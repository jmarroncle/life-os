import Link from "next/link";
import { currentMonth, formatCents } from "@/lib/money";
import { getBudgetSummary, setBudget } from "./actions";

function shiftMonth(month: string, delta: number): string {
  const [year, monthNum] = month.split("-").map(Number);
  const date = new Date(year, monthNum - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export default async function PresupuestosPage({
  searchParams,
}: PageProps<"/finanzas/presupuestos">) {
  const params = await searchParams;
  const month =
    typeof params.month === "string" ? params.month : currentMonth();
  const summary = await getBudgetSummary(month);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-4">
        <Link
          href={`/finanzas/presupuestos?month=${shiftMonth(month, -1)}`}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          ← Anterior
        </Link>
        <span className="text-sm font-medium">{month}</span>
        <Link
          href={`/finanzas/presupuestos?month=${shiftMonth(month, 1)}`}
          className="text-sm text-neutral-500 hover:text-neutral-900"
        >
          Siguiente →
        </Link>
      </div>

      {summary.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Creá categorías de gasto (pestaña &quot;Categorías&quot;) para
          poder presupuestarlas.
        </p>
      ) : (
        <ul className="space-y-3">
          {summary.map((row) => {
            const pct =
              row.limitCents && row.limitCents > 0
                ? Math.min(100, Math.round((row.spentCents / row.limitCents) * 100))
                : 0;
            const overBudget = row.limitCents !== null && row.spentCents > row.limitCents;

            return (
              <li
                key={row.categoryId}
                className="rounded-md border border-neutral-200 p-3 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-medium">{row.categoryName}</span>
                  <form action={setBudget} className="flex items-center gap-2">
                    <input type="hidden" name="categoryId" value={row.categoryId} />
                    <input type="hidden" name="month" value={month} />
                    <input
                      type="number"
                      name="limit"
                      step="0.01"
                      min="0"
                      placeholder="Presupuesto"
                      defaultValue={
                        row.limitCents !== null ? row.limitCents / 100 : ""
                      }
                      className="w-28 rounded-md border border-neutral-300 px-2 py-1 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                    >
                      Guardar
                    </button>
                  </form>
                </div>

                <div className="mt-2 h-2 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className={`h-full ${overBudget ? "bg-red-500" : "bg-neutral-900"}`}
                    style={{ width: `${row.limitCents ? pct : 0}%` }}
                  />
                </div>

                <p className="mt-1 text-xs text-neutral-400">
                  {formatCents(row.spentCents)}
                  {row.limitCents !== null
                    ? ` de ${formatCents(row.limitCents)}`
                    : " gastado (sin presupuesto)"}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
