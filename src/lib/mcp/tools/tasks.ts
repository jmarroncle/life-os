import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import type { McpServer } from "@modelcontextprotocol/server";
import { db } from "@/db";
import { projects, tasks, taskStatus } from "@/db/schema";
import { errorResult, jsonResult, withUser } from "@/lib/mcp/tool-helpers";

const StatusEnum = z.enum(taskStatus.enumValues);

export function registerTaskTools(server: McpServer) {
  server.registerTool(
    "life_os_list_tasks",
    {
      title: "Listar tareas",
      description:
        "Lista las tareas de Data Center (tipo Asana), opcionalmente filtradas por estado. Devuelve id, título, descripción, estado (todo/doing/done), fecha límite, proyecto y link de PR si tiene.",
      inputSchema: z.object({
        status: StatusEnum.optional().describe(
          "Filtrar por estado. Si se omite, devuelve todas.",
        ),
      }),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withUser(
      async (
        { status }: { status?: (typeof taskStatus.enumValues)[number] },
        userId,
      ) => {
        const conditions = [eq(tasks.userId, userId)];
        if (status) conditions.push(eq(tasks.status, status));

        const rows = await db
          .select({
            id: tasks.id,
            title: tasks.title,
            description: tasks.description,
            status: tasks.status,
            dueDate: tasks.dueDate,
            projectId: tasks.projectId,
            projectName: projects.name,
            prUrl: tasks.prUrl,
          })
          .from(tasks)
          .leftJoin(projects, eq(tasks.projectId, projects.id))
          .where(and(...conditions))
          .orderBy(asc(tasks.position), asc(tasks.createdAt));

        return jsonResult(`${rows.length} tarea(s) encontrada(s).`, {
          tasks: rows,
        });
      },
    ),
  );

  server.registerTool(
    "life_os_create_task",
    {
      title: "Crear tarea",
      description:
        'Crea una tarea nueva en Data Center → Tareas. Usar para "crear un proceso", "agregar una tarea" o "recordame hacer X".',
      inputSchema: z.object({
        title: z.string().min(1).describe("Título de la tarea."),
        description: z.string().optional().describe("Descripción opcional."),
        projectId: z
          .string()
          .uuid()
          .optional()
          .describe(
            "ID del proyecto al que pertenece (ver life_os_list_projects).",
          ),
        dueDate: z
          .string()
          .optional()
          .describe("Fecha límite en formato ISO 8601 (ej. 2026-08-20)."),
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
          description,
          projectId,
          dueDate,
        }: {
          title: string;
          description?: string;
          projectId?: string;
          dueDate?: string;
        },
        userId,
      ) => {
        const [created] = await db
          .insert(tasks)
          .values({
            userId,
            title,
            description: description ?? null,
            projectId: projectId ?? null,
            dueDate: dueDate ? new Date(dueDate) : null,
          })
          .returning({ id: tasks.id });

        return jsonResult(`Tarea "${title}" creada.`, { id: created.id });
      },
    ),
  );

  server.registerTool(
    "life_os_update_task",
    {
      title: "Actualizar tarea",
      description:
        "Actualiza título, descripción, estado, proyecto y/o fecha límite de una tarea existente. Solo se cambian los campos que se pasan.",
      inputSchema: z.object({
        id: z.string().uuid().describe("ID de la tarea (ver life_os_list_tasks)."),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        status: StatusEnum.optional(),
        projectId: z.string().uuid().nullable().optional(),
        dueDate: z
          .string()
          .nullable()
          .optional()
          .describe("ISO 8601, o null para quitarla."),
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
        {
          id,
          title,
          description,
          status,
          projectId,
          dueDate,
        }: {
          id: string;
          title?: string;
          description?: string;
          status?: (typeof taskStatus.enumValues)[number];
          projectId?: string | null;
          dueDate?: string | null;
        },
        userId,
      ) => {
        const updates: Record<string, unknown> = { updatedAt: new Date() };
        if (title !== undefined) updates.title = title;
        if (description !== undefined) updates.description = description;
        if (status !== undefined) updates.status = status;
        if (projectId !== undefined) updates.projectId = projectId;
        if (dueDate !== undefined) {
          updates.dueDate = dueDate ? new Date(dueDate) : null;
        }

        const result = await db
          .update(tasks)
          .set(updates)
          .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
          .returning({ id: tasks.id });

        if (result.length === 0) {
          return errorResult(`No se encontró la tarea ${id}.`);
        }
        return jsonResult(`Tarea ${id} actualizada.`, { id });
      },
    ),
  );

  server.registerTool(
    "life_os_delete_task",
    {
      title: "Eliminar tarea",
      description: "Elimina una tarea existente de forma permanente.",
      inputSchema: z.object({
        id: z.string().uuid().describe("ID de la tarea a eliminar."),
      }),
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    withUser(async ({ id }: { id: string }, userId) => {
      const result = await db
        .delete(tasks)
        .where(and(eq(tasks.id, id), eq(tasks.userId, userId)))
        .returning({ id: tasks.id });

      if (result.length === 0) {
        return errorResult(`No se encontró la tarea ${id}.`);
      }
      return jsonResult(`Tarea ${id} eliminada.`, { id });
    }),
  );

  server.registerTool(
    "life_os_list_projects",
    {
      title: "Listar proyectos",
      description:
        "Lista los proyectos de Data Center, usados para agrupar tareas y para 'Crear PR'.",
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
          id: projects.id,
          name: projects.name,
          githubRepo: projects.githubRepo,
        })
        .from(projects)
        .where(eq(projects.userId, userId))
        .orderBy(asc(projects.name));

      return jsonResult(`${rows.length} proyecto(s).`, { projects: rows });
    }),
  );
}
