"use server";

import { and, desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import type { YooptaContentValue } from "@/components/block-editor";

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

  redirect(`/data-center/paginas/${created.id}`);
}

export async function updatePage(
  id: string,
  data: { title?: string; content?: YooptaContentValue; icon?: string | null },
) {
  const user = await requireUser();
  await db
    .update(pages)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(pages.id, id), eq(pages.userId, user.id)));
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

  await db
    .update(pages)
    .set({ parentId: newParentId, updatedAt: new Date() })
    .where(and(eq(pages.id, id), eq(pages.userId, user.id)));
}

export async function deletePage(id: string) {
  const user = await requireUser();
  const [deleted] = await db
    .delete(pages)
    .where(and(eq(pages.id, id), eq(pages.userId, user.id)))
    .returning({ parentId: pages.parentId });

  redirect(
    deleted?.parentId
      ? `/data-center/paginas/${deleted.parentId}`
      : "/data-center",
  );
}

export async function createPageWithContent(
  title: string,
  content: YooptaContentValue,
) {
  const user = await requireUser();
  const [created] = await db
    .insert(pages)
    .values({ userId: user.id, title: title || "Sin título", content })
    .returning({ id: pages.id });
  return created.id;
}
