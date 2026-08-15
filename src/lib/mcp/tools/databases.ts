import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/server";
import { db } from "@/db";
import { databaseColumns, databaseRows, databases } from "@/db/schema";
import { errorResult, jsonResult, withLogging, withUser } from "@/lib/mcp/tool-helpers";
import { buildSimpleContent, extractPlainText } from "@/lib/mcp/block-content";
import { rowLabel } from "@/lib/database-row-label";

type ColumnRef = { id: string; name: string; type: string; options: string[] | null };

async function getColumns(databaseId: string): Promise<ColumnRef[]> {
  return db
    .select()
    .from(databaseColumns)
    .where(eq(databaseColumns.databaseId, databaseId))
    .orderBy(asc(databaseColumns.position), asc(databaseColumns.createdAt));
}

// El chat no conoce los UUID de columna — recibe/devuelve valores keyeados
// por NOMBRE de columna, y se traduce a columnId (la clave real en
// database_rows.values) acá adentro.
function valuesByIdToByName(
  values: Record<string, unknown>,
  columns: ColumnRef[],
): Record<string, unknown> {
  const byId = new Map(columns.map((c) => [c.id, c]));
  const out: Record<string, unknown> = {};
  for (const [columnId, value] of Object.entries(values)) {
    const column = byId.get(columnId);
    if (column) out[column.name] = value;
  }
  return out;
}

function coerceValue(raw: unknown, type: string): unknown {
  if (raw === undefined || raw === null) return type === "multi_select" ? [] : null;
  switch (type) {
    case "checkbox":
      return Boolean(raw);
    case "number": {
      const num = Number(raw);
      return Number.isNaN(num) ? null : num;
    }
    case "multi_select":
      return Array.isArray(raw) ? raw.map(String) : [String(raw)];
    default:
      return String(raw);
  }
}

function valuesByNameToById(
  values: Record<string, unknown>,
  columns: ColumnRef[],
): { values: Record<string, unknown>; unknownNames: string[] } {
  const byName = new Map(columns.map((c) => [c.name, c]));
  const out: Record<string, unknown> = {};
  const unknownNames: string[] = [];
  for (const [name, raw] of Object.entries(values)) {
    const column = byName.get(name);
    if (!column) {
      unknownNames.push(name);
      continue;
    }
    out[column.id] = coerceValue(raw, column.type);
  }
  return { values: out, unknownNames };
}

const AI_TAG_COLUMN_NAME = "Tags";
const AI_TAG_VALUE = "IA";

// Toda fila creada vía MCP lleva el tag "IA" en su columna "Tags" (multi_select)
// — ver Decisiones en CLAUDE.md, misma convención que review_status y el tag
// "IA" de life_os_create_note. Si la base todavía no tiene una columna
// "Tags", se crea (con "IA" ya como opción disponible) en vez de fallar o
// depender de que el usuario la haya armado a mano de antemano.
async function ensureAiTag(
  databaseId: string,
  userId: string,
  columns: ColumnRef[],
  byIdValues: Record<string, unknown>,
): Promise<void> {
  let tagColumn = columns.find(
    (c) => c.type === "multi_select" && c.name.toLowerCase() === AI_TAG_COLUMN_NAME.toLowerCase(),
  );

  if (!tagColumn) {
    const [created] = await db
      .insert(databaseColumns)
      .values({
        databaseId,
        userId,
        name: AI_TAG_COLUMN_NAME,
        type: "multi_select",
        options: [AI_TAG_VALUE],
        position: columns.length,
      })
      .returning();
    tagColumn = created;
  } else if (!(tagColumn.options ?? []).includes(AI_TAG_VALUE)) {
    const nextOptions = [...(tagColumn.options ?? []), AI_TAG_VALUE];
    await db
      .update(databaseColumns)
      .set({ options: nextOptions })
      .where(eq(databaseColumns.id, tagColumn.id));
  }

  const existing = Array.isArray(byIdValues[tagColumn.id])
    ? (byIdValues[tagColumn.id] as string[])
    : [];
  if (!existing.includes(AI_TAG_VALUE)) {
    byIdValues[tagColumn.id] = [...existing, AI_TAG_VALUE];
  }
}

