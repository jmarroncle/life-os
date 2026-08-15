"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { formatCents } from "@/lib/money";
import type { DraftItem } from "@/app/(app)/data-center/revisar/actions";

const STORAGE_KEY = "life-os:dashboard-widgets";

type WidgetKey =
  | "revisar"
  | "tareas"
  | "finanzas"
  | "calendario"
  | "foco"
  | "paginas"
  | "notas";

const WIDGET_LABELS: Record<WidgetKey, string> = {
  revisar: "Por revisar",
  tareas: "Tareas pendientes",
  finanzas: "Finanzas del mes",
  calendario: "Próximos eventos",
  foco: "Foco",
  paginas: "Páginas recientes",
  notas: "Notas recientes",
};

const DEFAULT_ORDER: WidgetKey[] = [
  "revisar",
  "tareas",
  "finanzas",
  "calendario",
  "foco",
  "paginas",
  "notas",
];

type Task = { id: string; title: string; status: string };
type CalendarEvent = { id: string; summary: string; start: string | null };
type Page = { id: string; title: string; icon: string | null; updatedAt: Date };
type Note = { id: string; title: string; updatedAt: Date };

export function DashboardWidgets({
  pendingTasks,
  month,
  summary,
  calendar,
  recentPages,
  recentNotes,
  draftItems,
}: {
  pendingTasks: Task[];
  month: string;
  summary: { incomeCents: number; expenseCents: number; balanceCents: number };
  calendar: { connected: boolean; events: CalendarEvent[] };
  recentPages: Page[];
  recentNotes: Note[];
  draftItems: DraftItem[];
}) {
  const [order, setOrder] = useState<WidgetKey[]>(DEFAULT_ORDER);
  const [hidden, setHidden] = useState<Set<WidgetKey>>(new Set());
  const [customizing, setCustomizing] = useState(false);

  useEffect(() => {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { order?: WidgetKey[]; hidden?: WidgetKey[] };
      const validOrder = (parsed.order ?? []).filter((key) =>
        DEFAULT_ORDER.includes(key),
      );
      const missing = DEFAULT_ORDER.filter((key) => !validOrder.includes(key));
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrder([...validOrder, ...missing]);
      setHidden(new Set(parsed.hidden ?? []));
    } catch {
      // localStorage corrupto: se queda con los defaults.
    }
  }, []);

  function persist(nextOrder: WidgetKey[], nextHidden: Set<WidgetKey>) {
    setOrder(nextOrder);
    setHidden(nextHidden);
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ order: nextOrder, hidden: [...nextHidden] }),
    );
  }

  function toggleHidden(key: WidgetKey) {
    const next = new Set(hidden);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    persist(order, next);
  }

  function move(key: WidgetKey, direction: -1 | 1) {
    const index = order.indexOf(key);
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    persist(next, hidden);
  }

  const widgetContent: Record<WidgetKey, ReactNode> = {
    revisar:
      draftItems.length === 0 ? (
        <Widget title="Por revisar" href="/data-center/revisar">
          <p className="mt-3 text-sm text-neutral-400">
            Nada esperando revisión.
          </p>
        </Widget>
      ) : (
        <div className="rounded-md border border-amber-500 p-4">
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-medium text-neutral-500">
              Por revisar
              <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                {draftItems.length}
              </span>
            </h2>
            <Link
              href="/data-center/revisar"
              className="text-xs text-neutral-400 hover:text-neutral-900"
            >
              Ver todo →
            </Link>
          </div>
          <ul className="mt-3 space-y-2">
            {draftItems.slice(0, 5).map((item) => (
              <li key={`${item.type}-${item.id}`}>
                <Link
                  href={item.href}
                  className="flex items-center justify-between gap-2 rounded px-1 py-1 text-sm hover:bg-neutral-50"
                >
                  <span className="truncate">
                    {item.icon ?? (item.type === "page" ? "📄" : "📋")} {item.title}
                  </span>
                  <span className="shrink-0 text-xs text-neutral-400">
                    {item.contextLabel}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ),
    tareas: (
      <Widget title="Tareas pendientes" href="/data-center/tareas">
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
      </Widget>
    ),
    finanzas: (
      <Widget title={`Finanzas de ${month}`} href="/finanzas" hrefLabel="Ver más →">
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
      </Widget>
    ),
    calendario: (
      <Widget
        title="Próximos eventos"
        href="/data-center/calendario"
        hrefLabel="Ver calendario →"
      >
        {!calendar.connected ? (
          <p className="mt-3 text-sm text-neutral-400">
            Conectá tu Google Calendar desde Data Center → Calendario.
          </p>
        ) : calendar.events.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-400">No hay eventos próximos.</p>
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
      </Widget>
    ),
    foco: (
      <div className="rounded-md border border-neutral-200 p-4">
        <h2 className="text-sm font-medium text-neutral-500">Foco</h2>
        <p className="mt-3 text-sm text-neutral-500">
          Timer Pomodoro + fondos ambientales para una sesión de concentración.
        </p>
        <Link
          href="/foco"
          className="mt-3 inline-block rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white"
        >
          Arrancar sesión de foco
        </Link>
      </div>
    ),
    paginas: (
      <Widget title="Páginas recientes" href="/data-center">
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
      </Widget>
    ),
    notas: (
      <Widget title="Notas recientes" href="/libreta">
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
      </Widget>
    ),
  };

  const visibleOrder = order.filter((key) => !hidden.has(key));

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setCustomizing((prev) => !prev)}
          className="text-xs text-neutral-400 hover:text-neutral-900"
        >
          {customizing ? "Listo" : "Personalizar ⚙"}
        </button>
      </div>

      {customizing && (
        <div className="space-y-1 rounded-md border border-neutral-200 p-3">
          {order.map((key, index) => (
            <div
              key={key}
              className="flex items-center justify-between gap-2 py-1 text-sm"
            >
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={!hidden.has(key)}
                  onChange={() => toggleHidden(key)}
                />
                {WIDGET_LABELS[key]}
              </label>
              <div className="flex gap-1 text-xs text-neutral-400">
                <button
                  type="button"
                  onClick={() => move(key, -1)}
                  disabled={index === 0}
                  className="disabled:opacity-30"
                  aria-label="Subir"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => move(key, 1)}
                  disabled={index === order.length - 1}
                  className="disabled:opacity-30"
                  aria-label="Bajar"
                >
                  ↓
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {visibleOrder.length === 0 ? (
        <p className="text-sm text-neutral-400">
          Ocultaste todos los widgets — reactivá alguno en &ldquo;Personalizar&rdquo;.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visibleOrder.map((key) => (
            <div key={key}>{widgetContent[key]}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function Widget({
  title,
  href,
  hrefLabel = "Ver todas →",
  children,
}: {
  title: string;
  href: string;
  hrefLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-md border border-neutral-200 p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-neutral-500">{title}</h2>
        <Link href={href} className="text-xs text-neutral-400 hover:text-neutral-900">
          {hrefLabel}
        </Link>
      </div>
      {children}
    </div>
  );
}
