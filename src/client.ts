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

    const res = await fetch(url, {
      method,
      headers: this.headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      let errorMessage: string;
      try {
        const errorBody = (await res.json()) as { error?: string; message?: string };
        errorMessage =
          errorBody.error || errorBody.message || `HTTP ${res.status}`;
      } catch {
        errorMessage = `HTTP ${res.status} ${res.statusText}`;
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
