import { createHmac, timingSafeEqual } from "crypto";

// Tokens/códigos stateless firmados con HMAC, usando MCP_ACCESS_TOKEN como
// clave — evita una tabla nueva en la base sólo para este flujo OAuth (ver
// CLAUDE.md, "Servidor MCP embebido"). El servidor de vuelta y media que
// verifica la firma es la única fuente de verdad; no hay estado persistido.

function getSigningKey(): string {
  const secret = process.env.MCP_ACCESS_TOKEN;
  if (!secret) throw new Error("MCP_ACCESS_TOKEN no configurado");
  return secret;
}

function sign(body: string): string {
  return createHmac("sha256", getSigningKey()).update(body).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function encode(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString("base64url");
}

function decode<T>(str: string): T | undefined {
  try {
    return JSON.parse(Buffer.from(str, "base64url").toString("utf8")) as T;
  } catch {
    return undefined;
  }
}

function pack(payload: unknown): string {
  const body = encode(payload);
  return `${body}.${sign(body)}`;
}

function unpack<T>(token: string): T | undefined {
  const [body, sig] = token.split(".");
  if (!body || !sig || !safeEqual(sig, sign(body))) return undefined;
  return decode<T>(body);
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

export type AuthorizationCodePayload = {
  userId: string;
  redirectUri: string;
  codeChallenge: string;
  exp: number;
};

export function issueAuthorizationCode(
  data: Omit<AuthorizationCodePayload, "exp">,
): string {
  return pack({ ...data, exp: nowSeconds() + 5 * 60 } satisfies AuthorizationCodePayload);
}

export function verifyAuthorizationCode(
  code: string,
): AuthorizationCodePayload | undefined {
  const payload = unpack<AuthorizationCodePayload>(code);
  if (!payload || payload.exp < nowSeconds()) return undefined;
  return payload;
}

export type AccessTokenPayload = { userId: string; exp: number };

const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 días

export function issueAccessToken(userId: string): {
  token: string;
  expiresIn: number;
} {
  const exp = nowSeconds() + ACCESS_TOKEN_TTL_SECONDS;
  return { token: pack({ userId, exp } satisfies AccessTokenPayload), expiresIn: ACCESS_TOKEN_TTL_SECONDS };
}

export function verifyAccessToken(token: string): AccessTokenPayload | undefined {
  const payload = unpack<AccessTokenPayload>(token);
  if (!payload || payload.exp < nowSeconds()) return undefined;
  return payload;
}
