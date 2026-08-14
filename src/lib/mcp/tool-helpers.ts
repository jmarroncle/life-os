import type { ServerContext } from "@modelcontextprotocol/server";

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
