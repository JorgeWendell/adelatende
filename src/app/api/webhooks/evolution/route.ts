import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

import { db } from "@/db";
import { waConnection, waQueue } from "@/db/schema";
import {
  extractConnectionState,
  qrImageFromPayload,
} from "@/lib/evolution";
import { isGroupJid } from "@/lib/phone";
import {
  findConnectionByInstance,
  insertMessage,
  previewFromBody,
  upsertContact,
  upsertIncomingConversation,
} from "@/lib/tickets";

export const runtime = "nodejs";

function eventName(payload: Record<string, unknown>) {
  return String(payload.event ?? payload.Event ?? "")
    .toLowerCase()
    .replace(/_/g, ".");
}

function instanceName(payload: Record<string, unknown>) {
  const instance = payload.instance;
  if (typeof instance === "string") return instance;
  if (instance && typeof instance === "object") {
    const name = (instance as { instanceName?: string; name?: string })
      .instanceName;
    if (name) return name;
    const alt = (instance as { name?: string }).name;
    if (alt) return alt;
  }
  const data = payload.data as { instance?: string; instanceName?: string } | undefined;
  return String(
    payload.instanceName ?? data?.instanceName ?? data?.instance ?? ""
  );
}

function messageParts(data: Record<string, unknown>) {
  const key = (data.key ?? {}) as {
    id?: string;
    remoteJid?: string;
    fromMe?: boolean;
  };
  const message = (data.message ?? {}) as Record<string, unknown>;
  const image = message.imageMessage as Record<string, unknown> | undefined;
  const video = message.videoMessage as Record<string, unknown> | undefined;
  const audio = message.audioMessage as Record<string, unknown> | undefined;
  const document = message.documentMessage as Record<string, unknown> | undefined;
  const extended = message.extendedTextMessage as { text?: string } | undefined;

  let type = "text";
  let body =
    (typeof message.conversation === "string" && message.conversation) ||
    extended?.text ||
    "";
  if (image) {
    type = "image";
    body = String(image.caption ?? body);
  } else if (video) {
    type = "video";
    body = String(video.caption ?? body);
  } else if (audio) {
    type = "audio";
  } else if (document) {
    type = "document";
    body = String(document.fileName ?? body);
  }

  return {
    waId: key.id ?? null,
    jid: String(key.remoteJid ?? ""),
    fromMe: Boolean(key.fromMe),
    pushName: typeof data.pushName === "string" ? data.pushName : null,
    type,
    body,
  };
}

export async function POST(request: NextRequest) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (secret && request.headers.get("x-webhook-secret") !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const payload = (await request.json()) as Record<string, unknown>;
  const event = eventName(payload);
  const instance = instanceName(payload);
  if (!instance) {
    return NextResponse.json({ ok: true });
  }

  const connection = await findConnectionByInstance(instance);
  if (!connection) {
    return NextResponse.json({ ok: true });
  }

  if (event.includes("qrcode")) {
    const qr = await qrImageFromPayload(payload);
    await db
      .update(waConnection)
      .set({
        qrCode: qr,
        status: "connecting",
        updatedAt: new Date(),
      })
      .where(eq(waConnection.id, connection.id));
    return NextResponse.json({ ok: true });
  }

  if (event.includes("connection")) {
    const state = extractConnectionState(payload);
    const data = (payload.data ?? payload) as Record<string, unknown>;
    const phone =
      (typeof data.wuid === "string" && data.wuid.replace(/@.*$/, "")) ||
      (typeof data.owner === "string" && data.owner.replace(/@.*$/, "")) ||
      connection.phone;
    await db
      .update(waConnection)
      .set({
        status: state,
        phone: state === "open" ? phone : connection.phone,
        qrCode: state === "open" ? null : connection.qrCode,
        updatedAt: new Date(),
      })
      .where(eq(waConnection.id, connection.id));
    return NextResponse.json({ ok: true });
  }

  if (!event.includes("messages")) {
    return NextResponse.json({ ok: true });
  }

  const data = (payload.data ?? payload) as Record<string, unknown>;
  const parts = messageParts(data);
  if (!parts.jid || parts.jid === "status@broadcast") {
    return NextResponse.json({ ok: true });
  }
  if (isGroupJid(parts.jid) === false && parts.jid.endsWith("@lid")) {
    return NextResponse.json({ ok: true });
  }

  const contact = await upsertContact({
    organizationId: connection.organizationId,
    jid: parts.jid,
    name: parts.pushName,
  });

  let distribution: string | null = null;
  let maxLoad = 0;
  if (connection.defaultQueueId) {
    const [queue] = await db
      .select({
        distribution: waQueue.distribution,
        maxLoad: waQueue.maxLoad,
      })
      .from(waQueue)
      .where(eq(waQueue.id, connection.defaultQueueId))
      .limit(1);
    distribution = queue?.distribution ?? null;
    maxLoad = queue?.maxLoad ?? 0;
  }

  const conversation = await upsertIncomingConversation({
    organizationId: connection.organizationId,
    connectionId: connection.id,
    contactId: contact.id,
    jid: parts.jid,
    preview: previewFromBody(parts.body, parts.type),
    defaultQueueId: connection.defaultQueueId,
    distribution,
    maxLoad,
  });

  await insertMessage({
    organizationId: connection.organizationId,
    conversationId: conversation.id,
    waId: parts.waId,
    direction: parts.fromMe ? "out" : "in",
    type: parts.type,
    body: parts.body,
    fromMe: parts.fromMe,
  });

  return NextResponse.json({ ok: true });
}
