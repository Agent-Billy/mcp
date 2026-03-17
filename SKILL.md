# Agent Billy — AI Billing Manager for Stripe

## Overview

Agent Billy is an MCP server that gives AI agents and teams secure, role-based access to Stripe billing operations. Process refunds, manage subscriptions, search customers, and handle invoices — all with permission controls and audit logging.

## What It Does

- **Customer lookups** — search and view customer details, payment history, subscriptions
- **Refund processing** — process refunds with role-based spending limits
- **Subscription management** — view, update, cancel subscriptions
- **Invoice handling** — view, create, and send invoices
- **Audit trail** — every action logged with who, what, when, and how

## Installation

```bash
npx agent-billy
```

Works with Claude Desktop, Claude Code, Cursor, and any MCP-compatible client via stdio or HTTP transport.

## Configuration

Connect your Stripe account using a restricted API key. Billy stores keys in Azure Key Vault — never exposed to team members.

```json
{
  "mcpServers": {
    "agent-billy": {
      "command": "npx",
      "args": ["agent-billy"]
    }
  }
}
```

## Permissions

Four built-in role levels:

| Role | Capabilities |
|------|-------------|
| **Read-Only** | View customers, subscriptions, invoices |
| **Billing Clerk** | + Process refunds (with spending limits) |
| **Billing Manager** | + Manage subscriptions, create invoices |
| **Owner** | + Team management, audit log, settings |

## Key Features

- **Sub-100ms reads** — Stripe data synced to local PostgreSQL via Stripe Sync Engine
- **Role-based access** — 4 permission levels with configurable refund limits
- **Audit logging** — every action tracked (dashboard and MCP)
- **Per-customer isolation** — dedicated container per customer on Azure
- **Security** — Stripe keys in Azure Key Vault, never visible to team

## Pricing

- Starter: $14.99/mo (3 team members)
- Pro: $29.99/mo (10 team members)
- Business: $79.99/mo (unlimited)
- 14-day free trial, no credit card required

## Links

- Website: https://agentbilly.ai
- npm: https://www.npmjs.com/package/agent-billy
- GitHub: https://github.com/Agent-Billy/mcp
- Docs: https://agentbilly.ai/docs

## Tags

stripe, billing, mcp, finance, payments, ai-agent, role-based-access, audit-logging, saas

## Author

Agent Billy Team — https://agentbilly.ai
