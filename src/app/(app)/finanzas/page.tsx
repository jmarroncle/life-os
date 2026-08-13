import { currentMonth, formatCents } from "@/lib/money";
import { getMonthSummary } from "./actions";

export default async function FinanzasResumenPage() {
  const month = currentMonth();
  const summary = await getMonthSummary(month);
  const maxCategoryCents = summary.categoryBreakdown[0]?.cents ?? 0;

  return (
    <div className="space-y-6">
      <p className="text-sm text-neutral-500">Resumen de {month}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-md border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Ingresos</p>
          <p className="text-xl font-semibold text-green-700">
            {formatCents(summary.incomeCents)}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Gastos</p>
          <p className="text-xl font-semibold text-red-600">
            {formatCents(summary.expenseCents)}
          </p>
        </div>
        <div className="rounded-md border border-neutral-200 p-4">
          <p className="text-xs text-neutral-500">Balance</p>
          <p className="text-xl font-semibold">
            {formatCents(summary.balanceCents)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-neutral-500">
          Gasto por categoría
        </h2>
        {summary.categoryBreakdown.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Todavía no hay gastos cargados este mes.
          </p>
        ) : (
          <ul className="space-y-2">
            {summary.categoryBreakdown.map((row) => (
              <li key={row.name} className="text-sm">
                <div className="flex items-center justify-between">
                  <span>{row.name}</span>
                  <span className="text-neutral-500">
                    {formatCents(row.cents)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full bg-neutral-900"
                    style={{
                      width: `${maxCategoryCents ? Math.round((row.cents / maxCategoryCents) * 100) : 0}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
