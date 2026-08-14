"use client";

import { useMemo } from "react";
import YooptaEditor, {
  createYooptaEditor,
  type YooptaContentValue,
} from "@yoopta/editor";
import { plugins, marks } from "@/lib/yoopta-plugins";
import { BlockEditorToolbar } from "@/components/block-editor-toolbar";
import { BlockEditorSlashMenu } from "@/components/block-editor-slash-menu";
import { BlockEditorBlockActions } from "@/components/block-editor-block-actions";

export type { YooptaContentValue };

export function emptyBlockValue(): YooptaContentValue {
  return {} as YooptaContentValue;
}

export function BlockEditor({
  initialValue,
  onChange,
  placeholder = "Escribí algo, o \"# \" para un título, \"- \" para una lista…",
  readOnly = false,
}: {
  initialValue: YooptaContentValue;
  onChange?: (value: YooptaContentValue) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const editor = useMemo(
    () => createYooptaEditor({ plugins, marks, value: initialValue, readOnly }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <YooptaEditor
      editor={editor}
      onChange={(value) => onChange?.(value)}
      placeholder={placeholder}
      className="yoopta-editor-life-os"
    >
      {!readOnly && (
        <>
          <BlockEditorToolbar />
          <BlockEditorSlashMenu />
          <BlockEditorBlockActions />
        </>
      )}
    </YooptaEditor>
  );
}
