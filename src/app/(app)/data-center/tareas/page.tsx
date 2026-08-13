import { TaskBoard } from "@/components/task-board";
import { createProject, createTask, listProjects, listTasks } from "./actions";

export default async function TareasPage() {
  const [tasksList, projectsList] = await Promise.all([
    listTasks(),
    listProjects(),
  ]);

  return (
    <div className="space-y-6">
      <form action={createTask} className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="title"
          placeholder="Nueva tarea…"
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <select
          name="projectId"
          className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
        >
          <option value="">Sin proyecto</option>
          {projectsList.map((project) => (
            <option key={project.id} value={project.id}>
              {project.name}
            </option>
          ))}
        </select>
        <input
          type="date"
          name="dueDate"
          className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Agregar
        </button>
      </form>

      <details className="text-sm text-neutral-500">
        <summary className="cursor-pointer select-none">
          + Nuevo proyecto
        </summary>
        <form action={createProject} className="mt-2 flex gap-2">
          <input
            type="text"
            name="name"
            placeholder="Nombre del proyecto"
            required
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <button
            type="submit"
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium"
          >
            Crear
          </button>
        </form>
      </details>

      <TaskBoard initialTasks={tasksList} />
    </div>
  );
}
