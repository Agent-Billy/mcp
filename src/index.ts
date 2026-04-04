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

/**
 * Validate that the API URL uses HTTPS and does not point to
 * private/internal networks (SSRF protection).
 */
function validateApiUrl(raw: string): string {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`Invalid API URL: ${raw}`);
  }

  // Enforce HTTPS in production (allow http only for localhost dev)
  const isLocalhost =
    parsed.hostname === "localhost" || parsed.hostname === "127.0.0.1";
  if (parsed.protocol !== "https:" && !isLocalhost) {
    throw new Error(
      "BILLY_API_URL must use HTTPS for non-localhost connections."
    );
  }

  // Block private/internal IP ranges to prevent SSRF
  const host = parsed.hostname;
  const blockedPatterns = [
    /^10\./,                          // 10.0.0.0/8
    /^172\.(1[6-9]|2\d|3[01])\./,    // 172.16.0.0/12
    /^192\.168\./,                    // 192.168.0.0/16
    /^169\.254\./,                    // link-local / AWS IMDS
    /^0\./,                           // 0.0.0.0/8
    /^\[?fe80:/i,                     // IPv6 link-local
    /^\[?::1\]?$/,                    // IPv6 loopback
    /^\[?fd/i,                        // IPv6 ULA
  ];

  if (!isLocalhost) {
    for (const pattern of blockedPatterns) {
      if (pattern.test(host)) {
        throw new Error(
          "BILLY_API_URL must not point to private or internal network addresses."
        );
      }
    }
  }

  // Block file:// and other dangerous schemes
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new Error("BILLY_API_URL must use the https: (or http: for localhost) scheme.");
  }

  // Strip credentials from URL if present
  if (parsed.username || parsed.password) {
    throw new Error("BILLY_API_URL must not contain embedded credentials.");
  }

  return raw;
}

/**
 * Redact credentials and sensitive parts of a URL for safe logging.
 */
function safeLogUrl(raw: string): string {
  try {
    const u = new URL(raw);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "(invalid URL)";
  }
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

  const validatedUrl = validateApiUrl(apiUrl);
  const server = createServer({ apiUrl: validatedUrl, token, apiKey });

  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write(
    `Agent Billy MCP server running — connected to ${safeLogUrl(validatedUrl)}\n`
  );
}

main().catch((err) => {
  process.stderr.write(`Fatal error: ${err}\n`);
  process.exit(1);
});
