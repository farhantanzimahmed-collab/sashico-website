"use client";

import { useState } from "react";
import { Download } from "lucide-react";

interface ExportButtonProps {
  type: "orders" | "customers" | "subscribers" | "contacts";
  label?: string;
}

export default function ExportButton({ type, label }: ExportButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleExport() {
    setLoading(true);
    try {
      const res = await fetch(`/api/export?type=${type}`);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sashico-${type}-${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handleExport}
      disabled={loading}
      className="flex items-center gap-2 border border-brand-gray-200 px-4 py-2.5 text-sm font-sans text-brand-gray-700 hover:border-brand-black transition-colors disabled:opacity-50"
    >
      <Download className="h-4 w-4" />
      {loading ? "Exporting..." : (label || "Export Excel")}
    </button>
  );
}
