"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

interface PageEditorProps {
  slug: string;
  label: string;
  initialContent: Record<string, unknown>;
  pageId: number | null;
}

// ─── Simple pages (Shipping, Returns, Privacy, Terms) ────────────────────────
function RichTextEditor({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">
        {label} <span className="normal-case text-brand-gray-400">(HTML supported)</span>
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={20}
        className="w-full border border-brand-gray-200 bg-white px-4 py-3 text-sm font-mono placeholder:text-brand-gray-400 focus:border-brand-black focus:outline-none resize-y transition-colors"
        placeholder="<p>Your content here...</p>"
      />
      <p className="mt-1 text-xs text-brand-gray-400 font-sans">Use &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;ul&gt;&lt;li&gt;, &lt;strong&gt;, &lt;br&gt; tags for formatting.</p>
    </div>
  );
}

// ─── FAQ editor ───────────────────────────────────────────────────────────────
function FAQEditor({
  categories,
  onChange,
}: {
  categories: { name: string; items: { q: string; a: string }[] }[];
  onChange: (v: { name: string; items: { q: string; a: string }[] }[]) => void;
}) {
  function updateCat(i: number, key: "name", val: string) {
    const next = [...categories];
    next[i] = { ...next[i], [key]: val };
    onChange(next);
  }

  function updateItem(ci: number, ii: number, key: "q" | "a", val: string) {
    const next = [...categories];
    const items = [...next[ci].items];
    items[ii] = { ...items[ii], [key]: val };
    next[ci] = { ...next[ci], items };
    onChange(next);
  }

  function addItem(ci: number) {
    const next = [...categories];
    next[ci] = { ...next[ci], items: [...next[ci].items, { q: "", a: "" }] };
    onChange(next);
  }

  function removeItem(ci: number, ii: number) {
    const next = [...categories];
    next[ci] = { ...next[ci], items: next[ci].items.filter((_, i) => i !== ii) };
    onChange(next);
  }

  function addCategory() {
    onChange([...categories, { name: "New Category", items: [{ q: "", a: "" }] }]);
  }

  function removeCategory(i: number) {
    onChange(categories.filter((_, idx) => idx !== i));
  }

  return (
    <div className="space-y-8">
      {categories.map((cat, ci) => (
        <div key={ci} className="border border-brand-gray-100 p-5 space-y-4">
          <div className="flex items-center gap-3">
            <input
              value={cat.name}
              onChange={(e) => updateCat(ci, "name", e.target.value)}
              className="flex-1 border border-brand-gray-200 px-3 py-2 text-sm font-sans font-semibold focus:border-brand-black focus:outline-none"
              placeholder="Category name"
            />
            <button onClick={() => removeCategory(ci)} className="text-red-400 hover:text-red-600 transition-colors p-1">
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
          {cat.items.map((item, ii) => (
            <div key={ii} className="bg-brand-gray-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <input
                    value={item.q}
                    onChange={(e) => updateItem(ci, ii, "q", e.target.value)}
                    className="w-full border border-brand-gray-200 px-3 py-2 text-sm font-sans focus:border-brand-black focus:outline-none"
                    placeholder="Question"
                  />
                  <textarea
                    value={item.a}
                    onChange={(e) => updateItem(ci, ii, "a", e.target.value)}
                    rows={3}
                    className="w-full border border-brand-gray-200 px-3 py-2 text-sm font-sans focus:border-brand-black focus:outline-none resize-none"
                    placeholder="Answer"
                  />
                </div>
                <button onClick={() => removeItem(ci, ii)} className="text-red-400 hover:text-red-600 transition-colors p-1 mt-1">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
          <button
            onClick={() => addItem(ci)}
            className="flex items-center gap-2 text-xs font-sans text-brand-gray-500 hover:text-brand-black transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Question
          </button>
        </div>
      ))}
      <button
        onClick={addCategory}
        className="flex items-center gap-2 text-xs font-sans border border-dashed border-brand-gray-300 px-4 py-3 w-full justify-center hover:border-brand-black hover:text-brand-black transition-colors text-brand-gray-500"
      >
        <Plus className="h-4 w-4" /> Add Category
      </button>
    </div>
  );
}

// ─── Main editor ──────────────────────────────────────────────────────────────
export default function PageEditor({ slug, label, initialContent, pageId }: PageEditorProps) {
  const [content, setContent] = useState<Record<string, unknown>>(initialContent);
  const [saving, setSaving] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  function set(key: string, value: unknown) {
    setContent((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (pageId) {
        const { error } = await supabase
          .from("page_content")
          .update({ content, updated_at: new Date().toISOString() })
          .eq("id", pageId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("page_content")
          .insert({ page_slug: slug, page_title: label, content });
        if (error) throw error;
      }
      toast.success("Page saved!");
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  const str = (key: string, fallback = "") => String(content[key] ?? fallback);

  // ── About ──
  if (slug === "about") return (
    <div className="space-y-6">
      <Input label="Page Heading" value={str("heading")} onChange={(e) => set("heading", e.target.value)} placeholder="Embroidery Is Our Language" />
      <Input label="Story Heading" value={str("subheading")} onChange={(e) => set("subheading", e.target.value)} placeholder="Born from Bangladesh" />
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">Story Body</label>
        <textarea value={str("body")} onChange={(e) => set("body", e.target.value)} rows={8}
          className="w-full border border-brand-gray-200 bg-white px-4 py-3 text-sm font-sans placeholder:text-brand-gray-400 focus:border-brand-black focus:outline-none resize-y transition-colors"
          placeholder="Tell your brand story..." />
      </div>
      <div className="border-t border-brand-gray-100 pt-4">
        <p className="label-xs text-brand-gray-500 mb-4">Values (3 items)</p>
        {((content.values as { title: string; description: string }[]) || []).map((v, i) => (
          <div key={i} className="bg-brand-gray-50 p-4 space-y-2 mb-3">
            <input value={v.title} onChange={(e) => {
              const next = [...((content.values as { title: string; description: string }[]) || [])];
              next[i] = { ...next[i], title: e.target.value };
              set("values", next);
            }} className="w-full border border-brand-gray-200 px-3 py-2 text-sm font-sans focus:border-brand-black focus:outline-none" placeholder="Value title" />
            <textarea value={v.description} onChange={(e) => {
              const next = [...((content.values as { title: string; description: string }[]) || [])];
              next[i] = { ...next[i], description: e.target.value };
              set("values", next);
            }} rows={2} className="w-full border border-brand-gray-200 px-3 py-2 text-sm font-sans focus:border-brand-black focus:outline-none resize-none" placeholder="Value description" />
          </div>
        ))}
      </div>
      <Button onClick={handleSave} loading={saving}>Save Page</Button>
    </div>
  );

  // ── Contact ──
  if (slug === "contact") return (
    <div className="space-y-6">
      <Input label="Page Heading" value={str("heading")} onChange={(e) => set("heading", e.target.value)} placeholder="Get In Touch" />
      <Input label="Email" type="email" value={str("email")} onChange={(e) => set("email", e.target.value)} placeholder="sashicofficial2020@gmail.com" />
      <Input label="Phone / WhatsApp" value={str("phone")} onChange={(e) => set("phone", e.target.value)} placeholder="01628340463" />
      <Input label="Address" value={str("address")} onChange={(e) => set("address", e.target.value)} placeholder="Dhaka, Bangladesh" />
      <Input label="Business Hours" value={str("hours")} onChange={(e) => set("hours", e.target.value)} placeholder="Mon–Sat, 10am–6pm" />
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">Intro Text</label>
        <textarea value={str("body")} onChange={(e) => set("body", e.target.value)} rows={3}
          className="w-full border border-brand-gray-200 bg-white px-4 py-3 text-sm font-sans placeholder:text-brand-gray-400 focus:border-brand-black focus:outline-none resize-none transition-colors"
          placeholder="Have a question? We'd love to hear from you." />
      </div>
      <Button onClick={handleSave} loading={saving}>Save Page</Button>
    </div>
  );

  // ── FAQ ──
  if (slug === "faq") {
    const cats = (content.categories as { name: string; items: { q: string; a: string }[] }[]) || [];
    return (
      <div className="space-y-6">
        <Input label="Page Heading" value={str("heading")} onChange={(e) => set("heading", e.target.value)} placeholder="Frequently Asked Questions" />
        <div>
          <p className="label-xs text-brand-gray-700 mb-4">FAQ Categories & Questions</p>
          <FAQEditor categories={cats} onChange={(v) => set("categories", v)} />
        </div>
        <Button onClick={handleSave} loading={saving}>Save Page</Button>
      </div>
    );
  }

  // ── Size Guide ──
  if (slug === "size-guide") {
    const rows = (content.rows as { size: string; chest: string; waist: string; hips: string; shoulder: string }[]) || [];
    return (
      <div className="space-y-6">
        <Input label="Page Heading" value={str("heading")} onChange={(e) => set("heading", e.target.value)} placeholder="Size Guide" />
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">Intro Text</label>
          <textarea value={str("body")} onChange={(e) => set("body", e.target.value)} rows={3}
            className="w-full border border-brand-gray-200 bg-white px-4 py-3 text-sm font-sans placeholder:text-brand-gray-400 focus:border-brand-black focus:outline-none resize-none transition-colors" />
        </div>
        <div>
          <p className="label-xs text-brand-gray-700 mb-3">Size Table</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-sans border border-brand-gray-200">
              <thead>
                <tr className="bg-brand-gray-50 text-xs uppercase tracking-wider text-brand-gray-500">
                  {["Size", "Chest", "Waist", "Hips", "Shoulder"].map(h => (
                    <th key={h} className="px-3 py-2 text-left border-b border-brand-gray-200">{h} (cm)</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-brand-gray-100">
                    {(["size","chest","waist","hips","shoulder"] as const).map((col) => (
                      <td key={col} className="px-2 py-1">
                        <input value={row[col]} onChange={(e) => {
                          const next = [...rows];
                          next[i] = { ...next[i], [col]: e.target.value };
                          set("rows", next);
                        }} className="w-full border border-brand-gray-200 px-2 py-1 text-xs focus:border-brand-black focus:outline-none" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <Button onClick={handleSave} loading={saving}>Save Page</Button>
      </div>
    );
  }

  // ── Simple pages (Shipping, Returns, Privacy, Terms) ──
  return (
    <div className="space-y-6">
      <Input label="Page Heading" value={str("heading")} onChange={(e) => set("heading", e.target.value)} />
      <RichTextEditor label="Page Content" value={str("body")} onChange={(v) => set("body", v)} />
      <Button onClick={handleSave} loading={saving}>Save Page</Button>
    </div>
  );
}
