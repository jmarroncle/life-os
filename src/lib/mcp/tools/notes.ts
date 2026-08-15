import { z } from "zod";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/server";
import { db } from "@/db";
import { notes } from "@/db/schema";
import { errorResult, jsonResult, withLogging, withUser } from "@/lib/mcp/tool-helpers";
import { buildSimpleContent, extractPlainText } from "@/lib/mcp/block-content";

export function registerNoteTools(server: McpServer) {
  server.registerTool(
    "life_os_list_notes",
    {
      title: "Listar notas",
      description:
        "Lista las notas de la Libreta (captura rápida tipo journal), opcionalmente filtradas por texto en el título o los tags.",
      inputSchema: z.object({
        query: z.string().optional().describe("Texto a buscar en título o tags."),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_list_notes",
      withUser(async ({ query }: { query?: string }, userId) => {
        const conditions = [eq(notes.userId, userId)];
        if (query) {
          conditions.push(
            or(
              ilike(notes.title, `%${query}%`),
              sql`exists (select 1 from unnest(${notes.tags}) tag where tag ilike ${`%${query}%`})`,
            )!,
          );
        }

        const rows = await db
          .select({
            id: notes.id,
            title: notes.title,
            tags: notes.tags,
            updatedAt: notes.updatedAt,
          })
          .from(notes)
          .where(and(...conditions))
          .orderBy(desc(notes.updatedAt));

        return jsonResult(`${rows.length} nota(s).`, { notes: rows });
      }),
    ),
  );

  server.registerTool(
    "life_os_get_note",
    {
      title: "Leer nota",
      description: "Devuelve el título, tags y contenido en texto plano de una nota.",
      inputSchema: z.object({ id: z.string().uuid() }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_get_note",
      withUser(async ({ id }: { id: string }, userId) => {
        const [note] = await db
          .select()
          .from(notes)
          .where(and(eq(notes.id, id), eq(notes.userId, userId)))
          .limit(1);

        if (!note) return errorResult(`No se encontró la nota ${id}.`);

        return jsonResult(`Nota "${note.title}".`, {
          id: note.id,
          title: note.title,
          tags: note.tags,
          content: extractPlainText(note.content),
        });
      }),
    ),
  );

  server.registerTool(
    "life_os_create_note",
    {
      title: "Crear nota",
      description: "Crea una nota nueva en la Libreta.",
      inputSchema: z.object({
        title: z.string().min(1),
        content: z
          .string()
          .optional()
          .describe("Contenido en texto plano. Separá párrafos con una línea en blanco."),
        tags: z.array(z.string()).optional(),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_create_note",
      withUser(
        async (
          { title, content, tags }: { title: string; content?: string; tags?: string[] },
          userId,
        ) => {
          // Toda nota creada vía MCP lleva el tag "IA" — ver Decisiones en
          // CLAUDE.md, misma convención que review_status en pages/rows.
          const tagSet = new Set([...(tags ?? []), "IA"]);

          const [created] = await db
            .insert(notes)
            .values({
              userId,
              title,
              content: buildSimpleContent(content ?? ""),
              tags: [...tagSet],
            })
            .returning({ id: notes.id });

          return jsonResult(`Nota "${title}" creada.`, { id: created.id });
        },
      ),
    ),
  );

  server.registerTool(
    "life_os_delete_note",
    {
      title: "Eliminar nota",
      description: "Elimina una nota de forma permanente.",
      inputSchema: z.object({ id: z.string().uuid() }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withLogging(
      "life_os_delete_note",
      withUser(async ({ id }: { id: string }, userId) => {
        const result = await db
          .delete(notes)
          .where(and(eq(notes.id, id), eq(notes.userId, userId)))
          .returning({ id: notes.id });

        if (result.length === 0) {
          return errorResult(`No se encontró la nota ${id}.`);
        }
        return jsonResult(`Nota ${id} eliminada.`, { id });
      }),
    ),
  );
}
