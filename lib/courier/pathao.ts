/**
 * Pathao Courier merchant API ("Aladdin").
 *
 * Credentials + OAuth tokens live in the private `sashico-config` storage bucket
 * (same place as the Google Sync credentials) — never in code or the browser.
 * Admin → Courier saves them; everything else calls pathaoApi().
 */
import { serviceClient } from "@/lib/adminAuth";

const CONFIG_FILE = "pathao.json";
const BASE_URL = {
  live: "https://api-hermes.pathao.com",
  sandbox: "https://courier-api-sandbox.pathao.com",
} as const;

export interface PathaoConfig {
  environment: "live" | "sandbox";
  client_id: string;
  client_secret: string;
  username: string; // merchant login email
  password: string; // merchant login password
  store_id?: number;
  default_weight?: number; // kg
  webhook_key?: string; // random key embedded in our webhook URL
  access_token?: string;
  refresh_token?: string;
  token_expires_at?: number; // epoch ms
}

export async function readPathaoConfig(): Promise<PathaoConfig | null> {
  const { data, error } = await serviceClient().storage.from("sashico-config").download(CONFIG_FILE);
  if (error || !data) return null;
  try {
    return JSON.parse(await data.text()) as PathaoConfig;
  } catch {
    return null;
  }
}

export async function writePathaoConfig(config: PathaoConfig): Promise<void> {
  const blob = new Blob([JSON.stringify(config)], { type: "application/json" });
  const { error } = await serviceClient().storage.from("sashico-config").upload(CONFIG_FILE, blob, {
    contentType: "application/json",
    upsert: true,
  });
  if (error) throw new Error(`Could not save Pathao settings: ${error.message}`);
}

export class PathaoError extends Error {
  constructor(message: string, public status?: number, public details?: unknown) {
    super(message);
  }
}

