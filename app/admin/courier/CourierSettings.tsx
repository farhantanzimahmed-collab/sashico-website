"use client";

import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

interface Store { store_id: number; store_name: string; store_address?: string }
interface Config {
  configured: boolean;
  environment?: "live" | "sandbox";
  client_id?: string;
  client_secret?: string;
  username?: string;
  store_id?: number | null;
  default_weight?: number;
  webhook_url?: string | null;
}

const field = "w-full border border-brand-gray-200 bg-white px-4 py-3 text-sm font-sans text-brand-black placeholder:text-brand-gray-400 focus:border-brand-black focus:outline-none";
const label = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans";

export default function CourierSettings() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [form, setForm] = useState({ environment: "live", client_id: "", client_secret: "", username: "", password: "", default_weight: "0.5" });
  const [stores, setStores] = useState<Store[]>([]);
  const [storeId, setStoreId] = useState<string>("");
  const [saving, setSaving] = useState(false);

  async function load() {
    const res = await fetch("/api/admin/courier/config");
    const data: Config = await res.json();
    setCfg(data);
    if (data.configured) {
      setForm((f) => ({ ...f, environment: data.environment || "live", client_id: data.client_id || "", username: data.username || "", default_weight: String(data.default_weight ?? 0.5) }));
      setStoreId(data.store_id ? String(data.store_id) : "");
    }
  }
  useEffect(() => { load(); }, []);

  async function save(extra: Record<string, unknown> = {}) {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/courier/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, store_id: storeId || undefined, ...extra }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not connect to Pathao");
      setStores(data.stores || []);
      if (data.store_id) setStoreId(String(data.store_id));
      toast.success("Connected to Pathao ✓");
      setForm((f) => ({ ...f, client_secret: "", password: "" }));
      await load();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (!cfg) return <p className="text-sm text-brand-gray-500 font-sans">Loading…</p>;

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className={`border p-4 text-sm font-sans ${cfg.configured && cfg.store_id ? "border-green-200 bg-green-50 text-green-800" : "border-yellow-200 bg-yellow-50 text-yellow-800"}`}>
        {cfg.configured && cfg.store_id
          ? `✅ Connected (${cfg.environment === "sandbox" ? "Sandbox / test" : "Live"}) — pickup store #${cfg.store_id}. Book parcels from any order page.`
          : cfg.configured
          ? "⚠️ Connected — now choose your pickup store below."
          : "Not connected yet. Get your API keys from merchant.pathao.com → Developer's API, then fill in the form."}
      </div>

      {/* Credentials */}
      <div className="bg-white border border-brand-gray-100 p-6 space-y-4">
        <h2 className="text-sm font-sans font-semibold uppercase tracking-wider text-brand-black">API credentials</h2>
        <div>
          <label className={label}>Environment</label>
          <select value={form.environment} onChange={(e) => setForm({ ...form, environment: e.target.value })} className={field}>
            <option value="live">Live — real parcels</option>
            <option value="sandbox">Sandbox — testing only</option>
          </select>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className={label}>Client ID</label>
            <input value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })} className={field} autoComplete="off" />
          </div>
          <div>
            <label className={label}>Client Secret</label>
            <input type="password" value={form.client_secret} onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
              placeholder={cfg.configured ? `Saved (${cfg.client_secret}) — leave blank to keep` : ""} className={field} autoComplete="new-password" />
          </div>
          <div>
            <label className={label}>Pathao login email</label>
            <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} className={field} autoComplete="off" />
          </div>
          <div>
            <label className={label}>Pathao login password</label>
            <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={cfg.configured ? "Saved — leave blank to keep" : ""} className={field} autoComplete="new-password" />
          </div>
          <div>
            <label className={label}>Default parcel weight (kg)</label>
            <input type="number" step="0.1" min="0.1" value={form.default_weight} onChange={(e) => setForm({ ...form, default_weight: e.target.value })} className={field} />
          </div>
        </div>
        <p className="text-xs text-brand-gray-500 font-sans">Stored privately on the server — never shown on the website or in the browser.</p>
        <Button onClick={() => save()} loading={saving} size="md">Save &amp; test connection</Button>
      </div>

      {/* Pickup store */}
      {cfg.configured && (
        <div className="bg-white border border-brand-gray-100 p-6 space-y-4">
          <h2 className="text-sm font-sans font-semibold uppercase tracking-wider text-brand-black">Pickup store</h2>
          {stores.length === 0 ? (
            <div className="flex items-center gap-3">
              <p className="text-sm text-brand-gray-600 font-sans">
                {cfg.store_id ? `Using store #${cfg.store_id}.` : "No store selected."}
              </p>
              <button onClick={() => save()} className="text-xs uppercase tracking-wider underline font-sans">Load my stores</button>
            </div>
          ) : (
            <>
              <select value={storeId} onChange={(e) => setStoreId(e.target.value)} className={field}>
                <option value="">Choose the store Pathao picks up from…</option>
                {stores.map((s) => (
                  <option key={s.store_id} value={s.store_id}>{s.store_name}{s.store_address ? ` — ${s.store_address}` : ""}</option>
                ))}
              </select>
              <Button onClick={() => save({ store_id: storeId })} loading={saving} size="md" disabled={!storeId}>Save store</Button>
            </>
          )}
        </div>
      )}

      {/* Webhook */}
      {cfg.webhook_url && (
        <div className="bg-white border border-brand-gray-100 p-6 space-y-3">
          <h2 className="text-sm font-sans font-semibold uppercase tracking-wider text-brand-black">Automatic status updates (webhook)</h2>
          <p className="text-sm text-brand-gray-600 font-sans">
            In the Pathao merchant panel → Developer&apos;s API → Webhook, paste this URL so orders update themselves
            (Shipped → Delivered / Returned):
          </p>
          <div className="flex gap-2">
            <input readOnly value={cfg.webhook_url} className={`${field} font-mono text-xs`} onFocus={(e) => e.target.select()} />
            <button
              onClick={() => { navigator.clipboard.writeText(cfg.webhook_url!); toast.success("Copied"); }}
              className="border border-brand-gray-200 px-4 text-xs uppercase tracking-wider font-sans hover:border-brand-black"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
