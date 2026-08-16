"use client";

import { useMemo, useState } from "react";
import type { TaskPriority, TaskStatus } from "@/app/(app)/data-center/tareas/actions";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "Por hacer" },
  { value: "doing", label: "Haciendo" },
  { value: "done", label: "Hecho" },
];

const PRIORITY_OPTIONS: { value: TaskPriority; label: string }[] = [
  { value: "low", label: "Baja" },
  { value: "medium", label: "Media" },
  { value: "high", label: "Alta" },
];

// Tareas importadas de un workspace de equipo en Notion traen esta info
// pegada como la primera línea de las notas en vez de en campos propios
// (esos campos no existían todavía). El botón "Extraer de las notas" la
// separa en priority/assignees reales.
const LEGACY_META_RE = /^Prioridad:\s*([^\s·]+)\s*·\s*Asignado a:\s*([^\n]*)\n?/i;

const PRIORITY_ALIASES: Record<string, TaskPriority> = {
  low: "low",
  baja: "low",
  bajo: "low",
  medium: "medium",
  media: "medium",
  medio: "medium",
  high: "high",
  alta: "high",
  alto: "high",
};

function parseLegacyMeta(
  text: string,
): { priority: TaskPriority | null; assignees: string | null; rest: string } | null {
  const match = text.match(LEGACY_META_RE);
  if (!match) return null;
  return {
    priority: PRIORITY_ALIASES[match[1].trim().toLowerCase()] ?? null,
    assignees: match[2].trim() || null,
    rest: text.slice(match[0].length).trimStart(),
  };
}

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority | null;
  assignees: string | null;
  dueDate: Date | null;
  projectId: string | null;
  prUrl: string | null;
};

type Project = { id: string; name: string };

type UpdatePatch = {
  title?: string;
  description?: string | null;
  status?: TaskStatus;
  priority?: TaskPriority | null;
  assignees?: string | null;
  dueDate?: Date | null;
  projectId?: string | null;
};

function toDateInputValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

export function TaskDetail({
  task,
  projects,
  onUpdate,
}: {
  task: Task;
  projects: Project[];
  onUpdate: (patch: UpdatePatch) => Promise<void>;
}) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [priority, setPriority] = useState(task.priority);
  const [assignees, setAssignees] = useState(task.assignees ?? "");
  const [description, setDescription] = useState(task.description ?? "");

  const legacyMeta = useMemo(() => parseLegacyMeta(description), [description]);

  async function save(patch: UpdatePatch) {
    setSaveStatus("saving");
    await onUpdate(patch);
    setSaveStatus("saved");
  }

  function extractFromNotes() {
    if (!legacyMeta) return;
    setPriority(legacyMeta.priority);
    setAssignees(legacyMeta.assignees ?? "");
    setDescription(legacyMeta.rest);
    save({
      priority: legacyMeta.priority,
      assignees: legacyMeta.assignees,
      description: legacyMeta.rest || null,
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input
          defaultValue={task.title}
          onBlur={(event) => {
            const title = event.target.value.trim() || "Sin título";
            save({ title });
          }}
          placeholder="Sin título"
          className="w-full border-none bg-transparent text-2xl font-semibold outline-none placeholder:text-neutral-300"
        />
        <span className="shrink-0 text-xs text-neutral-400">
          {saveStatus === "saving"
            ? "Guardando…"
            : saveStatus === "saved"
              ? "Guardado"
              : ""}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          defaultValue={task.status}
          onChange={(event) => save({ status: event.target.value as TaskStatus })}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={priority ?? ""}
          onChange={(event) => {
            const next = (event.target.value || null) as TaskPriority | null;
            setPriority(next);
            save({ priority: next });
          }}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Sin prioridad</option>
          {PRIORITY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          defaultValue={task.projectId ?? ""}
          onChange={(event) => save({ projectId: event.target.value || null })}
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        >
          <option value="">Sin proyecto</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          defaultValue={toDateInputValue(task.dueDate)}
          onChange={(event) =>
            save({ dueDate: event.target.value ? new Date(event.target.value) : null })
          }
          className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
        />
        {task.prUrl && (
          <a
            href={task.prUrl}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-600 hover:underline"
          >
            Ver PR →
          </a>
        )}
      </div>

      <input
        value={assignees}
        onChange={(event) => setAssignees(event.target.value)}
        onBlur={(event) => save({ assignees: event.target.value.trim() || null })}
        placeholder="Asignado a…"
        className="w-full rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
      />

      {legacyMeta && (
        <button
          type="button"
          onClick={extractFromNotes}
          className="rounded-md border border-dashed border-neutral-300 px-3 py-1.5 text-xs text-neutral-500 hover:border-neutral-400 hover:text-neutral-900"
        >
          Extraer prioridad/asignado de las notas
        </button>
      )}

      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        onBlur={(event) => save({ description: event.target.value.trim() || null })}
        placeholder="Notas sobre esta tarea…"
        rows={10}
        className="w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
      />
    </div>
  );
}
