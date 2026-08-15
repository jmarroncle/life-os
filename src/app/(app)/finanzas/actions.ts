"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  categories,
  transactions,
  type accountType,
  type categoryKind,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logUndo } from "@/lib/undo";

export type AccountType = (typeof accountType.enumValues)[number];
export type CategoryKind = (typeof categoryKind.enumValues)[number];

export async function listAccounts() {
  const user = await requireUser();
  return db
    .select()
    .from(accounts)
    .where(eq(accounts.userId, user.id))
    .orderBy(asc(accounts.name));
}

export async function createAccount(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const type = String(formData.get("type") ?? "bank") as AccountType;

  const [created] = await db
    .insert(accounts)
    .values({ userId: user.id, name, type })
    .returning({ id: accounts.id });

  await logUndo(user.id, `Crear cuenta "${name}"`, [
    { op: "delete", table: "accounts", id: created.id },
  ]);
}

export async function listCategories(kind?: CategoryKind) {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(categories)
    .where(eq(categories.userId, user.id))
    .orderBy(asc(categories.name));
  return kind ? rows.filter((row) => row.kind === kind) : rows;
}

export async function createCategory(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const kind = String(formData.get("kind") ?? "expense") as CategoryKind;

  const [created] = await db
    .insert(categories)
    .values({ userId: user.id, name, kind })
    .returning({ id: categories.id });

  await logUndo(user.id, `Crear categoría "${name}"`, [
    { op: "delete", table: "categories", id: created.id },
  ]);
}

export async function getMonthSummary(month: string) {
  const user = await requireUser();

  const rows = await db
    .select({
      categoryName: categories.name,
      amountCents: transactions.amountCents,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, user.id),
        sql`to_char(${transactions.occurredAt}, 'YYYY-MM') = ${month}`,
      ),
    );

  let incomeCents = 0;
  let expenseCents = 0;
  const byCategory = new Map<string, number>();

  for (const row of rows) {
    if (row.amountCents > 0) {
      incomeCents += row.amountCents;
    } else {
      const spent = -row.amountCents;
      expenseCents += spent;
      const key = row.categoryName ?? "Sin categoría";
      byCategory.set(key, (byCategory.get(key) ?? 0) + spent);
    }
  }

  const categoryBreakdown = Array.from(byCategory.entries())
    .map(([name, cents]) => ({ name, cents }))
    .sort((a, b) => b.cents - a.cents);

  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    categoryBreakdown,
  };
}
