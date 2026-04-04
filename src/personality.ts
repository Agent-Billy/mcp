/**
 * Billy Personality Layer
 *
 * Formats API responses in a human-friendly way with Billy's personality.
 * Adds context-aware suggestions at the end of responses.
 */

interface StatsData {
  mtd_revenue?: number;
  success_rate?: number;
  active_subscriptions?: number;
  failed_charges?: number;
  total_customers?: number;
  [key: string]: unknown;
}

interface ChargeItem {
  id?: string;
  amount?: number;
  currency?: string;
  status?: string;
  customer_email?: string;
  description?: string;
  [key: string]: unknown;
}

interface CustomerItem {
  id?: string;
  name?: string;
  email?: string;
  [key: string]: unknown;
}

interface SubscriptionItem {
  id?: string;
  status?: string;
  customer_email?: string;
  plan_name?: string;
  current_period_end?: string;
  [key: string]: unknown;
}

interface InvoiceItem {
  id?: string;
  status?: string;
  amount_due?: number;
  customer_email?: string;
  [key: string]: unknown;
}

interface RefundResult {
  id?: string;
  amount?: number;
  charge?: string;
  customer_email?: string;
  status?: string;
  [key: string]: unknown;
}

interface CouponItem {
  id?: string;
  name?: string;
  percent_off?: number;
  amount_off?: number;
  duration?: string;
  [key: string]: unknown;
}

interface SearchResult {
  results?: Array<{ type?: string; [key: string]: unknown }>;
  total?: number;
  [key: string]: unknown;
}

function formatCurrency(amount: number, currency = "usd"): string {
  const symbol = currency.toLowerCase() === "usd" ? "$" : currency.toUpperCase() + " ";
  return `${symbol}${(amount / 100).toFixed(2)}`;
}

/**
 * Sanitize a string value from an API response to prevent prompt injection
 * and control-character abuse when interpolated into LLM-facing output.
 */
function sanitize(value: unknown, maxLen = 200): string {
  if (value == null) return "";
  const s = String(value);
  // Strip control characters (except newline/tab) and trim
  const cleaned = s.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "").trim();
  return cleaned.length > maxLen ? cleaned.slice(0, maxLen) + "…" : cleaned;
}

function formatList(items: unknown[], formatter: (item: unknown) => string, label: string): string {
  const arr = Array.isArray(items) ? items : [];
  if (arr.length === 0) {
    return `No ${label} found.`;
  }
  const lines = arr.map((item, i) => `${i + 1}. ${formatter(item)}`);
  return `Found ${arr.length} ${label}:\n\n${lines.join("\n")}`;
}

export function billyResponse(action: string, data: unknown): string {
  try {
    switch (action) {
      case "stats":
        return formatStats(data as StatsData);
      case "list_charges":
        return formatChargeList(data);
      case "get_charge":
        return formatChargeDetail(data as ChargeItem);
      case "list_customers":
        return formatCustomerList(data);
      case "get_customer":
        return formatCustomerDetail(data as CustomerItem);
      case "create_customer":
        return formatCustomerCreated(data as CustomerItem);
      case "update_customer":
        return formatCustomerUpdated(data as CustomerItem);
      case "list_subscriptions":
        return formatSubscriptionList(data);
      case "cancel_subscription":
        return formatSubscriptionCanceled(data as SubscriptionItem);
      case "reactivate_subscription":
        return formatSubscriptionReactivated(data as SubscriptionItem);
      case "list_invoices":
        return formatInvoiceList(data);
      case "send_invoice":
        return formatInvoiceSent(data as InvoiceItem);
      case "void_invoice":
        return formatInvoiceVoided(data as InvoiceItem);
      case "list_refunds":
        return formatRefundList(data);
      case "create_refund":
        return formatRefundCreated(data as RefundResult);
      case "list_coupons":
        return formatCouponList(data);
      case "create_coupon":
        return formatCouponCreated(data as CouponItem);
      case "delete_coupon":
        return formatCouponDeleted(data);
      case "search":
        return formatSearchResults(data as SearchResult);
      default: {
        // Truncate raw JSON fallback to prevent excessive data exposure
        const raw = JSON.stringify(data, null, 2);
        return raw.length > 2000 ? raw.slice(0, 2000) + "\n… (truncated)" : raw;
      }
    }
  } catch {
    return "(Unable to format response)";
  }
}

function formatStats(stats: StatsData): string {
  const revenue = stats.mtd_revenue != null ? formatCurrency(stats.mtd_revenue) : "N/A";
  const rate = stats.success_rate != null ? `${stats.success_rate}%` : "N/A";
  const activeSubs = stats.active_subscriptions ?? "N/A";
  const failed = stats.failed_charges ?? 0;
  const customers = stats.total_customers ?? "N/A";

  let response = `Here's your billing snapshot:\n\n`;
  response += `- MTD Revenue: ${revenue}\n`;
  response += `- Payment Success Rate: ${rate}\n`;
  response += `- Active Subscriptions: ${activeSubs}\n`;
  response += `- Total Customers: ${customers}\n`;
  response += `- Failed Charges (this month): ${failed}`;

  if (typeof failed === "number" && failed > 0) {
    response += `\n\nI noticed ${failed} failed charge${failed > 1 ? "s" : ""} this month. Want me to pull up the details so we can look into them?`;
  }

  return response;
}

