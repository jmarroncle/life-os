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
  derivedToMemberId: string | null;
  derivedAt: Date | null;
};

type Project = { id: string; name: string };

type TeamMember = {
  id: string;
  name: string;
  email: string;
  activatedAt: Date | null;
};

type DeriveResult = {
  emailOk: boolean;
  emailError?: string;
  pushOk: boolean;
  pushSkipped: boolean;
};

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
  teamMembers,
  onUpdate,
  onDerive,
}: {
  task: Task;
  projects: Project[];
  teamMembers: TeamMember[];
  onUpdate: (patch: UpdatePatch) => Promise<void>;
  onDerive: (memberId: string) => Promise<DeriveResult>;
}) {
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [priority, setPriority] = useState(task.priority);
  const [assignees, setAssignees] = useState(task.assignees ?? "");
  const [description, setDescription] = useState(task.description ?? "");
  const [deriveMemberId, setDeriveMemberId] = useState(teamMembers[0]?.id ?? "");
  const [deriving, setDeriving] = useState(false);
  const [deriveResult, setDeriveResult] = useState<DeriveResult | null>(null);

  const legacyMeta = useMemo(() => parseLegacyMeta(description), [description]);
  const derivedToMember = teamMembers.find((m) => m.id === task.derivedToMemberId);

  async function save(patch: UpdatePatch) {
    setSaveStatus("saving");
    await onUpdate(patch);
    setSaveStatus("saved");
  }

  async function handleDerive() {
    if (!deriveMemberId) return;
    setDeriving(true);
    setDeriveResult(null);
    try {
      const result = await onDerive(deriveMemberId);
      setDeriveResult(result);
    } finally {
      setDeriving(false);
    }
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

      {teamMembers.length > 0 && (
        <div className="space-y-2 rounded-md border border-neutral-200 p-3">
          <p className="text-xs font-medium text-neutral-500">
            Derivar (email + push a un compañero)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={deriveMemberId}
              onChange={(event) => setDeriveMemberId(event.target.value)}
              className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
            >
              {teamMembers.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                  {!member.activatedAt ? " (sin notificaciones activadas)" : ""}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleDerive}
              disabled={deriving}
              className="rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
            >
              {deriving ? "Derivando…" : "Derivar"}
            </button>
          </div>
          {deriveResult && (
            <p className="text-xs text-neutral-500">
              {deriveResult.emailOk ? "Email enviado. " : `Email falló${deriveResult.emailError ? ` (${deriveResult.emailError})` : ""}. `}
              {deriveResult.pushSkipped
                ? "Sin push (no activó notificaciones todavía)."
                : deriveResult.pushOk
                  ? "Push enviado."
                  : "Push falló."}
            </p>
          )}
          {derivedToMember && task.derivedAt && (
            <p className="text-xs text-neutral-400">
              Derivada a {derivedToMember.name} el{" "}
              {task.derivedAt.toLocaleDateString("es-AR")}.
            </p>
          )}
        </div>
      )}

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
