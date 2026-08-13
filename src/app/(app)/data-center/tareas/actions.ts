"use server";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, tasks, taskStatus } from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type TaskStatus = (typeof taskStatus.enumValues)[number];

export async function listProjects() {
  const user = await requireUser();
  return db
    .select({ id: projects.id, name: projects.name })
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
      status: tasks.status,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      projectName: projects.name,
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

  await db.insert(projects).values({ userId: user.id, name });
}

export async function createTask(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) return;

  const projectId = String(formData.get("projectId") ?? "") || null;
  const dueDateRaw = String(formData.get("dueDate") ?? "");

  await db.insert(tasks).values({
    userId: user.id,
    title,
    projectId,
    dueDate: dueDateRaw ? new Date(dueDateRaw) : null,
  });
}

export async function updateTaskStatus(id: string, status: TaskStatus) {
  const user = await requireUser();
  await db
    .update(tasks)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
}

export async function deleteTask(id: string) {
  const user = await requireUser();
  await db
    .delete(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));
}
