/**
 * MCP Server Setup
 *
 * Creates and configures the Agent Billy MCP server
 * with all billing tools registered.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { BillyClient, type BillyClientOptions } from "./client.js";
import { registerTools } from "./tools.js";

const VERSION = "1.0.0";

export function createServer(clientOptions: BillyClientOptions): McpServer {
  const server = new McpServer({
    name: "agent-billy",
    version: VERSION,
  });

  const client = new BillyClient(clientOptions);

  registerTools(server, client);

  return server;
}
