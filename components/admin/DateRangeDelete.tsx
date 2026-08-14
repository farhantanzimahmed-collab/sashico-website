"use client";

import { useState } from "react";
import { Trash2, CalendarRange } from "lucide-react";
import { useRouter } from "next/navigation";

export default function DateRangeDelete({ type }: { type: "customers" | "orders" }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const endpoint = type === "customers" ? "/api/admin/customers" : "/api/admin/orders";
  const label = type === "customers" ? "customers" : "orders";

  function reset() {
    setFrom("");
    setTo("");
    setConfirming(false);
    setLoading(false);
  }

  function handleRangeChange() {
    setConfirming(false);
  }

  function handleRequestDelete() {
    if (!from || !to) {
      alert("Please select both start and end dates.");
      return;
    }
    if (new Date(from) > new Date(to)) {
      alert("Start date must be before or equal to end date.");
      return;
    }
    setConfirming(true);
  }

  async function handleConfirmDelete() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateFrom: from, dateTo: to }),
      });
      const data = await res.json();
      if (res.ok) {
        const count = data.deleted ?? 0;
        alert(`${count} ${label} deleted.`);
        reset();
        router.refresh();
      } else {
        alert("Failed: " + (data.error || "Unknown error"));
        setLoading(false);
        setConfirming(false);
      }
    } catch {
      alert("Network error. Please try again.");
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <span className="flex items-center gap-1.5 text-2xs uppercase tracking-wider font-sans text-brand-gray-400">
        <CalendarRange className="h-3.5 w-3.5" />
        Delete by date
      </span>

      <input
        type="date"
        value={from}
        onChange={(e) => { setFrom(e.target.value); handleRangeChange(); }}
        className="border border-brand-gray-200 px-3 py-1.5 text-xs font-sans text-brand-black bg-white focus:border-brand-black focus:outline-none"
      />

      <span className="text-2xs text-brand-gray-400 font-sans">—</span>

      <input
        type="date"
        value={to}
        onChange={(e) => { setTo(e.target.value); handleRangeChange(); }}
        className="border border-brand-gray-200 px-3 py-1.5 text-xs font-sans text-brand-black bg-white focus:border-brand-black focus:outline-none"
      />

      {!confirming ? (
        <button
          onClick={handleRequestDelete}
          className="flex items-center gap-1.5 px-3 py-1.5 text-2xs uppercase tracking-wider font-sans border border-red-200 text-red-500 hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!from || !to}
        >
          <Trash2 className="h-3 w-3" />
          Delete range
        </button>
      ) : (
        <span className="flex items-center gap-2">
          <button
            onClick={handleConfirmDelete}
            disabled={loading}
            className="px-3 py-1.5 text-2xs uppercase tracking-wider font-sans bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-60"
          >
            {loading ? "Deleting…" : "Confirm delete"}
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={loading}
            className="text-2xs uppercase tracking-wider font-sans text-brand-gray-400 hover:text-brand-black transition-colors"
          >
            Cancel
          </button>
        </span>
      )}
    </div>
  );
}
