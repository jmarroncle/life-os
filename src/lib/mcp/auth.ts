import { timingSafeEqual } from "crypto";
import type { AuthInfo } from "@modelcontextprotocol/server";
import { verifyAccessToken } from "./oauth-tokens";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

// Dos formas de llegar acá con un Bearer token válido:
//
// 1. Token fijo (MCP_ACCESS_TOKEN), no OAuth — pensado para pegar a mano en
//    Claude Code CLI / la config de Claude Desktop. Life OS es de un solo
//    usuario, así que un secreto largo comparado en tiempo constante
//    alcanza (mismo criterio que GITHUB_TOKEN: PAT en vez de una app OAuth
//    completa), y el userId autorizado sale de MCP_USER_ID.
//
// 2. Token emitido por nuestro propio mini authorization server
//    (src/app/api/mcp/oauth/, ver oauth-tokens.ts) — necesario porque
//    claude.ai (y otros clientes MCP "remotos") no ofrecen forma de pegar
//    un header a mano: fuerzan el flujo OAuth 2.1 con PKCE. El token es
//    stateless (firmado con HMAC usando el mismo MCP_ACCESS_TOKEN como
//    clave) y el userId que lleva adentro es el de la sesión de Supabase
//    que aprobó el consentimiento, no el de una env var.
//
// En ambos casos el userId autorizado viaja en `extra` y es lo que usan
// las tools para filtrar sus queries — no hay sesión de cookies acá, por
// eso no se puede reusar requireUser().
export async function verifyMcpToken(
  _req: Request,
  bearerToken?: string,
): Promise<AuthInfo | undefined> {
  if (!bearerToken) return undefined;

  const expectedToken = process.env.MCP_ACCESS_TOKEN;
  const staticUserId = process.env.MCP_USER_ID;
  if (expectedToken && staticUserId && safeEqual(bearerToken, expectedToken)) {
    return {
      token: bearerToken,
      clientId: "life-os-owner",
      scopes: ["life-os"],
      extra: { userId: staticUserId },
    };
  }

  const oauthPayload = verifyAccessToken(bearerToken);
  if (oauthPayload) {
    return {
      token: bearerToken,
      clientId: "life-os-oauth-client",
      scopes: ["life-os"],
      extra: { userId: oauthPayload.userId },
    };
  }

  return undefined;
}
