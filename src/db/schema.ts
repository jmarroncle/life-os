import {
  type AnyPgColumn,
  boolean,
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// Life OS comparte el proyecto de Supabase de behavioral-design-platform
// (límite de proyectos free), pero vive en su propio schema de Postgres
// para no pisar sus tablas.
export const lifeOs = pgSchema("life_os");

// Referencia mínima a auth.users (schema gestionado por Supabase) para
// poder declarar foreign keys con cascade, igual que hace
// behavioral-design-platform en supabase/schema.sql.
const authSchema = pgSchema("auth");
const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});

export const taskStatus = lifeOs.enum("task_status", [
  "todo",
  "doing",
  "done",
]);

export const projects = lifeOs.table(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    // Repo destino para "Crear PR" en las tareas de este proyecto, formato "owner/repo".
    githubRepo: text("github_repo"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("projects_user_id_idx").on(table.userId)],
);

export const tasks = lifeOs.table(
  "tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatus("status").notNull().default("todo"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    position: integer("position").notNull().default(0),
    prUrl: text("pr_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("tasks_user_id_idx").on(table.userId),
    index("tasks_project_id_idx").on(table.projectId),
  ],
);

export const pageLayout = lifeOs.enum("page_layout", [
  "normal",
  "columns-2",
  "columns-3",
]);

// "draft" = generado/editado por IA (vía MCP) y todavía sin revisar por el
// usuario. "reviewed" es el default para todo lo creado a mano en la app —
// no necesita pasar por la cola de revisión. Se usa tanto en pages como en
// database_rows (ver más abajo), mismo enum para las dos.
export const contentReviewStatus = lifeOs.enum("content_review_status", [
  "draft",
  "reviewed",
]);

export const pages = lifeOs.table(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    // Una página sin padre es una página "raíz" (top-level). Una "carpeta"
    // en el sentido Notion no es una entidad separada: es simplemente una
    // página que tiene subpáginas.
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => pages.id,
      { onDelete: "cascade" },
    ),
    title: text("title").notNull().default("Sin título"),
    // Emoji suelto (p. ej. "📄"), null = sin ícono custom. No hay soporte
    // para subir imágenes como ícono, solo emoji, igual que la Libreta no
    // tiene tags con color: mantener la personalización simple.
    icon: text("icon"),
    // "columns-N": el contenido se reparte en N columnas CSS, cortando
    // antes de cada HeadingOne/Two/Three (ver globals.css). No es un
    // bloque de columnas editable tipo Notion (elegís vos qué bloque va en
    // qué columna) — es automático según los encabezados que ya tenga la
    // página. Alcanza para el caso de una página "índice" con varias
    // secciones (como el Home migrado de Notion).
    layout: pageLayout("layout").notNull().default("normal"),
    content: jsonb("content").notNull().default({}),
    // "draft" cuando la crea/edita el MCP (ver src/lib/mcp/tools/pages.ts) —
    // ver Decisiones en CLAUDE.md, cola "Por revisar".
    reviewStatus: contentReviewStatus("review_status").notNull().default("reviewed"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("pages_user_id_idx").on(table.userId),
    index("pages_parent_id_idx").on(table.parentId),
    index("pages_review_status_idx").on(table.reviewStatus),
  ],
);

export const notes = lifeOs.table(
  "notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Sin título"),
    content: jsonb("content").notNull().default({}),
    tags: text("tags").array().notNull().default([]),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("notes_user_id_idx").on(table.userId)],
);

// --- Finanzas ---
// Los montos se guardan en centavos (integer, con signo: positivo =
// ingreso, negativo = gasto) para no arrastrar problemas de precisión de
// punto flotante. Se asume una sola moneda por ahora (el campo currency es
// solo para mostrar, no hay conversión).

export const accountType = lifeOs.enum("account_type", [
  "cash",
  "bank",
  "card",
  "other",
]);

export const categoryKind = lifeOs.enum("category_kind", [
  "income",
  "expense",
]);

export const accounts = lifeOs.table(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: accountType("type").notNull().default("bank"),
    currency: text("currency").notNull().default("ARS"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("accounts_user_id_idx").on(table.userId)],
);

export const categories = lifeOs.table(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    kind: categoryKind("kind").notNull().default("expense"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("categories_user_id_idx").on(table.userId)],
);

export const transactions = lifeOs.table(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    amountCents: integer("amount_cents").notNull(),
    description: text("description"),
    occurredAt: timestamp("occurred_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("transactions_user_id_idx").on(table.userId),
    index("transactions_account_id_idx").on(table.accountId),
    index("transactions_occurred_at_idx").on(table.occurredAt),
  ],
);

export const budgets = lifeOs.table(
  "budgets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    // Formato "YYYY-MM", ej. "2026-08".
    month: text("month").notNull(),
    limitCents: integer("limit_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("budgets_user_id_idx").on(table.userId),
    uniqueIndex("budgets_user_category_month_idx").on(
      table.userId,
      table.categoryId,
      table.month,
    ),
  ],
);

