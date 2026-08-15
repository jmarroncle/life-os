import Link from "next/link";
import { createNote, listNotes } from "./actions";

export default async function LibretaPage({
  searchParams,
}: PageProps<"/libreta">) {
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q : undefined;
  const items = await listNotes(query);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Libreta</h1>

      <form action="/libreta" className="flex flex-wrap gap-2">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="Buscar por título o tag…"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium"
        >
          Buscar
        </button>
      </form>

      <form action={createNote} className="flex flex-wrap gap-2">
        <input
          type="text"
          name="title"
          placeholder="Título de la nueva nota…"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <input
          type="text"
          name="tags"
          placeholder="tags (opcional, separados por coma)"
          className="min-w-0 flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500 sm:w-56 sm:flex-none"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Nueva nota
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {query ? "No hay notas que coincidan." : "Todavía no creaste ninguna nota."}
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {items.map((note) => (
            <li key={note.id}>
              <Link
                href={`/libreta/${note.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-50"
              >
                <span>
                  {note.title}
                  {note.tags.length > 0 && (
                    <span className="ml-2 text-xs text-neutral-400">
                      {note.tags.map((tag) => `#${tag}`).join(" ")}
                    </span>
                  )}
                </span>
                <span className="text-xs text-neutral-400">
                  {new Date(note.updatedAt).toLocaleDateString("es-AR")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
