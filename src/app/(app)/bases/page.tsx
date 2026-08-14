import Link from "next/link";
import { createDatabase, listDatabases } from "./actions";

export default async function BasesPage() {
  const items = await listDatabases();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Bases de datos</h1>
        <p className="text-sm text-neutral-500">
          Colecciones con columnas propias, tipo las databases de Notion
          (texto, número, select, fecha, checkbox…).
        </p>
      </div>

      <form action={createDatabase} className="flex flex-wrap gap-2">
        <input
          type="text"
          name="icon"
          placeholder="📋"
          maxLength={4}
          className="w-16 rounded-md border border-neutral-300 px-2 py-2 text-center text-sm outline-none focus:border-neutral-500"
        />
        <input
          type="text"
          name="name"
          placeholder="Nombre de la base…"
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Crear base
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Todavía no creaste ninguna base de datos.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {items.map((item) => (
            <li key={item.id}>
              <Link
                href={`/bases/${item.id}`}
                className="flex items-center justify-between px-4 py-3 text-sm hover:bg-neutral-50"
              >
                <span>
                  {item.icon ?? "📋"} {item.name}
                </span>
                <span className="text-xs text-neutral-400">
                  {new Date(item.createdAt).toLocaleDateString("es-AR")}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
