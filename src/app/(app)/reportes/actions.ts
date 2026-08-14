"use server";

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "@/db";
import { categories, notes, pages, tasks, transactions } from "@/db/schema";
import { requireUser } from "@/lib/auth";

function monthsBackFrom(monthsBack: number): { months: string[]; cutoff: Date } {
  const now = new Date();
  const months: string[] = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }
  const cutoff = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1);
  return { months, cutoff };
}

export async function getMonthlyTrend(monthsBack = 6) {
  const user = await requireUser();
  const { months, cutoff } = monthsBackFrom(monthsBack);

  const rows = await db
    .select({
      month: sql<string>`to_char(${transactions.occurredAt}, 'YYYY-MM')`,
      amountCents: transactions.amountCents,
    })
    .from(transactions)
    .where(
      and(eq(transactions.userId, user.id), gte(transactions.occurredAt, cutoff)),
    );

  const byMonth = new Map(
    months.map((month) => [month, { incomeCents: 0, expenseCents: 0 }]),
  );

  for (const row of rows) {
    const bucket = byMonth.get(row.month);
    if (!bucket) continue;
    if (row.amountCents > 0) bucket.incomeCents += row.amountCents;
    else bucket.expenseCents += -row.amountCents;
  }

  return months.map((month) => ({ month, ...byMonth.get(month)! }));
}

export async function getCategoryTotals(monthsBack = 6) {
  const user = await requireUser();
  const { cutoff } = monthsBackFrom(monthsBack);

  const rows = await db
    .select({
      categoryName: categories.name,
      amountCents: transactions.amountCents,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(eq(transactions.userId, user.id), gte(transactions.occurredAt, cutoff)),
    );

  const byCategory = new Map<string, number>();
  for (const row of rows) {
    if (row.amountCents >= 0) continue;
    const key = row.categoryName ?? "Sin categoría";
    byCategory.set(key, (byCategory.get(key) ?? 0) - row.amountCents);
  }

  return Array.from(byCategory.entries())
    .map(([name, cents]) => ({ name, cents }))
    .sort((a, b) => b.cents - a.cents)
    .slice(0, 8);
}

export async function getProductivityStats() {
  const user = await requireUser();

  const [taskRows, [pageCount], [noteCount]] = await Promise.all([
    db.select({ status: tasks.status }).from(tasks).where(eq(tasks.userId, user.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(pages)
      .where(eq(pages.userId, user.id)),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notes)
      .where(eq(notes.userId, user.id)),
  ]);

  const byStatus = { todo: 0, doing: 0, done: 0 };
  for (const row of taskRows) byStatus[row.status]++;

  return {
    tasksByStatus: byStatus,
    pagesCount: pageCount?.count ?? 0,
    notesCount: noteCount?.count ?? 0,
  };
}
