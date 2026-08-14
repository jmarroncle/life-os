import { protectedResourceHandler, metadataCorsOptionsRequestHandler } from "mcp-handler";

// RFC 9728 — le dice a un cliente MCP (claude.ai) dónde está el
// authorization server para este recurso (/api/mcp). Ver
// src/app/api/mcp/oauth/ para la implementación de ese authorization server.
const authServerUrls = [process.env.NEXT_PUBLIC_SITE_URL!];

export const GET = protectedResourceHandler({ authServerUrls });
export const OPTIONS = metadataCorsOptionsRequestHandler();
