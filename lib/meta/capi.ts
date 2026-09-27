import { createHash } from "crypto";

/**
 * Meta Conversions API (server-side events).
 * Browser Pixel + CAPI send the same event_id so Meta dedupes them into one event.
 */

const PIXEL_ID = process.env.META_PIXEL_ID || "1974979363218444";
const GRAPH_API = `https://graph.facebook.com/v23.0/${PIXEL_ID}/events`;

function hash(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

// Meta matches phones in E.164 digits: BD local "01XXXXXXXXX" → "8801XXXXXXXXX"
function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("01")) return `88${digits}`;
  return digits;
}

export interface MetaUserData {
  email?: string;
  phone?: string;
  name?: string;
  city?: string;
  country?: string;
}

export interface MetaEvent {
  eventName: string;
  eventId?: string;
  eventSourceUrl?: string;
  customData?: Record<string, unknown>;
  userData?: MetaUserData;
  fbc?: string | null;
  fbp?: string | null;
  clientIp?: string;
  userAgent?: string;
}

export async function sendMetaEvent(e: MetaEvent): Promise<{ ok: boolean; data: unknown }> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return { ok: false, data: "No CAPI token" };

  const u = e.userData ?? {};
  const hashed: Record<string, string> = {};
  if (u.email) hashed.em = hash(u.email);
  if (u.phone) hashed.ph = hash(normalizePhone(u.phone));
  if (u.name) {
    const parts = u.name.trim().split(/\s+/);
    hashed.fn = hash(parts[0]);
    if (parts.length > 1) hashed.ln = hash(parts.slice(1).join(" "));
  }
  if (u.city) hashed.ct = hash(u.city.replace(/\s+/g, ""));
  if (u.country) hashed.country = hash(u.country);

  const event: Record<string, unknown> = {
    event_name: e.eventName,
    event_time: Math.floor(Date.now() / 1000),
    action_source: "website",
    event_source_url: e.eventSourceUrl || process.env.NEXT_PUBLIC_APP_URL || "https://sashico.net",
    user_data: {
      ...hashed,
      ...(e.clientIp ? { client_ip_address: e.clientIp } : {}),
      ...(e.userAgent ? { client_user_agent: e.userAgent } : {}),
      ...(e.fbc ? { fbc: e.fbc } : {}),
      ...(e.fbp ? { fbp: e.fbp } : {}),
    },
    custom_data: e.customData ?? {},
  };
  if (e.eventId) event.event_id = e.eventId;

  const res = await fetch(`${GRAPH_API}?access_token=${token}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [event] }),
  });
  const data = await res.json();
  if (!res.ok) console.error("[capi]", e.eventName, data);
  return { ok: res.ok, data };
}

/** Client IP + UA from an incoming request (Apache/Passenger sets X-Forwarded-For). */
export function requestContext(headers: Headers) {
  return {
    clientIp:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      headers.get("x-real-ip") ||
      undefined,
    userAgent: headers.get("user-agent") || undefined,
  };
}
