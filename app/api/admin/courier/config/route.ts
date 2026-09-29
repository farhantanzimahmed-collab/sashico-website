import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { requireAdmin } from "@/lib/adminAuth";
import { readPathaoConfig, writePathaoConfig, getPathaoToken, listStores, PathaoConfig } from "@/lib/courier/pathao";

const mask = (v?: string) => (v ? `${v.slice(0, 4)}••••${v.slice(-2)}` : "");

// GET — current settings with secrets masked
export async function GET(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const cfg = await readPathaoConfig();
  if (!cfg) return NextResponse.json({ configured: false });
  const origin = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;
  return NextResponse.json({
    configured: true,
    environment: cfg.environment,
    client_id: cfg.client_id,
    client_secret: mask(cfg.client_secret),
    username: cfg.username,
    store_id: cfg.store_id ?? null,
    default_weight: cfg.default_weight ?? 0.5,
    webhook_url: cfg.webhook_key ? `${origin}/api/webhooks/pathao?key=${cfg.webhook_key}` : null,
  });
}

// POST — save credentials (blank secret/password = keep existing), verify login, list stores
export async function POST(req: NextRequest) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json();
  const existing = await readPathaoConfig();

  const cfg: PathaoConfig = {
    environment: body.environment === "sandbox" ? "sandbox" : "live",
    client_id: String(body.client_id || existing?.client_id || "").trim(),
    client_secret: String(body.client_secret || existing?.client_secret || "").trim(),
    username: String(body.username || existing?.username || "").trim(),
    password: String(body.password || existing?.password || ""),
    store_id: body.store_id ? Number(body.store_id) : existing?.store_id,
    default_weight: Number(body.default_weight) > 0 ? Number(body.default_weight) : existing?.default_weight ?? 0.5,
    webhook_key: existing?.webhook_key || randomBytes(18).toString("hex"),
  };
  if (!cfg.client_id || !cfg.client_secret || !cfg.username || !cfg.password) {
    return NextResponse.json({ error: "Client ID, Client Secret, email and password are all required" }, { status: 400 });
  }

  // Credentials changed → force a fresh login to verify them
  const credsChanged =
    !existing || existing.client_id !== cfg.client_id || existing.client_secret !== cfg.client_secret ||
    existing.username !== cfg.username || existing.password !== cfg.password || existing.environment !== cfg.environment;
  if (!credsChanged) Object.assign(cfg, { access_token: existing!.access_token, refresh_token: existing!.refresh_token, token_expires_at: existing!.token_expires_at });

  try {
    await getPathaoToken(cfg, credsChanged); // also persists config + tokens
    const stores = await listStores(cfg);
    if (!cfg.store_id && stores.length === 1) {
      cfg.store_id = stores[0].store_id;
      await writePathaoConfig(cfg);
    }
    return NextResponse.json({ ok: true, stores, store_id: cfg.store_id ?? null });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
