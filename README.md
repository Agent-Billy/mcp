# Agent Billy MCP Server

Local MCP proxy that gives AI assistants (Claude, Cursor, Copilot) secure, role-based access to your Stripe billing through your Billy container API.

## Quick Start

```bash
npx agent-billy --api-url https://yourorg.agentbilly.ai --api-key billy_your-api-key
```

Or use environment variables:

```bash
export BILLY_API_URL=https://yourorg.agentbilly.ai
export BILLY_API_KEY=billy_your-api-key
npx agent-billy
```

## MCP Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "agent-billy": {
      "command": "npx",
      "args": ["-y", "agent-billy"],
      "env": {
        "BILLY_API_URL": "https://yourorg.agentbilly.ai",
        "BILLY_API_KEY": "billy_your-api-key"
      }
    }
  }
}
```

Config file locations:
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

### Claude Code

```bash
claude mcp add agent-billy \
  -e BILLY_API_URL=https://yourorg.agentbilly.ai \
  -e BILLY_API_KEY=billy_your-api-key \
  -- npx -y agent-billy
```

### Cursor

Go to **Settings > MCP Servers > Add new MCP server** and enter:

```json
{
  "command": "npx",
  "args": ["-y", "agent-billy"],
  "env": {
    "BILLY_API_URL": "https://yourorg.agentbilly.ai",
    "BILLY_API_KEY": "billy_your-api-key"
  }
}
```

### VS Code (GitHub Copilot)

Add to your `settings.json`:

```json
{
  "mcp": {
    "servers": {
      "agent-billy": {
        "command": "npx",
        "args": ["-y", "agent-billy"],
        "env": {
          "BILLY_API_URL": "https://yourorg.agentbilly.ai",
          "BILLY_API_KEY": "billy_your-api-key"
        }
      }
    }
  }
}
```

## Authentication

Generate an API key from your Billy dashboard:

1. Log in at `https://yourorg.agentbilly.ai`
2. Go to **Settings > API Keys**
3. Click **Generate Key** and choose a role
4. Copy the key and use it as your `BILLY_API_KEY`

API keys inherit the role you assign when creating them. A Billing Clerk key can only perform Billing Clerk actions. Keys can be revoked at any time from Settings.

## Available Tools

### Read Tools

| Tool | Description |
|------|-------------|
| `billy_list_charges` | List recent charges. Filter by status (succeeded, failed, pending). |
| `billy_get_charge` | Get details for a specific charge by Stripe charge ID. |
| `billy_list_customers` | List customers with pagination. |
| `billy_get_customer` | Get details for a specific customer by Stripe customer ID. |
| `billy_list_subscriptions` | List subscriptions. Filter by status (active, past_due, canceled, trialing). |
| `billy_list_invoices` | List invoices. Filter by status (draft, open, paid, void, uncollectible). |
| `billy_list_refunds` | List all refunds that have been issued. |
| `billy_get_stats` | Dashboard snapshot: MTD revenue, success rate, active subs, failed charges. |
| `billy_search` | Search across customers, charges, subscriptions, and invoices by keyword. |

### Write Tools

| Tool | Description |
|------|-------------|
| `billy_create_refund` | Issue a full or partial refund for a charge. |
| `billy_create_customer` | Create a new Stripe customer. |
| `billy_update_customer` | Update a customer's email, name, description, or metadata. |
| `billy_cancel_subscription` | Cancel a subscription (at period end or immediately). |
| `billy_reactivate_subscription` | Reactivate a canceled subscription that hasn't fully expired. |
| `billy_send_invoice` | Send an invoice to the customer via email. |
| `billy_void_invoice` | Void an invoice so it can no longer be paid. |
| `billy_create_coupon` | Create a discount coupon (percentage or fixed amount). |
| `billy_delete_coupon` | Delete a coupon so it can't be applied to new customers. |

## Role-Based Access

All permissions are enforced server-side. The API key inherits the role of the user who created it.

| Role | Read | Refunds | Manage Subs | Invoices | Customers | Coupons |
|------|------|---------|-------------|----------|-----------|---------|
| **Owner** | All | Unlimited | Full | Full | Full | Full |
| **Billing Manager** | All | Up to $5,000 | Full | Full | Full | Full |
| **Billing Clerk** | All | Up to $100 | View only | View only | Update only | No |
| **Read Only** | All | No | No | No | No | No |

## Spending Limits

Refund limits are enforced per transaction, per role:

- **Owner:** No limit
- **Billing Manager:** $5,000 per refund
- **Billing Clerk:** $100 per refund
- **Read Only:** Cannot issue refunds

Attempting to exceed your limit returns a permission error. The action is logged in the audit trail.

## CLI Options

```
agent-billy --api-url <url> --api-key <key>

Options:
  --api-url   Billy container API URL (or BILLY_API_URL env var)
  --api-key   API key (or BILLY_API_KEY env var)
  --token     JWT auth token, alternative to api-key (or BILLY_TOKEN env var)
  --help, -h  Show help
```

## Links

- Website: [agentbilly.ai](https://agentbilly.ai)
- Docs: [agentbilly.ai/docs](https://agentbilly.ai/docs)
- npm: [npmjs.com/package/agent-billy](https://www.npmjs.com/package/agent-billy)
- Support: hello@agentbilly.ai
