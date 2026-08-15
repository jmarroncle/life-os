export function rowLabel(
  values: Record<string, unknown>,
  columns: { id: string; type: string }[],
): string {
  const textColumn = columns.find((column) => column.type === "text");
  const fromTextColumn = textColumn ? values[textColumn.id] : undefined;
  if (typeof fromTextColumn === "string" && fromTextColumn.trim()) {
    return fromTextColumn.trim();
  }

  for (const column of columns) {
    const value = values[column.id];
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "Fila sin nombre";
}
