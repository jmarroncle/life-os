"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logUndo } from "@/lib/undo";

export async function listTeamMembers() {
  const user = await requireUser();
  return db
    .select({
      id: teamMembers.id,
      name: teamMembers.name,
      email: teamMembers.email,
      activationToken: teamMembers.activationToken,
      activatedAt: teamMembers.activatedAt,
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .orderBy(teamMembers.createdAt);
}

export async function createTeamMember(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  if (!name || !email) return;

  const [created] = await db
    .insert(teamMembers)
    .values({ userId: user.id, name, email, activationToken: randomUUID() })
    .returning({ id: teamMembers.id });

  await logUndo(user.id, `Agregar compañero "${name}"`, [
    { op: "delete", table: "teamMembers", id: created.id },
  ]);
}

export async function deleteTeamMember(id: string) {
  const user = await requireUser();
  const [before] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .delete(teamMembers)
    .where(and(eq(teamMembers.id, id), eq(teamMembers.userId, user.id)));

  await logUndo(user.id, `Eliminar compañero "${before.name}"`, [
    { op: "insert", table: "teamMembers", values: before },
  ]);
}
