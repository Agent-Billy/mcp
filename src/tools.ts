/**
 * MCP Tool Definitions
 *
 * Registers all Billy billing tools with the MCP server.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BillyClient } from "./client.js";
import { billyResponse, billyError } from "./personality.js";

// ── Reusable validated schemas ──────────────────────────────
const MAX_LIMIT = 100;
const MAX_STRING = 1000;
const MAX_QUERY = 500;
const MAX_ID = 255;

/** Stripe-style ID: alphanumeric, underscores, hyphens only — blocks path traversal */
const stripeId = z
  .string()
  .max(MAX_ID)
  .regex(/^[a-zA-Z0-9_-]+$/, "Invalid ID format");

const paginationLimit = z
  .number()
  .int()
  .min(1)
  .max(MAX_LIMIT)
  .optional()
  .describe(`Max number of items to return (1-${MAX_LIMIT}, default 25)`);

const paginationOffset = z
  .number()
  .int()
  .min(0)
  .max(100000)
  .optional()
  .describe("Number of items to skip for pagination");

const boundedString = (desc: string) =>
  z.string().max(MAX_STRING).describe(desc);

const boundedOptionalString = (desc: string) =>
  z.string().max(MAX_STRING).optional().describe(desc);

export function registerTools(server: McpServer, client: BillyClient): void {
  // ──────────────────────────────────────────────
  // READ TOOLS
  // ──────────────────────────────────────────────

  server.tool(
    "billy_list_charges",
    "List recent charges from your Stripe account. Optionally filter by status (succeeded, failed, pending).",
    {
      status: z.enum(["succeeded", "failed", "pending"]).optional().describe("Filter by charge status"),
      limit: paginationLimit,
    },
    async ({ status, limit }) => {
      try {
        const data = await client.listCharges({ status, limit });
        return { content: [{ type: "text" as const, text: billyResponse("list_charges", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_get_charge",
    "Get detailed information about a specific charge by its Stripe charge ID.",
    {
      charge_id: stripeId.describe("The Stripe charge ID (e.g., ch_1ABC...)"),
    },
    async ({ charge_id }) => {
      try {
        const data = await client.getCharge(charge_id);
        return { content: [{ type: "text" as const, text: billyResponse("get_charge", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_list_customers",
    "List customers in your Stripe account.",
    {
      limit: paginationLimit,
      offset: paginationOffset,
    },
    async ({ limit, offset }) => {
      try {
        const data = await client.listCustomers({ limit, offset });
        return { content: [{ type: "text" as const, text: billyResponse("list_customers", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_get_customer",
    "Get detailed information about a specific customer by their Stripe customer ID.",
    {
      customer_id: stripeId.describe("The Stripe customer ID (e.g., cus_1ABC...)"),
    },
    async ({ customer_id }) => {
      try {
        const data = await client.getCustomer(customer_id);
        return { content: [{ type: "text" as const, text: billyResponse("get_customer", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_list_subscriptions",
    "List subscriptions with optional status filter (active, past_due, canceled, trialing).",
    {
      status: z.enum(["active", "past_due", "canceled", "trialing"]).optional().describe("Filter by subscription status"),
      limit: paginationLimit,
    },
    async ({ status, limit }) => {
      try {
        const data = await client.listSubscriptions({ status, limit });
        return { content: [{ type: "text" as const, text: billyResponse("list_subscriptions", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_list_invoices",
    "List invoices with optional status filter (draft, open, paid, void, uncollectible).",
    {
      status: z.enum(["draft", "open", "paid", "void", "uncollectible"]).optional().describe("Filter by invoice status"),
      limit: paginationLimit,
    },
    async ({ status, limit }) => {
      try {
        const data = await client.listInvoices({ status, limit });
        return { content: [{ type: "text" as const, text: billyResponse("list_invoices", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_list_refunds",
    "List all refunds that have been issued.",
    {},
    async () => {
      try {
        const data = await client.listRefunds();
        return { content: [{ type: "text" as const, text: billyResponse("list_refunds", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_get_stats",
    "Get a dashboard snapshot: MTD revenue, payment success rate, active subscriptions, failed charges, and more.",
    {},
    async () => {
      try {
        const data = await client.getStats();
        return { content: [{ type: "text" as const, text: billyResponse("stats", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_search",
    "Search across customers, charges, subscriptions, and invoices by keyword (email, name, ID, etc.).",
    {
      query: z.string().min(1).max(MAX_QUERY).describe("Search query (e.g., customer email, name, charge ID)"),
    },
    async ({ query }) => {
      try {
        const data = await client.search(query);
        return { content: [{ type: "text" as const, text: billyResponse("search", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  // ──────────────────────────────────────────────
  // WRITE TOOLS (permission-checked server-side)
  // ──────────────────────────────────────────────

  server.tool(
    "billy_create_refund",
    "Issue a refund for a charge. Optionally specify a partial amount and reason.",
    {
      charge_id: stripeId.describe("The Stripe charge ID to refund"),
      amount: z.number().int().min(1).max(99999999).optional().describe("Partial refund amount in cents (1–999,999.99). Omit for full refund."),
      reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).optional().describe("Reason for the refund"),
    },
    async ({ charge_id, amount, reason }) => {
      try {
        const data = await client.createRefund({ charge_id, amount, reason });
        return { content: [{ type: "text" as const, text: billyResponse("create_refund", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_create_customer",
    "Create a new Stripe customer with email and optional name, description, and metadata.",
    {
      email: z.string().email().max(254).describe("Customer email address"),
      name: boundedOptionalString("Customer full name"),
      description: boundedOptionalString("Internal description or notes"),
      metadata: z.record(z.string().max(500)).optional().describe("Key-value metadata to attach"),
    },
    async ({ email, name, description, metadata }) => {
      try {
        const data = await client.createCustomer({ email, name, description, metadata });
        return { content: [{ type: "text" as const, text: billyResponse("create_customer", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_update_customer",
    "Update an existing customer's email, name, description, or metadata.",
    {
      customer_id: stripeId.describe("The Stripe customer ID to update"),
      email: z.string().email().max(254).optional().describe("New email address"),
      name: boundedOptionalString("New name"),
      description: boundedOptionalString("New description"),
      metadata: z.record(z.string().max(500)).optional().describe("Updated metadata key-value pairs"),
    },
    async ({ customer_id, email, name, description, metadata }) => {
      try {
        const data = await client.updateCustomer(customer_id, { email, name, description, metadata });
        return { content: [{ type: "text" as const, text: billyResponse("update_customer", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_cancel_subscription",
    "Cancel a subscription. By default cancels at end of billing period. Set immediately=true to cancel right now.",
    {
      subscription_id: stripeId.describe("The Stripe subscription ID to cancel"),
      immediately: z.boolean().optional().describe("If true, cancel immediately instead of at period end (default false)"),
    },
    async ({ subscription_id, immediately }) => {
      try {
        const data = await client.cancelSubscription(subscription_id, immediately);
        return { content: [{ type: "text" as const, text: billyResponse("cancel_subscription", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_reactivate_subscription",
    "Reactivate a previously canceled subscription (only works if it hasn't fully expired yet).",
    {
      subscription_id: stripeId.describe("The Stripe subscription ID to reactivate"),
    },
    async ({ subscription_id }) => {
      try {
        const data = await client.reactivateSubscription(subscription_id);
        return { content: [{ type: "text" as const, text: billyResponse("reactivate_subscription", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_send_invoice",
    "Send an invoice to the customer via email.",
    {
      invoice_id: stripeId.describe("The Stripe invoice ID to send"),
    },
    async ({ invoice_id }) => {
      try {
        const data = await client.sendInvoice(invoice_id);
        return { content: [{ type: "text" as const, text: billyResponse("send_invoice", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_void_invoice",
    "Void an invoice so it can no longer be paid. Use this for invoices sent in error.",
    {
      invoice_id: stripeId.describe("The Stripe invoice ID to void"),
    },
    async ({ invoice_id }) => {
      try {
        const data = await client.voidInvoice(invoice_id);
        return { content: [{ type: "text" as const, text: billyResponse("void_invoice", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_create_coupon",
    "Create a discount coupon. Specify either percent_off or amount_off, plus duration.",
    {
      name: boundedString("Display name for the coupon"),
      id: stripeId.optional().describe("Custom coupon ID (auto-generated if omitted)"),
      percent_off: z.number().min(1).max(100).optional().describe("Percentage discount (1-100)"),
      amount_off: z.number().int().min(1).max(99999999).optional().describe("Fixed amount discount in cents"),
      currency: z.string().length(3).optional().describe("Currency for amount_off (default: usd)"),
      duration: z.enum(["once", "repeating", "forever"]).describe("How long the discount lasts"),
      duration_in_months: z.number().int().min(1).max(120).optional().describe("Number of months (required if duration is 'repeating')"),
      max_redemptions: z.number().int().min(1).max(1000000).optional().describe("Max number of times this coupon can be redeemed"),
    },
    async ({ name, id, percent_off, amount_off, currency, duration, duration_in_months, max_redemptions }) => {
      try {
        const data = await client.createCoupon({
          name, id, percent_off, amount_off, currency, duration, duration_in_months, max_redemptions,
        });
        return { content: [{ type: "text" as const, text: billyResponse("create_coupon", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );

  server.tool(
    "billy_delete_coupon",
    "Delete a coupon so it can no longer be applied to new customers.",
    {
      coupon_id: stripeId.describe("The coupon ID to delete"),
    },
    async ({ coupon_id }) => {
      try {
        const data = await client.deleteCoupon(coupon_id);
        return { content: [{ type: "text" as const, text: billyResponse("delete_coupon", data) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: billyError(err) }], isError: true };
      }
    }
  );
}
