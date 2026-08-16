"use client";

import { useState } from "react";
import type { TaskStatus } from "@/app/(app)/data-center/tareas/actions";

const STATUS_OPTIONS: { value: TaskStatus; label: string }[] = [
  { value: "todo", label: "Por hacer" },
  { value: "doing", label: "Haciendo" },
  { value: "done", label: "Hecho" },
];

type Task = {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  dueDate: Date | null;
  projectId: string | null;
  prUrl: string | null;
};

type Project = { id: string; name: string };

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
  onUpdate: (patch: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    dueDate?: Date | null;
    projectId?: string | null;
  }) => Promise<void>;
}) {
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");

  async function save(patch: Parameters<typeof onUpdate>[0]) {
    setStatus("saving");
    await onUpdate(patch);
    setStatus("saved");
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
          {status === "saving" ? "Guardando…" : status === "saved" ? "Guardado" : ""}
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

      <textarea
        defaultValue={task.description ?? ""}
        onBlur={(event) => save({ description: event.target.value.trim() || null })}
        placeholder="Notas sobre esta tarea…"
        rows={10}
        className="w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
      />
    </div>
  );
}
