import type { ServerContext } from "@modelcontextprotocol/server";
import { logMcpCall } from "@/lib/mcp/log-call";

export type ToolResult = {
  content: Array<{ type: "text"; text: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

export function errorResult(message: string): ToolResult {
  return {
    content: [{ type: "text", text: `Error: ${message}` }],
    isError: true,
  };
}

export function jsonResult(
  summary: string,
  data: Record<string, unknown>,
): ToolResult {
  return {
    content: [
      { type: "text", text: `${summary}\n\n${JSON.stringify(data, null, 2)}` },
    ],
    structuredContent: data,
  };
}

// Resuelve el userId desde el AuthInfo que dejó withMcpAuth en el request
// (ver src/lib/mcp/auth.ts) y centraliza el try/catch de cada tool — así
// cada handler de tool solo escribe su lógica de negocio.
export function withUser<Args>(
  fn: (args: Args, userId: string) => Promise<ToolResult>,
) {
  return async (args: Args, ctx: ServerContext): Promise<ToolResult> => {
    const userId = ctx.http?.authInfo?.extra?.userId;
    if (typeof userId !== "string" || !userId) {
      return errorResult("No autenticado.");
    }
    try {
      return await fn(args, userId);
    } catch (error) {
      return errorResult(
        error instanceof Error ? error.message : String(error),
      );
    }
  };
}

// Envuelve un handler ya armado con withUser() y registra la llamada en
// mcp_calls (duración, éxito, tokens estimados) — ver src/lib/mcp/log-call.ts.
// Un fallo al loguear nunca debe tirar abajo la respuesta real de la tool,
// por eso el catch silencioso: la auditoría es best-effort, no una garantía.
export function withLogging<Args>(
  toolName: string,
  fn: (args: Args, ctx: ServerContext) => Promise<ToolResult>,
) {
  return async (args: Args, ctx: ServerContext): Promise<ToolResult> => {
    const start = Date.now();
    const result = await fn(args, ctx);
    const userId = ctx.http?.authInfo?.extra?.userId;
    if (typeof userId === "string" && userId) {
      logMcpCall({
        userId,
        toolName,
        args,
        result,
        durationMs: Date.now() - start,
      }).catch(() => {});
    }
    return result;
  };
}
