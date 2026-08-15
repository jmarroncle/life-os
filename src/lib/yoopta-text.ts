// Helpers de texto plano para el contenido de bloques Yoopta, usados desde
// el cliente (a diferencia de src/lib/mcp/block-content.ts, que es su
// contraparte server-side para el MCP).

type SlateNode = { text?: string; children?: SlateNode[] };

export function extractBlockText(nodes: SlateNode[]): string {
  let result = "";
  for (const node of nodes) {
    if (typeof node.text === "string") {
      result += node.text;
    } else if (node.children) {
      result += extractBlockText(node.children);
    }
  }
  return result;
}
