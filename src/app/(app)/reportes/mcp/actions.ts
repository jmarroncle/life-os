"use server";

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { mcpCalls } from "@/db/schema";
import { requireUser } from "@/lib/auth";

type Window = {
  count: number;
  errors: number;
  tokensIn: number;
  tokensOut: number;
};

async function windowStats(userId: string, since: Date): Promise<Window> {
  const [row] = await db
    .select({
      count: sql<number>`count(*)::int`,
      errors: sql<number>`count(*) filter (where not ${mcpCalls.success})::int`,
      tokensIn: sql<number>`coalesce(sum(${mcpCalls.estimatedTokensIn}), 0)::int`,
      tokensOut: sql<number>`coalesce(sum(${mcpCalls.estimatedTokensOut}), 0)::int`,
    })
    .from(mcpCalls)
    .where(and(eq(mcpCalls.userId, userId), gte(mcpCalls.createdAt, since)));

  return row ?? { count: 0, errors: 0, tokensIn: 0, tokensOut: 0 };
}

export async function getMcpOverview() {
  const user = await requireUser();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const [last24h, last7d, last30d] = await Promise.all([
    windowStats(user.id, new Date(now - day)),
    windowStats(user.id, new Date(now - 7 * day)),
    windowStats(user.id, new Date(now - 30 * day)),
  ]);

  const byTool = await db
    .select({
      toolName: mcpCalls.toolName,
      count: sql<number>`count(*)::int`,
      errors: sql<number>`count(*) filter (where not ${mcpCalls.success})::int`,
      tokensIn: sql<number>`coalesce(sum(${mcpCalls.estimatedTokensIn}), 0)::int`,
      tokensOut: sql<number>`coalesce(sum(${mcpCalls.estimatedTokensOut}), 0)::int`,
      avgDurationMs: sql<number>`coalesce(avg(${mcpCalls.durationMs}), 0)::int`,
    })
    .from(mcpCalls)
    .where(and(eq(mcpCalls.userId, user.id), gte(mcpCalls.createdAt, new Date(now - 30 * day))))
    .groupBy(mcpCalls.toolName)
    .orderBy(desc(sql`count(*)`));

  return { last24h, last7d, last30d, byTool };
}

export async function listMcpCalls(limit = 50) {
  const user = await requireUser();
  return db
    .select()
    .from(mcpCalls)
    .where(eq(mcpCalls.userId, user.id))
    .orderBy(desc(mcpCalls.createdAt))
    .limit(limit);
}