export function registerDatabaseTools(server: McpServer) {
  server.registerTool(
    "life_os_list_databases",
    {
      title: "Listar bases de datos",
      description:
        "Lista las bases de datos genéricas (estilo Notion database: columnas tipadas + filas).",
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_list_databases",
      withUser(async (_args: Record<string, never>, userId) => {
        const rows = await db
          .select()
          .from(databases)
          .where(eq(databases.userId, userId))
          .orderBy(asc(databases.name));

        return jsonResult(`${rows.length} base(s) de datos.`, { databases: rows });
      }),
    ),
  );

  server.registerTool(
    "life_os_get_database",
    {
      title: "Ver una base de datos",
      description:
        "Devuelve las columnas y filas de una base de datos. Cada fila incluye sus valores (keyeados por nombre de columna) y un preview de su contenido de página (si tiene).",
      inputSchema: z.object({
        id: z.string().uuid().describe("ID de la base (ver life_os_list_databases)."),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_get_database",
      withUser(async ({ id }: { id: string }, userId) => {
        const [database] = await db
          .select()
          .from(databases)
          .where(and(eq(databases.id, id), eq(databases.userId, userId)))
          .limit(1);
        if (!database) return errorResult(`No se encontró la base ${id}.`);

        const columns = await getColumns(id);
        const rawRows = await db
          .select()
          .from(databaseRows)
          .where(eq(databaseRows.databaseId, id))
          .orderBy(asc(databaseRows.position), asc(databaseRows.createdAt));

        const rows = rawRows.map((row) => {
          const values = row.values as Record<string, unknown>;
          const contentText = extractPlainText(row.content);
          return {
            id: row.id,
            label: rowLabel(values, columns),
            values: valuesByIdToByName(values, columns),
            hasContent: contentText.length > 0,
            contentPreview: contentText.slice(0, 200),
          };
        });

        return jsonResult(`Base "${database.name}": ${columns.length} columna(s), ${rows.length} fila(s).`, {
          database: { id: database.id, name: database.name, icon: database.icon },
          columns: columns.map((c) => ({ id: c.id, name: c.name, type: c.type, options: c.options })),
          rows,
        });
      }),
    ),
  );

  server.registerTool(
    "life_os_get_database_row",
    {
      title: "Leer una fila (como página)",
      description:
        "Devuelve los valores y el contenido en texto plano de una fila — en Notion cada fila de una base de datos es también una página completa; esto es lo mismo acá.",
      inputSchema: z.object({
        rowId: z.string().uuid(),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_get_database_row",
      withUser(async ({ rowId }: { rowId: string }, userId) => {
        const [row] = await db
          .select()
          .from(databaseRows)
          .where(and(eq(databaseRows.id, rowId), eq(databaseRows.userId, userId)))
          .limit(1);
        if (!row) return errorResult(`No se encontró la fila ${rowId}.`);

        const columns = await getColumns(row.databaseId);
        const values = row.values as Record<string, unknown>;

        return jsonResult(`Fila "${rowLabel(values, columns)}".`, {
          id: row.id,
          databaseId: row.databaseId,
          label: rowLabel(values, columns),
          values: valuesByIdToByName(values, columns),
          content: extractPlainText(row.content),
        });
      }),
    ),
  );

  server.registerTool(
    "life_os_add_database_row",
    {
      title: "Agregar fila",
      description:
        "Agrega una fila nueva a una base de datos. Los valores van keyeados por nombre de columna (ver life_os_get_database) — una columna que no exista se ignora.",
      inputSchema: z.object({
        databaseId: z.string().uuid(),
        values: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("{ [nombreDeColumna]: valor }"),
        content: z
          .string()
          .optional()
          .describe(
            "Contenido de la fila como página, en texto plano. Separá párrafos con una línea en blanco.",
          ),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_add_database_row",
      withUser(
        async (
          {
            databaseId,
            values,
            content,
          }: { databaseId: string; values?: Record<string, unknown>; content?: string },
          userId,
        ) => {
          const [database] = await db
            .select()
            .from(databases)
            .where(and(eq(databases.id, databaseId), eq(databases.userId, userId)))
            .limit(1);
          if (!database) return errorResult(`No se encontró la base ${databaseId}.`);

          const columns = await getColumns(databaseId);
          const { values: byId, unknownNames } = valuesByNameToById(values ?? {}, columns);
          await ensureAiTag(databaseId, userId, columns, byId);

          const [created] = await db
            .insert(databaseRows)
            .values({
              databaseId,
              userId,
              values: byId,
              content: content ? buildSimpleContent(content) : {},
              // Todo lo creado vía MCP entra como borrador sin revisar — ver
              // Decisiones en CLAUDE.md, cola "Por revisar".
              reviewStatus: "draft",
            })
            .returning({ id: databaseRows.id });

          const warning =
            unknownNames.length > 0
              ? ` Columnas ignoradas (no existen): ${unknownNames.join(", ")}.`
              : "";
          return jsonResult(`Fila creada en "${database.name}".${warning}`, { id: created.id });
        },
      ),
    ),
  );

  server.registerTool(
    "life_os_update_database_row",
    {
      title: "Actualizar una fila",
      description:
        "Actualiza los valores y/o el contenido (texto plano, como página) de una fila existente. Solo cambia lo que se pase.",
      inputSchema: z.object({
        rowId: z.string().uuid(),
        values: z
          .record(z.string(), z.unknown())
          .optional()
          .describe("{ [nombreDeColumna]: valor } — solo se actualizan las columnas incluidas."),
        content: z
          .string()
          .optional()
          .describe("Si se pasa, reemplaza todo el contenido actual de la fila."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_update_database_row",
      withUser(
        async (
          {
            rowId,
            values,
            content,
          }: { rowId: string; values?: Record<string, unknown>; content?: string },
          userId,
        ) => {
          const [row] = await db
            .select()
            .from(databaseRows)
            .where(and(eq(databaseRows.id, rowId), eq(databaseRows.userId, userId)))
            .limit(1);
          if (!row) return errorResult(`No se encontró la fila ${rowId}.`);

          const columns = await getColumns(row.databaseId);
          const updates: Record<string, unknown> = { updatedAt: new Date() };
          let unknownNames: string[] = [];

          if (values) {
            const merged = valuesByNameToById(values, columns);
            unknownNames = merged.unknownNames;
            updates.values = { ...(row.values as Record<string, unknown>), ...merged.values };
          }
          if (content !== undefined) {
            updates.content = buildSimpleContent(content);
            // Un edit de contenido por MCP vuelve a mandar la fila a
            // revisar, aunque ya hubiera sido aprobada antes.
            updates.reviewStatus = "draft";
          }

          await db.update(databaseRows).set(updates).where(eq(databaseRows.id, rowId));

          const warning =
            unknownNames.length > 0
              ? ` Columnas ignoradas (no existen): ${unknownNames.join(", ")}.`
              : "";
          return jsonResult(`Fila ${rowId} actualizada.${warning}`, { id: rowId });
        },
      ),
    ),
  );

  server.registerTool(
    "life_os_add_database_column",
    {
      title: "Agregar columna",
      description: "Agrega una columna nueva a una base de datos existente.",
      inputSchema: z.object({
        databaseId: z.string().uuid(),
        name: z.string().min(1),
        type: z
          .enum(["text", "number", "select", "multi_select", "date", "checkbox", "url"])
          .default("text"),
        options: z
          .array(z.string())
          .optional()
          .describe("Opciones disponibles, solo para type select/multi_select."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_add_database_column",
      withUser(
        async (
          {
            databaseId,
            name,
            type,
            options,
          }: {
            databaseId: string;
            name: string;
            type: string;
            options?: string[];
          },
          userId,
        ) => {
          const [database] = await db
            .select()
            .from(databases)
            .where(and(eq(databases.id, databaseId), eq(databases.userId, userId)))
            .limit(1);
          if (!database) return errorResult(`No se encontró la base ${databaseId}.`);

          const existing = await getColumns(databaseId);
          const [created] = await db
            .insert(databaseColumns)
            .values({
              databaseId,
              userId,
              name,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              type: type as any,
              options: type === "select" || type === "multi_select" ? (options ?? null) : null,
              position: existing.length,
            })
            .returning({ id: databaseColumns.id });

          return jsonResult(`Columna "${name}" agregada a "${database.name}".`, {
            id: created.id,
          });
        },
      ),
    ),
  );

  server.registerTool(
    "life_os_delete_database_row",
    {
      title: "Eliminar fila",
      description: "Elimina una fila de forma permanente.",
      inputSchema: z.object({ rowId: z.string().uuid() }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_delete_database_row",
      withUser(async ({ rowId }: { rowId: string }, userId) => {
        const result = await db
          .delete(databaseRows)
          .where(and(eq(databaseRows.id, rowId), eq(databaseRows.userId, userId)))
          .returning({ id: databaseRows.id });

        if (result.length === 0) {
          return errorResult(`No se encontró la fila ${rowId}.`);
        }
        return jsonResult(`Fila ${rowId} eliminada.`, { id: rowId });
      }),
    ),
  );
}
