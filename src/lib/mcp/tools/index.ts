import type { McpServer } from "@modelcontextprotocol/server";
import { registerTaskTools } from "./tasks";
import { registerPageTools } from "./pages";
import { registerNoteTools } from "./notes";
import { registerFinanceTools } from "./finance";

export function registerAllTools(server: McpServer) {
  registerTaskTools(server);
  registerPageTools(server);
  registerNoteTools(server);
  registerFinanceTools(server);
}
