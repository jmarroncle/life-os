"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { databaseColumns, databaseRows, databases, pages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { rowLabel } from "@/lib/database-row-label";

// Junta páginas y filas de bases de datos con reviewStatus="draft" (ver
// Decisiones en CLAUDE.md) en una sola lista para /data-center/revisar y el
// widget de Inicio. No usa InverseOp/logUndo: "marcar como revisado" no
// borra ni pierde nada, no necesita deshacer.

export type DraftItem = {
  type: "page" | "row";
  id: string;
  title: string;
  icon: string | null;
  href: string;
  updatedAt: Date;
  contextLabel: string;
};

export async function listDraftItems(): Promise<DraftItem[]> {
  const user = await requireUser();

  const draftPages = await db
    .select({
      id: pages.id,
      title: pages.title,
      icon: pages.icon,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(and(eq(pages.userId, user.id), eq(pages.reviewStatus, "draft")));

  const draftRows = await db
    .select({
      id: databaseRows.id,
      databaseId: databaseRows.databaseId,
      values: databaseRows.values,
      updatedAt: databaseRows.updatedAt,
    })
    .from(databaseRows)
    .where(and(eq(databaseRows.userId, user.id), eq(databaseRows.reviewStatus, "draft")));

  const databaseIds = [...new Set(draftRows.map((row) => row.databaseId))];
  const [relatedDatabases, relatedColumns] = databaseIds.length
    ? await Promise.all([
        db.select().from(databases).where(inArray(databases.id, databaseIds)),
        db
          .select()
          .from(databaseColumns)
          .where(inArray(databaseColumns.databaseId, databaseIds)),
      ])
    : [[], []];

  const databaseById = new Map(relatedDatabases.map((item) => [item.id, item]));
  const columnsByDatabase = new Map<string, typeof relatedColumns>();
  for (const column of relatedColumns) {
    if (!columnsByDatabase.has(column.databaseId)) columnsByDatabase.set(column.databaseId, []);
    columnsByDatabase.get(column.databaseId)!.push(column);
  }

  const pageItems: DraftItem[] = draftPages.map((page) => ({
    type: "page",
    id: page.id,
    title: page.title,
    icon: page.icon,
    href: `/data-center/paginas/${page.id}`,
    updatedAt: page.updatedAt,
    contextLabel: "Página",
  }));

  const rowItems: DraftItem[] = draftRows.map((row) => {
    const database = databaseById.get(row.databaseId);
    const columns = columnsByDatabase.get(row.databaseId) ?? [];
    return {
      type: "row",
      id: row.id,
      title: rowLabel(row.values as Record<string, unknown>, columns),
      icon: database?.icon ?? null,
      href: `/bases/${row.databaseId}/filas/${row.id}`,
      updatedAt: row.updatedAt,
      contextLabel: `Fila en ${database?.name ?? "base de datos"}`,
    };
  });

  return [...pageItems, ...rowItems].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
  );
}

export async function markPageReviewed(id: string) {
  const user = await requireUser();
  await db
    .update(pages)
    .set({ reviewStatus: "reviewed" })
    .where(and(eq(pages.id, id), eq(pages.userId, user.id)));
}

export async function markRowReviewed(id: string) {
  const user = await requireUser();
  await db
    .update(databaseRows)
    .set({ reviewStatus: "reviewed" })
    .where(and(eq(databaseRows.id, id), eq(databaseRows.userId, user.id)));
}
