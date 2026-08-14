"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  databaseColumns,
  databaseRows,
  databases,
  type databaseColumnType,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";

export type DatabaseColumnType = (typeof databaseColumnType.enumValues)[number];

export async function listDatabases() {
  const user = await requireUser();
  return db
    .select()
    .from(databases)
    .where(eq(databases.userId, user.id))
    .orderBy(asc(databases.name));
}

export async function createDatabase(formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const icon = String(formData.get("icon") ?? "").trim() || null;

  const [created] = await db
    .insert(databases)
    .values({ userId: user.id, name, icon })
    .returning({ id: databases.id });

  redirect(`/bases/${created.id}`);
}

export async function deleteDatabase(id: string) {
  const user = await requireUser();
  await db
    .delete(databases)
    .where(and(eq(databases.id, id), eq(databases.userId, user.id)));
  redirect("/bases");
}

export async function getDatabaseView(id: string) {
  const user = await requireUser();

  const [database] = await db
    .select()
    .from(databases)
    .where(eq(databases.id, id))
    .limit(1);
  if (!database || database.userId !== user.id) return null;

  const columns = await db
    .select()
    .from(databaseColumns)
    .where(eq(databaseColumns.databaseId, id))
    .orderBy(asc(databaseColumns.position), asc(databaseColumns.createdAt));

  const rows = await db
    .select()
    .from(databaseRows)
    .where(eq(databaseRows.databaseId, id))
    .orderBy(asc(databaseRows.position), asc(databaseRows.createdAt));

  return { database, columns, rows };
}

export async function addColumn(databaseId: string, formData: FormData) {
  const user = await requireUser();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  const type = String(formData.get("type") ?? "text") as DatabaseColumnType;
  const rawOptions = String(formData.get("options") ?? "").trim();
  const options =
    (type === "select" || type === "multi_select") && rawOptions
      ? rawOptions
          .split(",")
          .map((option) => option.trim())
          .filter(Boolean)
      : null;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(databaseColumns)
    .where(eq(databaseColumns.databaseId, databaseId));

  await db.insert(databaseColumns).values({
    databaseId,
    userId: user.id,
    name,
    type,
    options,
    position: count,
  });
}

export async function deleteColumn(columnId: string) {
  const user = await requireUser();
  await db
    .delete(databaseColumns)
    .where(and(eq(databaseColumns.id, columnId), eq(databaseColumns.userId, user.id)));
}

function parseRowValues(
  formData: FormData,
  columns: { id: string; type: DatabaseColumnType }[],
): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  for (const column of columns) {
    const raw = formData.get(`col_${column.id}`);
    if (column.type === "checkbox") {
      values[column.id] = raw === "on";
    } else if (column.type === "multi_select") {
      values[column.id] = formData
        .getAll(`col_${column.id}`)
        .map((v) => String(v))
        .filter(Boolean);
    } else if (column.type === "number") {
      const num = Number(raw);
      values[column.id] = raw && !Number.isNaN(num) ? num : null;
    } else {
      values[column.id] = raw ? String(raw) : "";
    }
  }
  return values;
}

export async function addRow(
  databaseId: string,
  columns: { id: string; type: DatabaseColumnType }[],
  formData: FormData,
) {
  const user = await requireUser();
  const values = parseRowValues(formData, columns);

  await db.insert(databaseRows).values({
    databaseId,
    userId: user.id,
    values,
  });
}

export async function updateRow(
  rowId: string,
  columns: { id: string; type: DatabaseColumnType }[],
  formData: FormData,
) {
  const user = await requireUser();
  const values = parseRowValues(formData, columns);

  await db
    .update(databaseRows)
    .set({ values, updatedAt: new Date() })
    .where(and(eq(databaseRows.id, rowId), eq(databaseRows.userId, user.id)));
}

export async function deleteRow(rowId: string) {
  const user = await requireUser();
  await db
    .delete(databaseRows)
    .where(and(eq(databaseRows.id, rowId), eq(databaseRows.userId, user.id)));
}