async function requestToken(config: PathaoConfig, grant: "password" | "refresh_token") {
  const body: Record<string, string> =
    grant === "password"
      ? { client_id: config.client_id, client_secret: config.client_secret, grant_type: "password", username: config.username, password: config.password }
      : { client_id: config.client_id, client_secret: config.client_secret, grant_type: "refresh_token", refresh_token: config.refresh_token! };

  const res = await fetch(`${BASE_URL[config.environment]}/aladdin/api/v1/issue-token`, {
    method: "POST",
    signal: AbortSignal.timeout(15000), // never hold a server slot waiting on Pathao
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.access_token) {
    throw new PathaoError(json.message || "Pathao login failed — check Client ID/Secret, email and password", res.status, json);
  }
  config.access_token = json.access_token;
  config.refresh_token = json.refresh_token ?? config.refresh_token;
  // Refresh a day early to be safe
  config.token_expires_at = Date.now() + (Number(json.expires_in || 0) - 86400) * 1000;
  await writePathaoConfig(config);
  return config.access_token!;
}

/** Valid access token, refreshing or re-issuing as needed. */
export async function getPathaoToken(config: PathaoConfig, force = false): Promise<string> {
  if (!force && config.access_token && (config.token_expires_at ?? 0) > Date.now()) return config.access_token;
  if (config.refresh_token && !force) {
    try {
      return await requestToken(config, "refresh_token");
    } catch {
      // fall through to a fresh password login
    }
  }
  return requestToken(config, "password");
}

/** Authenticated Pathao API call; returns the parsed JSON body. */
export async function pathaoApi<T = any>(path: string, init: { method?: string; body?: unknown } = {}, cfg?: PathaoConfig): Promise<T> {
  const config = cfg ?? (await readPathaoConfig());
  if (!config) throw new PathaoError("Pathao is not set up yet — add your API keys in Admin → Courier");

  const call = async (token: string) =>
    fetch(`${BASE_URL[config.environment]}${path}`, {
      method: init.method ?? "GET",
      signal: AbortSignal.timeout(15000),
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

  let res = await call(await getPathaoToken(config));
  if (res.status === 401) res = await call(await getPathaoToken(config, true)); // token revoked/expired early
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fieldErrors = json.errors ? Object.values(json.errors).flat().join(" ") : "";
    throw new PathaoError(`${json.message || "Pathao request failed"}${fieldErrors ? ` — ${fieldErrors}` : ""}`, res.status, json);
  }
  return json as T;
}

// ── Lookups ──────────────────────────────────────────────────────────────────
export interface PathaoCity { city_id: number; city_name: string }
export interface PathaoZone { zone_id: number; zone_name: string }
export interface PathaoArea { area_id: number; area_name: string; home_delivery_available?: boolean }
export interface PathaoStore { store_id: number; store_name: string; store_address?: string; is_active?: number }

export const listCities = async () => (await pathaoApi<{ data: { data: PathaoCity[] } }>("/aladdin/api/v1/city-list")).data.data;
export const listZones = async (cityId: number) =>
  (await pathaoApi<{ data: { data: PathaoZone[] } }>(`/aladdin/api/v1/cities/${cityId}/zone-list`)).data.data;
export const listAreas = async (zoneId: number) =>
  (await pathaoApi<{ data: { data: PathaoArea[] } }>(`/aladdin/api/v1/zones/${zoneId}/area-list`)).data.data;
export const listStores = async (cfg?: PathaoConfig) =>
  (await pathaoApi<{ data: { data: PathaoStore[] } }>("/aladdin/api/v1/stores", {}, cfg)).data.data;

// ── Orders ───────────────────────────────────────────────────────────────────
export interface PathaoOrderInput {
  store_id: number;
  merchant_order_id: string;
  recipient_name: string;
  recipient_phone: string;
  recipient_address: string;
  recipient_city: number;
  recipient_zone: number;
  recipient_area?: number;
  delivery_type: 48; // 48 = normal delivery
  item_type: 2; // 2 = parcel
  special_instruction?: string;
  item_quantity: number;
  item_weight: number; // kg
  amount_to_collect: number; // COD amount (0 if prepaid)
  item_description?: string;
}

export async function createPathaoOrder(input: PathaoOrderInput) {
  const json = await pathaoApi<{ data: { consignment_id: string; merchant_order_id: string; order_status: string; delivery_fee: number } }>(
    "/aladdin/api/v1/orders",
    { method: "POST", body: input }
  );
  return json.data;
}

export async function getPathaoOrderInfo(consignmentId: string) {
  const json = await pathaoApi<{ data: { consignment_id: string; order_status: string; order_status_slug?: string; updated_at?: string } }>(
    `/aladdin/api/v1/orders/${encodeURIComponent(consignmentId)}/info`
  );
  return json.data;
}

/**
 * Map a Pathao parcel status to our order_status (DB allows: pending, confirmed,
 * processing, shipped, delivered, cancelled). Returns null = no change.
 */
export function mapPathaoStatus(pathaoStatus: string): { order_status?: string; payment_status?: string } | null {
  // Accepts webhook events ("order.paid-return") and status names ("Paid Return")
  const s = pathaoStatus.toLowerCase().replace(/^order\./, "").replace(/[\s.-]+/g, "_");
  // Attempts that Pathao can retry — log only, don't change the order yet
  if (/pickup_failed|delivery_failed|exchange/.test(s)) return null;
  // Any kind of return (incl. "paid return", "returned to merchant") = not delivered
  if (/return/.test(s)) return { order_status: "cancelled" };
  if (/pickup_cancel|cancel/.test(s)) return { order_status: "cancelled" };
  if (/partial_delivery|delivered/.test(s)) return { order_status: "delivered" };
  if (/payment_invoice|^paid$/.test(s)) return { payment_status: "paid" };
  if (/pending|pickup_requested|assigned_for_pickup/.test(s)) return { order_status: "processing" };
  if (/^pickup$|picked|sorting|transit|hub|assigned_for_delivery|on_hold|out_for_delivery/.test(s)) return { order_status: "shipped" };
  return null; // order created/updated, store events, etc.
}
