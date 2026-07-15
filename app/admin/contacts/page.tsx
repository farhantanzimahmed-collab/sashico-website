"use client";

import { useState, useEffect } from "react";
import { Search, Eye, EyeOff, Trash2, Download, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { ContactSubmission } from "@/lib/types";
import toast from "react-hot-toast";

export default function ContactsAdminPage() {
  const supabase = createClient();
  const [contacts, setContacts] = useState<ContactSubmission[]>([]);
  const [filtered, setFiltered] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  async function loadContacts() {
    const { data } = await supabase
      .from("contact_submissions")
      .select("*")
      .order("created_at", { ascending: false });
    const list = (data as ContactSubmission[]) || [];
    setContacts(list);
    setFiltered(list);
    setLoading(false);
  }

  useEffect(() => { loadContacts(); }, []);

  useEffect(() => {
    if (!search.trim()) { setFiltered(contacts); return; }
    const q = search.toLowerCase();
    setFiltered(contacts.filter((c) =>
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.message.toLowerCase().includes(q)
    ));
  }, [search, contacts]);

  async function handleMarkRead(c: ContactSubmission) {
    await supabase.from("contact_submissions").update({ is_read: !c.is_read }).eq("id", c.id);
    loadContacts();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("contact_submissions").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    loadContacts();
  }

  function handleExpand(id: string) {
    setExpanded((prev) => prev === id ? null : id);
    const c = contacts.find((c) => c.id === id);
    if (c && !c.is_read) {
      supabase.from("contact_submissions").update({ is_read: true }).eq("id", id).then(() => loadContacts());
    }
  }

  function handleExport() {
    const rows = [
      ["Name", "Email", "Subject", "Message", "Status", "Date"],
      ...filtered.map((c) => [c.name, c.email, c.subject || "", c.message, c.is_read ? "Read" : "Unread", c.created_at]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `contacts-${Date.now()}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  const unread = contacts.filter((c) => !c.is_read).length;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-sans font-bold text-brand-black">Contact Messages</h1>
          <p className="text-sm text-brand-gray-500 font-sans mt-1">
            {unread > 0 ? <><strong className="text-brand-black">{unread} unread</strong> · </> : null}
            {contacts.length} total messages
          </p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 border border-brand-gray-200 px-4 py-2.5 text-sm font-sans text-brand-gray-700 hover:border-brand-black transition-colors"
        >
          <Download className="h-4 w-4" /> Export CSV
        </button>
      </div>

      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-gray-300" />
        <input
          type="text"
          placeholder="Search messages..."
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
            {search ? "No messages match your search." : "No messages yet."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c) => (
            <div key={c.id} className={`bg-white border transition-colors ${!c.is_read ? "border-brand-black" : "border-brand-gray-100"}`}>
              <div
                className="flex items-start gap-4 px-5 py-4 cursor-pointer"
                onClick={() => handleExpand(c.id)}
              >
                {!c.is_read && <div className="h-2 w-2 rounded-full bg-brand-black mt-1.5 flex-shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <p className={`text-sm font-sans font-semibold ${!c.is_read ? "text-brand-black" : "text-brand-gray-700"}`}>{c.name}</p>
                    <span className="text-xs font-sans text-brand-gray-400">{c.email}</span>
                    {c.subject && <span className="text-xs font-sans text-brand-gray-500 font-medium">{c.subject}</span>}
                  </div>
                  <p className="text-xs font-sans text-brand-gray-500 mt-0.5 truncate">{c.message}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0 ml-auto">
                  <span className="text-xs font-sans text-brand-gray-400">
                    {new Date(c.created_at).toLocaleDateString("en-BD")}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleMarkRead(c); }}
                    className="p-1.5 text-brand-gray-300 hover:text-brand-black transition-colors"
                    title={c.is_read ? "Mark unread" : "Mark read"}
                  >
                    {c.is_read ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}
                    className="p-1.5 text-brand-gray-300 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {expanded === c.id && (
                <div className="border-t border-brand-gray-100 px-5 py-4">
                  <p className="text-sm font-sans text-brand-gray-700 leading-relaxed whitespace-pre-wrap">{c.message}</p>
                  <a
                    href={`mailto:${c.email}?subject=Re: ${c.subject || "Your message"}`}
                    className="inline-flex items-center gap-2 mt-4 text-sm font-sans text-brand-black border border-brand-black px-4 py-2 hover:bg-brand-black hover:text-white transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5" /> Reply via Email
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
