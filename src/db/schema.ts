import {
  type AnyPgColumn,
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
    position: integer("position").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("database_rows_database_id_idx").on(table.databaseId)],
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
