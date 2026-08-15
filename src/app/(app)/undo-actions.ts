"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { undoLastAction as runUndo } from "@/lib/undo";

export async function undoLastAction() {
  const user = await requireUser();
  const result = await runUndo(user.id);
  if (result.ok) {
    // Cualquier módulo puede haber sido tocado por la acción deshecha —
    // revalidar todo el árbol es más simple y seguro que tratar de
    // adivinar qué rutas puntuales cambiaron.
    revalidatePath("/", "layout");
  }
  return result;
}
