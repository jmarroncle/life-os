"use client";

import { useRef, useState, type ReactNode } from "react";
import { BlockEditor, type YooptaContentValue } from "@/components/block-editor";

type SaveStatus = "idle" | "saving" | "saved";

export function EntityEditor({
  initialTitle,
  initialContent,
  onSaveTitle,
  onSaveContent,
  extraHeader,
}: {
  initialTitle: string;
  initialContent: YooptaContentValue;
  onSaveTitle: (title: string) => Promise<void>;
  onSaveContent: (content: YooptaContentValue) => Promise<void>;
  extraHeader?: ReactNode;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const contentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleContentSave(value: YooptaContentValue) {
    setStatus("saving");
    if (contentTimer.current) clearTimeout(contentTimer.current);
    contentTimer.current = setTimeout(() => {
      onSaveContent(value).then(() => setStatus("saved"));
    }, 800);
  }

  async function handleTitleBlur(event: React.FocusEvent<HTMLInputElement>) {
    const title = event.target.value.trim() || "Sin título";
    setStatus("saving");
    await onSaveTitle(title);
    setStatus("saved");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <input
          defaultValue={initialTitle}
          onBlur={handleTitleBlur}
          placeholder="Sin título"
          className="w-full border-none bg-transparent text-2xl font-semibold outline-none placeholder:text-neutral-300"
        />
        <span className="shrink-0 text-xs text-neutral-400">
          {status === "saving" ? "Guardando…" : status === "saved" ? "Guardado" : ""}
        </span>
      </div>
      {extraHeader}
      <BlockEditor initialValue={initialContent} onChange={scheduleContentSave} />
    </div>
  );
}
