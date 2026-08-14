import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addColumn,
  addRow,
  deleteColumn,
  deleteDatabase,
  deleteRow,
  getDatabaseView,
  updateRow,
} from "../actions";
import { DatabaseTable } from "@/components/database-table";

const TYPE_LABEL: Record<string, string> = {
  text: "Texto",
  number: "Número",
  select: "Select",
  multi_select: "Multi-select",
  date: "Fecha",
  checkbox: "Checkbox",
  url: "URL",
};

export default async function BaseDetailPage({
  params,
}: PageProps<"/bases/[id]">) {
  const { id } = await params;
  const view = await getDatabaseView(id);

  if (!view) {
    notFound();
  }

  const { database, columns, rows: rawRows } = view;
  const columnRefs = columns.map((column) => ({
    id: column.id,
    type: column.type,
  }));
  const rows = rawRows.map((row) => ({
    id: row.id,
    values: row.values as Record<string, unknown>,
  }));

  async function boundUpdateRow(rowId: string, formData: FormData) {
    "use server";
    await updateRow(rowId, columnRefs, formData);
  }

  async function boundAddRow(formData: FormData) {
    "use server";
    await addRow(id, columnRefs, formData);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <nav className="flex items-center gap-1 text-xs text-neutral-400">
          <Link href="/bases" className="hover:text-neutral-900">
            Bases de datos
          </Link>
          <span>/</span>
          <span className="text-neutral-600">
            {database.icon ?? "📋"} {database.name}
          </span>
        </nav>

        <form action={deleteDatabase.bind(null, id)}>
          <button
            type="submit"
            className="shrink-0 text-xs text-neutral-400 hover:text-red-600"
          >
            Eliminar base
          </button>
        </form>
      </div>

      <h1 className="text-xl font-semibold">
        {database.icon ?? "📋"} {database.name}
      </h1>

      <DatabaseTable
        columns={columns}
        rows={rows}
        onUpdateRow={boundUpdateRow}
        onDeleteRow={deleteRow}
        onDeleteColumn={deleteColumn}
        onAddRow={boundAddRow}
      />

      <div className="space-y-2 border-t border-neutral-100 pt-4">
        <p className="text-xs font-medium text-neutral-500">
          Agregar columna
        </p>
        <form
          action={addColumn.bind(null, id)}
          className="flex flex-wrap items-center gap-2"
        >
          <input
            type="text"
            name="name"
            placeholder="Nombre de la columna…"
            required
            className="flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
          />
          <select
            name="type"
            defaultValue="text"
            className="rounded-md border border-neutral-300 px-2 py-1.5 text-sm"
          >
            {Object.entries(TYPE_LABEL).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <input
            type="text"
            name="options"
            placeholder="Opciones separadas por coma (solo select/multi-select)"
            className="min-w-64 flex-1 rounded-md border border-neutral-300 px-3 py-1.5 text-sm outline-none focus:border-neutral-500"
          />
          <button
            type="submit"
            className="shrink-0 rounded-md border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
          >
            Agregar columna
          </button>
        </form>
      </div>
    </div>
  );
}
