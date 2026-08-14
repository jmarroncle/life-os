import { randomUUID } from "crypto";
import type { YooptaContentValue } from "@/components/block-editor";

// El editor de bloques (Yoopta) guarda el contenido como JSONB de bloques
// Slate, no como texto/markdown plano. markdown.deserialize de
// @yoopta/exports necesita DOMParser (solo corre en el browser, ver
// generate-doc-form.tsx), así que acá no podemos convertir markdown rico
// del lado del servidor. En vez de eso, armamos bloques "Paragraph" a mano
// a partir de texto plano — un párrafo por bloque, separados por línea en
// blanco. Sin formato rico (títulos, listas) desde el MCP; para eso usar
// la app.
export function buildSimpleContent(text: string): YooptaContentValue {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
  const list = paragraphs.length > 0 ? paragraphs : [""];

  const blocks: YooptaContentValue = {};
  list.forEach((paragraphText, index) => {
    const blockId = randomUUID();
    blocks[blockId] = {
      id: blockId,
      type: "Paragraph",
      value: [
        {
          id: randomUUID(),
          type: "paragraph",
          children: [{ text: paragraphText }],
        },
      ],
      meta: { order: index, depth: 0 },
    } as YooptaContentValue[string];
  });
  return blocks;
}

type SlateNode = { text?: string; children?: SlateNode[] };
type YooptaBlockLike = { value?: SlateNode[]; meta?: { order?: number } };

// Inverso de buildSimpleContent, pero también sirve para leer páginas
// creadas desde la app (con títulos, listas, etc.) — extrae solo el texto,
// perdiendo el formato, para devolverlo a un chat.
export function extractPlainText(content: unknown): string {
  if (!content || typeof content !== "object") return "";
  const blocks = Object.values(content as Record<string, YooptaBlockLike>);
  blocks.sort((a, b) => (a.meta?.order ?? 0) - (b.meta?.order ?? 0));

  const lines: string[] = [];
  for (const block of blocks) {
    const text = extractText(block.value ?? []);
    if (text) lines.push(text);
  }
  return lines.join("\n\n");
}

function extractText(nodes: SlateNode[]): string {
  let result = "";
  for (const node of nodes) {
    if (typeof node.text === "string") {
      result += node.text;
    } else if (node.children) {
      result += extractText(node.children);
    }
  }
  return result;
}
