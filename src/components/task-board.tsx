"use client";

import { useState, useTransition } from "react";
import {
  deleteTask,
  updateTaskStatus,
  type TaskStatus,
} from "@/app/(app)/data-center/tareas/actions";
import { createPullRequestForTask } from "@/app/(app)/data-center/tareas/pr-actions";

type Task = {
  id: string;
  title: string;
  status: TaskStatus;
  dueDate: Date | null;
  projectId: string | null;
  projectName: string | null;
  prUrl: string | null;
};

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: "todo", label: "Por hacer" },
  { status: "doing", label: "Haciendo" },
  { status: "done", label: "Hecho" },
];

export function TaskBoard({ initialTasks }: { initialTasks: Task[] }) {
  const [items, setItems] = useState(initialTasks);
  const [, startTransition] = useTransition();
  const [prLoadingId, setPrLoadingId] = useState<string | null>(null);
  const [prErrors, setPrErrors] = useState<Record<string, string>>({});

  function handleStatusChange(id: string, status: TaskStatus) {
    setItems((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
    startTransition(() => {
      updateTaskStatus(id, status);
    });
  }

  function handleDelete(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id));
    startTransition(() => {
      deleteTask(id);
    });
  }

  async function handleCreatePr(id: string) {
    setPrLoadingId(id);
    setPrErrors((prev) => ({ ...prev, [id]: "" }));
    try {
      const prUrl = await createPullRequestForTask(id);
      setItems((prev) => prev.map((t) => (t.id === id ? { ...t, prUrl } : t)));
    } catch (error) {
      setPrErrors((prev) => ({
        ...prev,
        [id]: error instanceof Error ? error.message : "Error creando el PR.",
      }));
    } finally {
      setPrLoadingId(null);
    }
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {COLUMNS.map((col) => {
        const columnTasks = items.filter((t) => t.status === col.status);
        return (
          <div key={col.status} className="space-y-2">
            <h2 className="text-sm font-medium text-neutral-500">
              {col.label} · {columnTasks.length}
            </h2>
            <ul className="space-y-2">
              {columnTasks.map((task) => (
                <li
                  key={task.id}
                  className="rounded-md border border-neutral-200 bg-white p-3 text-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span>{task.title}</span>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-neutral-300 hover:text-red-500"
                      aria-label="Eliminar tarea"
                    >
                      ×
                    </button>
                  </div>
                  {task.projectName && (
                    <p className="mt-1 text-xs text-neutral-400">
                      {task.projectName}
                    </p>
                  )}
                  {task.dueDate && (
                    <p className="mt-1 text-xs text-neutral-400">
                      {new Date(task.dueDate).toLocaleDateString("es-AR")}
                    </p>
                  )}
                  <select
                    value={task.status}
                    onChange={(event) =>
                      handleStatusChange(
                        task.id,
                        event.target.value as TaskStatus,
                      )
                    }
                    className="mt-2 w-full rounded border border-neutral-200 bg-white text-xs"
                  >
                    {COLUMNS.map((c) => (
                      <option key={c.status} value={c.status}>
                        {c.label}
                      </option>
                    ))}
                  </select>

                  {task.projectId && (
                    <div className="mt-2">
                      {task.prUrl ? (
                        <a
                          href={task.prUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          Ver PR →
                        </a>
                      ) : (
                        <button
                          onClick={() => handleCreatePr(task.id)}
                          disabled={prLoadingId === task.id}
                          className="text-xs text-neutral-500 hover:text-neutral-900 disabled:opacity-50"
                        >
                          {prLoadingId === task.id ? "Creando PR…" : "Crear PR"}
                        </button>
                      )}
                      {prErrors[task.id] && (
                        <p className="mt-1 text-xs text-red-500">
                          {prErrors[task.id]}
                        </p>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
