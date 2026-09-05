"use server";

import { and, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { waConversation, waMessage } from "@/db/schema";
import { moduleAction, tenantAction } from "@/lib/safe-action";

export const getRelatorio = moduleAction("relatorios")
  .inputSchema(
    z.object({
      from: z.string(),
      to: z.string(),
    })
  )
  .action(async ({ parsedInput, ctx }) => {
    const from = new Date(`${parsedInput.from}T00:00:00`);
    const to = new Date(`${parsedInput.to}T23:59:59`);

    const [messages] = await db
      .select({
        sent: sql<number>`count(*) filter (where ${waMessage.direction} = 'out')::int`,
        received: sql<number>`count(*) filter (where ${waMessage.direction} = 'in')::int`,
      })
      .from(waMessage)
      .where(
        and(
          eq(waMessage.organizationId, ctx.organizationId),
          gte(waMessage.createdAt, from),
          lte(waMessage.createdAt, to)
        )
      );

    const [tickets] = await db
      .select({
        open: sql<number>`count(*) filter (where ${waConversation.status} = 'open')::int`,
        waiting: sql<number>`count(*) filter (where ${waConversation.status} = 'waiting')::int`,
        closed: sql<number>`count(*) filter (where ${waConversation.status} = 'closed' and ${waConversation.updatedAt} >= ${from} and ${waConversation.updatedAt} <= ${to})::int`,
        total: sql<number>`count(*)::int`,
      })
      .from(waConversation)
      .where(eq(waConversation.organizationId, ctx.organizationId));

    const daily = await db
      .select({
        day: sql<string>`to_char(${waMessage.createdAt}, 'YYYY-MM-DD')`,
        sent: sql<number>`count(*) filter (where ${waMessage.direction} = 'out')::int`,
        received: sql<number>`count(*) filter (where ${waMessage.direction} = 'in')::int`,
      })
      .from(waMessage)
      .where(
        and(
          eq(waMessage.organizationId, ctx.organizationId),
          gte(waMessage.createdAt, from),
          lte(waMessage.createdAt, to)
        )
      )
      .groupBy(sql`to_char(${waMessage.createdAt}, 'YYYY-MM-DD')`)
      .orderBy(sql`to_char(${waMessage.createdAt}, 'YYYY-MM-DD')`);

    return {
      sent: Number(messages?.sent ?? 0),
      received: Number(messages?.received ?? 0),
      open: Number(tickets?.open ?? 0),
      waiting: Number(tickets?.waiting ?? 0),
      closed: Number(tickets?.closed ?? 0),
      tickets: Number(tickets?.total ?? 0),
      daily: daily.map((item) => ({
        day: item.day,
        sent: Number(item.sent),
        received: Number(item.received),
      })),
    };
  });

export const getDashboardStats = tenantAction.action(
  async ({ ctx }) => {
    const [row] = await db
      .select({
        open: sql<number>`count(*) filter (where ${waConversation.status} = 'open')::int`,
        waiting: sql<number>`count(*) filter (where ${waConversation.status} = 'waiting')::int`,
        unread: sql<number>`coalesce(sum(${waConversation.unreadCount}), 0)::int`,
      })
      .from(waConversation)
      .where(eq(waConversation.organizationId, ctx.organizationId));

    return {
      open: Number(row?.open ?? 0),
      waiting: Number(row?.waiting ?? 0),
      unread: Number(row?.unread ?? 0),
    };
  }
);
