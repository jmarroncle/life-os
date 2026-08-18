"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import type { DatabaseColumnType, DatabaseFilter } from "@/app/(app)/bases/actions";
import { rowLabel } from "@/lib/database-row-label";

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

export type DatabaseViewSummary = {
  id: string;
  name: string;
  filters: unknown;
  sortColumnId: string | null;
  sortDirection: string | null;
};

// Un operador por tipo de columna alcanza para un v1 útil — Notion tiene
// varios por tipo, pero eso es mucha UI para lo que hace falta acá.
const OPS_BY_TYPE: Record<DatabaseColumnType, { value: string; label: string }[]> = {
  text: [{ value: "contains", label: "contiene" }],
  url: [{ value: "contains", label: "contiene" }],
  number: [
    { value: "eq", label: "=" },
    { value: "gt", label: ">" },
    { value: "lt", label: "<" },
  ],
  select: [{ value: "eq", label: "es" }],
  multi_select: [{ value: "has", label: "incluye" }],
  checkbox: [{ value: "eq", label: "es" }],
  date: [
    { value: "eq", label: "en" },
    { value: "before", label: "antes de" },
    { value: "after", label: "después de" },
  ],
};

function defaultOpFor(type: DatabaseColumnType): string {
  return OPS_BY_TYPE[type][0].value;
}

function matchesFilter(
  value: unknown,
  column: DatabaseColumnView,
  filter: DatabaseFilter,
): boolean {
  if (!filter.value) return true;
  switch (column.type) {
    case "text":
    case "url":
      return String(value ?? "").toLowerCase().includes(filter.value.toLowerCase());
    case "number": {
      const n = typeof value === "number" ? value : null;
      const target = Number(filter.value);
      if (n === null || Number.isNaN(target)) return false;
      if (filter.op === "gt") return n > target;
      if (filter.op === "lt") return n < target;
      return n === target;
    }
    case "select":
      return value === filter.value;
    case "multi_select":
      return Array.isArray(value) && (value as string[]).includes(filter.value);
    case "checkbox":
      return (value === true) === (filter.value === "true");
    case "date": {
      const d = typeof value === "string" ? value : "";
      if (!d) return false;
      if (filter.op === "before") return d < filter.value;
      if (filter.op === "after") return d > filter.value;
      return d === filter.value;
    }
    default:
      return true;
  }
}

