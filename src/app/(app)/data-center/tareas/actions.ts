"use server";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, tasks, taskStatus } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logUndo, omitId } from "@/lib/undo";

export type TaskStatus = (typeof taskStatus.enumValues)[number];

export async function listProjects() {
  const user = await requireUser();
  return db
    .select({ id: projects.id, name: projects.name, githubRepo: projects.githubRepo })
    .from(projects)
    .where(eq(projects.userId, user.id))
    .orderBy(asc(projects.name));
}

export async function listTasks() {
  const user = await requireUser();
  return db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      projectName: projects.name,
      prUrl: tasks.prUrl,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .where(eq(tasks.userId, user.id))
    .orderBy(asc(tasks.position), asc(tasks.createdAt));
}

export async function createProject(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const githubRepo = String(formData.get("githubRepo") ?? "").trim() || null;

  const [created] = await db
    .insert(projects)
    .values({ userId: user.id, name, githubRepo })
    .returning({ id: projects.id });

  await logUndo(user.id, `Crear proyecto "${name}"`, [
    { op: "delete", table: "projects", id: created.id },
  ]);
}

export async function setProjectRepo(formData: FormData) {
  const user = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  const githubRepo = String(formData.get("githubRepo") ?? "").trim() || null;
  if (!projectId) return;

  const [before] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .update(projects)
    .set({ githubRepo })
    .where(and(eq(projects.id, projectId), eq(projects.userId, user.id)));

  await logUndo(user.id, `Editar proyecto "${before.name}"`, [
    { op: "update", table: "projects", id: projectId, values: omitId(before) },
  ]);
}

export async function createTask(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const projectId = String(formData.get("projectId") ?? "") || null;
  const dueDateRaw = String(formData.get("dueDate") ?? "");

  const [created] = await db
    .insert(tasks)
    .values({
      userId: user.id,
      title,
      projectId,
      dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
    })
    .returning({ id: tasks.id });

  await logUndo(user.id, `Crear tarea "${title}"`, [
    { op: "delete", table: "tasks", id: created.id },
  ]);
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const user = await requireUser();
  const [before] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .update(tasks)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  await logUndo(user.id, `Cambiar estado de tarea "${before.title}"`, [
    { op: "update", table: "tasks", id, values: omitId(before) },
  ]);
}

export async function deleteTask(id: string) {
  const user = await requireUser();
  const [before] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  await logUndo(user.id, `Eliminar tarea "${before.title}"`, [
    { op: "insert", table: "tasks", values: before },
  ]);
}
