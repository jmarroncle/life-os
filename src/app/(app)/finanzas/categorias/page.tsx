import { createCategory, listCategories } from "../actions";

const KIND_LABEL: Record<string, string> = {
  income: "Ingreso",
  expense: "Gasto",
};

export default async function CategoriasPage() {
  const items = await listCategories();

  return (
    <div className="space-y-6">
      <form action={createCategory} className="flex flex-wrap gap-2">
        <input
          type="text"
          name="name"
          placeholder="Nombre de la categoría…"
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <select
          name="kind"
          className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
          defaultValue="expense"
        >
          {Object.entries(KIND_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Crear categoría
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Todavía no creaste ninguna categoría.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {items.map((category) => (
            <li
              key={category.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>{category.name}</span>
              <span className="text-xs text-neutral-400">
                {KIND_LABEL[category.kind]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
