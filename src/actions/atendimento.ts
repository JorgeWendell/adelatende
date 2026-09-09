"use server";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import {
  member,
  user,
  waConnection,
  waContact,
  waConversation,
  waMessage,
  waQuickReply,
} from "@/db/schema";
import { sendEvolutionMedia, sendEvolutionText } from "@/lib/evolution";
import { jidFromPhone, phoneFromJid } from "@/lib/phone";
import { ActionError, moduleAction } from "@/lib/safe-action";
import {
  insertMessage,
  previewFromBody,
  upsertContact,
} from "@/lib/tickets";

export const listConversas = moduleAction("atendimento")
  .inputSchema(
    z.object({
      connectionId: z.string().optional(),
      q: z.string().optional(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const filters = [eq(waConversation.organizationId, ctx.organizationId)];
    if (parsedInput.connectionId) {
      filters.push(eq(waConversation.connectionId, parsedInput.connectionId));
    }

    const rows = await db
      .select({
        id: waConversation.id,
        status: waConversation.status,
        isGroup: waConversation.isGroup,
        unreadCount: waConversation.unreadCount,
        lastMessageAt: waConversation.lastMessageAt,
        lastMessagePreview: waConversation.lastMessagePreview,
        assignedUserId: waConversation.assignedUserId,
        assignedName: user.name,
        connectionId: waConnection.id,
        connectionName: waConnection.name,
        contactId: waContact.id,
        contactName: waContact.name,
        contactPhone: waContact.phone,
        contactJid: waContact.jid,
        contactAvatar: waContact.avatarUrl,
      })
      .from(waConversation)
      .innerJoin(waContact, eq(waConversation.contactId, waContact.id))
      .innerJoin(waConnection, eq(waConversation.connectionId, waConnection.id))
      .leftJoin(user, eq(waConversation.assignedUserId, user.id))
      .where(and(...filters))
      .orderBy(desc(waConversation.lastMessageAt));

    const query = parsedInput.q?.trim().toLowerCase();
    const filtered = query
      ? rows.filter(
          (row) =>
            row.contactName.toLowerCase().includes(query) ||
            row.contactPhone.includes(query) ||
            (row.lastMessagePreview ?? "").toLowerCase().includes(query)
        )
      : rows;

    const connections = await db
      .select({
        id: waConnection.id,
        name: waConnection.name,
        status: waConnection.status,
        phone: waConnection.phone,
      })
      .from(waConnection)
      .where(eq(waConnection.organizationId, ctx.organizationId))
      .orderBy(waConnection.name);

    return {
      meId: ctx.session.user.id,
      connections,
      conversations: filtered,
    };
  });

export const listMensagens = moduleAction("atendimento")
  .inputSchema(z.object({ conversationId: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const [conversation] = await db
      .select({
        id: waConversation.id,
        status: waConversation.status,
        assignedUserId: waConversation.assignedUserId,
        isGroup: waConversation.isGroup,
        connectionId: waConnection.id,
        connectionName: waConnection.name,
        contactId: waContact.id,
        contactName: waContact.name,
        contactPhone: waContact.phone,
        contactJid: waContact.jid,
        contactNotes: waContact.notes,
        contactAvatar: waContact.avatarUrl,
      })
      .from(waConversation)
      .innerJoin(waContact, eq(waConversation.contactId, waContact.id))
      .innerJoin(waConnection, eq(waConversation.connectionId, waConnection.id))
      .where(
        and(
          eq(waConversation.id, parsedInput.conversationId),
          eq(waConversation.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!conversation) {
      throw new ActionError("Conversa não encontrada.");
    }

    const messages = await db
      .select()
      .from(waMessage)
      .where(eq(waMessage.conversationId, conversation.id))
      .orderBy(waMessage.createdAt);

    await db
      .update(waConversation)
      .set({ unreadCount: 0, updatedAt: new Date() })
      .where(eq(waConversation.id, conversation.id));

    return { conversation, messages };
  });

export const setConversaStatus = moduleAction("atendimento")
  .inputSchema(
    z.object({
      conversationId: z.string(),
      status: z.enum(["waiting", "open", "closed"]),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const assignedUserId =
      parsedInput.status === "open"
        ? ctx.session.user.id
        : parsedInput.status === "waiting"
          ? null
          : undefined;

    if (parsedInput.status === "open") {
      const [conversation] = await db
        .select({
          id: waConversation.id,
          contactJid: waContact.jid,
          instance: waConnection.evolutionInstance,
        })
        .from(waConversation)
        .innerJoin(waContact, eq(waConversation.contactId, waContact.id))
        .innerJoin(waConnection, eq(waConversation.connectionId, waConnection.id))
        .where(
          and(
            eq(waConversation.id, parsedInput.conversationId),
            eq(waConversation.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!conversation) {
        throw new ActionError("Conversa não encontrada.");
      }

      const agentName =
        ctx.session.user.name?.trim().split(/\s+/)[0] || "atendente";
      const greeting = `Ola me chamo ${agentName}, vou dar andamento a sua solicitação.`;
      const number = phoneFromJid(conversation.contactJid);

      await sendEvolutionText(conversation.instance, number, greeting);
      await insertMessage({
        organizationId: ctx.organizationId,
        conversationId: conversation.id,
        direction: "out",
        type: "text",
        body: greeting,
        fromMe: true,
      });

      await db
        .update(waConversation)
        .set({
          status: "open",
          assignedUserId,
          lastMessageAt: new Date(),
          lastMessagePreview: previewFromBody(greeting, "text"),
          unreadCount: 0,
          updatedAt: new Date(),
        })
        .where(eq(waConversation.id, conversation.id));

      return { ok: true };
    }

    if (parsedInput.status === "closed") {
      const [conversation] = await db
        .select({
          id: waConversation.id,
          contactJid: waContact.jid,
          instance: waConnection.evolutionInstance,
        })
        .from(waConversation)
        .innerJoin(waContact, eq(waConversation.contactId, waContact.id))
        .innerJoin(waConnection, eq(waConversation.connectionId, waConnection.id))
        .where(
          and(
            eq(waConversation.id, parsedInput.conversationId),
            eq(waConversation.organizationId, ctx.organizationId)
          )
        )
        .limit(1);

      if (!conversation) {
        throw new ActionError("Conversa não encontrada.");
      }

      const farewell =
        "Atendimento encerrado, se precisar de algo entre em contato conosco, tenha um excelente dia!";
      const number = phoneFromJid(conversation.contactJid);

      await sendEvolutionText(conversation.instance, number, farewell);
      await insertMessage({
        organizationId: ctx.organizationId,
        conversationId: conversation.id,
        direction: "out",
        type: "text",
        body: farewell,
        fromMe: true,
      });

      await db
        .update(waConversation)
        .set({
          status: "closed",
          lastMessageAt: new Date(),
          lastMessagePreview: previewFromBody(farewell, "text"),
          unreadCount: 0,
          updatedAt: new Date(),
        })
        .where(eq(waConversation.id, conversation.id));

      return { ok: true };
    }

    await db
      .update(waConversation)
      .set({
        status: parsedInput.status,
        ...(assignedUserId !== undefined ? { assignedUserId } : {}),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(waConversation.id, parsedInput.conversationId),
          eq(waConversation.organizationId, ctx.organizationId)
        )
      );
    return { ok: true };
  });

export const listAtendentes = moduleAction("atendimento").action(
  async ({ ctx }) => {
    const rows = await db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, ctx.organizationId))
      .orderBy(user.name);

    return rows.filter((row) => row.userId !== ctx.session.user.id);
  }
);

export const transferConversa = moduleAction("atendimento")
  .inputSchema(
    z.object({
      conversationId: z.string(),
      userId: z.string(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    if (parsedInput.userId === ctx.session.user.id) {
      throw new ActionError("Escolha outro usuário.");
    }

    const [target] = await db
      .select({ userId: user.id, name: user.name })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(
        and(
          eq(member.organizationId, ctx.organizationId),
          eq(member.userId, parsedInput.userId)
        )
      )
      .limit(1);
    if (!target) {
      throw new ActionError("Usuário não encontrado na empresa.");
    }

    const [conversation] = await db
      .select({ id: waConversation.id })
      .from(waConversation)
      .where(
        and(
          eq(waConversation.id, parsedInput.conversationId),
          eq(waConversation.organizationId, ctx.organizationId)
        )
      )
      .limit(1);
    if (!conversation) {
      throw new ActionError("Conversa não encontrada.");
    }

    await db
      .update(waConversation)
      .set({
        status: "open",
        assignedUserId: target.userId,
        updatedAt: new Date(),
      })
      .where(eq(waConversation.id, conversation.id));

    return { ok: true, assignedName: target.name };
  });

export const sendMensagem = moduleAction("atendimento")
  .inputSchema(
    z.object({
      conversationId: z.string(),
      body: z.string().trim().min(1).optional(),
      media: z
        .object({
          mediatype: z.string(),
          mimetype: z.string(),
          media: z.string(),
          fileName: z.string().optional(),
        })
        .optional(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const [conversation] = await db
      .select({
        id: waConversation.id,
        contactJid: waContact.jid,
        instance: waConnection.evolutionInstance,
        contactName: waContact.name,
      })
      .from(waConversation)
      .innerJoin(waContact, eq(waConversation.contactId, waContact.id))
      .innerJoin(waConnection, eq(waConversation.connectionId, waConnection.id))
      .where(
        and(
          eq(waConversation.id, parsedInput.conversationId),
          eq(waConversation.organizationId, ctx.organizationId)
        )
      )
      .limit(1);

    if (!conversation) {
      throw new ActionError("Conversa não encontrada.");
    }

    const number = phoneFromJid(conversation.contactJid);
    let body = parsedInput.body ?? "";
    if (body.includes("{{nome}}")) {
      body = body.replaceAll("{{nome}}", conversation.contactName);
    }

    if (parsedInput.media) {
      await sendEvolutionMedia(conversation.instance, number, {
        ...parsedInput.media,
        caption: body || undefined,
      });
    } else {
      if (!body) throw new ActionError("Digite uma mensagem.");
      await sendEvolutionText(conversation.instance, number, body);
    }

    const type = parsedInput.media?.mediatype ?? "text";
    await insertMessage({
      organizationId: ctx.organizationId,
      conversationId: conversation.id,
      direction: "out",
      type,
      body,
      fromMe: true,
    });

    await db
      .update(waConversation)
      .set({
        lastMessageAt: new Date(),
        lastMessagePreview: previewFromBody(body, type),
        status: "open",
        assignedUserId: ctx.session.user.id,
        unreadCount: 0,
        updatedAt: new Date(),
      })
      .where(eq(waConversation.id, conversation.id));

    return { ok: true };
  });

export const startConversa = moduleAction("atendimento")
  .inputSchema(
    z.object({
      connectionId: z.string(),
      phone: z.string().min(8),
      name: z.string().optional(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const [connection] = await db
      .select()
      .from(waConnection)
      .where(
        and(
          eq(waConnection.id, parsedInput.connectionId),
          eq(waConnection.organizationId, ctx.organizationId)
        )
      )
      .limit(1);
    if (!connection) throw new ActionError("Conexão inválida.");

    const jid = jidFromPhone(parsedInput.phone);
    const contact = await upsertContact({
      organizationId: ctx.organizationId,
      jid,
      name: parsedInput.name,
    });

    const [existing] = await db
      .select({ id: waConversation.id })
      .from(waConversation)
      .where(
        and(
          eq(waConversation.connectionId, connection.id),
          eq(waConversation.contactId, contact.id)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(waConversation)
        .set({ status: "waiting", updatedAt: new Date() })
        .where(eq(waConversation.id, existing.id));
      return { id: existing.id };
    }

    const id = crypto.randomUUID();
    const now = new Date();
    await db.insert(waConversation).values({
      id,
      organizationId: ctx.organizationId,
      connectionId: connection.id,
      contactId: contact.id,
      queueId: connection.defaultQueueId,
      status: "waiting",
      isGroup: false,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  });

export const listQuickReplies = moduleAction("atendimento").action(
  async ({ ctx }) => {
    return db
      .select()
      .from(waQuickReply)
      .where(eq(waQuickReply.organizationId, ctx.organizationId))
      .orderBy(waQuickReply.shortcut);
  }
);

export const saveQuickReply = moduleAction("atendimento", "gestor")
  .inputSchema(
    z.object({
      id: z.string().optional(),
      shortcut: z.string().trim().min(1),
      body: z.string().trim().min(1),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const shortcut = parsedInput.shortcut.replace(/^\//, "");
    const now = new Date();
    if (parsedInput.id) {
      await db
        .update(waQuickReply)
        .set({ shortcut, body: parsedInput.body, updatedAt: now })
        .where(
          and(
            eq(waQuickReply.id, parsedInput.id),
            eq(waQuickReply.organizationId, ctx.organizationId)
          )
        );
      return { id: parsedInput.id };
    }
    const id = crypto.randomUUID();
    await db.insert(waQuickReply).values({
      id,
      organizationId: ctx.organizationId,
      shortcut,
      body: parsedInput.body,
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  });
