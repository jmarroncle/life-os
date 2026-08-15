"use client";

import { useRef, useState } from "react";
import { BlockEditor, type YooptaContentValue } from "@/components/block-editor";

type SaveStatus = "idle" | "saving" | "saved";

export function RowContentEditor({
  initialContent,
  onSaveContent,
}: {
  initialContent: YooptaContentValue;
  onSaveContent: (content: YooptaContentValue) => Promise<void>;
}) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function scheduleSave(value: YooptaContentValue) {
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      onSaveContent(value).then(() => setStatus("saved"));
    }, 800);
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <span className="text-xs text-neutral-400">
          {status === "saving" ? "Guardando…" : status === "saved" ? "Guardado" : ""}
        </span>
      </div>
      <BlockEditor initialValue={initialContent} onChange={scheduleSave} />
    </div>
  );
}
