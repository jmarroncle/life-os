"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
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
  layout = "normal",
}: {
  initialValue: YooptaContentValue;
  onChange?: (value: YooptaContentValue) => void;
  placeholder?: string;
  readOnly?: boolean;
  onConvertToPage?: (text: string) => Promise<{ url: string; label: string }>;
  // "columns-N": reparte el contenido en columnas CSS, ver globals.css.
  layout?: "normal" | "columns-2" | "columns-3";
}) {
  const editor = useMemo(
    () => createYooptaEditor({ plugins, marks, value: initialValue, readOnly }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const router = useRouter();

  // Dentro de un bloque editable (contentEditable), el navegador NO sigue
  // un <a href> con un click normal (lo trata como "posicionar el cursor",
  // no como "navegar") — es comportamiento nativo, no un bug de Yoopta.
  // Se intercepta acá para que los links armados por "Convertir en página"
  // (y cualquier otro link) funcionen con un click normal, en modo edición
  // o lectura por igual.
  function handleClickCapture(event: React.MouseEvent<HTMLDivElement>) {
    const anchor = (event.target as HTMLElement).closest(
      "a[data-element-type='link']",
    );
    if (!anchor) return;
    const href = anchor.getAttribute("href");
    if (!href) return;
    event.preventDefault();
    event.stopPropagation();
    const openInNewTab = event.metaKey || event.ctrlKey;
    if (href.startsWith("/") && !openInNewTab) {
      router.push(href);
    } else {
      window.open(href, openInNewTab ? "_blank" : anchor.getAttribute("target") || "_self");
    }
  }

  // El "+/arrastrar/⋯" que aparece al pasar el mouse sobre un bloque usa,
  // adentro de Yoopta, la posición Y del mouse para decidir qué bloque
  // está "hovereado" — asume una sola columna de arriba a abajo. Con CSS
  // multi-column (layout columns-N) varios bloques de columnas distintas
  // comparten la misma banda Y, así que ese cálculo agarra el bloque
  // equivocado (confirmado: el menú aparecía sobre otro bloque, y su área
  // de click de más podía llegar a tapar un link real). Se desactiva ese
  // hover UI (y el drag-and-drop, que depende del mismo tracking) en
  // páginas con columnas — se puede seguir editando texto y usando "/",
  // solo se pierde la barrita flotante por bloque.
  const perBlockHoverUiEnabled = !readOnly && layout === "normal";

  const editorElement = (
    <YooptaEditor
      editor={editor}
      onChange={(value) => onChange?.(value)}
      placeholder={placeholder}
      className={
        layout === "normal"
          ? "yoopta-editor-life-os"
          : `yoopta-editor-life-os yoopta-editor-${layout}`
      }
      renderBlock={
        perBlockHoverUiEnabled
          ? ({ children, blockId }) => (
              <SortableBlock id={blockId} useDragHandle>
                {children}
              </SortableBlock>
            )
          : undefined
      }
    >
      {!readOnly && (
        <>
          <BlockEditorToolbar />
          <BlockEditorSlashMenu />
          {perBlockHoverUiEnabled && (
            <BlockEditorBlockActions onConvertToPage={onConvertToPage} />
          )}
        </>
      )}
    </YooptaEditor>
  );

  if (!perBlockHoverUiEnabled) {
    return <div onClickCapture={handleClickCapture}>{editorElement}</div>;
  }

  return (
    <div onClickCapture={handleClickCapture}>
      <BlockDndContext editor={editor}>{editorElement}</BlockDndContext>
    </div>
  );
}
