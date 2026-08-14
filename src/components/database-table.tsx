"use client";

import type { DatabaseColumnType } from "@/app/(app)/bases/actions";

export type DatabaseColumnView = {
  id: string;
  name: string;
  type: DatabaseColumnType;
  options: string[] | null;
};

export type DatabaseRowView = {
  id: string;
  values: Record<string, unknown>;
};

function CellInput({
  column,
  value,
}: {
  column: DatabaseColumnView;
  value: unknown;
}) {
  const name = `col_${column.id}`;

  switch (column.type) {
    case "checkbox":
      return (
        <input
          type="checkbox"
          name={name}
          defaultChecked={value === true}
          className="h-4 w-4"
        />
      );
    case "date":
      return (
        <input
          type="date"
          name={name}
          defaultValue={typeof value === "string" ? value : ""}
          className="w-full min-w-0 rounded border-none bg-transparent px-1 py-1 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300"
        />
      );
    case "number":
      return (
        <input
          type="number"
          name={name}
          defaultValue={typeof value === "number" ? value : ""}
          className="w-full min-w-0 rounded border-none bg-transparent px-1 py-1 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300"
        />
      );
    case "url":
      return (
        <input
          type="url"
          name={name}
          defaultValue={typeof value === "string" ? value : ""}
          placeholder="https://…"
          className="w-full min-w-0 rounded border-none bg-transparent px-1 py-1 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300"
        />
      );
    case "select": {
      const current = typeof value === "string" ? value : "";
      return (
        <select
          name={name}
          defaultValue={current}
          className="w-full min-w-0 rounded border-none bg-transparent px-1 py-1 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300"
        >
          <option value="">—</option>
          {(column.options ?? []).map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }
    case "multi_select": {
      const current = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="flex flex-wrap gap-x-2 gap-y-1 px-1 py-1">
          {(column.options ?? []).map((option) => (
            <label
              key={option}
              className="flex items-center gap-1 text-xs text-neutral-600"
            >
              <input
                type="checkbox"
                name={name}
                value={option}
                defaultChecked={current.includes(option)}
                className="h-3 w-3"
              />
              {option}
            </label>
          ))}
        </div>
      );
    }
    default:
      return (
        <input
          type="text"
          name={name}
          defaultValue={typeof value === "string" ? value : ""}
          className="w-full min-w-0 rounded border-none bg-transparent px-1 py-1 text-sm outline-none focus:bg-white focus:ring-1 focus:ring-neutral-300"
        />
      );
  }
}

export function DatabaseTable({
  columns,
  rows,
  onUpdateRow,
  onDeleteRow,
  onDeleteColumn,
  onAddRow,
}: {
  columns: DatabaseColumnView[];
  rows: DatabaseRowView[];
  onUpdateRow: (rowId: string, formData: FormData) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onAddRow: (formData: FormData) => Promise<void>;
}) {
  if (columns.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Agregá al menos una columna para poder cargar filas.
      </p>
    );
  }

  const gridTemplate = `repeat(${columns.length}, minmax(9rem, 1fr)) 5rem`;

  return (
    <div className="overflow-x-auto rounded-md border border-neutral-200">
      <div style={{ minWidth: `${columns.length * 9 + 5}rem` }}>
        <div
          className="grid border-b border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-500"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {columns.map((column) => (
            <div
              key={column.id}
              className="flex items-center justify-between gap-1 px-2 py-2"
            >
              <span className="truncate">{column.name}</span>
              <form action={onDeleteColumn.bind(null, column.id)}>
                <button
                  type="submit"
                  title="Borrar columna"
                  className="shrink-0 text-neutral-300 hover:text-red-600"
                >
                  ×
                </button>
              </form>
            </div>
          ))}
          <div className="px-2 py-2" />
        </div>

        {rows.length === 0 ? (
          <p className="px-3 py-3 text-sm text-neutral-500">
            Todavía no hay filas.
          </p>
        ) : (
          rows.map((row) => (
            <form
              key={row.id}
              action={onUpdateRow.bind(null, row.id)}
              className="grid items-center border-b border-neutral-100 text-sm last:border-b-0"
              style={{ gridTemplateColumns: gridTemplate }}
            >
              {columns.map((column) => (
                <div key={column.id} className="px-1 py-1">
                  <CellInput column={column} value={row.values[column.id]} />
                </div>
              ))}
              <div className="flex items-center justify-end gap-2 px-2 py-1">
                <button
                  type="submit"
                  title="Guardar"
                  className="text-xs text-neutral-400 hover:text-neutral-900"
                >
                  ✓
                </button>
                <button
                  type="submit"
                  formAction={onDeleteRow.bind(null, row.id)}
                  title="Borrar fila"
                  className="text-xs text-neutral-300 hover:text-red-600"
                >
                  ×
                </button>
              </div>
            </form>
          ))
        )}

        <form
          action={onAddRow}
          className="grid items-center border-t border-neutral-200 bg-neutral-50 text-sm"
          style={{ gridTemplateColumns: gridTemplate }}
        >
          {columns.map((column) => (
            <div key={column.id} className="px-1 py-1">
              <CellInput column={column} value={undefined} />
            </div>
          ))}
          <div className="flex items-center justify-end px-2 py-1">
            <button
              type="submit"
              title="Agregar fila"
              className="text-xs font-medium text-neutral-500 hover:text-neutral-900"
            >
              + fila
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
