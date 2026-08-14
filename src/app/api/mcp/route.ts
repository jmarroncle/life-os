import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { registerAllTools } from "@/lib/mcp/tools";
import { verifyMcpToken } from "@/lib/mcp/auth";

const handler = createMcpHandler(
  (server) => {
    registerAllTools(server);
  },
  {
    serverInfo: { name: "life-os-mcp-server", version: "1.0.0" },
  },
);

const authedHandler = withMcpAuth(handler, verifyMcpToken, { required: true });

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
