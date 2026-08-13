"use client";

import { useState } from "react";
import { EntityEditor } from "@/components/entity-editor";
import type { YooptaContentValue } from "@/components/block-editor";
import { parseTags } from "@/lib/tags";

export function NoteEditor({
  initialTitle,
  initialContent,
  initialTags,
  onSaveTitle,
  onSaveContent,
  onSaveTags,
}: {
  initialTitle: string;
  initialContent: YooptaContentValue;
  initialTags: string[];
  onSaveTitle: (title: string) => Promise<void>;
  onSaveContent: (content: YooptaContentValue) => Promise<void>;
  onSaveTags: (tags: string[]) => Promise<void>;
}) {
  const [tagsInput, setTagsInput] = useState(initialTags.join(", "));

  return (
    <EntityEditor
      initialTitle={initialTitle}
      initialContent={initialContent}
      onSaveTitle={onSaveTitle}
      onSaveContent={onSaveContent}
      extraHeader={
        <input
          value={tagsInput}
          onChange={(event) => setTagsInput(event.target.value)}
          onBlur={() => onSaveTags(parseTags(tagsInput))}
          placeholder="tags separados por coma"
          className="w-full rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500 outline-none focus:border-neutral-400"
        />
      }
    />
  );
}
