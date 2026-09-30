"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function AbandonedActions({ id, phone, name, status }: { id: string; phone: string; name: string | null; status: string }) {
  const router = useRouter();
  async function setStatus(next: string) {
    const res = await fetch("/api/admin/abandoned", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: next }),
    });
    if (!res.ok) return toast.error("Could not update");
    toast.success(`Marked ${next}`);
    router.refresh();
  }
  const msg = `Hi ${name || ""}! This is Sashico 👋 We noticed you didn't finish your order — can we help with size or delivery? Your items are still available: https://sashico.net/cart`;
  const btn = "text-2xs uppercase tracking-wider border border-brand-gray-200 px-2.5 py-1.5 hover:border-black whitespace-nowrap";
  return (
    <div className="flex flex-wrap gap-2">
      <a className={btn} href={`https://wa.me/88${phone}?text=${encodeURIComponent(msg)}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
      <a className={btn} href={`tel:${phone}`}>Call</a>
      {status !== "contacted" && status !== "recovered" && <button className={btn} onClick={() => setStatus("contacted")}>Contacted</button>}
      {status !== "recovered" && <button className={btn} onClick={() => setStatus("recovered")}>Recovered</button>}
      {status !== "dismissed" && status !== "recovered" && <button className={btn} onClick={() => setStatus("dismissed")}>Dismiss</button>}
    </div>
  );
}
