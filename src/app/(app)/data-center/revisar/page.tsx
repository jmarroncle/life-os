import Link from "next/link";
import { listDraftItems, markPageReviewed, markRowReviewed } from "./actions";

export default async function RevisarPage() {
  const items = await listDraftItems();

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Por revisar</h1>
        <p className="text-sm text-neutral-500">
          Páginas y filas creadas o editadas por IA (vía MCP) que todavía no
          revisaste. Marcalas como revisadas una vez que las leíste y ajustaste.
        </p>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          No hay nada pendiente de revisión 🎉
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {items.map((item) => {
            const markReviewed =
              item.type === "page"
                ? markPageReviewed.bind(null, item.id)
                : markRowReviewed.bind(null, item.id);

            return (
              <li
                key={`${item.type}-${item.id}`}
                className="flex items-center justify-between gap-3 px-4 py-3"
              >
                <Link href={item.href} className="min-w-0 flex-1 hover:opacity-70">
                  <p className="truncate text-sm">
                    {item.icon ?? (item.type === "page" ? "📄" : "📋")} {item.title}
                  </p>
                  <p className="text-xs text-neutral-400">
                    {item.contextLabel} ·{" "}
                    {new Date(item.updatedAt).toLocaleDateString("es-AR")}
                  </p>
                </Link>
                <form action={markReviewed}>
                  <button
                    type="submit"
                    className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-100"
                  >
                    Marcar como revisado
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
