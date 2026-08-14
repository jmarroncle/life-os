import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { isAllowedRedirectUri } from "@/lib/mcp/oauth-redirect-allowlist";

// RFC 7591 — Dynamic Client Registration. No persiste nada: el client_id
// devuelto es un UUID cualquiera, no verificado luego en /authorize. La
// seguridad real de este servidor pasa por el login de Supabase + la
// allowlist de redirect_uri (ver oauth-redirect-allowlist.ts), no por
// validar qué client_id llegó. Esto alcanza para un flujo de un solo
// usuario; si algún día se conectan varios clientes MCP de terceros no
// confiables, esto necesitaría un registro real en base.
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const redirectUris = Array.isArray(body?.redirect_uris) ? body.redirect_uris : [];

  if (redirectUris.length === 0 || !redirectUris.every((uri: unknown) => typeof uri === "string")) {
    return NextResponse.json(
      { error: "invalid_client_metadata", error_description: "redirect_uris es requerido" },
      { status: 400 },
    );
  }

  if (!redirectUris.every(isAllowedRedirectUri)) {
    return NextResponse.json(
      { error: "invalid_redirect_uri", error_description: "Host de redirect_uri no permitido" },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      client_id: randomUUID(),
      client_id_issued_at: Math.floor(Date.now() / 1000),
      redirect_uris: redirectUris,
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code"],
      response_types: ["code"],
    },
    { status: 201 },
  );
}
