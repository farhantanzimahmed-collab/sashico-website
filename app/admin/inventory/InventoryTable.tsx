"use client";

import { useMemo, useState } from "react";
import toast from "react-hot-toast";

export interface InvRow {
  productId: string; name: string; slug: string; active: boolean; size: string;
  master: number; reserved: number; available: number; sold: number;
}

type Filter = "all" | "attention" | "out";

export default function InventoryTable({ rows: initial }: { rows: InvRow[] }) {
  const [rows, setRows] = useState(initial);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");
  const key = (r: InvRow) => `${r.productId}|${r.size}`;

  const shown = useMemo(() => rows.filter((r) => {
    if (q && !`${r.name} ${r.slug} ${r.size}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (filter === "attention") return r.available <= 2;
    if (filter === "out") return r.available <= 0;
    return true;
  }), [rows, filter, q]);

  async function save(r: InvRow) {
    const v = edits[key(r)];
    if (v === undefined || Number(v) === r.master) return;
    const res = await fetch("/api/admin/inventory", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: r.productId, size: r.size, master: v }),
    });
    const data = await res.json();
    if (!res.ok) return toast.error(data.error || "Could not save");
    const s = (data.sizes as { size: string; master: number; reserved: number; sold: number }[]).find((x) => x.size === r.size)!;
    setRows((prev) => prev.map((x) => key(x) === key(r) ? { ...x, master: s.master, reserved: s.reserved, sold: s.sold, available: s.master - s.reserved } : x));
    setEdits((e) => { const n = { ...e }; delete n[key(r)]; return n; });
    toast.success(`${r.name} (${r.size}): master ${s.master}, available ${Math.max(s.master - s.reserved, 0)}`);
  }

  const tab = (f: Filter, label: string) => (
    <button onClick={() => setFilter(f)} className={`text-2xs uppercase tracking-wider px-3 py-2 border font-sans ${filter === f ? "bg-black text-white border-black" : "border-brand-gray-200 hover:border-black"}`}>{label}</button>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 mb-3">
        {tab("all", "All")}{tab("attention", "Low (≤2)")}{tab("out", "Out / oversold")}
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search product or code…"
          className="ml-auto border border-brand-gray-200 px-3 py-2 text-sm font-sans focus:border-black focus:outline-none" />
      </div>
      <div className="bg-white border border-brand-gray-100 overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-brand-gray-100 bg-brand-gray-50 text-left text-2xs uppercase tracking-wider text-brand-gray-400">
              {["Product", "Size", "Master", "Reserved", "Available", "Sold"].map((h) => <th key={h} className="px-4 py-3 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => {
              const k = key(r); const editing = edits[k] !== undefined;
              return (
                <tr key={k} className={`border-b border-brand-gray-100 ${!r.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-2.5">
                    <p className="text-brand-black">{r.name}</p>
                    <p className="text-2xs text-brand-gray-500 uppercase">{r.slug}{!r.active && " · inactive"}</p>
                  </td>
                  <td className="px-4 py-2.5">{r.size}</td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <input type="number" min={0} value={editing ? edits[k] : r.master}
                        onChange={(e) => setEdits((x) => ({ ...x, [k]: e.target.value }))}
                        onKeyDown={(e) => e.key === "Enter" && save(r)}
                        className="w-20 border border-brand-gray-200 px-2 py-1.5 focus:border-black focus:outline-none" aria-label={`Master ${r.name} ${r.size}`} />
                      {editing && <button onClick={() => save(r)} className="text-2xs uppercase tracking-wider bg-black text-white px-2.5 py-1.5">Save</button>}
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-brand-gray-600">{r.reserved}</td>
                  <td className={`px-4 py-2.5 font-semibold ${r.available < 0 ? "text-red-700" : r.available === 0 ? "text-orange-600" : r.available <= 2 ? "text-yellow-700" : "text-green-700"}`}>
                    {r.available < 0 ? `${r.available} (oversold)` : r.available}
                  </td>
                  <td className="px-4 py-2.5 text-brand-gray-600">{r.sold}</td>
                </tr>
              );
            })}
            {!shown.length && <tr><td colSpan={6} className="px-4 py-10 text-center text-brand-gray-400">Nothing to show.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
