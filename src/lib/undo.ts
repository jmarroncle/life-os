import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  accounts,
  budgets,
  categories,
  databaseColumns,
  databaseRows,
  databases,
  notes,
  pages,
  projects,
  tasks,
  transactions,
  undoLog,
} from "@/db/schema";

// Todas las tablas de "contenido" que puede tocar el usuario, indexadas por
// nombre — le da a undoLastAction() una forma genérica de aplicar
// insert/update/delete sin un switch por módulo. Todas comparten una PK
// `id`, lo que hace que las tres operaciones sean uniformes.
const TABLES = {
  pages,
  tasks,
  projects,
  notes,
  accounts,
  categories,
  transactions,
  budgets,
  databases,
  databaseColumns,
  databaseRows,
} as const;

export type UndoTableName = keyof typeof TABLES;

export type InverseOp =
  // deshace un create: borrar la fila que se creó.
  | { op: "delete"; table: UndoTableName; id: string }
  // deshace un update: volver a poner los valores previos.
  | { op: "update"; table: UndoTableName; id: string; values: Record<string, unknown> }
  // deshace un delete: reinsertar la fila (con su id original, para que
  // cualquier otra fila que la referencie —ej. un link a una página—
  // siga apuntando a algo válido).
  | { op: "insert"; table: UndoTableName; values: Record<string, unknown> };

// Quita `id` de un snapshot para usarlo en un SET de update (no hace falta
// reescribir la PK, y evita pasarla dos veces por el where + el set).
export function omitId<T extends { id: unknown }>(row: T): Record<string, unknown> {
  const rest: Record<string, unknown> = { ...row };
  delete rest.id;
  return rest;
}

export async function logUndo(
  userId: string,
  description: string,
  inverseOps: InverseOp[],
) {
  if (inverseOps.length === 0) return;
  await db.insert(undoLog).values({ userId, description, inverseOps });
}

// El jsonb pierde el tipo Date (queda como string ISO) — se revive acá en
// vez de confiar en que el driver lo coerciona solo al escribir.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;

function reviveDates(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(values)) {
    out[key] = typeof value === "string" && ISO_DATE_RE.test(value) ? new Date(value) : value;
  }
  return out;
}

export async function undoLastAction(
  userId: string,
): Promise<{ ok: boolean; message: string }> {
  const [entry] = await db
    .select()
    .from(undoLog)
    .where(and(eq(undoLog.userId, userId), isNull(undoLog.undoneAt)))
    .orderBy(desc(undoLog.createdAt))
    .limit(1);

  if (!entry) {
    return { ok: false, message: "No hay nada para deshacer." };
  }

  const ops = entry.inverseOps as InverseOp[];

  for (const op of ops) {
    const table = TABLES[op.table];
    if (op.op === "delete") {
      await db.delete(table).where(eq(table.id, op.id));
    } else if (op.op === "update") {
      await db
        .update(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(reviveDates(op.values) as any)
        .where(eq(table.id, op.id));
    } else {
      await db
        .insert(table)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values(reviveDates(op.values) as any)
        .onConflictDoNothing();
    }
  }

  await db.update(undoLog).set({ undoneAt: new Date() }).where(eq(undoLog.id, entry.id));

  return { ok: true, message: entry.description };
}
