"use server";

import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { member, user, waQueue, waQueueMember } from "@/db/schema";
import { ActionError, moduleAction } from "@/lib/safe-action";

const queueSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da fila."),
  color: z.string().default("#57adf8"),
  greeting: z.string().optional(),
  distribution: z.enum(["manual", "round-robin", "least-busy"]).default("manual"),
  maxLoad: z.number().int().min(0).default(0),
  memberIds: z.array(z.string()).default([]),
});

export const listFilas = moduleAction("filas").action(async ({ ctx }) => {
  const [queues, members, agents] = await Promise.all([
    db
      .select()
      .from(waQueue)
      .where(eq(waQueue.organizationId, ctx.organizationId))
      .orderBy(desc(waQueue.createdAt)),
    db
      .select()
      .from(waQueueMember)
      .where(eq(waQueueMember.organizationId, ctx.organizationId)),
    db
      .select({
        userId: user.id,
        name: user.name,
        email: user.email,
      })
      .from(member)
      .innerJoin(user, eq(member.userId, user.id))
      .where(eq(member.organizationId, ctx.organizationId))
      .orderBy(user.name),
  ]);

  return {
    agents,
    queues: queues.map((queue) => ({
      ...queue,
      members: members
        .filter((item) => item.queueId === queue.id)
        .map((item) => item.userId),
    })),
  };
});

export const saveFila = moduleAction("filas", "gestor")
  .inputSchema(queueSchema.extend({ id: z.string().optional() }))
  .action(async ({ parsedInput, ctx }) => {
    const now = new Date();
    const id = parsedInput.id ?? crypto.randomUUID();

    if (parsedInput.id) {
      await db
        .update(waQueue)
        .set({
          name: parsedInput.name,
          color: parsedInput.color,
          greeting: parsedInput.greeting || null,
          distribution: parsedInput.distribution,
          maxLoad: parsedInput.maxLoad,
          updatedAt: now,
        })
        .where(
          and(
            eq(waQueue.id, parsedInput.id),
            eq(waQueue.organizationId, ctx.organizationId)
          )
        );
      await db
        .delete(waQueueMember)
        .where(eq(waQueueMember.queueId, parsedInput.id));
    } else {
      await db.insert(waQueue).values({
        id,
        organizationId: ctx.organizationId,
        name: parsedInput.name,
        color: parsedInput.color,
        greeting: parsedInput.greeting || null,
        distribution: parsedInput.distribution,
        maxLoad: parsedInput.maxLoad,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (parsedInput.memberIds.length) {
      await db.insert(waQueueMember).values(
        parsedInput.memberIds.map((userId) => ({
          id: crypto.randomUUID(),
          organizationId: ctx.organizationId,
          queueId: id,
          userId,
          createdAt: now,
          updatedAt: now,
        }))
      );
    }

    return { id };
  });

export const deleteFila = moduleAction("filas", "gestor")
  .inputSchema(z.object({ id: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    await db
      .delete(waQueue)
      .where(
        and(
          eq(waQueue.id, parsedInput.id),
          eq(waQueue.organizationId, ctx.organizationId)
        )
      );
    return { ok: true };
  });
