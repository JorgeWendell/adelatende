"use server";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { waConnection, waQueue } from "@/db/schema";
import {
  createEvolutionInstance,
  deleteEvolutionInstance,
  instanceNameFor,
  logoutEvolutionInstance,
  setEvolutionWebhook,
  waitForQr,
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
      const hook = webhookUrl();
      const created = await createEvolutionInstance(
        evolutionInstance,
        hook || undefined
      );
      if (hook) {
        await setEvolutionWebhook(evolutionInstance, hook).catch(() => null);
      }
      const qr = await waitForQr(evolutionInstance, created);
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

    const [row] = await db
      .select({ qrCode: waConnection.qrCode })
      .from(waConnection)
      .where(eq(waConnection.id, id))
      .limit(1);

    return { id, qrCode: row?.qrCode ?? null };
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

    const qr = await waitForQr(row.evolutionInstance);
    if (!qr) {
      throw new ActionError(
        "A Evolution ainda não gerou o QR. Exclua a conexão, crie de novo e, se persistir, veja o log do container adelatende-evolution."
      );
    }
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
