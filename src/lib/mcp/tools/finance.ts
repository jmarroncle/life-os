import { z } from "zod";
import { and, desc, eq, sql } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/server";
import { db } from "@/db";
import { accounts, categories, transactions } from "@/db/schema";
import { errorResult, jsonResult, withLogging, withUser } from "@/lib/mcp/tool-helpers";
import { currentMonth, formatCents } from "@/lib/money";

export function registerFinanceTools(server: McpServer) {
  server.registerTool(
    "life_os_list_accounts",
    {
      title: "Listar cuentas",
      description:
        "Lista las cuentas (bancarias, efectivo, tarjeta) usadas en Finanzas.",
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_list_accounts",
      withUser(async (_args: Record<string, never>, userId) => {
        const rows = await db
          .select()
          .from(accounts)
          .where(eq(accounts.userId, userId));
        return jsonResult(`${rows.length} cuenta(s).`, { accounts: rows });
      }),
    ),
  );

  server.registerTool(
    "life_os_list_categories",
    {
      title: "Listar categorías",
      description: "Lista las categorías de ingreso/gasto usadas en Finanzas.",
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_list_categories",
      withUser(async (_args: Record<string, never>, userId) => {
        const rows = await db
          .select()
          .from(categories)
          .where(eq(categories.userId, userId));
        return jsonResult(`${rows.length} categoría(s).`, { categories: rows });
      }),
    ),
  );

  server.registerTool(
    "life_os_get_finance_summary",
    {
      title: "Resumen financiero del mes",
      description:
        "Devuelve ingresos, gastos, balance y desglose por categoría de un mes.",
      inputSchema: z.object({
        month: z
          .string()
          .regex(/^\d{4}-\d{2}$/)
          .optional()
          .describe("Formato YYYY-MM. Por defecto, el mes actual."),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_get_finance_summary",
      withUser(async ({ month }: { month?: string }, userId) => {
        const targetMonth = month ?? currentMonth();

        const rows = await db
          .select({
            categoryName: categories.name,
            amountCents: transactions.amountCents,
          })
          .from(transactions)
          .leftJoin(categories, eq(transactions.categoryId, categories.id))
          .where(
            and(
              eq(transactions.userId, userId),
              sql`to_char(${transactions.occurredAt}, 'YYYY-MM') = ${targetMonth}`,
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
          .map(([name, cents]) => ({ name, amount: formatCents(cents), cents }))
          .sort((a, b) => b.cents - a.cents);

        return jsonResult(
          `Resumen de ${targetMonth}: ingresos ${formatCents(incomeCents)}, gastos ${formatCents(expenseCents)}.`,
          {
            month: targetMonth,
            incomeCents,
            expenseCents,
            balanceCents: incomeCents - expenseCents,
            categoryBreakdown,
          },
        );
      }),
    ),
  );

  server.registerTool(
    "life_os_list_transactions",
    {
      title: "Listar movimientos",
      description: "Lista los últimos movimientos (ingresos/gastos) registrados.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(100).default(20),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_list_transactions",
      withUser(async ({ limit }: { limit: number }, userId) => {
        const rows = await db
          .select({
            id: transactions.id,
            amountCents: transactions.amountCents,
            description: transactions.description,
            occurredAt: transactions.occurredAt,
            accountId: transactions.accountId,
            categoryId: transactions.categoryId,
          })
          .from(transactions)
          .where(eq(transactions.userId, userId))
          .orderBy(desc(transactions.occurredAt))
          .limit(limit);

        return jsonResult(`${rows.length} movimiento(s).`, {
          transactions: rows,
        });
      }),
    ),
  );

  server.registerTool(
    "life_os_create_transaction",
    {
      title: "Crear movimiento",
      description:
        "Registra un ingreso o gasto. El monto va en pesos (no en centavos) y el signo determina el tipo: positivo = ingreso, negativo = gasto.",
      inputSchema: z.object({
        accountId: z
          .string()
          .uuid()
          .describe("ID de la cuenta (ver life_os_list_accounts)."),
        amount: z
          .number()
          .describe(
            "Monto en pesos. Positivo = ingreso, negativo = gasto. Ej: -1500 para un gasto de $1500.",
          ),
        categoryId: z
          .string()
          .uuid()
          .optional()
          .describe("ID de la categoría (ver life_os_list_categories)."),
        description: z.string().optional(),
        occurredAt: z
          .string()
          .optional()
          .describe("Fecha ISO 8601. Por defecto, ahora."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_create_transaction",
      withUser(
        async (
          {
            accountId,
            amount,
            categoryId,
            description,
            occurredAt,
          }: {
            accountId: string;
            amount: number;
            categoryId?: string;
            description?: string;
            occurredAt?: string;
          },
          userId,
        ) => {
          const [account] = await db
            .select({ id: accounts.id })
            .from(accounts)
            .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)))
            .limit(1);
          if (!account) return errorResult(`No se encontró la cuenta ${accountId}.`);

          const amountCents = Math.round(amount * 100);
          const [created] = await db
            .insert(transactions)
            .values({
              userId,
              accountId,
              categoryId: categoryId ?? null,
              amountCents,
              description: description ?? null,
              occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
            })
            .returning({ id: transactions.id });

          return jsonResult(`Movimiento de ${formatCents(amountCents)} registrado.`, {
            id: created.id,
          });
        },
      ),
    ),
  );
}
