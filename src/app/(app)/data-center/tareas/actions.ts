"use server";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, tasks, taskPriority, taskStatus, teamMembers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logUndo, omitId } from "@/lib/undo";
import { sendEmail } from "@/lib/email";
import { sendPushNotification, type PushSubscriptionJson } from "@/lib/push";

export type TaskStatus = (typeof taskStatus.enumValues)[number];
export type TaskPriority = (typeof taskPriority.enumValues)[number];

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

export async function getTask(id: string) {
  const user = await requireUser();
  const [row] = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assignees: tasks.assignees,
      dueDate: tasks.dueDate,
      projectId: tasks.projectId,
      prUrl: tasks.prUrl,
      derivedToMemberId: tasks.derivedToMemberId,
      derivedAt: tasks.derivedAt,
    })
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .limit(1);
  return row ?? null;
}

export async function updateTask(
  id: string,
  patch: {
    title?: string;
    description?: string | null;
    status?: TaskStatus;
    priority?: TaskPriority | null;
    assignees?: string | null;
    dueDate?: Date | null;
    projectId?: string | null;
  },
) {
  const user = await requireUser();
  const [before] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .update(tasks)
    .set({ ...patch, updatedAt: new Date() })
    .where(and(eq(tasks.id, id), eq(tasks.userId, user.id)));

  await logUndo(user.id, `Editar tarea "${before.title}"`, [
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

const PRIORITY_LABEL: Record<TaskPriority, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
};

// El compañero no tiene cuenta en Life OS (ver data-center/equipo) — no
// puede entrar a ver la tarea, así que el email/push le mandan todo el
// contenido posta en vez de un link a la app.
export async function deriveTask(
  taskId: string,
  memberId: string,
): Promise<{ emailOk: boolean; emailError?: string; pushOk: boolean; pushSkipped: boolean }> {
  const user = await requireUser();

  const [task] = await db
    .select()
    .from(tasks)
    .where(and(eq(tasks.id, taskId), eq(tasks.userId, user.id)))
    .limit(1);
  if (!task) throw new Error("No se encontró la tarea.");

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.userId, user.id)))
    .limit(1);
  if (!member) throw new Error("No se encontró el compañero.");

  const detailLines = [
    task.priority ? `Prioridad: ${PRIORITY_LABEL[task.priority]}` : null,
    task.dueDate ? `Vence: ${task.dueDate.toLocaleDateString("es-AR")}` : null,
  ].filter(Boolean);

  const html = `
    <h2>${task.title}</h2>
    ${detailLines.length > 0 ? `<p>${detailLines.join(" · ")}</p>` : ""}
    ${task.description ? `<p>${task.description.replace(/\n/g, "<br>")}</p>` : "<p><em>Sin notas.</em></p>"}
    <p style="color:#888;font-size:12px;">Tarea derivada desde Life OS.</p>
  `;

  const emailResult = await sendEmail({
    to: member.email,
    subject: `Tarea derivada: ${task.title}`,
    html,
  });

  let pushOk = false;
  const pushSkipped = !member.pushSubscription;
  if (member.pushSubscription) {
    const pushResult = await sendPushNotification(
      member.pushSubscription as PushSubscriptionJson,
      {
        title: `Nueva tarea: ${task.title}`,
        body: task.description?.slice(0, 140) ?? "",
        url: process.env.NEXT_PUBLIC_SITE_URL ?? "/",
      },
    );
    pushOk = pushResult.ok;
    if (pushResult.expired) {
      // La suscripción venció (el compañero desinstaló, borró datos del
      // navegador, etc.) — se limpia para que la UI vuelva a mostrarlo
      // como "pendiente de activar" en vez de fallar en silencio cada vez.
      await db
        .update(teamMembers)
        .set({ pushSubscription: null, activatedAt: null })
        .where(eq(teamMembers.id, member.id));
    }
  }

  await db
    .update(tasks)
    .set({ derivedToMemberId: member.id, derivedAt: new Date() })
    .where(eq(tasks.id, taskId));

  return {
    emailOk: emailResult.ok,
    emailError: emailResult.error,
    pushOk,
    pushSkipped,
  };
}
