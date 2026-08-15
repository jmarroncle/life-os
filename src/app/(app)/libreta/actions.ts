"use server";

import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { parseTags } from "@/lib/tags";
import { logUndo, omitId } from "@/lib/undo";
import type { YooptaContentValue } from "@/components/block-editor";

export async function listNotes(query?: string) {
  const user = await requireUser();
  const conditions = [eq(notes.userId, user.id)];

  if (query) {
    conditions.push(
      or(
        ilike(notes.title, `%${query}%`),
        sql`exists (select 1 from unnest(${notes.tags}) tag where tag ilike ${`%${query}%`})`,
      )!,
    );
  }

  return db
    .select({
      id: notes.id,
      title: notes.title,
      tags: notes.tags,
      updatedAt: notes.updatedAt,
    })
    .from(notes)
    .where(and(...conditions))
    .orderBy(desc(notes.updatedAt));
}

export async function getNote(id: string) {
  const user = await requireUser();
  const [note] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
    .limit(1);
  return note ?? null;
}

export async function createNote(formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim() || "Sin título";
  const tags = parseTags(String(formData.get("tags") ?? ""));

  const [created] = await db
    .insert(notes)
    .values({ userId: user.id, title, tags, content: {} })
    .returning({ id: notes.id });

  await logUndo(user.id, `Crear nota "${title}"`, [
    { op: "delete", table: "notes", id: created.id },
  ]);

  redirect(`/libreta/${created.id}`);
}

export async function updateNote(
  id: string,
  data: { title?: string; content?: YooptaContentValue; tags?: string[] },
) {
  const user = await requireUser();
  const [before] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .update(notes)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)));

  await logUndo(user.id, `Editar nota "${before.title}"`, [
    { op: "update", table: "notes", id, values: omitId(before) },
  ]);
}

export async function deleteNote(id: string) {
  const user = await requireUser();
  const [before] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .delete(notes)
    .where(and(eq(notes.id, id), eq(notes.userId, user.id)));

  await logUndo(user.id, `Eliminar nota "${before.title}"`, [
    { op: "insert", table: "notes", values: before },
  ]);

  redirect("/libreta");
}
