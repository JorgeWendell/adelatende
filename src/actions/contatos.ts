"use server";

import { and, desc, eq, ilike, or } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { waConnection, waContact, waConversation } from "@/db/schema";
import { jidFromPhone } from "@/lib/phone";
import { ActionError, moduleAction } from "@/lib/safe-action";

export const listContatos = moduleAction("contatos")
  .inputSchema(z.object({ q: z.string().optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const query = parsedInput.q?.trim();
    const filters = [eq(waContact.organizationId, ctx.organizationId)];
    if (query) {
      filters.push(
        or(
          ilike(waContact.name, `%${query}%`),
          ilike(waContact.phone, `%${query}%`)
        )!
      );
    }

    return db
      .select()
      .from(waContact)
      .where(and(...filters))
      .orderBy(desc(waContact.updatedAt));
  });

export const saveContato = moduleAction("contatos")
  .inputSchema(
    z.object({
      id: z.string().optional(),
      name: z.string().trim().min(2),
      phone: z.string().trim().min(8),
      notes: z.string().optional(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const now = new Date();
    const jid = jidFromPhone(parsedInput.phone);
    if (parsedInput.id) {
      await db
        .update(waContact)
        .set({
          name: parsedInput.name,
          phone: parsedInput.phone,
          jid,
          notes: parsedInput.notes || null,
          updatedAt: now,
        })
        .where(
          and(
            eq(waContact.id, parsedInput.id),
            eq(waContact.organizationId, ctx.organizationId)
          )
        );
      return { id: parsedInput.id };
    }

    const id = crypto.randomUUID();
    await db.insert(waContact).values({
      id,
      organizationId: ctx.organizationId,
      name: parsedInput.name,
      phone: parsedInput.phone,
      jid,
      notes: parsedInput.notes || null,
      createdAt: now,
      updatedAt: now,
    });
    return { id };
  });

export const openContatoChat = moduleAction("contatos")
  .inputSchema(
    z.object({
      contactId: z.string(),
      connectionId: z.string(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const [contact] = await db
      .select()
      .from(waContact)
      .where(
        and(
          eq(waContact.id, parsedInput.contactId),
          eq(waContact.organizationId, ctx.organizationId)
        )
      )
      .limit(1);
    if (!contact) throw new ActionError("Contato não encontrado.");

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

    if (existing) return { conversationId: existing.id };

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
    return { conversationId: id };
  });
