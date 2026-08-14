import { eq } from "drizzle-orm";
import { db } from "@/db";
import { googleCalendarConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { currentMonth } from "@/lib/money";
import { getValidAccessToken, listUpcomingEvents } from "@/lib/google-calendar";
import { DashboardWidgets } from "@/components/dashboard-widgets";
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

      <DashboardWidgets
        pendingTasks={pendingTasks}
        month={month}
        summary={summary}
        calendar={calendar}
        recentPages={recentPages}
        recentNotes={recentNotes}
      />
    </div>
  );
}
