/**
 * MCP Tool Definitions
 *
 * Registers all Billy billing tools with the MCP server.
 */

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { BillyClient } from "./client.js";
import { billyResponse, billyError } from "./personality.js";

export function registerTools(server: McpServer, client: BillyClient): void {
  // ──────────────────────────────────────────────
  // READ TOOLS
  // ──────────────────────────────────────────────

  server.tool(
    "billy_list_charges",
    "List recent charges from your Stripe account. Optionally filter by status (succeeded, failed, pending).",
    {
      status: z.string().optional().describe("Filter by charge status: succeeded, failed, pending"),
      limit: z.number().optional().describe("Max number of charges to return (default 25)"),
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
      charge_id: z.string().describe("The Stripe charge ID (e.g., ch_1ABC...)"),
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
      limit: z.number().optional().describe("Max number of customers to return (default 25)"),
      offset: z.number().optional().describe("Number of customers to skip for pagination"),
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
      customer_id: z.string().describe("The Stripe customer ID (e.g., cus_1ABC...)"),
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
      status: z.string().optional().describe("Filter by subscription status: active, past_due, canceled, trialing"),
      limit: z.number().optional().describe("Max number of subscriptions to return (default 25)"),
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
      status: z.string().optional().describe("Filter by invoice status: draft, open, paid, void, uncollectible"),
      limit: z.number().optional().describe("Max number of invoices to return (default 25)"),
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
      query: z.string().describe("Search query (e.g., customer email, name, charge ID)"),
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
      charge_id: z.string().describe("The Stripe charge ID to refund"),
      amount: z.number().optional().describe("Partial refund amount in cents. Omit for full refund."),
      reason: z.string().optional().describe("Reason for the refund: duplicate, fraudulent, requested_by_customer"),
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
      email: z.string().describe("Customer email address"),
      name: z.string().optional().describe("Customer full name"),
      description: z.string().optional().describe("Internal description or notes"),
      metadata: z.record(z.string()).optional().describe("Key-value metadata to attach"),
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
      customer_id: z.string().describe("The Stripe customer ID to update"),
      email: z.string().optional().describe("New email address"),
      name: z.string().optional().describe("New name"),
      description: z.string().optional().describe("New description"),
      metadata: z.record(z.string()).optional().describe("Updated metadata key-value pairs"),
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
      subscription_id: z.string().describe("The Stripe subscription ID to cancel"),
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
      subscription_id: z.string().describe("The Stripe subscription ID to reactivate"),
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
      invoice_id: z.string().describe("The Stripe invoice ID to send"),
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
      invoice_id: z.string().describe("The Stripe invoice ID to void"),
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
      name: z.string().describe("Display name for the coupon"),
      id: z.string().optional().describe("Custom coupon ID (auto-generated if omitted)"),
      percent_off: z.number().optional().describe("Percentage discount (e.g., 25 for 25% off)"),
      amount_off: z.number().optional().describe("Fixed amount discount in cents"),
      currency: z.string().optional().describe("Currency for amount_off (default: usd)"),
      duration: z.enum(["once", "repeating", "forever"]).describe("How long the discount lasts"),
      duration_in_months: z.number().optional().describe("Number of months (required if duration is 'repeating')"),
      max_redemptions: z.number().optional().describe("Max number of times this coupon can be redeemed"),
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
      coupon_id: z.string().describe("The coupon ID to delete"),
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
