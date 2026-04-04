/**
 * Billy API Client
 *
 * HTTP client that wraps fetch calls to the Billy container API.
 * Handles authentication via JWT token or API key.
 */

export interface BillyClientOptions {
  apiUrl: string;
  token?: string;
  apiKey?: string;
}

export interface ListParams {
  limit?: number;
  offset?: number;
  status?: string;
}

export interface CreateCustomerData {
  email: string;
  name?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface UpdateCustomerData {
  email?: string;
  name?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface CreateCouponData {
  id?: string;
  name: string;
  percent_off?: number;
  amount_off?: number;
  currency?: string;
  duration: "once" | "repeating" | "forever";
  duration_in_months?: number;
  max_redemptions?: number;
}

export interface CreateRefundData {
  charge_id: string;
  amount?: number;
  reason?: string;
}

/** Max allowed response body size (5 MB) to prevent memory exhaustion. */
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

/** Request timeout in milliseconds (30 seconds). */
const REQUEST_TIMEOUT_MS = 30_000;

/**
 * Sanitize an error message so backend internals are never leaked.
 * Keeps known safe HTTP status codes and strips everything else to a
 * generic message.
 */
function sanitizeErrorMessage(raw: string): string {
  // Truncate excessively long messages
  const msg = raw.length > 300 ? raw.slice(0, 300) + "…" : raw;
  // Only surface the HTTP status — hide backend details
  const statusMatch = msg.match(/\b(4\d{2}|5\d{2})\b/);
  if (statusMatch) {
    return `HTTP ${statusMatch[1]}`;
  }
  return "Unexpected error";
}

export class BillyClient {
  private readonly baseUrl: string;
  private readonly headers: Record<string, string>;

  constructor(options: BillyClientOptions) {
    this.baseUrl = options.apiUrl.replace(/\/+$/, "");

    this.headers = {
      "Content-Type": "application/json",
      "User-Agent": "agent-billy-mcp/0.0.1",
    };

    if (options.token) {
      this.headers["Authorization"] = `Bearer ${options.token}`;
    } else if (options.apiKey) {
      this.headers["X-API-Key"] = options.apiKey;
    } else {
      throw new Error(
        "Either --token (BILLY_TOKEN) or --api-key (BILLY_API_KEY) must be provided"
      );
    }
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch(url, {
        method,
        headers: this.headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });
    } catch (err) {
      clearTimeout(timeout);
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new Error("Billy API error: request timed out");
      }
      throw new Error("Billy API error: network error");
    } finally {
      clearTimeout(timeout);
    }

    // Guard against oversized responses (DoS / memory exhaustion)
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
      throw new Error("Billy API error: response too large");
    }

    if (!res.ok) {
      let errorMessage: string;
      try {
        const errorBody = (await res.json()) as { error?: string; message?: string };
        const raw =
          errorBody.error || errorBody.message || `HTTP ${res.status}`;
        errorMessage = sanitizeErrorMessage(raw);
      } catch {
        errorMessage = `HTTP ${res.status}`;
      }
      throw new Error(`Billy API error: ${errorMessage}`);
    }

    return res.json() as Promise<T>;
  }

  private buildQuery(params?: ListParams): string {
    if (!params) return "";
    const query = new URLSearchParams();
    if (params.limit) query.set("limit", String(params.limit));
    if (params.offset) query.set("offset", String(params.offset));
    if (params.status) query.set("status", params.status);
    return query.toString() ? `?${query.toString()}` : "";
  }

  // --- Charges ---

  async listCharges(params?: ListParams): Promise<unknown> {
    return this.request("GET", `/api/charges${this.buildQuery(params)}`);
  }

  async getCharge(id: string): Promise<unknown> {
    return this.request("GET", `/api/charges/${id}`);
  }

  // --- Customers ---

  async listCustomers(params?: ListParams): Promise<unknown> {
    return this.request("GET", `/api/customers${this.buildQuery(params)}`);
  }

  async getCustomer(id: string): Promise<unknown> {
    return this.request("GET", `/api/customers/${id}`);
  }

  async createCustomer(data: CreateCustomerData): Promise<unknown> {
    return this.request("POST", "/api/customers", data);
  }

  async updateCustomer(id: string, data: UpdateCustomerData): Promise<unknown> {
    return this.request("PATCH", `/api/customers/${id}`, data);
  }

  // --- Subscriptions ---

  async listSubscriptions(params?: ListParams): Promise<unknown> {
    return this.request("GET", `/api/subscriptions${this.buildQuery(params)}`);
  }

  async cancelSubscription(
    id: string,
    immediately?: boolean
  ): Promise<unknown> {
    return this.request("POST", `/api/subscriptions/${id}/cancel`, {
      immediately: immediately ?? false,
    });
  }

  async reactivateSubscription(id: string): Promise<unknown> {
    return this.request("POST", `/api/subscriptions/${id}/reactivate`);
  }

  // --- Invoices ---

  async listInvoices(params?: ListParams): Promise<unknown> {
    return this.request("GET", `/api/invoices${this.buildQuery(params)}`);
  }

  async sendInvoice(id: string): Promise<unknown> {
    return this.request("POST", `/api/invoices/${id}/send`);
  }

  async voidInvoice(id: string): Promise<unknown> {
    return this.request("POST", `/api/invoices/${id}/void`);
  }

  // --- Refunds ---

  async listRefunds(): Promise<unknown> {
    return this.request("GET", "/api/refunds");
  }

  async createRefund(data: CreateRefundData): Promise<unknown> {
    return this.request("POST", "/api/refunds", data);
  }

  // --- Coupons ---

  async listCoupons(): Promise<unknown> {
    return this.request("GET", "/api/coupons");
  }

  async createCoupon(data: CreateCouponData): Promise<unknown> {
    return this.request("POST", "/api/coupons", data);
  }

  async deleteCoupon(id: string): Promise<unknown> {
    return this.request("DELETE", `/api/coupons/${id}`);
  }

  // --- Stats ---

  async getStats(): Promise<unknown> {
    return this.request("GET", "/api/stats");
  }

  // --- Search ---

  async search(query: string): Promise<unknown> {
    return this.request(
      "GET",
      `/api/search?q=${encodeURIComponent(query)}`
    );
  }
}
