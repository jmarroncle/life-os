import {
  index,
  integer,
  jsonb,
  pgSchema,
  text,
  timestamp,
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

export const pages = lifeOs.table(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    title: text("title").notNull().default("Sin título"),
    content: jsonb("content").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index("pages_user_id_idx").on(table.userId)],
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