function formatChargeList(data: unknown): string {
  const items = extractArray(data);
  const failedCount = items.filter((c: ChargeItem) => c.status === "failed").length;

  let response = formatList(items, (item) => {
    const c = item as ChargeItem;
    const amount = c.amount != null ? formatCurrency(c.amount, c.currency) : "N/A";
    return `${sanitize(c.id)} | ${amount} | ${sanitize(c.status) || "unknown"} | ${sanitize(c.customer_email) || "no email"}`;
  }, "charges");

  if (failedCount > 0) {
    response += `\n\n${failedCount} charge${failedCount > 1 ? "s" : ""} failed. Want me to retry any of these or check the payment methods?`;
  }

  return response;
}

function formatChargeDetail(charge: ChargeItem): string {
  const amount = charge.amount != null ? formatCurrency(charge.amount, charge.currency) : "N/A";
  let response = `Charge ${sanitize(charge.id) || "unknown"}:\n\n`;
  response += `- Amount: ${amount}\n`;
  response += `- Status: ${sanitize(charge.status) || "unknown"}\n`;
  response += `- Customer: ${sanitize(charge.customer_email) || "N/A"}\n`;
  response += `- Description: ${sanitize(charge.description) || "none"}`;

  if (charge.status === "succeeded") {
    response += `\n\nNeed to issue a refund for this charge?`;
  }

  return response;
}

function formatCustomerList(data: unknown): string {
  const items = extractArray(data);
  return formatList(items, (item) => {
    const c = item as CustomerItem;
    return `${sanitize(c.id)} | ${sanitize(c.name) || "unnamed"} | ${sanitize(c.email) || "no email"}`;
  }, "customers");
}

/** Allowlisted fields safe to expose from customer objects. */
const CUSTOMER_SAFE_FIELDS = new Set([
  "id", "name", "email", "description", "phone", "currency",
  "created", "delinquent", "balance", "default_source",
]);

function formatCustomerDetail(customer: CustomerItem): string {
  let response = `Customer ${sanitize(customer.id) || "unknown"}:\n\n`;
  response += `- Name: ${sanitize(customer.name) || "not set"}\n`;
  response += `- Email: ${sanitize(customer.email) || "not set"}`;

  const extra = Object.entries(customer).filter(
    ([k]) => !["id", "name", "email", "object"].includes(k) && CUSTOMER_SAFE_FIELDS.has(k)
  );
  for (const [key, value] of extra) {
    if (value != null && typeof value !== "object") {
      response += `\n- ${sanitize(key)}: ${sanitize(value)}`;
    }
  }

  return response;
}

function formatCustomerCreated(customer: CustomerItem): string {
  return `Done! Created customer ${sanitize(customer.id)}${customer.email ? ` (${sanitize(customer.email)})` : ""}. They're ready for subscriptions and invoicing.`;
}

function formatCustomerUpdated(customer: CustomerItem): string {
  return `Updated! Customer ${sanitize(customer.id)} has been modified${customer.email ? ` — email: ${sanitize(customer.email)}` : ""}.`;
}

function formatSubscriptionList(data: unknown): string {
  const items = extractArray(data);
  const pastDue = items.filter((s: SubscriptionItem) => s.status === "past_due").length;

  let response = formatList(items, (item) => {
    const s = item as SubscriptionItem;
    return `${sanitize(s.id)} | ${sanitize(s.status) || "unknown"} | ${sanitize(s.customer_email) || "no email"} | ${sanitize(s.plan_name) || "unknown plan"}`;
  }, "subscriptions");

  if (pastDue > 0) {
    response += `\n\nI noticed ${pastDue} subscription${pastDue > 1 ? "s are" : " is"} past due. Want me to check the payment methods on file?`;
  }

  return response;
}

function formatSubscriptionCanceled(sub: SubscriptionItem): string {
  let response = `Done! Subscription ${sanitize(sub.id)} has been canceled`;
  if (sub.current_period_end) {
    response += `. It will remain active until ${sanitize(sub.current_period_end)}`;
  }
  response += ".";
  if (sub.customer_email) {
    response += ` Should I send a confirmation to ${sanitize(sub.customer_email)}?`;
  }
  return response;
}

function formatSubscriptionReactivated(sub: SubscriptionItem): string {
  return `Subscription ${sanitize(sub.id)} has been reactivated! The customer will continue on their existing plan.`;
}

