import { db } from "@/db";
import { mcpCalls } from "@/db/schema";
import type { ToolResult } from "@/lib/mcp/tool-helpers";

// Heurística estándar (~4 caracteres por token) — no es el tokenizer real
// de Claude (no es público), da una magnitud de uso, no un costo exacto.
export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.ceil(text.length / 4);
}

function resultText(result: ToolResult): string {
  return result.content.map((c) => c.text).join("\n");
}

export async function logMcpCall({
  userId,
  toolName,
  args,
  result,
  durationMs,
}: {
  userId: string;
  toolName: string;
  args: unknown;
  result: ToolResult;
  durationMs: number;
}) {
  const argsText = JSON.stringify(args ?? {});
  const outputText = resultText(result);

  await db.insert(mcpCalls).values({
    userId,
    toolName,
    success: !result.isError,
    summary: outputText.slice(0, 300),
    durationMs,
    estimatedTokensIn: estimateTokens(argsText),
    estimatedTokensOut: estimateTokens(outputText),
  });
}
