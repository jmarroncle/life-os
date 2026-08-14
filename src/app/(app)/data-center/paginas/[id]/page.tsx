import Link from "next/link";
import { notFound } from "next/navigation";
import { createPage, deletePage, getPage, listPages, updatePage } from "../../actions";
import { EntityEditor } from "@/components/entity-editor";
import { PageIconPicker } from "@/components/page-icon-picker";
import {
  emptyBlockValue,
  type YooptaContentValue,
} from "@/components/block-editor";

export default async function PaginaPage({
  params,
}: PageProps<"/data-center/paginas/[id]">) {
  const { id } = await params;
  const [page, allPages] = await Promise.all([getPage(id), listPages()]);

  if (!page) {
    notFound();
  }

  const byId = new Map(allPages.map((item) => [item.id, item]));
  const ancestors: { id: string; title: string; icon: string | null }[] = [];
  let current = byId.get(id)?.parentId ?? null;
  while (current) {
    const ancestor = byId.get(current);
    if (!ancestor) break;
    ancestors.unshift({ id: ancestor.id, title: ancestor.title, icon: ancestor.icon });
    current = ancestor.parentId;
  }

  const children = allPages.filter((item) => item.parentId === id);

  async function saveTitle(title: string) {
    "use server";
    await updatePage(id, { title });
  }

  async function saveContent(content: YooptaContentValue) {
    "use server";
    await updatePage(id, { content });
  }

  async function saveIcon(icon: string | null) {
    "use server";
    await updatePage(id, { icon });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <nav className="flex flex-wrap items-center gap-1 text-xs text-neutral-400">
          <Link href="/data-center" className="hover:text-neutral-900">
            Páginas
          </Link>
          {ancestors.map((ancestor) => (
            <span key={ancestor.id} className="flex items-center gap-1">
              <span>/</span>
              <Link
                href={`/data-center/paginas/${ancestor.id}`}
                className="hover:text-neutral-900"
              >
                {ancestor.icon ?? "📄"} {ancestor.title}
              </Link>
            </span>
          ))}
          <span>/</span>
          <span className="text-neutral-600">
            {page.icon ?? "📄"} {page.title}
          </span>
        </nav>

        <form action={deletePage.bind(null, id)}>
          <button
            type="submit"
            className="shrink-0 text-xs text-neutral-400 hover:text-red-600"
          >
            Eliminar página
          </button>
        </form>
      </div>

      <PageIconPicker initialIcon={page.icon} onIconChange={saveIcon} />

      <EntityEditor
        initialTitle={page.title}
        initialContent={(page.content as YooptaContentValue) ?? emptyBlockValue()}
        onSaveTitle={saveTitle}
        onSaveContent={saveContent}
      />

      <div className="space-y-2 border-t border-neutral-100 pt-4">
        <p className="text-xs font-medium text-neutral-500">Subpáginas</p>
        {children.length > 0 && (
          <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
            {children.map((child) => (
              <li key={child.id}>
                <Link
                  href={`/data-center/paginas/${child.id}`}
                  className="flex items-center justify-between px-3 py-2 text-sm hover:bg-neutral-50"
                >
                  <span>
                    {child.icon ?? "📄"} {child.title}
                  </span>
                  <span className="text-xs text-neutral-400">
                    {new Date(child.updatedAt).toLocaleDateString("es-AR")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        <form action={createPage.bind(null, id)} className="flex gap-2">
          <input
            type="text"
            name="title"
            placeholder="Título de la subpágina…"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
          >
            Agregar subpágina
          </button>
        </form>
      </div>
    </div>
  );
}
