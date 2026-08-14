import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/server";
import { db } from "@/db";
import { pages } from "@/db/schema";
import { errorResult, jsonResult, withUser } from "@/lib/mcp/tool-helpers";
import { buildSimpleContent, extractPlainText } from "@/lib/mcp/block-content";

export function registerPageTools(server: McpServer) {
  server.registerTool(
    "life_os_list_pages",
    {
      title: "Listar páginas",
      description:
        "Lista las páginas de Data Center (estilo Notion). Incluye la jerarquía vía parentId — una página sin parentId es de nivel raíz, y una 'carpeta' es simplemente una página con subpáginas.",
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withUser(async (_args: Record<string, never>, userId) => {
      const rows = await db
        .select({
          id: pages.id,
          parentId: pages.parentId,
          title: pages.title,
          icon: pages.icon,
          updatedAt: pages.updatedAt,
        })
        .from(pages)
        .where(eq(pages.userId, userId))
        .orderBy(desc(pages.updatedAt));

      return jsonResult(`${rows.length} página(s).`, { pages: rows });
    }),
  );

  server.registerTool(
    "life_os_get_page",
    {
      title: "Leer página",
      description:
        "Devuelve el título y el contenido en texto plano de una página (el formato rico del editor se pierde, solo texto).",
      inputSchema: z.object({
        id: z.string().uuid().describe("ID de la página (ver life_os_list_pages)."),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withUser(async ({ id }: { id: string }, userId) => {
      const [page] = await db
        .select()
        .from(pages)
        .where(and(eq(pages.id, id), eq(pages.userId, userId)))
        .limit(1);

      if (!page) return errorResult(`No se encontró la página ${id}.`);

      return jsonResult(`Página "${page.title}".`, {
        id: page.id,
        title: page.title,
        icon: page.icon,
        parentId: page.parentId,
        content: extractPlainText(page.content),
      });
    }),
  );

  server.registerTool(
    "life_os_create_page",
    {
      title: "Crear página",
      description:
        "Crea una página nueva en Data Center. El contenido se guarda como texto plano dividido en párrafos (separalos con una línea en blanco) — no soporta formato rico (títulos, listas) desde acá, para eso usar la app.",
      inputSchema: z.object({
        title: z.string().min(1).describe("Título de la página."),
        content: z
          .string()
          .optional()
          .describe("Contenido en texto plano. Separá párrafos con una línea en blanco."),
        parentId: z
          .string()
          .uuid()
          .optional()
          .describe("ID de la página padre, para crearla como subpágina."),
        icon: z.string().optional().describe("Un emoji para usar como ícono."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    withUser(
      async (
        {
          title,
          content,
          parentId,
          icon,
        }: { title: string; content?: string; parentId?: string; icon?: string },
        userId,
      ) => {
        const [created] = await db
          .insert(pages)
          .values({
            userId,
            title,
            parentId: parentId ?? null,
            icon: icon ?? null,
            content: buildSimpleContent(content ?? ""),
          })
          .returning({ id: pages.id });

        return jsonResult(`Página "${title}" creada.`, { id: created.id });
      },
    ),
  );

  server.registerTool(
    "life_os_update_page",
    {
      title: "Actualizar página",
      description:
        "Actualiza el título y/o reemplaza por completo el contenido de texto plano de una página existente.",
      inputSchema: z.object({
        id: z.string().uuid(),
        title: z.string().min(1).optional(),
        content: z
          .string()
          .optional()
          .describe("Si se pasa, reemplaza todo el contenido actual."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withUser(
      async (
        { id, title, content }: { id: string; title?: string; content?: string },
        userId,
      ) => {
        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (title !== undefined) updates.title = title;
        if (content !== undefined) updates.content = buildSimpleContent(content);

        const result = await db
          .update(pages)
          .set(updates)
          .where(and(eq(pages.id, id), eq(pages.userId, userId)))
          .returning({ id: pages.id });

        if (result.length === 0) {
          return errorResult(`No se encontró la página ${id}.`);
        }
        return jsonResult(`Página ${id} actualizada.`, { id });
      },
    ),
  );

  server.registerTool(
    "life_os_delete_page",
    {
      title: "Eliminar página",
      description:
        "Elimina una página de forma permanente. Si tiene subpáginas, también se eliminan (cascada).",
      inputSchema: z.object({ id: z.string().uuid() }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withUser(async ({ id }: { id: string }, userId) => {
      const result = await db
        .delete(pages)
        .where(and(eq(pages.id, id), eq(pages.userId, userId)))
        .returning({ id: pages.id });

      if (result.length === 0) {
        return errorResult(`No se encontró la página ${id}.`);
      }
      return jsonResult(`Página ${id} eliminada.`, { id });
    }),
  );
}
