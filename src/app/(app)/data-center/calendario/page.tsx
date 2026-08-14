import { eq } from "drizzle-orm";
import { db } from "@/db";
import { googleCalendarConnections } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { getValidAccessToken, listUpcomingEvents } from "@/lib/google-calendar";
import { disconnectGoogleCalendar } from "./actions";

export default async function CalendarioPage({
  searchParams,
}: PageProps<"/data-center/calendario">) {
  const params = await searchParams;
  const user = await requireUser();

  const [connection] = await db
    .select({ userId: googleCalendarConnections.userId })
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, user.id))
    .limit(1);

  if (!connection) {
    return (
      <div className="space-y-4">
        <h1 className="text-lg font-semibold">Calendario</h1>
        <p className="text-sm text-neutral-500">
          Conectá tu Google Calendar para ver tus próximos eventos acá.
        </p>
        {params.error && (
          <p className="text-sm text-red-600">
            No se pudo conectar
            {params.error === "no-refresh-token"
              ? " — Google ya te había dado acceso antes. Revocalo en myaccount.google.com/permissions y probá de nuevo."
              : "."}
          </p>
        )}
        <a
          href="/api/google-calendar/connect"
          className="inline-block rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Conectar Google Calendar
        </a>
      </div>
    );
  }

  let events: Awaited<ReturnType<typeof listUpcomingEvents>> = [];
  let fetchError: string | null = null;

  try {
    const accessToken = await getValidAccessToken(user.id);
    if (accessToken) {
      events = await listUpcomingEvents(accessToken);
    }
  } catch {
    fetchError = "No se pudieron cargar los eventos. Probá reconectar.";
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">Calendario</h1>
        <form action={disconnectGoogleCalendar}>
          <button
            type="submit"
            className="text-xs text-neutral-400 hover:text-red-500"
          >
            Desconectar
          </button>
        </form>
      </div>

      {fetchError && <p className="text-sm text-red-600">{fetchError}</p>}

      {events.length === 0 && !fetchError ? (
        <p className="text-sm text-neutral-500">No hay eventos próximos.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {events.map((event) => (
            <li key={event.id} className="px-4 py-3 text-sm">
              <a href={event.htmlLink} target="_blank" rel="noreferrer" className="hover:underline">
                {event.summary}
              </a>
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
  );
}
