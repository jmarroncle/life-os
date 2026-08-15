"use client";

import { useMemo } from "react";
import YooptaEditor, {
  createYooptaEditor,
  type YooptaContentValue,
} from "@yoopta/editor";
import { BlockDndContext, SortableBlock } from "@yoopta/ui/block-dnd";
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
  onConvertToPage,
}: {
  initialValue: YooptaContentValue;
  onChange?: (value: YooptaContentValue) => void;
  placeholder?: string;
  readOnly?: boolean;
  onConvertToPage?: (text: string) => Promise<{ url: string; label: string }>;
}) {
  const editor = useMemo(
    () => createYooptaEditor({ plugins, marks, value: initialValue, readOnly }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const editorElement = (
    <YooptaEditor
      editor={editor}
      onChange={(value) => onChange?.(value)}
      placeholder={placeholder}
      className="yoopta-editor-life-os"
      renderBlock={
        readOnly
          ? undefined
          : ({ children, blockId }) => (
              <SortableBlock id={blockId} useDragHandle>
                {children}
              </SortableBlock>
            )
      }
    >
      {!readOnly && (
        <>
          <BlockEditorToolbar />
          <BlockEditorSlashMenu />
          <BlockEditorBlockActions onConvertToPage={onConvertToPage} />
        </>
      )}
    </YooptaEditor>
  );

  if (readOnly) return editorElement;

  return <BlockDndContext editor={editor}>{editorElement}</BlockDndContext>;
}
