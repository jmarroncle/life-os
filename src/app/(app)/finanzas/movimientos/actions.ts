"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { parseAmountToCents } from "@/lib/money";
import { logUndo } from "@/lib/undo";

export async function listTransactions() {
  const user = await requireUser();
  return db
    .select({
      id: transactions.id,
      amountCents: transactions.amountCents,
      description: transactions.description,
      occurredAt: transactions.occurredAt,
      accountName: accounts.name,
      categoryName: categories.name,
    })
    .from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(eq(transactions.userId, user.id))
    .orderBy(desc(transactions.occurredAt))
    .limit(100);
}

export async function createTransaction(formData: FormData) {
  const user = await requireUser();
  const accountId = String(formData.get("accountId") ?? "");
  if (!accountId) return;

  const categoryId = String(formData.get("categoryId") ?? "") || null;
  const kind = String(formData.get("kind") ?? "expense");
  const rawAmount = String(formData.get("amount") ?? "");
  const amountCents =
    Math.abs(parseAmountToCents(rawAmount)) * (kind === "expense" ? -1 : 1);
  if (amountCents === 0) return;

  const description = String(formData.get("description") ?? "").trim() || null;
  const dateRaw = String(formData.get("date") ?? "");
  const occurredAt = dateRaw ? new Date(dateRaw) : new Date();

  const [created] = await db
    .insert(transactions)
    .values({
      userId: user.id,
      accountId,
      categoryId,
      amountCents,
      description,
      occurredAt,
    })
    .returning({ id: transactions.id });

  await logUndo(user.id, `Crear movimiento${description ? ` "${description}"` : ""}`, [
    { op: "delete", table: "transactions", id: created.id },
  ]);
}

export async function deleteTransaction(id: string) {
  const user = await requireUser();
  const [before] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, user.id)));

  await logUndo(
    user.id,
    `Eliminar movimiento${before.description ? ` "${before.description}"` : ""}`,
    [{ op: "insert", table: "transactions", values: before }],
  );
}
