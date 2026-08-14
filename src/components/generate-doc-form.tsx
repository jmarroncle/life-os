"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { createYooptaEditor } from "@yoopta/editor";
import { markdown } from "@yoopta/exports";
import { plugins, marks } from "@/lib/yoopta-plugins";
import { generateMarkdown, type GenerateDocState } from "@/app/(app)/data-center/generar/actions";
import { createPageWithContent } from "@/app/(app)/data-center/actions";

const initialState: GenerateDocState = { status: "idle", title: "", markdown: "" };

export function GenerateDocForm() {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(generateMarkdown, initialState);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const editor = createYooptaEditor({ plugins, marks });
      const content = markdown.deserialize(editor, state.markdown);
      const id = await createPageWithContent(state.title, content);
      router.push(`/data-center/paginas/${id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <form action={formAction} className="space-y-2">
        <textarea
          name="prompt"
          required
          rows={3}
          placeholder='¿Sobre qué querés que escriba? (ej: "documentación técnica sobre cómo funciona el módulo de Finanzas")'
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending ? "Generando…" : "Generar"}
        </button>
      </form>

      {state.message && <p className="text-sm text-red-600">{state.message}</p>}

      {state.status === "done" && (
        <div className="space-y-3 rounded-md border border-neutral-200 p-4">
          <p className="text-sm font-medium">{state.title}</p>
          <pre className="max-h-96 overflow-auto whitespace-pre-wrap text-xs text-neutral-500">
            {state.markdown}
          </pre>
          <button
            onClick={handleSave}
            disabled={saving}
            className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Guardando…" : "Guardar como página"}
          </button>
        </div>
      )}
    </div>
  );
}
