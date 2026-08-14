"use client";

import { useYooptaEditor } from "@yoopta/editor";
import { FloatingBlockActions } from "@yoopta/ui/floating-block-actions";
import { BlockOptions, useBlockActions } from "@yoopta/ui/block-options";

export function BlockEditorBlockActions() {
  const editor = useYooptaEditor();
  const { duplicateBlock, deleteBlock } = useBlockActions();

  return (
    <FloatingBlockActions>
      {({ blockId, blockData }) => {
        if (!blockId || !blockData) return null;

        return (
          <>
            <FloatingBlockActions.Button
              title="Agregar bloque debajo"
              onClick={() =>
                editor.insertBlock("Paragraph", {
                  at: blockData.meta.order + 1,
                  focus: true,
                })
              }
            >
              +
            </FloatingBlockActions.Button>
            <BlockOptions>
              <BlockOptions.Trigger asChild>
                <FloatingBlockActions.Button title="Opciones del bloque">
                  ⠿
                </FloatingBlockActions.Button>
              </BlockOptions.Trigger>
              <BlockOptions.Content side="bottom" align="start">
                <BlockOptions.Item onSelect={() => duplicateBlock(blockId)}>
                  Duplicar
                </BlockOptions.Item>
                <BlockOptions.Item
                  variant="destructive"
                  onSelect={() => deleteBlock(blockId)}
                >
                  Eliminar
                </BlockOptions.Item>
              </BlockOptions.Content>
            </BlockOptions>
          </>
        );
      }}
    </FloatingBlockActions>
  );
}