// --- Bases de datos genéricas ---
// El equivalente de una "database" de Notion: colecciones con columnas
// tipadas y filas, en vez de un módulo con schema fijo. A diferencia de
// pages/notes (un solo jsonb "content" con bloques), acá cada fila guarda
// sus valores en un jsonb "values" keyeado por columnId — no hace falta
// una tabla de celdas separada porque no hay bloques de texto rico adentro,
// solo valores escalares (o arrays, para multi_select).

export const databaseColumnType = lifeOs.enum("database_column_type", [
  "text",
  "number",
  "select",
  "multi_select",
  "date",
  "checkbox",
  "url",
]);

export const databases = lifeOs.table(
  "databases",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    icon: text("icon"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("databases_user_id_idx").on(table.userId)],
);

export const databaseColumns = lifeOs.table(
  "database_columns",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    databaseId: uuid("database_id")
      .notNull()
      .references(() => databases.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: databaseColumnType("type").notNull().default("text"),
    // Opciones para select/multi_select (las etiquetas disponibles). Null
    // para el resto de los tipos.
    options: text("options").array(),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("database_columns_database_id_idx").on(table.databaseId)],
);

export const databaseRows = lifeOs.table(
  "database_rows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    databaseId: uuid("database_id")
      .notNull()
      .references(() => databases.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    // { [columnId]: valor }. El tipo de cada valor depende del tipo de la
    // columna: text/url/select -> string, number -> number, multi_select ->
    // string[], date -> string "YYYY-MM-DD", checkbox -> boolean.
    values: jsonb("values").notNull().default({}),
    // Igual que pages/notes: bloques de Yoopta. En Notion cada fila de una
    // base de datos es también una página completa (texto, tablas,
    // imágenes) — esto es lo mismo acá, aparte de sus valores de columna.
    content: jsonb("content").notNull().default({}),
    // Mismo campo y mismo criterio que pages.reviewStatus — ver ahí.
    reviewStatus: contentReviewStatus("review_status").notNull().default("reviewed"),
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("database_rows_database_id_idx").on(table.databaseId),
    index("database_rows_review_status_idx").on(table.reviewStatus),
  ],
);

// --- Vínculo página <-> base de datos ---
// Una página puede "embeber" bases de datos existentes (ej. la página
// "Marketing y ventas" mostrando la base "Suite de productos" como una
// tarjeta clickeable) sin duplicar datos: esta tabla solo guarda qué
// databases se muestran en qué página. Único (pageId, databaseId) para no
// repetir el mismo embed dos veces en la misma página.

export const pageDatabaseLinks = lifeOs.table(
  "page_database_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    databaseId: uuid("database_id")
      .notNull()
      .references(() => databases.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("page_database_links_page_id_idx").on(table.pageId),
    index("page_database_links_database_id_idx").on(table.databaseId),
    uniqueIndex("page_database_links_page_database_idx").on(
      table.pageId,
      table.databaseId,
    ),
  ],
);

// --- Deshacer ---
// Un log de acciones reversibles, compartido por todos los módulos. Cada
// fila es una acción de usuario (crear/editar/eliminar algo) guardada como
// una lista ordenada de operaciones inversas ya resueltas (ver
// src/lib/undo.ts) — "Deshacer" simplemente ejecuta la entrada no
// deshecha más reciente y la marca como usada. No es un historial completo
// tipo Ctrl+Z (no hay redo), es una red de seguridad de un solo paso hacia
// atrás por click, repetible.

export const undoLog = lifeOs.table(
  "undo_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    description: text("description").notNull(),
    inverseOps: jsonb("inverse_ops").notNull(),
    undoneAt: timestamp("undone_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("undo_log_user_id_idx").on(table.userId)],
);

// --- MCP: log de llamadas ---
// Una fila por cada tool MCP invocado (ver src/lib/mcp/tool-helpers.ts,
// withLogging). El objetivo es poder auditar el uso del conector — qué se
// llamó, cuándo, si falló, cuánto tardó — y tener una idea del volumen de
// tokens, no un costo exacto: estimatedTokensIn/Out se calculan con una
// heurística de ~4 caracteres por token sobre los args y la respuesta
// (ver estimateTokens en log-call.ts), no con el tokenizer real de Claude
// (no es público). No se guarda el payload completo de cada llamada —
// solo un resumen corto — para no duplicar datos que ya viven en sus
// propias tablas ni inflar esta.

export const mcpCalls = lifeOs.table(
  "mcp_calls",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    toolName: text("tool_name").notNull(),
    success: boolean("success").notNull(),
    summary: text("summary"),
    durationMs: integer("duration_ms").notNull(),
    estimatedTokensIn: integer("estimated_tokens_in").notNull(),
    estimatedTokensOut: integer("estimated_tokens_out").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("mcp_calls_user_id_idx").on(table.userId),
    index("mcp_calls_created_at_idx").on(table.createdAt),
  ],
);

// --- Google Calendar ---
// Un solo usuario por ahora, así que una fila por user_id alcanza.

export const googleCalendarConnections = lifeOs.table(
  "google_calendar_connections",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("access_token").notNull(),
    refreshToken: text("refresh_token").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
);
