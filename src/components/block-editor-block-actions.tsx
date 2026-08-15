"use client";

import { useYooptaEditor } from "@yoopta/editor";
import { FloatingBlockActions } from "@yoopta/ui/floating-block-actions";
import { BlockOptions, useBlockActions } from "@yoopta/ui/block-options";
import { DragHandle } from "@yoopta/ui/block-dnd";
import { extractBlockText } from "@/lib/yoopta-text";

export function BlockEditorBlockActions({
  onConvertToPage,
}: {
  // undefined = la feature no aplica en este contexto (ej. notas de la
  // Libreta, que no tienen jerarquía de páginas) — no se muestra el ítem.
  onConvertToPage?: (text: string) => Promise<{ url: string; label: string }>;
}) {
  const editor = useYooptaEditor();
  const { duplicateBlock, deleteBlock } = useBlockActions();

  async function convertToPage(
    blockId: string,
    blockData: { value: unknown[]; meta: { order: number } },
  ) {
    if (!onConvertToPage) return;
    const text = extractBlockText(blockData.value as never[]).trim();
    const { url, label } = await onConvertToPage(text);
    const order = blockData.meta.order;
    // No existe una forma confiable de mutar el value de un bloque ya
    // montado (cada bloque es su propio sub-editor Slate; updateBlock solo
    // toca el store de arriba y no se refleja en pantalla) — en cambio, se
    // borra el bloque original y se inserta uno nuevo con el link ya
    // armado en su lugar.
    deleteBlock(blockId);
    editor.insertBlock("Paragraph", {
      at: order,
      blockData: {
        value: [
          {
            id: crypto.randomUUID(),
            type: "paragraph",
            children: [
              { text: "" },
              {
                id: crypto.randomUUID(),
                type: "link",
                children: [{ text: label || "Sin título" }],
                props: {
                  url,
                  target: "_self",
                  rel: "noopener noreferrer",
                  title: "",
                  nodeType: "inline",
                },
              },
              { text: "" },
            ],
          },
        ] as never,
      },
    });
  }

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
            <DragHandle blockId={blockId} asChild>
              <FloatingBlockActions.Button title="Arrastrar para mover">
                ⠿
              </FloatingBlockActions.Button>
            </DragHandle>
            <BlockOptions>
              <BlockOptions.Trigger asChild>
                <FloatingBlockActions.Button title="Opciones del bloque">
                  ⋯
                </FloatingBlockActions.Button>
              </BlockOptions.Trigger>
              <BlockOptions.Content side="bottom" align="start">
                {onConvertToPage && (
                  <BlockOptions.Item
                    onSelect={() => convertToPage(blockId, blockData)}
                  >
                    Convertir en página
                  </BlockOptions.Item>
                )}
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
