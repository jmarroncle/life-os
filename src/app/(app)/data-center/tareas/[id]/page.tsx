import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getTask, listProjects, updateTask, deleteTask } from "../actions";
import { TaskDetail } from "@/components/task-detail";

export default async function TareaPage({
  params,
}: PageProps<"/data-center/tareas/[id]">) {
  const { id } = await params;
  const [task, projectsList] = await Promise.all([getTask(id), listProjects()]);

  if (!task) {
    notFound();
  }

  async function boundUpdateTask(patch: Parameters<typeof updateTask>[1]) {
    "use server";
    await updateTask(id, patch);
  }

  async function boundDeleteTask() {
    "use server";
    await deleteTask(id);
    redirect("/data-center/tareas");
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/data-center/tareas"
          className="text-xs text-neutral-400 hover:text-neutral-900"
        >
          ← Tareas
        </Link>
        <form action={boundDeleteTask}>
          <button
            type="submit"
            className="shrink-0 text-xs text-neutral-400 hover:text-red-600"
          >
            Eliminar tarea
          </button>
        </form>
      </div>

      <TaskDetail task={task} projects={projectsList} onUpdate={boundUpdateTask} />
    </div>
  );
}
