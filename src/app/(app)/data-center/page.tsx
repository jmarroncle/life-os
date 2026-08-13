import Link from "next/link";
import { createPage, listPages } from "./actions";

export default async function DataCenterPaginasPage() {
  const items = await listPages();

  return (
    <div className="space-y-6">
      <form action={createPage} className="flex gap-2">
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

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Todavía no creaste ninguna página.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {items.map((page) => (
            <li key={page.id}>
              <Link
                href={`/data-center/paginas/${page.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-50"
              >
                <span>{page.title}</span>
                <span className="text-xs text-neutral-400">
                  {new Date(page.updatedAt).toLocaleDateString("es-AR")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
