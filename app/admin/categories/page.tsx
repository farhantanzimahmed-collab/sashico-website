"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Category } from "@/lib/types";
import { slugify } from "@/lib/utils";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";

export default function CategoriesAdminPage() {
  const supabase = createClient();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ name: "", slug: "", description: "" });

  async function loadCategories() {
    const { data } = await supabase
      .from("categories")
      .select("*")
      .order("display_order", { ascending: true });
    setCategories((data as Category[]) || []);
    setLoading(false);
  }

  useEffect(() => { loadCategories(); }, []);

  function handleNameChange(name: string) {
    setForm((f) => ({ ...f, name, slug: editingId ? f.slug : slugify(name) }));
  }

  async function handleSave() {
    if (!form.name.trim()) { toast.error("Name required"); return; }
    setSaving(true);
    try {
      if (editingId) {
        const { error } = await supabase
          .from("categories")
          .update({ name: form.name, slug: form.slug, description: form.description || null })
          .eq("id", editingId);
        if (error) throw error;
        toast.success("Category updated");
      } else {
        const maxOrder = categories.reduce((m, c) => Math.max(m, c.display_order), 0);
        const { error } = await supabase.from("categories").insert({
          name: form.name,
          slug: form.slug || slugify(form.name),
          description: form.description || null,
          display_order: maxOrder + 1,
          is_active: true,
        });
        if (error) throw error;
        toast.success("Category created");
      }
      setEditingId(null);
      setShowNew(false);
      setForm({ name: "", slug: "", description: "" });
      loadCategories();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? Products in this category will keep their category text but lose the category link.`)) return;
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    loadCategories();
  }

  async function handleToggleActive(cat: Category) {
    await supabase.from("categories").update({ is_active: !cat.is_active }).eq("id", cat.id);
    loadCategories();
  }

  function startEdit(cat: Category) {
    setEditingId(cat.id);
    setForm({ name: cat.name, slug: cat.slug, description: cat.description || "" });
    setShowNew(false);
  }

  function startNew() {
    setShowNew(true);
    setEditingId(null);
    setForm({ name: "", slug: "", description: "" });
  }

  function handleCancel() {
    setEditingId(null);
    setShowNew(false);
    setForm({ name: "", slug: "", description: "" });
  }

  const showForm = showNew || editingId;

  return (
    <div className="p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-sans font-bold text-brand-black">Categories</h1>
          <p className="text-sm text-brand-gray-500 font-sans mt-1">Manage product categories and their display order.</p>
        </div>
        {!showForm && (
          <Button onClick={startNew} size="sm">
            <Plus className="h-4 w-4" /> New Category
          </Button>
        )}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-brand-gray-100 p-6 mb-6 space-y-4">
          <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
            {editingId ? "Edit Category" : "New Category"}
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Name"
              value={form.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. T-Shirts"
            />
            <Input
              label="Slug (URL)"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              placeholder="t-shirts"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">Description (optional)</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={2}
              className="w-full border border-brand-gray-200 bg-white px-4 py-3 text-sm font-sans placeholder:text-brand-gray-400 focus:border-brand-black focus:outline-none resize-none"
              placeholder="Short description..."
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} loading={saving} size="sm">
              {editingId ? "Save Changes" : "Create Category"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleCancel}>Cancel</Button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-sm text-brand-gray-400 font-sans py-8 text-center">Loading...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-brand-gray-200">
          <p className="text-sm text-brand-gray-400 font-sans mb-3">No categories yet.</p>
          <p className="text-xs text-brand-gray-300 font-sans">Run the migration SQL first, then create categories here.</p>
        </div>
      ) : (
        <div className="bg-white border border-brand-gray-100 divide-y divide-brand-gray-100">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center gap-4 px-5 py-4">
              <GripVertical className="h-4 w-4 text-brand-gray-300 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-sans font-medium text-brand-black">{cat.name}</p>
                <p className="text-xs font-sans text-brand-gray-400 font-mono">/shop?category={cat.slug}</p>
                {cat.description && <p className="text-xs font-sans text-brand-gray-500 mt-0.5 truncate">{cat.description}</p>}
              </div>
              <button
                onClick={() => handleToggleActive(cat)}
                className={`text-2xs font-sans px-2.5 py-1 border transition-colors ${cat.is_active ? "border-green-200 text-green-700 bg-green-50" : "border-brand-gray-200 text-brand-gray-400"}`}
              >
                {cat.is_active ? "Active" : "Hidden"}
              </button>
              <button onClick={() => startEdit(cat)} className="p-2 text-brand-gray-400 hover:text-brand-black transition-colors">
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => handleDelete(cat.id, cat.name)} className="p-2 text-brand-gray-400 hover:text-red-500 transition-colors">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
