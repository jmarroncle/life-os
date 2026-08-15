"use client";

import { useRef, useState } from "react";
import { useYooptaEditor, type PluginElementRenderProps } from "@yoopta/editor";
import type { ImageElement } from "@yoopta/image";
import { uploadBlockImage } from "@/lib/uploads";

// @yoopta/image es "headless": su render por default es solo <img src=… />,
// sin ninguna forma de disparar la carga (confirmado leyendo su fuente —
// no hay botón, dropzone ni <input type="file"> en ningún lado). Este
// reemplaza ese render para agregar el estado "todavía no hay imagen":
// un botón que abre el selector de archivos nativo, sube con la misma
// server action que ya usaba ImageCommands.insertImage, y al terminar
// escribe el resultado con editor.updateElement (no hay otra forma
// pública de tocar solo las props de un elemento ya insertado).
export function BlockEditorImage({
  element,
  attributes,
  children,
  blockId,
}: PluginElementRenderProps) {
  const editor = useYooptaEditor();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const imageElement = element as ImageElement;
  const src = imageElement.props?.src;

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const { src: uploadedSrc, alt } = await uploadBlockImage(file);
      editor.updateElement({
        blockId,
        type: "image",
        props: { src: uploadedSrc, alt },
      });
    } catch {
      setError("No se pudo subir la imagen.");
    } finally {
      setUploading(false);
    }
  }

  if (src) {
    return (
      <div {...attributes} contentEditable={false}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={imageElement.props?.alt ?? ""}
          className="max-w-full rounded-md"
        />
        {children}
      </div>
    );
  }

  return (
    <div {...attributes} contentEditable={false}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-neutral-300 py-6 text-sm text-neutral-500 hover:border-neutral-400 hover:bg-neutral-50 disabled:opacity-50"
      >
        {uploading ? "Subiendo…" : "🖼️ Subir imagen"}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) handleFile(file);
          event.target.value = "";
        }}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      {children}
    </div>
  );
}
