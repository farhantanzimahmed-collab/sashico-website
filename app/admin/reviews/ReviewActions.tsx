"use client";

import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function ReviewActions({ id, approved }: { id: string; approved: boolean }) {
  const router = useRouter();
  async function act(action: "approve" | "hide" | "delete") {
    if (action === "delete" && !confirm("Delete this review permanently?")) return;
    const res = await fetch("/api/admin/reviews", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, action }) });
    if (!res.ok) return toast.error("Could not update review");
    toast.success(action === "approve" ? "Approved — now live" : action === "hide" ? "Hidden from site" : "Deleted");
    router.refresh();
  }
  const btn = "text-2xs uppercase tracking-wider border px-3 py-1.5 font-sans";
  return (
    <div className="flex gap-2 shrink-0">
      {approved
        ? <button className={`${btn} border-brand-gray-200 hover:border-black`} onClick={() => act("hide")}>Hide</button>
        : <button className={`${btn} border-black bg-black text-white`} onClick={() => act("approve")}>Approve</button>}
      <button className={`${btn} border-brand-gray-200 text-red-700 hover:border-red-700`} onClick={() => act("delete")}>Delete</button>
    </div>
  );
}
