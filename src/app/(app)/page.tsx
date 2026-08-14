import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { googleCalendarConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { currentMonth, formatCents } from "@/lib/money";
import { getValidAccessToken, listUpcomingEvents } from "@/lib/google-calendar";
import { listTasks } from "./data-center/tareas/actions";
import { getMonthSummary } from "./finanzas/actions";
import { listPages } from "./data-center/actions";
import { listNotes } from "./libreta/actions";

async function getUpcomingEventsPreview() {
  const user = await requireUser();
  const [connection] = await db
    .select({ userId: googleCalendarConnections.userId })
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, user.id))
    .limit(1);

  if (!connection) return { connected: false as const, events: [] };

  try {
    const accessToken = await getValidAccessToken(user.id);
    const events = accessToken ? await listUpcomingEvents(accessToken) : [];
    return { connected: true as const, events: events.slice(0, 3) };
  } catch {
    return { connected: true as const, events: [] };
  }
}

export default async function HomePage() {
  const month = currentMonth();

  const [tasks, summary, pages, notes, calendar] = await Promise.all([
    listTasks(),
    getMonthSummary(month),
    listPages(),
    listNotes(),
    getUpcomingEventsPreview(),
  ]);

  const pendingTasks = tasks.filter((task) => task.status !== "done");
  const recentPages = pages.slice(0, 5);
  const recentNotes = notes.slice(0, 5);

  const today = new Date().toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">
          {today.charAt(0).toUpperCase() + today.slice(1)}
        </h1>
        <p className="text-sm text-neutral-500">
          {pendingTasks.length === 0
            ? "No tenés tareas pendientes."
            : `Tenés ${pendingTasks.length} tarea${pendingTasks.length === 1 ? "" : "s"} pendiente${pendingTasks.length === 1 ? "" : "s"}.`}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-500">
              Tareas pendientes
            </h2>
            <Link
              href="/data-center/tareas"
              className="text-xs text-neutral-400 hover:text-neutral-900"
            >
              Ver todas →
            </Link>
          </div>
          {pendingTasks.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-400">Nada pendiente 🎉</p>
          ) : (
            <ul className="mt-3 space-y-2">
              {pendingTasks.slice(0, 5).map((task) => (
                <li
                  key={task.id}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="truncate">{task.title}</span>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {task.status === "doing" ? "Haciendo" : "Por hacer"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-500">
              Finanzas de {month}
            </h2>
            <Link
              href="/finanzas"
              className="text-xs text-neutral-400 hover:text-neutral-900"
            >
              Ver más →
            </Link>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-xs text-neutral-500">Ingresos</p>
              <p className="text-sm font-semibold text-green-700">
                {formatCents(summary.incomeCents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Gastos</p>
              <p className="text-sm font-semibold text-red-600">
                {formatCents(summary.expenseCents)}
              </p>
            </div>
            <div>
              <p className="text-xs text-neutral-500">Balance</p>
              <p className="text-sm font-semibold">
                {formatCents(summary.balanceCents)}
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-md border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-500">
              Próximos eventos
            </h2>
            <Link
              href="/data-center/calendario"
              className="text-xs text-neutral-400 hover:text-neutral-900"
            >
              Ver calendario →
            </Link>
          </div>
          {!calendar.connected ? (
            <p className="mt-3 text-sm text-neutral-400">
              Conectá tu Google Calendar desde Data Center → Calendario.
            </p>
          ) : calendar.events.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-400">
              No hay eventos próximos.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {calendar.events.map((event) => (
                <li key={event.id} className="text-sm">
                  <p className="truncate">{event.summary}</p>
                  {event.start && (
                    <p className="text-xs text-neutral-400">
                      {new Date(event.start).toLocaleString("es-AR")}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-neutral-200 p-4">
          <h2 className="text-sm font-medium text-neutral-500">Foco</h2>
          <p className="mt-3 text-sm text-neutral-500">
            Timer Pomodoro + fondos ambientales para una sesión de
            concentración.
          </p>
          <Link
            href="/foco"
            className="mt-3 inline-block rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
          >
            Arrancar sesión de foco
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-500">
              Páginas recientes
            </h2>
            <Link
              href="/data-center"
              className="text-xs text-neutral-400 hover:text-neutral-900"
            >
              Ver todas →
            </Link>
          </div>
          {recentPages.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-400">
              Todavía no creaste páginas.
            </p>
          ) : (
            <ul className="mt-3 space-y-1">
              {recentPages.map((page) => (
                <li key={page.id}>
                  <Link
                    href={`/data-center/paginas/${page.id}`}
                    className="flex items-center justify-between gap-2 rounded px-1 py-1 text-sm hover:bg-neutral-50"
                  >
                    <span className="truncate">
                      {page.icon ?? "📄"} {page.title}
                    </span>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {new Date(page.updatedAt).toLocaleDateString("es-AR")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-md border border-neutral-200 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-neutral-500">
              Notas recientes
            </h2>
            <Link
              href="/libreta"
              className="text-xs text-neutral-400 hover:text-neutral-900"
            >
              Ver todas →
            </Link>
          </div>
          {recentNotes.length === 0 ? (
            <p className="mt-3 text-sm text-neutral-400">
              Todavía no creaste notas.
            </p>
          ) : (
            <ul className="mt-3 space-y-1">
              {recentNotes.map((note) => (
                <li key={note.id}>
                  <Link
                    href={`/libreta/${note.id}`}
                    className="flex items-center justify-between gap-2 rounded px-1 py-1 text-sm hover:bg-neutral-50"
                  >
                    <span className="truncate">{note.title}</span>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {new Date(note.updatedAt).toLocaleDateString("es-AR")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
