import { NextResponse } from "next/server";
import { createHash } from "crypto";
import {
  issueAccessToken,
  verifyAuthorizationCode,
} from "@/lib/mcp/oauth-tokens";

function oauthError(error: string, description: string, status = 400) {
  return NextResponse.json(
    { error, error_description: description },
    { status },
  );
}

function verifyPkce(codeVerifier: string, codeChallenge: string): boolean {
  const computed = createHash("sha256").update(codeVerifier).digest("base64url");
  return computed === codeChallenge;
}

// Intercambio del código de autorización por un access token (RFC 6749
// §4.1.3 + PKCE, RFC 7636). Sin refresh tokens: el access token dura 90
// días (ver oauth-tokens.ts), después el usuario vuelve a pasar por
// /authorize.
export async function POST(req: Request) {
  const contentType = req.headers.get("content-type") ?? "";
  const params = contentType.includes("application/json")
    ? new URLSearchParams(await req.json().catch(() => ({})))
    : new URLSearchParams(await req.text());

  const grantType = params.get("grant_type");
  const code = params.get("code");
  const redirectUri = params.get("redirect_uri");
  const codeVerifier = params.get("code_verifier");

  if (grantType !== "authorization_code") {
    return oauthError("unsupported_grant_type", "Sólo se soporta authorization_code");
  }
  if (!code || !redirectUri || !codeVerifier) {
    return oauthError("invalid_request", "Faltan code, redirect_uri o code_verifier");
  }

  const payload = verifyAuthorizationCode(code);
  if (!payload) {
    return oauthError("invalid_grant", "Código inválido o expirado", 400);
  }
  if (payload.redirectUri !== redirectUri) {
    return oauthError("invalid_grant", "redirect_uri no coincide con el de /authorize");
  }
  if (!verifyPkce(codeVerifier, payload.codeChallenge)) {
    return oauthError("invalid_grant", "code_verifier no coincide con code_challenge");
  }

  const { token, expiresIn } = issueAccessToken(payload.userId);

  return NextResponse.json({
    access_token: token,
    token_type: "Bearer",
    expires_in: expiresIn,
    scope: "life-os",
  });
}
