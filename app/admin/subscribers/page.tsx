"use client";

import { useState, useEffect } from "react";
import { Search, Trash2, Download, Mail, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { NewsletterSubscriber } from "@/lib/types";
import toast from "react-hot-toast";

export default function SubscribersAdminPage() {
  const supabase = createClient();
  const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
  const [filtered, setFiltered] = useState<NewsletterSubscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);

  async function loadSubscribers() {
    const { data } = await supabase
      .from("newsletter_subscribers")
      .select("*")
      .order("subscribed_at", { ascending: false });
    const list = (data as NewsletterSubscriber[]) || [];
    setSubscribers(list);
    setFiltered(list);
    setLoading(false);
  }

  useEffect(() => { loadSubscribers(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(subscribers); return; }
    const q = search.toLowerCase();
    setFiltered(subscribers.filter((s) =>
      s.email.toLowerCase().includes(q) || (s.phone || "").includes(q)
    ));
  }, [search, subscribers]);

  async function handleDelete(id: string) {
    if (!confirm("Remove this subscriber?")) return;
    setDeleting(id);
    const { error } = await supabase.from("newsletter_subscribers").delete().eq("id", id);
    if (error) { toast.error(error.message); } else { toast.success("Removed"); loadSubscribers(); }
    setDeleting(null);
  }

  async function handleToggleActive(sub: NewsletterSubscriber) {
    await supabase.from("newsletter_subscribers").update({ is_active: !sub.is_active }).eq("id", sub.id);
    loadSubscribers();
  }

  function handleExport() {
    const rows = [
      ["Email", "Phone", "Status", "Subscribed At"],
      ...filtered.map((s) => [s.email, s.phone || "", s.is_active ? "Active" : "Unsubscribed", s.subscribed_at]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `subscribers-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const active = subscribers.filter((s) => s.is_active).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-sans font-bold text-brand-black">Subscribers</h1>
          <p className="text-sm text-brand-gray-500 font-sans mt-1">
            {active} active · {subscribers.length} total
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 border border-brand-gray-200 px-4 py-2.5 text-sm font-sans text-brand-gray-700 hover:border-brand-black transition-colors"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray-300" />
        <input
          type="text"
          placeholder="Search by email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-brand-gray-200 text-sm font-sans focus:border-brand-black focus:outline-none"
        />
      </div>

      {loading ? (
        <div className="text-sm text-brand-gray-400 font-sans py-8 text-center">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-brand-gray-200">
          <p className="text-sm text-brand-gray-400 font-sans">
            {search ? "No subscribers match your search." : "No subscribers yet."}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-brand-gray-100">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brand-gray-100">
                <th className="px-5 py-3 text-left text-2xs uppercase tracking-wider font-sans text-brand-gray-400">Email</th>
                <th className="px-5 py-3 text-left text-2xs uppercase tracking-wider font-sans text-brand-gray-400">Phone</th>
                <th className="px-5 py-3 text-left text-2xs uppercase tracking-wider font-sans text-brand-gray-400">Status</th>
                <th className="px-5 py-3 text-left text-2xs uppercase tracking-wider font-sans text-brand-gray-400">Subscribed</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-gray-100">
              {filtered.map((sub) => (
                <tr key={sub.id} className="hover:bg-brand-gray-50">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-brand-gray-300 flex-shrink-0" />
                      <span className="text-sm font-sans text-brand-black">{sub.email}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    {sub.phone ? (
                      <div className="flex items-center gap-2">
                        <Phone className="h-3.5 w-3.5 text-brand-gray-300 flex-shrink-0" />
                        <span className="text-sm font-sans text-brand-gray-700">{sub.phone}</span>
                      </div>
                    ) : (
                      <span className="text-xs font-sans text-brand-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => handleToggleActive(sub)}
                      className={`text-2xs font-sans px-2.5 py-1 border transition-colors ${sub.is_active ? "border-green-200 text-green-700 bg-green-50" : "border-brand-gray-200 text-brand-gray-400"}`}
                    >
                      {sub.is_active ? "Active" : "Unsubscribed"}
                    </button>
                  </td>
                  <td className="px-5 py-3 text-sm font-sans text-brand-gray-500">
                    {new Date(sub.subscribed_at).toLocaleDateString("en-BD")}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => handleDelete(sub.id)}
                      disabled={deleting === sub.id}
                      className="p-1.5 text-brand-gray-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
