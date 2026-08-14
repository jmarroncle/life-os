import { createPage, listPages, movePage } from "./actions";
import { PageTree } from "@/components/page-tree";

export default async function DataCenterPaginasPage() {
  const items = await listPages();

  return (
    <div className="space-y-6">
      <form action={createPage.bind(null, null)} className="flex gap-2">
        <input
          type="text"
          name="title"
          placeholder="Título de la nueva página…"
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Crear página
        </button>
      </form>

      <PageTree initialItems={items} createPage={createPage} movePage={movePage} />
    </div>
  );
}
