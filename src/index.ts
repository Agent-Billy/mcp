#!/usr/bin/env node

/**
 * Agent Billy — MCP Server Entry Point
 *
 * Local MCP proxy that connects to a Billy container API.
 * Runs on stdio transport for use with Claude Desktop, Cursor, etc.
 *
 * Usage:
 *   agent-billy --api-url https://yourorg.agentbilly.ai --token <jwt>
 *
 * Environment variables:
 *   BILLY_API_URL  — Billy container API URL
 *   BILLY_TOKEN    — JWT auth token
 *   BILLY_API_KEY  — API key (alternative to token)
 */

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

function parseArgs(args: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--api-url" && args[i + 1]) {
      result["apiUrl"] = args[++i];
    } else if (arg === "--token" && args[i + 1]) {
      result["token"] = args[++i];
    } else if (arg === "--api-key" && args[i + 1]) {
      result["apiKey"] = args[++i];
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }
  return result;
}

function printHelp(): void {
  const help = `
Agent Billy — MCP Server for Stripe Billing

Usage:
  agent-billy --api-url <url> --token <jwt>

Options:
  --api-url   Billy container API URL (or BILLY_API_URL env var)
  --token     JWT auth token (or BILLY_TOKEN env var)
  --api-key   API key, alternative to token (or BILLY_API_KEY env var)
  --help, -h  Show this help message

Environment Variables:
  BILLY_API_URL   Billy container API URL
  BILLY_TOKEN     JWT auth token
  BILLY_API_KEY   API key (alternative to token)

Example MCP config (Claude Desktop):
  {
    "mcpServers": {
      "billy": {
        "command": "npx",
        "args": ["agent-billy"],
        "env": {
          "BILLY_API_URL": "https://yourorg.agentbilly.ai",
          "BILLY_TOKEN": "your-jwt-token"
        }
      }
    }
  }
`;
  process.stderr.write(help);
}

async function main(): Promise<void> {
  const cliArgs = parseArgs(process.argv.slice(2));

  const apiUrl = cliArgs["apiUrl"] || process.env["BILLY_API_URL"];
  const token = cliArgs["token"] || process.env["BILLY_TOKEN"];
  const apiKey = cliArgs["apiKey"] || process.env["BILLY_API_KEY"];

  if (!apiUrl) {
    process.stderr.write(
      "Error: --api-url or BILLY_API_URL is required.\nRun with --help for usage.\n"
    );
    process.exit(1);
  }

  if (!token && !apiKey) {
    process.stderr.write(
      "Error: --token (BILLY_TOKEN) or --api-key (BILLY_API_KEY) is required.\nRun with --help for usage.\n"
    );
    process.exit(1);
  }

  const server = createServer({ apiUrl, token, apiKey });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `Agent Billy MCP server running — connected to ${apiUrl}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
