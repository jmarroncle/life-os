import { NextResponse } from "next/server";
import { metadataCorsOptionsRequestHandler } from "mcp-handler";

// RFC 8414 — metadata del authorization server mínimo implementado en
// src/app/api/mcp/oauth/{authorize,token,register}. No hay refresh tokens
// (el access token dura 90 días, ver oauth-tokens.ts) y sólo se soporta
// PKCE con S256, sin client secret (cliente público, como claude.ai).
export async function GET() {
  const origin = process.env.NEXT_PUBLIC_SITE_URL!;

  return NextResponse.json({
    issuer: origin,
    authorization_endpoint: `${origin}/api/mcp/oauth/authorize`,
    token_endpoint: `${origin}/api/mcp/oauth/token`,
    registration_endpoint: `${origin}/api/mcp/oauth/register`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none"],
  });
}

export const OPTIONS = metadataCorsOptionsRequestHandler();
