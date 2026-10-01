"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatPrice, formatDate } from "@/lib/utils";
import AbandonedActions from "./AbandonedActions";

export interface Cart {
  id: string;
  customer_name: string | null;
  customer_phone: string;
  items: { product_name: string; size: string; quantity: number }[];
  total_amount: number;
  status: string;
  notified_at: string | null;
  updated_at: string;
}

const STATUS_STYLE: Record<string, string> = {
  open: "bg-yellow-100 text-yellow-800",
  contacted: "bg-blue-100 text-blue-800",
  recovered: "bg-green-100 text-green-800",
  dismissed: "bg-gray-100 text-gray-600",
};

export default function AbandonedTable({ carts }: { carts: Cart[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState(false);
  const allSelected = carts.length > 0 && selected.size === carts.length;
  const idle = (c: Cart) => Date.now() - new Date(c.updated_at).getTime() > 30 * 60 * 1000;

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  async function remove(ids: string[]) {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} cart${ids.length > 1 ? "s" : ""} permanently?`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/abandoned", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: "delete" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not delete");
      toast.success(`Deleted ${data.deleted}`);
      setSelected(new Set());
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const selectedIds = useMemo(() => [...selected], [selected]);

  return (
    <>
      {/* Bulk actions */}
      <div className="flex items-center gap-3 mb-3 min-h-[36px]">
        {selected.size > 0 && (
          <>
            <span className="text-sm font-sans text-brand-gray-600">{selected.size} selected</span>
            <button
              onClick={() => remove(selectedIds)}
              disabled={busy}
              className="text-2xs uppercase tracking-wider border border-red-700 text-red-700 px-3 py-2 hover:bg-red-700 hover:text-white font-sans disabled:opacity-50"
            >
              Delete selected
            </button>
            <button onClick={() => setSelected(new Set())} className="text-2xs uppercase tracking-wider underline font-sans text-brand-gray-500">
              Clear
            </button>
          </>
        )}
      </div>

      <div className="bg-white border border-brand-gray-100 overflow-x-auto">
        <table className="w-full text-sm font-sans">
          <thead>
            <tr className="border-b border-brand-gray-100 bg-brand-gray-50 text-left text-2xs uppercase tracking-wider text-brand-gray-400">
              <th className="px-5 py-3 w-10">
                <input
                  type="checkbox"
                  aria-label="Select all"
                  checked={allSelected}
                  onChange={() => setSelected(allSelected ? new Set() : new Set(carts.map((c) => c.id)))}
                  className="h-4 w-4 accent-black cursor-pointer"
                />
              </th>
              {["Customer", "Cart", "Value", "Last activity", "Status", ""].map((h) => (
                <th key={h} className="px-5 py-3 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {carts.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-12 text-center text-brand-gray-400">No abandoned checkouts.</td></tr>
            )}
            {carts.map((c) => (
              <tr key={c.id} className={`border-b border-brand-gray-100 align-top ${selected.has(c.id) ? "bg-brand-gray-50" : ""}`}>
                <td className="px-5 py-4">
                  <input
                    type="checkbox"
                    aria-label={`Select ${c.customer_name || c.customer_phone}`}
                    checked={selected.has(c.id)}
                    onChange={() => toggle(c.id)}
                    className="h-4 w-4 accent-black cursor-pointer"
                  />
                </td>
                <td className="px-5 py-4">
                  <p className="text-brand-black">{c.customer_name || "—"}</p>
                  <a href={`tel:${c.customer_phone}`} className="text-xs text-brand-gray-600 underline">{c.customer_phone}</a>
                </td>
                <td className="px-5 py-4 text-xs text-brand-gray-600">
                  {c.items.map((i, n) => <p key={n}>{i.product_name} ({i.size}) ×{i.quantity}</p>)}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">{formatPrice(c.total_amount)}</td>
                <td className="px-5 py-4 text-xs text-brand-gray-500 whitespace-nowrap">{formatDate(c.updated_at)}</td>
                <td className="px-5 py-4">
                  <span className={`px-2 py-1 text-2xs uppercase tracking-wider ${STATUS_STYLE[c.status] || ""}`}>
                    {c.status === "open" && !idle(c) ? "checking out" : c.status}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2 items-start">
                    <AbandonedActions id={c.id} phone={c.customer_phone} name={c.customer_name} status={c.status} />
                    <button
                      onClick={() => remove([c.id])}
                      disabled={busy}
                      className="text-2xs uppercase tracking-wider border border-brand-gray-200 text-red-700 px-2.5 py-1.5 hover:border-red-700 whitespace-nowrap"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
