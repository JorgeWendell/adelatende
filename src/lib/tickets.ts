import { and, asc, eq, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  waConnection,
  waContact,
  waConversation,
  waMessage,
  waQueueMember,
} from "@/db/schema";
import { isGroupJid, phoneFromJid } from "@/lib/phone";

export async function findConnectionByInstance(instanceName: string) {
  const [row] = await db
    .select()
    .from(waConnection)
    .where(eq(waConnection.evolutionInstance, instanceName))
    .limit(1);
  return row ?? null;
}

export async function upsertContact(input: {
  organizationId: string;
  jid: string;
  name?: string | null;
  avatarUrl?: string | null;
}) {
  const phone = phoneFromJid(input.jid);
  const [existing] = await db
    .select()
    .from(waContact)
    .where(
      and(
        eq(waContact.organizationId, input.organizationId),
        eq(waContact.jid, input.jid)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(waContact)
      .set({
        name: input.name?.trim() || existing.name,
        avatarUrl: input.avatarUrl ?? existing.avatarUrl,
        updatedAt: new Date(),
      })
      .where(eq(waContact.id, existing.id));
    return { ...existing, name: input.name?.trim() || existing.name };
  }

  const id = crypto.randomUUID();
  const now = new Date();
  const row = {
    id,
    organizationId: input.organizationId,
    name: input.name?.trim() || phone,
    phone,
    jid: input.jid,
    avatarUrl: input.avatarUrl ?? null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(waContact).values(row);
  return row;
}

export async function pickQueueAgent(
  organizationId: string,
  queueId: string | null
) {
  if (!queueId) return null;
  const members = await db
    .select({ userId: waQueueMember.userId })
    .from(waQueueMember)
    .where(
      and(
        eq(waQueueMember.organizationId, organizationId),
        eq(waQueueMember.queueId, queueId)
      )
    )
    .orderBy(asc(waQueueMember.createdAt));
  if (!members.length) return null;

  const loads = await db
    .select({
      assignedUserId: waConversation.assignedUserId,
      count: sql<number>`count(*)::int`,
    })
    .from(waConversation)
    .where(
      and(
        eq(waConversation.organizationId, organizationId),
        eq(waConversation.queueId, queueId),
        eq(waConversation.status, "open")
      )
    )
    .groupBy(waConversation.assignedUserId);

  const loadMap = new Map(
    loads
      .filter((item) => item.assignedUserId)
      .map((item) => [item.assignedUserId as string, Number(item.count)])
  );

  let chosen = members[0].userId;
  let min = Number.POSITIVE_INFINITY;
  for (const member of members) {
    const load = loadMap.get(member.userId) ?? 0;
    if (load < min) {
      min = load;
      chosen = member.userId;
    }
  }
  return chosen;
}

export async function upsertIncomingConversation(input: {
  organizationId: string;
  connectionId: string;
  contactId: string;
  jid: string;
  preview: string;
  defaultQueueId: string | null;
  distribution: string | null;
  maxLoad: number;
}) {
  const [existing] = await db
    .select()
    .from(waConversation)
    .where(
      and(
        eq(waConversation.connectionId, input.connectionId),
        eq(waConversation.contactId, input.contactId)
      )
    )
    .limit(1);

  const now = new Date();
  if (existing) {
    const nextStatus =
      existing.status === "closed" ? "waiting" : existing.status;
    await db
      .update(waConversation)
      .set({
        status: nextStatus,
        unreadCount: existing.unreadCount + 1,
        lastMessageAt: now,
        lastMessagePreview: input.preview,
        updatedAt: now,
        assignedUserId: nextStatus === "waiting" ? null : existing.assignedUserId,
      })
      .where(eq(waConversation.id, existing.id));
    return { ...existing, status: nextStatus };
  }

  let assignedUserId: string | null = null;
  let status = "waiting";
  if (
    input.defaultQueueId &&
    (input.distribution === "round-robin" || input.distribution === "least-busy")
  ) {
    assignedUserId = await pickQueueAgent(
      input.organizationId,
      input.defaultQueueId
    );
    if (assignedUserId) status = "open";
  }

  const id = crypto.randomUUID();
  const row = {
    id,
    organizationId: input.organizationId,
    connectionId: input.connectionId,
    contactId: input.contactId,
    queueId: input.defaultQueueId,
    assignedUserId,
    status,
    isGroup: isGroupJid(input.jid),
    unreadCount: 1,
    lastMessageAt: now,
    lastMessagePreview: input.preview,
    createdAt: now,
    updatedAt: now,
  };
  await db.insert(waConversation).values(row);
  return row;
}

export async function insertMessage(input: {
  organizationId: string;
  conversationId: string;
  waId?: string | null;
  direction: "in" | "out";
  type?: string;
  body?: string | null;
  mediaUrl?: string | null;
  mediaMime?: string | null;
  fromMe: boolean;
}) {
  if (input.waId) {
    const [dup] = await db
      .select({ id: waMessage.id })
      .from(waMessage)
      .where(
        and(
          eq(waMessage.organizationId, input.organizationId),
          eq(waMessage.waId, input.waId)
        )
      )
      .limit(1);
    if (dup) return dup;
  }

  const id = crypto.randomUUID();
  const now = new Date();
  await db.insert(waMessage).values({
    id,
    organizationId: input.organizationId,
    conversationId: input.conversationId,
    waId: input.waId ?? null,
    direction: input.direction,
    type: input.type ?? "text",
    body: input.body ?? null,
    mediaUrl: input.mediaUrl ?? null,
    mediaMime: input.mediaMime ?? null,
    fromMe: input.fromMe,
    createdAt: now,
    updatedAt: now,
  });
  return { id };
}

export function previewFromBody(body: string | null | undefined, type: string) {
  if (body?.trim()) return body.trim().slice(0, 140);
  if (type === "image") return "Imagem";
  if (type === "audio") return "Áudio";
  if (type === "video") return "Vídeo";
  if (type === "document") return "Documento";
  return "Mensagem";
}