function compareForSort(a: unknown, b: unknown, type: DatabaseColumnType): number {
  if (type === "number") {
    const an = typeof a === "number" ? a : -Infinity;
    const bn = typeof b === "number" ? b : -Infinity;
    return an - bn;
  }
  if (type === "checkbox") {
    return (a === true ? 1 : 0) - (b === true ? 1 : 0);
  }
  const as = Array.isArray(a) ? a.join(", ") : String(a ?? "");
  const bs = Array.isArray(b) ? b.join(", ") : String(b ?? "");
  return as.localeCompare(bs);
}

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
  databaseId,
  columns,
  rows,
  views,
  onUpdateRow,
  onDeleteRow,
  onDeleteColumn,
  onAddRow,
  onCreateView,
  onDeleteView,
}: {
  databaseId: string;
  columns: DatabaseColumnView[];
  rows: DatabaseRowView[];
  views: DatabaseViewSummary[];
  onUpdateRow: (rowId: string, formData: FormData) => Promise<void>;
  onDeleteRow: (rowId: string) => Promise<void>;
  onDeleteColumn: (columnId: string) => Promise<void>;
  onAddRow: (formData: FormData) => Promise<void>;
  onCreateView: (input: {
    name: string;
    filters: DatabaseFilter[];
    sortColumnId: string | null;
    sortDirection: string | null;
  }) => Promise<void>;
  onDeleteView: (viewId: string) => Promise<void>;
}) {
  const [, startTransition] = useTransition();
  const [activeViewId, setActiveViewId] = useState<string | null>(null);
  const [filters, setFilters] = useState<DatabaseFilter[]>([]);
  const [sort, setSort] = useState<{ columnId: string; direction: "asc" | "desc" } | null>(
    null,
  );
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [newViewOpen, setNewViewOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  const columnById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns]);

  function applyView(view: DatabaseViewSummary | null) {
    setActiveViewId(view?.id ?? null);
    setFilters(Array.isArray(view?.filters) ? (view.filters as DatabaseFilter[]) : []);
    setSort(
      view?.sortColumnId && view.sortDirection
        ? { columnId: view.sortColumnId, direction: view.sortDirection as "asc" | "desc" }
        : null,
    );
  }

  function toggleSort(columnId: string) {
    setActiveViewId(null);
    setSort((prev) => {
      if (!prev || prev.columnId !== columnId) return { columnId, direction: "asc" };
      if (prev.direction === "asc") return { columnId, direction: "desc" };
      return null;
    });
  }

  function addFilter() {
    if (columns.length === 0) return;
    setActiveViewId(null);
    setFilters((prev) => [
      ...prev,
      { columnId: columns[0].id, op: defaultOpFor(columns[0].type), value: "" },
    ]);
  }

  function updateFilter(index: number, patch: Partial<DatabaseFilter>) {
    setActiveViewId(null);
    setFilters((prev) => prev.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }

  function removeFilter(index: number) {
    setActiveViewId(null);
    setFilters((prev) => prev.filter((_, i) => i !== index));
  }

  function saveView() {
    const name = newViewName.trim();
    if (!name) return;
    startTransition(() => {
      onCreateView({
        name,
        filters,
        sortColumnId: sort?.columnId ?? null,
        sortDirection: sort?.direction ?? null,
      });
    });
    setNewViewName("");
    setNewViewOpen(false);
  }

  const visibleRows = useMemo(() => {
    let result = rows;
    if (filters.length > 0) {
      result = result.filter((row) =>
        filters.every((filter) => {
          const column = columnById.get(filter.columnId);
          if (!column) return true;
          return matchesFilter(row.values[column.id], column, filter);
        }),
      );
    }
    if (sort) {
      const sortColumn = columnById.get(sort.columnId);
      if (sortColumn) {
        result = [...result].sort((a, b) => {
          const cmp = compareForSort(a.values[sortColumn.id], b.values[sortColumn.id], sortColumn.type);
          return sort.direction === "asc" ? cmp : -cmp;
        });
      }
    }
    return result;
  }, [rows, filters, sort, columnById]);

  if (columns.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Agregá al menos una columna para poder cargar filas.
      </p>
    );
  }

  const gridTemplate = `2.5rem repeat(${columns.length}, minmax(9rem, 1fr)) 5rem`;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200 pb-2">
        <button
          type="button"
          onClick={() => applyView(null)}
          className={
            activeViewId === null
              ? "rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-900"
              : "rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
          }
        >
          Todas
        </button>
        {views.map((view) => (
          <span
            key={view.id}
            className={
              activeViewId === view.id
                ? "flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-medium text-neutral-900"
                : "flex items-center gap-1 rounded-md px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
            }
          >
            <button type="button" onClick={() => applyView(view)}>
              {view.name}
            </button>
            <button
              type="button"
              title="Eliminar vista"
              onClick={() => {
                startTransition(() => onDeleteView(view.id));
                if (activeViewId === view.id) applyView(null);
              }}
              className="text-neutral-300 hover:text-red-600"
            >
              ×
            </button>
          </span>
        ))}

        <div className="ml-auto flex items-center gap-2">
          {(filters.length > 0 || sort) && !newViewOpen && (
            <button
              type="button"
              onClick={() => setNewViewOpen(true)}
              className="rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
            >
              + Guardar como vista
            </button>
          )}
          {newViewOpen && (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                type="text"
                value={newViewName}
                onChange={(event) => setNewViewName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveView();
                  if (event.key === "Escape") setNewViewOpen(false);
                }}
                placeholder="Nombre de la vista…"
                className="w-36 rounded-md border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-neutral-500"
              />
              <button
                type="button"
                onClick={saveView}
                className="rounded-md bg-neutral-900 px-2 py-1 text-xs font-medium text-white"
              >
                Guardar
              </button>
              <button
                type="button"
                onClick={() => setNewViewOpen(false)}
                className="text-xs text-neutral-400 hover:text-neutral-900"
              >
                Cancelar
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={() => setFilterPanelOpen((prev) => !prev)}
            className={
              filters.length > 0
                ? "rounded-md border border-neutral-900 px-2 py-1 text-xs font-medium text-neutral-900"
                : "rounded-md border border-neutral-300 px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
            }
          >
            Filtrar{filters.length > 0 ? ` (${filters.length})` : ""}
          </button>
        </div>
      </div>

      {filterPanelOpen && (
        <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
          {filters.length === 0 && (
            <p className="text-xs text-neutral-400">No hay filtros todavía.</p>
          )}
          {filters.map((filter, index) => {
            const column = columnById.get(filter.columnId) ?? columns[0];
            const ops = OPS_BY_TYPE[column.type];
            return (
              <div key={index} className="flex flex-wrap items-center gap-2">
                <select
                  value={filter.columnId}
                  onChange={(event) => {
                    const nextColumn = columnById.get(event.target.value)!;
                    updateFilter(index, {
                      columnId: nextColumn.id,
                      op: defaultOpFor(nextColumn.type),
                      value: "",
                    });
                  }}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                >
                  {columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.op}
                  onChange={(event) => updateFilter(index, { op: event.target.value })}
                  className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                >
                  {ops.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                {column.type === "select" || column.type === "multi_select" ? (
                  <select
                    value={filter.value}
                    onChange={(event) => updateFilter(index, { value: event.target.value })}
                    className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                  >
                    <option value="">—</option>
                    {(column.options ?? []).map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                ) : column.type === "checkbox" ? (
                  <select
                    value={filter.value}
                    onChange={(event) => updateFilter(index, { value: event.target.value })}
                    className="rounded-md border border-neutral-300 px-2 py-1 text-xs"
                  >
                    <option value="">—</option>
                    <option value="true">Sí</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    type={column.type === "date" ? "date" : column.type === "number" ? "number" : "text"}
                    value={filter.value}
                    onChange={(event) => updateFilter(index, { value: event.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
                  />
                )}
                <button
                  type="button"
                  onClick={() => removeFilter(index)}
                  className="text-xs text-neutral-400 hover:text-red-600"
                >
                  Quitar
                </button>
              </div>
            );
          })}
          <button
            type="button"
            onClick={addFilter}
            className="text-xs font-medium text-neutral-600 hover:text-neutral-900"
          >
            + agregar filtro
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-md border border-neutral-200">
        <div style={{ minWidth: `${columns.length * 9 + 7.5}rem` }}>
          <div
            className="grid border-b border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-500"
            style={{ gridTemplateColumns: gridTemplate }}
          >
            <div className="px-2 py-2" />
            {columns.map((column) => (
              <div
                key={column.id}
                className="flex items-center justify-between gap-1 px-2 py-2"
              >
                <button
                  type="button"
                  onClick={() => toggleSort(column.id)}
                  className="flex min-w-0 items-center gap-1 truncate hover:text-neutral-900"
                >
                  <span className="truncate">{column.name}</span>
                  {sort?.columnId === column.id && (
                    <span>{sort.direction === "asc" ? "▲" : "▼"}</span>
                  )}
                </button>
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
          ) : visibleRows.length === 0 ? (
            <p className="px-3 py-3 text-sm text-neutral-500">
              Ninguna fila coincide con los filtros.
            </p>
          ) : (
            visibleRows.map((row) => (
              <form
                key={row.id}
                action={onUpdateRow.bind(null, row.id)}
                className="grid items-center border-b border-neutral-100 text-sm last:border-b-0"
                style={{ gridTemplateColumns: gridTemplate }}
              >
                <div className="flex items-center justify-center px-1 py-1">
                  <Link
                    href={`/bases/${databaseId}/filas/${row.id}`}
                    title={`Abrir "${rowLabel(row.values, columns)}" como página`}
                    className="text-neutral-400 hover:text-neutral-900"
                  >
                    📄
                  </Link>
                </div>
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
            <div className="px-1 py-1" />
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
    </div>
  );
}
