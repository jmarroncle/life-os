"use server";

import { and, asc, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { databases, pageDatabaseLinks, pageLayout, pages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { logUndo, omitId, type InverseOp } from "@/lib/undo";
import type { YooptaContentValue } from "@/components/block-editor";

// Junta una página y todos sus descendientes (BFS, padre antes que hijos)
// para poder deshacer un delete: el borrado de pages hace cascade sobre
// parentId, así que sin esto un "deshacer" solo recuperaría la página raíz
// del árbol borrado, no sus subpáginas.
async function collectPageSubtree(rootId: string, userId: string) {
  const all = await db.select().from(pages).where(eq(pages.userId, userId));
  const byParent = new Map<string, typeof all>();
  for (const page of all) {
    const key = page.parentId ?? "";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key)!.push(page);
  }

  const root = all.find((page) => page.id === rootId);
  if (!root) return [];

  const result = [root];
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of byParent.get(current) ?? []) {
      result.push(child);
      queue.push(child.id);
    }
  }
  return result;
}

export type PageLayout = (typeof pageLayout.enumValues)[number];

export async function listPages() {
  const user = await requireUser();
  return db
    .select({
      id: pages.id,
      parentId: pages.parentId,
      title: pages.title,
      icon: pages.icon,
      updatedAt: pages.updatedAt,
    })
    .from(pages)
    .where(eq(pages.userId, user.id))
    .orderBy(desc(pages.updatedAt));
}

export async function getPage(id: string) {
  const user = await requireUser();
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, id), eq(pages.userId, user.id)))
    .limit(1);
  return page ?? null;
}

export async function createPage(parentId: string | null, formData: FormData) {
  const user = await requireUser();
  const title = String(formData.get("title") ?? "").trim() || "Sin título";

  const [created] = await db
    .insert(pages)
    .values({ userId: user.id, parentId, title, content: {} })
    .returning({ id: pages.id });

  await logUndo(user.id, `Crear página "${title}"`, [
    { op: "delete", table: "pages", id: created.id },
  ]);

  redirect(`/data-center/paginas/${created.id}`);
}

// Variante de createPage para "convertir bloque en página": no redirige (el
// bloque de origen se reemplaza por un link in-place, sin salir de la
// página actual) y devuelve el id en vez de una FormData.
export async function createPageFromBlock(parentId: string, title: string) {
  const user = await requireUser();
  const cleanTitle = title.trim().slice(0, 200) || "Sin título";

  const [created] = await db
    .insert(pages)
    .values({ userId: user.id, parentId, title: cleanTitle, content: {} })
    .returning({ id: pages.id });

  await logUndo(user.id, `Crear página "${cleanTitle}"`, [
    { op: "delete", table: "pages", id: created.id },
  ]);

  return created.id;
}

export async function updatePage(
  id: string,
  data: {
    title?: string;
    content?: YooptaContentValue;
    icon?: string | null;
    layout?: PageLayout;
  },
) {
  const user = await requireUser();
  const [before] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, id), eq(pages.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .update(pages)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(pages.id, id), eq(pages.userId, user.id)));

  await logUndo(user.id, `Editar página "${before.title}"`, [
    { op: "update", table: "pages", id, values: omitId(before) },
  ]);
}

export async function movePage(id: string, newParentId: string | null) {
  const user = await requireUser();

  if (newParentId === id) {
    throw new Error("Una página no puede ser su propio padre.");
  }

  if (newParentId) {
    const userPages = await db
      .select({ id: pages.id, parentId: pages.parentId })
      .from(pages)
      .where(eq(pages.userId, user.id));
    const parentById = new Map(userPages.map((p) => [p.id, p.parentId]));

    let ancestor: string | null = newParentId;
    while (ancestor) {
      if (ancestor === id) {
        throw new Error(
          "No se puede mover una página dentro de una de sus propias subpáginas.",
        );
      }
      ancestor = parentById.get(ancestor) ?? null;
    }
  }

  const [before] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.id, id), eq(pages.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .update(pages)
    .set({ parentId: newParentId, updatedAt: new Date() })
    .where(and(eq(pages.id, id), eq(pages.userId, user.id)));

  await logUndo(user.id, `Mover página "${before.title}"`, [
    { op: "update", table: "pages", id, values: omitId(before) },
  ]);
}

export async function deletePage(id: string) {
  const user = await requireUser();
  const subtree = await collectPageSubtree(id, user.id);
  if (subtree.length === 0) return;

  const [deleted] = await db
    .delete(pages)
    .where(and(eq(pages.id, id), eq(pages.userId, user.id)))
    .returning({ parentId: pages.parentId });

  if (deleted) {
    const inverseOps: InverseOp[] = subtree.map((page) => ({
      op: "insert",
      table: "pages",
      values: page,
    }));
    await logUndo(user.id, `Eliminar página "${subtree[0].title}"`, inverseOps);
  }

  redirect(
    deleted?.parentId
      ? `/data-center/paginas/${deleted.parentId}`
      : "/data-center",
  );
}

// Bases de datos "embebidas" en una página (ver Decisiones en CLAUDE.md).
// Distinto de listPages/getPage: acá se lee/escribe la tabla puente
// pageDatabaseLinks, no pages.

export async function listLinkedDatabases(pageId: string) {
  const user = await requireUser();
  return db
    .select({
      linkId: pageDatabaseLinks.id,
      databaseId: databases.id,
      name: databases.name,
      icon: databases.icon,
    })
    .from(pageDatabaseLinks)
    .innerJoin(databases, eq(pageDatabaseLinks.databaseId, databases.id))
    .where(
      and(eq(pageDatabaseLinks.pageId, pageId), eq(pageDatabaseLinks.userId, user.id)),
    )
    .orderBy(asc(databases.name));
}

export async function linkDatabaseToPage(pageId: string, formData: FormData) {
  const user = await requireUser();
  const databaseId = String(formData.get("databaseId") ?? "").trim();
  if (!databaseId) return;

  const [created] = await db
    .insert(pageDatabaseLinks)
    .values({ userId: user.id, pageId, databaseId })
    .onConflictDoNothing()
    .returning({ id: pageDatabaseLinks.id });

  if (created) {
    await logUndo(user.id, "Vincular base de datos a la página", [
      { op: "delete", table: "pageDatabaseLinks", id: created.id },
    ]);
  }
}

export async function unlinkDatabaseFromPage(linkId: string) {
  const user = await requireUser();
  const [before] = await db
    .select()
    .from(pageDatabaseLinks)
    .where(and(eq(pageDatabaseLinks.id, linkId), eq(pageDatabaseLinks.userId, user.id)))
    .limit(1);
  if (!before) return;

  await db
    .delete(pageDatabaseLinks)
    .where(and(eq(pageDatabaseLinks.id, linkId), eq(pageDatabaseLinks.userId, user.id)));

  await logUndo(user.id, "Desvincular base de datos de la página", [
    { op: "insert", table: "pageDatabaseLinks", values: before },
  ]);
}

export async function createPageWithContent(
  title: string,
  content: YooptaContentValue,
) {
  const user = await requireUser();
  const cleanTitle = title || "Sin título";
  const [created] = await db
    .insert(pages)
    .values({ userId: user.id, title: cleanTitle, content })
    .returning({ id: pages.id });

  await logUndo(user.id, `Crear página "${cleanTitle}"`, [
    { op: "delete", table: "pages", id: created.id },
  ]);

  return created.id;
}
