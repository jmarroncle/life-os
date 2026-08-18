"use server";

import { and, asc, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import {
  databaseColumns,
  databaseRows,
  databases,
  databaseViews,
  type databaseColumnType,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logUndo, omitId, type InverseOp } from "@/lib/undo";
import type { YooptaContentValue } from "@/components/block-editor";

export type DatabaseColumnType = (typeof databaseColumnType.enumValues)[number];

export type DatabaseFilter = { columnId: string; op: string; value: string };

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

  await logUndo(user.id, `Crear base "${name}"`, [
    { op: "delete", table: "databases", id: created.id },
  ]);

  redirect(`/bases/${created.id}`);
}

export async function deleteDatabase(id: string) {
  const user = await requireUser();

  const [database] = await db
    .select()
    .from(databases)
    .where(and(eq(databases.id, id), eq(databases.userId, user.id)))
    .limit(1);
  if (!database) redirect("/bases");

  const [columns, rows] = await Promise.all([
    db.select().from(databaseColumns).where(eq(databaseColumns.databaseId, id)),
    db.select().from(databaseRows).where(eq(databaseRows.databaseId, id)),
  ]);

  await db
    .delete(databases)
    .where(and(eq(databases.id, id), eq(databases.userId, user.id)));

  const inverseOps: InverseOp[] = [
    { op: "insert", table: "databases", values: database },
    ...columns.map((column): InverseOp => ({ op: "insert", table: "databaseColumns", values: column })),
    ...rows.map((row): InverseOp => ({ op: "insert", table: "databaseRows", values: row })),
  ];
  await logUndo(user.id, `Eliminar base "${database.name}"`, inverseOps);

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

  const views = await db
    .select()
    .from(databaseViews)
    .where(eq(databaseViews.databaseId, id))
    .orderBy(asc(databaseViews.position), asc(databaseViews.createdAt));

  return { database, columns, rows, views };
}

export async function createView(
  databaseId: string,
  input: {
    name: string;
    filters: DatabaseFilter[];
    sortColumnId: string | null;
    sortDirection: string | null;
  },
) {
  const user = await requireUser();
  const name = input.name.trim();
  if (!name) return;

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(databaseViews)
    .where(eq(databaseViews.databaseId, databaseId));

  const [created] = await db
    .insert(databaseViews)
    .values({
      databaseId,
      userId: user.id,
      name,
      filters: input.filters,
      sortColumnId: input.sortColumnId,
      sortDirection: input.sortDirection,
      position: count,
    })
    .returning({ id: databaseViews.id });

  await logUndo(user.id, `Crear vista "${name}"`, [
    { op: "delete", table: "databaseViews", id: created.id },
  ]);
}

export async function deleteView(viewId: string) {
  const user = await requireUser();
  const [before] = await db
    .select()
    .from(databaseViews)
    .where(and(eq(databaseViews.id, viewId), eq(databaseViews.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .delete(databaseViews)
    .where(and(eq(databaseViews.id, viewId), eq(databaseViews.userId, user.id)));

  await logUndo(user.id, `Eliminar vista "${before.name}"`, [
    { op: "insert", table: "databaseViews", values: before },
  ]);
}

// Para /bases/[id]/filas/[rowId]: en Notion cada fila de una base de datos
// es también una página completa. Trae la fila + la base + las columnas
// (para el breadcrumb y el label de la fila, ver rowLabel).
export async function getRowView(rowId: string) {
  const user = await requireUser();

  const [row] = await db
    .select()
    .from(databaseRows)
    .where(and(eq(databaseRows.id, rowId), eq(databaseRows.userId, user.id)))
    .limit(1);
  if (!row) return null;

  const [database] = await db
    .select()
    .from(databases)
    .where(eq(databases.id, row.databaseId))
    .limit(1);
  if (!database) return null;

  const columns = await db
    .select()
    .from(databaseColumns)
    .where(eq(databaseColumns.databaseId, row.databaseId))
    .orderBy(asc(databaseColumns.position), asc(databaseColumns.createdAt));

  return { row, database, columns };
}

export async function updateRowContent(rowId: string, content: YooptaContentValue) {
  const user = await requireUser();
  const [before] = await db
    .select()
    .from(databaseRows)
    .where(and(eq(databaseRows.id, rowId), eq(databaseRows.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .update(databaseRows)
    .set({ content, updatedAt: new Date() })
    .where(and(eq(databaseRows.id, rowId), eq(databaseRows.userId, user.id)));

  await logUndo(user.id, "Editar contenido de fila", [
    { op: "update", table: "databaseRows", id: rowId, values: omitId(before) },
  ]);
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

  const [created] = await db
    .insert(databaseColumns)
    .values({
      databaseId,
      userId: user.id,
      name,
      type,
      options,
      position: count,
    })
    .returning({ id: databaseColumns.id });

  await logUndo(user.id, `Crear columna "${name}"`, [
    { op: "delete", table: "databaseColumns", id: created.id },
  ]);
}

export async function deleteColumn(columnId: string) {
  const user = await requireUser();
  const [before] = await db
    .select()
    .from(databaseColumns)
    .where(and(eq(databaseColumns.id, columnId), eq(databaseColumns.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .delete(databaseColumns)
    .where(and(eq(databaseColumns.id, columnId), eq(databaseColumns.userId, user.id)));

  await logUndo(user.id, `Eliminar columna "${before.name}"`, [
    { op: "insert", table: "databaseColumns", values: before },
  ]);
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

  const [created] = await db
    .insert(databaseRows)
    .values({
      databaseId,
      userId: user.id,
      values,
    })
    .returning({ id: databaseRows.id });

  await logUndo(user.id, "Crear fila", [
    { op: "delete", table: "databaseRows", id: created.id },
  ]);
}

export async function updateRow(
  rowId: string,
  columns: { id: string; type: DatabaseColumnType }[],
  formData: FormData,
) {
  const user = await requireUser();
  const values = parseRowValues(formData, columns);

  const [before] = await db
    .select()
    .from(databaseRows)
    .where(and(eq(databaseRows.id, rowId), eq(databaseRows.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .update(databaseRows)
    .set({ values, updatedAt: new Date() })
    .where(and(eq(databaseRows.id, rowId), eq(databaseRows.userId, user.id)));

  await logUndo(user.id, "Editar fila", [
    { op: "update", table: "databaseRows", id: rowId, values: omitId(before) },
  ]);
}

export async function deleteRow(rowId: string) {
  const user = await requireUser();
  const [before] = await db
    .select()
    .from(databaseRows)
    .where(and(eq(databaseRows.id, rowId), eq(databaseRows.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .delete(databaseRows)
    .where(and(eq(databaseRows.id, rowId), eq(databaseRows.userId, user.id)));

  await logUndo(user.id, "Eliminar fila", [
    { op: "insert", table: "databaseRows", values: before },
  ]);
}
