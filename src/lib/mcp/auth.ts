import { timingSafeEqual } from "crypto";
import type { AuthInfo } from "@modelcontextprotocol/server";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Auth de un solo token fijo (MCP_ACCESS_TOKEN), no OAuth — Life OS es de
// un solo usuario, así que un secreto largo comparado en tiempo constante
// alcanza (mismo criterio que GITHUB_TOKEN: PAT en vez de una app OAuth
// completa). El userId autorizado (MCP_USER_ID, el id de auth.users en
// Supabase) viaja en `extra` y es lo que usan las tools para filtrar sus
// queries — no hay sesión de cookies acá, por eso no se puede reusar
// requireUser().
export async function verifyMcpToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  const expectedToken = process.env.MCP_ACCESS_TOKEN;
  const userId = process.env.MCP_USER_ID;

  if (!expectedToken || !userId || !bearerToken) return undefined;
  if (!safeEqual(bearerToken, expectedToken)) return undefined;

  return {
    token: bearerToken,
    clientId: "life-os-owner",
    scopes: ["life-os"],
    extra: { userId },
  };
}
