"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { budgets, categories, transactions } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { parseAmountToCents } from "@/lib/money";
import { logUndo, omitId } from "@/lib/undo";

export async function getBudgetSummary(month: string) {
  const user = await requireUser();

  const expenseCategories = await db
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(and(eq(categories.userId, user.id), eq(categories.kind, "expense")));

  const budgetRows = await db
    .select({ categoryId: budgets.categoryId, limitCents: budgets.limitCents })
    .from(budgets)
    .where(and(eq(budgets.userId, user.id), eq(budgets.month, month)));

  const spendRows = await db
    .select({
      categoryId: transactions.categoryId,
      spentCents: sql<number>`coalesce(sum(-${transactions.amountCents}), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, user.id),
        sql`${transactions.amountCents} < 0`,
        sql`to_char(${transactions.occurredAt}, 'YYYY-MM') = ${month}`,
      ),
    )
    .groupBy(transactions.categoryId);

  const budgetMap = new Map(budgetRows.map((b) => [b.categoryId, b.limitCents]));
  const spendMap = new Map(
    spendRows.map((s) => [s.categoryId, Number(s.spentCents)]),
  );

  return expenseCategories.map((category) => ({
    categoryId: category.id,
    categoryName: category.name,
    limitCents: budgetMap.get(category.id) ?? null,
    spentCents: spendMap.get(category.id) ?? 0,
  }));
}

export async function setBudget(formData: FormData) {
  const user = await requireUser();
  const categoryId = String(formData.get("categoryId") ?? "");
  const month = String(formData.get("month") ?? "");
  const limitCents = Math.abs(
    parseAmountToCents(String(formData.get("limit") ?? "0")),
  );
  if (!categoryId || !month) return;

  const [existing] = await db
    .select()
    .from(budgets)
    .where(
      and(
        eq(budgets.userId, user.id),
        eq(budgets.categoryId, categoryId),
        eq(budgets.month, month),
      ),
    )
    .limit(1);

  const [result] = await db
    .insert(budgets)
    .values({ userId: user.id, categoryId, month, limitCents })
    .onConflictDoUpdate({
      target: [budgets.userId, budgets.categoryId, budgets.month],
      set: { limitCents },
    })
    .returning({ id: budgets.id });

  if (existing) {
    await logUndo(user.id, `Editar presupuesto de ${month}`, [
      { op: "update", table: "budgets", id: existing.id, values: omitId(existing) },
    ]);
  } else {
    await logUndo(user.id, `Crear presupuesto de ${month}`, [
      { op: "delete", table: "budgets", id: result.id },
    ]);
  }
}
