import { formatCents } from "@/lib/money";
import { getCategoryTotals, getMonthlyTrend, getProductivityStats } from "./actions";

const MONTHS_BACK = 6;

export default async function ReportesPage() {
  const [trend, categoryTotals, productivity] = await Promise.all([
    getMonthlyTrend(MONTHS_BACK),
    getCategoryTotals(MONTHS_BACK),
    getProductivityStats(),
  ]);

  const maxAmountCents = Math.max(
    1,
    ...trend.flatMap((m) => [m.incomeCents, m.expenseCents]),
  );
  const maxCategoryCents = categoryTotals[0]?.cents ?? 0;
  const totalTasks =
    productivity.tasksByStatus.todo +
    productivity.tasksByStatus.doing +
    productivity.tasksByStatus.done;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Reportes</h1>
        <p className="text-sm text-neutral-500">
          Vista agregada de los últimos {MONTHS_BACK} meses.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Ingresos y gastos por mes
        </h2>
        <div className="space-y-3 rounded-md border border-neutral-200 p-4">
          {trend.map((m) => (
            <div key={m.month} className="space-y-1">
              <div className="flex items-center justify-between text-xs text-neutral-500">
                <span>{m.month}</span>
                <span>
                  <span className="text-green-700">{formatCents(m.incomeCents)}</span>
                  {" / "}
                  <span className="text-red-600">{formatCents(m.expenseCents)}</span>
                </span>
              </div>
              <div className="flex gap-1">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full bg-green-700"
                    style={{
                      width: `${Math.round((m.incomeCents / maxAmountCents) * 100)}%`,
                    }}
                  />
                </div>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-100">
                  <div
                    className="h-full bg-red-600"
                    style={{
                      width: `${Math.round((m.expenseCents / maxAmountCents) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Categorías con más gasto (últimos {MONTHS_BACK} meses)
        </h2>
        {categoryTotals.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Todavía no hay gastos cargados en este período.
          </p>
        ) : (
          <ul className="space-y-2 rounded-md border border-neutral-200 p-4">
            {categoryTotals.map((row) => (
              <li key={row.name} className="text-sm">
                <div className="flex items-center justify-between">
                  <span>{row.name}</span>
                  <span className="text-neutral-500">{formatCents(row.cents)}</span>
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
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Productividad</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-neutral-200 p-4">
            <p className="text-xs text-neutral-500">Tareas</p>
            <p className="text-xl font-semibold">{totalTasks}</p>
            <p className="mt-1 text-xs text-neutral-400">
              {productivity.tasksByStatus.done} hechas ·{" "}
              {productivity.tasksByStatus.doing} haciendo ·{" "}
              {productivity.tasksByStatus.todo} por hacer
            </p>
          </div>
          <div className="rounded-md border border-neutral-200 p-4">
            <p className="text-xs text-neutral-500">Páginas</p>
            <p className="text-xl font-semibold">{productivity.pagesCount}</p>
          </div>
          <div className="rounded-md border border-neutral-200 p-4">
            <p className="text-xs text-neutral-500">Notas</p>
            <p className="text-xl font-semibold">{productivity.notesCount}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
