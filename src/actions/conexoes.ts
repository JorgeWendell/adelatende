"use server";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { waConnection, waQueue } from "@/db/schema";
import {
  connectEvolutionInstance,
  createEvolutionInstance,
  deleteEvolutionInstance,
  extractQrBase64,
  instanceNameFor,
  logoutEvolutionInstance,
  setEvolutionWebhook,
  webhookUrl,
} from "@/lib/evolution";
import { ActionError, moduleAction } from "@/lib/safe-action";

export const listConexoes = moduleAction("conexoes").action(async ({ ctx }) => {
  const [rows, queues] = await Promise.all([
    db
      .select()
      .from(waConnection)
      .where(eq(waConnection.organizationId, ctx.organizationId))
      .orderBy(desc(waConnection.createdAt)),
    db
      .select({ id: waQueue.id, name: waQueue.name, color: waQueue.color })
      .from(waQueue)
      .where(eq(waQueue.organizationId, ctx.organizationId))
      .orderBy(waQueue.name),
  ]);
  return { connections: rows, queues };
});

export const createConexao = moduleAction("conexoes", "gestor")
  .inputSchema(
    z.object({
      name: z.string().trim().min(2, "Informe o nome da conexão."),
      defaultQueueId: z.string().optional(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const id = crypto.randomUUID();
    const evolutionInstance = instanceNameFor(ctx.organizationId, id);
    const now = new Date();

    await db.insert(waConnection).values({
      id,
      organizationId: ctx.organizationId,
      name: parsedInput.name,
      evolutionInstance,
      status: "connecting",
      defaultQueueId: parsedInput.defaultQueueId || null,
      createdAt: now,
      updatedAt: now,
    });

    try {
      await createEvolutionInstance(evolutionInstance);
      const hook = webhookUrl();
      if (hook) {
        await setEvolutionWebhook(evolutionInstance, hook);
      }
      const connected = await connectEvolutionInstance(evolutionInstance);
      const qr = extractQrBase64(connected);
      if (qr) {
        await db
          .update(waConnection)
          .set({ qrCode: qr, updatedAt: new Date() })
          .where(eq(waConnection.id, id));
      }
    } catch (error) {
      await db.delete(waConnection).where(eq(waConnection.id, id));
      throw new ActionError(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a instância na Evolution API."
      );
    }

    return { id };
  });

export const refreshQr = moduleAction("conexoes")
  .inputSchema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const [row] = await db
      .select()
      .from(waConnection)
      .where(
        and(
          eq(waConnection.id, parsedInput.id),
          eq(waConnection.organizationId, ctx.organizationId)
        )
      )
      .limit(1);
    if (!row) throw new ActionError("Conexão não encontrada.");

    const connected = await connectEvolutionInstance(row.evolutionInstance);
    const qr = extractQrBase64(connected);
    await db
      .update(waConnection)
      .set({
        qrCode: qr,
        status: "connecting",
        updatedAt: new Date(),
      })
      .where(eq(waConnection.id, row.id));
    return { qrCode: qr, status: "connecting" as const };
  });

export const disconnectConexao = moduleAction("conexoes", "gestor")
  .inputSchema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const [row] = await db
      .select()
      .from(waConnection)
      .where(
        and(
          eq(waConnection.id, parsedInput.id),
          eq(waConnection.organizationId, ctx.organizationId)
        )
      )
      .limit(1);
    if (!row) throw new ActionError("Conexão não encontrada.");
    await logoutEvolutionInstance(row.evolutionInstance).catch(() => null);
    await db
      .update(waConnection)
      .set({ status: "close", qrCode: null, updatedAt: new Date() })
      .where(eq(waConnection.id, row.id));
    return { ok: true };
  });

export const deleteConexao = moduleAction("conexoes", "gestor")
  .inputSchema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const [row] = await db
      .select()
      .from(waConnection)
      .where(
        and(
          eq(waConnection.id, parsedInput.id),
          eq(waConnection.organizationId, ctx.organizationId)
        )
      )
      .limit(1);
    if (!row) throw new ActionError("Conexão não encontrada.");
    await deleteEvolutionInstance(row.evolutionInstance).catch(() => null);
    await db.delete(waConnection).where(eq(waConnection.id, row.id));
    return { ok: true };
  });

export const saveConexao = moduleAction("conexoes", "gestor")
  .inputSchema(
    z.object({
      id: z.string(),
      name: z.string().trim().min(2),
      defaultQueueId: z.string().optional(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    await db
      .update(waConnection)
      .set({
        name: parsedInput.name,
        defaultQueueId: parsedInput.defaultQueueId || null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(waConnection.id, parsedInput.id),
          eq(waConnection.organizationId, ctx.organizationId)
        )
      );
    return { ok: true };
  });