function formatInvoiceList(data: unknown): string {
  const items = extractArray(data);
  return formatList(items, (item) => {
    const inv = item as InvoiceItem;
    const amount = inv.amount_due != null ? formatCurrency(inv.amount_due) : "N/A";
    return `${sanitize(inv.id)} | ${amount} | ${sanitize(inv.status) || "unknown"} | ${sanitize(inv.customer_email) || "no email"}`;
  }, "invoices");
}

function formatInvoiceSent(invoice: InvoiceItem): string {
  return `Invoice ${sanitize(invoice.id)} has been sent${invoice.customer_email ? ` to ${sanitize(invoice.customer_email)}` : ""}!`;
}

function formatInvoiceVoided(invoice: InvoiceItem): string {
  return `Invoice ${sanitize(invoice.id)} has been voided. It will no longer be collectible.`;
}

function formatRefundList(data: unknown): string {
  const items = extractArray(data);
  return formatList(items, (item) => {
    const r = item as RefundResult;
    const amount = r.amount != null ? formatCurrency(r.amount) : "N/A";
    return `${sanitize(r.id)} | ${amount} | ${sanitize(r.status) || "unknown"} | charge: ${sanitize(r.charge) || "N/A"}`;
  }, "refunds");
}

function formatRefundCreated(refund: RefundResult): string {
  const amount = refund.amount != null ? formatCurrency(refund.amount) : "the amount";
  let response = `Done! Refunded ${amount}`;
  if (refund.customer_email) {
    response += ` to ${sanitize(refund.customer_email)}`;
  }
  if (refund.charge) {
    response += ` for charge ${sanitize(refund.charge)}`;
  }
  response += `. The refund should appear in their account within 5-10 business days.`;
  response += `\n\nShould I send a confirmation email to the customer?`;
  return response;
}

function formatCouponList(data: unknown): string {
  const items = extractArray(data);
  return formatList(items, (item) => {
    const c = item as CouponItem;
    const discount = c.percent_off
      ? `${c.percent_off}% off`
      : c.amount_off != null
        ? `${formatCurrency(c.amount_off)} off`
        : "unknown discount";
    return `${sanitize(c.id ?? c.name)} | ${discount} | ${sanitize(c.duration) || "unknown duration"}`;
  }, "coupons");
}

function formatCouponCreated(coupon: CouponItem): string {
  const discount = coupon.percent_off
    ? `${coupon.percent_off}% off`
    : coupon.amount_off != null
      ? `${formatCurrency(coupon.amount_off)} off`
      : "";
  return `Coupon "${sanitize(coupon.name ?? coupon.id)}" created! ${discount ? `(${discount})` : ""} Ready to apply to customers.`;
}

function formatCouponDeleted(data: unknown): string {
  const d = data as { id?: string };
  return `Coupon ${sanitize(d.id)} has been deleted. It will no longer be available for new redemptions.`;
}

function formatSearchResults(data: SearchResult): string {
  const results = data.results ?? [];
  if (results.length === 0) {
    return "No results found for that search query.";
  }

  /** Fields safe to display in search results. */
  const SEARCH_SAFE_FIELDS = new Set([
    "id", "name", "email", "status", "amount", "currency",
    "customer_email", "plan_name", "description",
  ]);

  const lines = results.map((r, i) => {
    const type = sanitize(r.type) || "unknown";
    const entries = Object.entries(r)
      .filter(([k]) => k !== "type" && k !== "object" && SEARCH_SAFE_FIELDS.has(k))
      .map(([k, v]) => `${sanitize(k)}: ${sanitize(v)}`)
      .join(" | ");
    return `${i + 1}. [${type}] ${entries}`;
  });

  return `Found ${results.length} result${results.length > 1 ? "s" : ""}:\n\n${lines.join("\n")}`;
}

function extractArray(data: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(data)) return data as Array<Record<string, unknown>>;
  if (data && typeof data === "object" && "data" in data) {
    const d = (data as Record<string, unknown>).data;
    if (Array.isArray(d)) return d as Array<Record<string, unknown>>;
  }
  return [];
}

export function billyError(error: unknown): string {
  const msg = error instanceof Error ? error.message : String(error);

  if (msg.includes("permission") || msg.includes("403") || msg.includes("forbidden")) {
    return `Hmm, I can't do that. Your role doesn't have permission for this action. You'll need someone with a higher access level to approve this.`;
  }

  if (msg.includes("401") || msg.includes("unauthorized") || msg.includes("token")) {
    return `Looks like there's an authentication issue. Your token might be expired or invalid. Try refreshing it from the Billy dashboard.`;
  }

  if (msg.includes("404") || msg.includes("not found")) {
    return `I couldn't find that resource. Double-check the ID and try again.`;
  }

  if (msg.includes("429") || msg.includes("rate limit")) {
    return `We're hitting the rate limit. Give it a moment and try again.`;
  }

  // Generic fallback — never expose raw backend error details
  return `Something went wrong. Please try again or contact support if the issue persists.`;
}
