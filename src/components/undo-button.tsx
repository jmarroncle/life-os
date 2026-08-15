"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function UndoButton({
  onUndo,
}: {
  onUndo: () => Promise<{ ok: boolean; message: string }>;
}) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      try {
        const result = await onUndo();
        setFeedback(result.ok ? `Deshecho: ${result.message}` : result.message);
        router.refresh();
      } catch {
        setFeedback("No se pudo deshacer.");
      }
      setTimeout(() => setFeedback(null), 4000);
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 py-1 text-xs text-neutral-600 hover:bg-neutral-100 disabled:opacity-50"
        title="Deshacer la última acción"
      >
        <span aria-hidden>↶</span>
        {pending ? "Deshaciendo…" : "Deshacer"}
      </button>
      {feedback && <span className="text-xs text-neutral-400">{feedback}</span>}
    </div>
  );
}
