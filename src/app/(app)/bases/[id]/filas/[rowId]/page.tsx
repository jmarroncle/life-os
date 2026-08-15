import Link from "next/link";
import { notFound } from "next/navigation";
import { getRowView, updateRowContent } from "../../../actions";
import { RowContentEditor } from "@/components/row-content-editor";
import { rowLabel } from "@/lib/database-row-label";
import { emptyBlockValue, type YooptaContentValue } from "@/components/block-editor";

function formatValue(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value ? "Sí" : "No";
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : null;
  return String(value);
}

export default async function RowPage({
  params,
}: PageProps<"/bases/[id]/filas/[rowId]">) {
  const { id, rowId } = await params;
  const view = await getRowView(rowId);

  if (!view || view.database.id !== id) {
    notFound();
  }

  const { row, database, columns } = view;
  const label = rowLabel(row.values as Record<string, unknown>, columns);
  const chips = columns
    .map((column) => ({
      name: column.name,
      value: formatValue((row.values as Record<string, unknown>)[column.id]),
    }))
    .filter((chip) => chip.value !== null);

  async function saveContent(content: YooptaContentValue) {
    "use server";
    await updateRowContent(rowId, content);
  }

  return (
    <div className="space-y-6">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-neutral-400">
        <Link href="/bases" className="hover:text-neutral-900">
          Bases de datos
        </Link>
        <span>/</span>
        <Link href={`/bases/${id}`} className="hover:text-neutral-900">
          {database.icon ?? "📋"} {database.name}
        </Link>
        <span>/</span>
        <span className="text-neutral-600">{label}</span>
      </nav>

      <h1 className="text-2xl font-semibold">{label}</h1>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <span
              key={chip.name}
              className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500"
            >
              <span className="text-neutral-400">{chip.name}: </span>
              {chip.value}
            </span>
          ))}
          <Link
            href={`/bases/${id}`}
            className="rounded-md px-2 py-1 text-xs text-neutral-400 hover:text-neutral-900"
          >
            Editar valores en la tabla →
          </Link>
        </div>
      )}

      <RowContentEditor
        initialContent={(row.content as YooptaContentValue) ?? emptyBlockValue()}
        onSaveContent={saveContent}
      />
    </div>
  );
}
