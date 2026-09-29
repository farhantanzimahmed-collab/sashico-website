"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";
import Button from "@/components/ui/Button";

interface Loc { id: number; name: string }
interface Props {
  orderId: string;
  consignmentId: string | null;
  district: string;
  area: string;
  codAmount: number;
  defaultWeight?: number;
}

const field = "w-full border border-brand-gray-200 bg-white px-3 py-2.5 text-sm font-sans text-brand-black focus:border-brand-black focus:outline-none";
const label = "mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans";
const norm = (s: string) => s.toLowerCase().replace(/[^a-z]/g, "");

async function getLocations(type: string, id?: number): Promise<Loc[]> {
  const res = await fetch(`/api/admin/courier/locations?type=${type}${id ? `&id=${id}` : ""}`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Could not load Pathao locations");
  return data.map((d: Record<string, unknown>) => ({
    id: Number(d.city_id ?? d.zone_id ?? d.area_id),
    name: String(d.city_name ?? d.zone_name ?? d.area_name),
  }));
}

// Best guess from what the customer typed ("Dhaka ", "Chattogram", "Gulshan" → "Gulshan 1").
// Pathao mixes old/new spellings, so try both.
const ALIASES: Record<string, string[]> = {
  chittagong: ["chattogram"], chattogram: ["chittagong"], comilla: ["cumilla"], cumilla: ["comilla"],
  barisal: ["barishal"], barishal: ["barisal"], jessore: ["jashore"], jashore: ["jessore"],
  bogra: ["bogura"], bogura: ["bogra"], brahmanbaria: ["bbaria"],
};
function guess(options: Loc[], text: string): Loc | undefined {
  const t = norm(text);
  if (!t) return undefined;
  const targets = [t, ...(ALIASES[t] || [])];
  for (const target of targets) {
    const exact = options.find((o) => norm(o.name) === target);
    if (exact) return exact;
  }
  return options.find((o) => targets.some((target) => norm(o.name).includes(target) || target.includes(norm(o.name))));
}

export default function PathaoPanel({ orderId, consignmentId, district, area, codAmount, defaultWeight = 0.5 }: Props) {
  const router = useRouter();
  const [cities, setCities] = useState<Loc[]>([]);
  const [zones, setZones] = useState<Loc[]>([]);
  const [areas, setAreas] = useState<Loc[]>([]);
  const [cityId, setCityId] = useState("");
  const [zoneId, setZoneId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [weight, setWeight] = useState(String(defaultWeight));
  const [amount, setAmount] = useState(String(Math.round(codAmount)));
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (consignmentId) return;
    getLocations("cities")
      .then((list) => {
        setCities(list);
        const g = guess(list, district);
        if (g) setCityId(String(g.id));
      })
      .catch((e) => setError(e.message));
  }, [consignmentId, district]);

  useEffect(() => {
    setZones([]); setZoneId(""); setAreas([]); setAreaId("");
    if (!cityId) return;
    getLocations("zones", Number(cityId)).then((list) => {
      setZones(list);
      const g = guess(list, area);
      if (g) setZoneId(String(g.id));
    }).catch((e) => toast.error(e.message));
  }, [cityId, area]);

  useEffect(() => {
    setAreas([]); setAreaId("");
    if (!zoneId) return;
    getLocations("areas", Number(zoneId)).then(setAreas).catch(() => {});
  }, [zoneId]);

  async function book() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/courier/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, city_id: cityId, zone_id: zoneId, area_id: areaId || undefined, weight, amount_to_collect: amount, instruction }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Booked with Pathao — ${data.consignment_id}`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function refresh() {
    setBusy(true);
    try {
      const res = await fetch("/api/admin/courier/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Pathao status: ${data.pathao_status}`);
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (consignmentId) {
    return (
      <div className="space-y-3 text-sm font-sans">
        <p className="text-brand-gray-600">Booked with Pathao</p>
        <p className="font-mono text-base text-brand-black">{consignmentId}</p>
        <Button onClick={refresh} loading={busy} size="sm" variant="outline">Refresh delivery status</Button>
      </div>
    );
  }

  if (error) {
    return (
      <p className="text-sm font-sans text-brand-gray-600">
        {error}{" "}
        <Link href="/admin/courier" className="underline text-brand-black">Set up Pathao →</Link>
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className={label}>City</label>
          <select value={cityId} onChange={(e) => setCityId(e.target.value)} className={field}>
            <option value="">{cities.length ? "Choose city" : "Loading…"}</option>
            {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Zone</label>
          <select value={zoneId} onChange={(e) => setZoneId(e.target.value)} className={field} disabled={!zones.length}>
            <option value="">Choose zone</option>
            {zones.map((z) => <option key={z.id} value={z.id}>{z.name}</option>)}
          </select>
        </div>
        <div>
          <label className={label}>Area (optional)</label>
          <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className={field} disabled={!areas.length}>
            <option value="">—</option>
            {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label}>Cash to collect (৳)</label>
          <input type="number" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label}>Weight (kg)</label>
          <input type="number" step="0.1" min="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} className={field} />
        </div>
      </div>
      <div>
        <label className={label}>Note for rider (optional)</label>
        <input value={instruction} onChange={(e) => setInstruction(e.target.value)} placeholder="e.g. Call before delivery" className={field} />
      </div>
      <Button onClick={book} loading={busy} size="md" disabled={!cityId || !zoneId}>Book with Pathao</Button>
    </div>
  );
}
