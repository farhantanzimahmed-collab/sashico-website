"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { SiteSettings } from "@/lib/types";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import toast from "react-hot-toast";
import { Upload } from "lucide-react";

interface SiteSettingsFormProps {
  settings: SiteSettings | null;
}

export default function SiteSettingsForm({ settings }: SiteSettingsFormProps) {
  const supabase = createClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState<string | null>(null);

  const [values, setValues] = useState({
    site_name: settings?.site_name || "Sashico",
    tagline: settings?.tagline || "Premium Embroidery Streetwear",
    logo_url: settings?.youtube_url || "",
    hero_title: settings?.hero_title || "Wear the Culture",
    hero_subtitle: settings?.hero_subtitle || "Premium embroidery streetwear crafted in Bangladesh",
    hero_image: settings?.hero_image || "",
    hero_video: settings?.hero_video || "",
    hero_mode: settings?.hero_mode || "multi_image",
    hero_cover_image: settings?.hero_cover_image || "",
    hero_image_1: settings?.hero_image_1 || "",
    hero_image_2: settings?.hero_image_2 || "",
    hero_image_3: settings?.hero_image_3 || "",
    hero_image_4: settings?.hero_image_4 || "",
    hero_cta_text: settings?.hero_cta_text || "Shop Collection",
    about_title: settings?.about_title || "Our Story",
    about_content: settings?.about_content || "",
    about_image: settings?.about_image || "",
    contact_email: settings?.contact_email || "",
    contact_phone: settings?.contact_phone || "",
    contact_address: settings?.contact_address || "",
    instagram_url: settings?.instagram_url || "",
    facebook_url: settings?.facebook_url || "",
    tiktok_url: settings?.tiktok_url || "",
    shipping_cost: settings?.shipping_cost || 80,
    free_shipping_threshold: settings?.free_shipping_threshold || 2000,
    announcement_bar_text: settings?.announcement_bar_text || "",
    announcement_bar_enabled: settings?.announcement_bar_enabled || false,
    announcement_bar_bg_color: settings?.announcement_bar_bg_color || "#000000",
    announcement_bar_text_color: settings?.announcement_bar_text_color || "#FFFFFF",
    font_family: settings?.font_family || "Manrope",
  });

  function handleChange(key: string, value: string | boolean | number) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleImageUpload(key: "hero_image" | "hero_image_1" | "hero_image_2" | "hero_image_3" | "hero_image_4" | "hero_cover_image" | "about_image" | "logo_url" | "hero_video", e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(key);

    try {
      const isVideo = file.type.startsWith("video/");

      if (isVideo) {
        // Videos bypass Vercel's body limit by uploading directly to Supabase
        const presignRes = await fetch("/api/admin/upload-presigned", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ filename: file.name, folder: "settings" }),
        });
        const presignJson = await presignRes.json();
        if (!presignRes.ok) throw new Error(presignJson.error || "Presign failed");

        const uploadRes = await fetch(presignJson.signedUrl, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });
        if (!uploadRes.ok) throw new Error("Upload to storage failed");

        handleChange(key, presignJson.publicUrl);
        toast.success("Video uploaded");
      } else {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("folder", "settings");

        const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || "Unknown error");
        handleChange(key, json.url);
        toast.success("Image uploaded");
      }
    } catch (err: any) {
      toast.error(`Upload failed: ${err.message}`);
    } finally {
      setUploading(null);
    }
  }

  const hasNewSettingsCols = settings !== null && typeof settings === "object" && "font_family" in settings;
  const hasHeroModeCols = settings !== null && typeof settings === "object" && "hero_mode" in settings;

  async function handleSave() {
    setSaving(true);
    try {
      const { logo_url, announcement_bar_bg_color, announcement_bar_text_color, font_family, hero_mode, hero_cover_image, ...rest } = values;
      const payload: any = { ...rest, youtube_url: logo_url, updated_at: new Date().toISOString() };
      if (hasNewSettingsCols) {
        payload.font_family = font_family;
        payload.announcement_bar_bg_color = announcement_bar_bg_color;
        payload.announcement_bar_text_color = announcement_bar_text_color;
      }
      if (hasHeroModeCols) {
        payload.hero_mode = hero_mode;
        payload.hero_cover_image = hero_cover_image;
      }
      const { error } = await supabase.from("site_settings").update(payload).eq("id", 1);
      if (error) throw error;
      toast.success("Settings saved successfully!");
    } catch (err: any) {
      toast.error(err.message || "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function ImageUploadField({ label, fieldKey, accept }: { label: string; fieldKey: "hero_image" | "hero_image_1" | "hero_image_2" | "hero_image_3" | "hero_image_4" | "hero_cover_image" | "about_image" | "logo_url" | "hero_video"; accept?: string }) {
    return (
      <div>
        <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">
          {label}
        </label>
        <div className="flex gap-3 items-start">
          <input
            type="text"
            value={(values as any)[fieldKey]}
            onChange={(e) => handleChange(fieldKey, e.target.value)}
            placeholder="Image URL or upload below"
            className="flex-1 border border-brand-gray-200 bg-white px-4 py-3 text-sm font-sans placeholder:text-brand-gray-400 focus:border-brand-black focus:outline-none"
          />
          <label className="cursor-pointer flex items-center gap-2 border border-brand-gray-200 px-4 py-3 text-xs font-sans text-brand-gray-600 hover:border-brand-black hover:text-brand-black transition-colors whitespace-nowrap">
            <Upload className="h-3.5 w-3.5" />
            {uploading === fieldKey ? "Uploading..." : "Upload"}
            <input
              type="file"
              accept={accept || "image/*"}
              className="sr-only"
              onChange={(e) => handleImageUpload(fieldKey, e)}
              disabled={uploading === fieldKey}
            />
          </label>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Brand Identity */}
      <section className="bg-white border border-brand-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
          Brand Identity
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Input label="Site Name" value={values.site_name} onChange={(e) => handleChange("site_name", e.target.value)} />
          <Input label="Tagline" value={values.tagline} onChange={(e) => handleChange("tagline", e.target.value)} />
        </div>
        <ImageUploadField label="Brand Logo (PNG recommended, transparent background)" fieldKey="logo_url" />
        {values.logo_url && (
          <div className="flex items-center gap-4 p-4 border border-brand-gray-100 bg-brand-gray-50">
            <div className="flex items-center gap-3">
              <div className="h-10 w-24 bg-brand-gray-200 flex items-center justify-center text-[10px] text-brand-gray-400 font-sans uppercase tracking-wide">Light bg</div>
              <div className="h-10 w-24 bg-brand-black flex items-center justify-center text-[10px] text-white/40 font-sans uppercase tracking-wide">Dark bg</div>
            </div>
            <div className="flex-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={values.logo_url} alt="Logo preview" className="h-8 object-contain" />
            </div>
            <button onClick={() => handleChange("logo_url", "")} className="text-xs text-brand-gray-400 hover:text-red-500 font-sans transition-colors">Remove</button>
          </div>
        )}
        {!values.logo_url && (
          <p className="text-xs text-brand-gray-400 font-sans">No logo uploaded — site name text will be used in the header instead.</p>
        )}
      </section>

      {/* Hero */}
      <section className="bg-white border border-brand-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
          Homepage Hero
        </h3>
        <Input label="Hero Title" value={values.hero_title} onChange={(e) => handleChange("hero_title", e.target.value)} />
        <Input label="Hero Subtitle" value={values.hero_subtitle} onChange={(e) => handleChange("hero_subtitle", e.target.value)} />
        <Input label="CTA Button Text" value={values.hero_cta_text} onChange={(e) => handleChange("hero_cta_text", e.target.value)} />

        {/* Hero Mode Selector */}
        <div className="pt-2 border-t border-brand-gray-100">
          <p className="text-xs font-sans font-semibold text-brand-black uppercase tracking-wider mb-1">Hero Display Mode</p>
          <p className="text-xs text-brand-gray-400 font-sans mb-3">Choose how the homepage hero section looks.</p>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "multi_image", label: "Multi-Image", desc: "4-panel grid" },
              { value: "single_image", label: "Single Cover", desc: "Full-width image" },
              { value: "video", label: "Video", desc: "Autoplay video" },
            ].map((mode) => (
              <button
                key={mode.value}
                type="button"
                onClick={() => handleChange("hero_mode", mode.value)}
                className={`border p-3 text-left transition-all ${values.hero_mode === mode.value ? "border-brand-black bg-brand-black text-white" : "border-brand-gray-200 text-brand-gray-700 hover:border-brand-black"}`}
              >
                <p className="text-xs font-sans font-semibold">{mode.label}</p>
                <p className={`text-[10px] font-sans mt-0.5 ${values.hero_mode === mode.value ? "text-white/60" : "text-brand-gray-400"}`}>{mode.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Single Cover Image */}
        {values.hero_mode === "single_image" && (
          <div className="pt-2">
            <p className="text-xs font-sans font-semibold text-brand-black uppercase tracking-wider mb-1">Cover Image</p>
            <p className="text-xs text-brand-gray-400 font-sans mb-3">Full-width image covering the entire hero. Landscape recommended.</p>
            {values.hero_cover_image && (
              <div className="relative aspect-video bg-brand-gray-100 overflow-hidden mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={values.hero_cover_image} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
                <button onClick={() => handleChange("hero_cover_image", "")} className="absolute top-2 right-2 h-6 w-6 bg-white/90 text-brand-gray-600 hover:text-red-500 flex items-center justify-center text-xs">✕</button>
              </div>
            )}
            <ImageUploadField label={values.hero_cover_image ? "Replace Cover Image" : "Upload Cover Image"} fieldKey="hero_cover_image" />
          </div>
        )}

        {/* Video */}
        {values.hero_mode === "video" && (
          <div className="pt-2">
            <p className="text-xs font-sans font-semibold text-brand-black uppercase tracking-wider mb-1">Hero Video</p>
            <p className="text-xs text-brand-gray-400 font-sans mb-3">Autoplay, loop, muted. MP4 recommended for best compatibility.</p>
            <div className="space-y-2">
              <Input label="Video URL" value={values.hero_video} onChange={(e) => handleChange("hero_video", e.target.value)} placeholder="Paste video URL or upload below" />
              <ImageUploadField label="Upload Video" fieldKey="hero_video" accept="video/*" />
              {values.hero_video && (
                <div className="flex items-center gap-3 mt-2">
                  <video src={values.hero_video} className="h-24 object-cover" muted />
                  <button onClick={() => handleChange("hero_video", "")} className="text-xs text-brand-gray-400 hover:text-red-500 font-sans">Remove</button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* 4 Hero Panel Images (multi_image mode) */}
        {values.hero_mode !== "single_image" && values.hero_mode !== "video" && (
          <div className="pt-2">
            <p className="text-xs font-sans font-semibold text-brand-black uppercase tracking-wider mb-1">Hero Panel Images</p>
            <p className="text-xs text-brand-gray-400 font-sans mb-4">Upload up to 4 images. Leave empty to auto-use product images.</p>
            <div className="grid grid-cols-2 gap-4">
              {([1, 2, 3, 4] as const).map((n) => {
                const key = `hero_image_${n}` as "hero_image_1" | "hero_image_2" | "hero_image_3" | "hero_image_4";
                return (
                  <div key={n} className="space-y-2">
                    <p className="text-xs font-sans text-brand-gray-600 font-medium">Panel {n}</p>
                    {values[key] && (
                      <div className="relative aspect-[3/4] bg-brand-gray-100 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={values[key]} alt={`Hero ${n}`} className="absolute inset-0 w-full h-full object-contain" />
                        <button onClick={() => handleChange(key, "")} className="absolute top-2 right-2 h-6 w-6 bg-white/90 text-brand-gray-600 hover:text-red-500 flex items-center justify-center text-xs">✕</button>
                      </div>
                    )}
                    <ImageUploadField label={values[key] ? "Replace Image" : "Upload Image"} fieldKey={key} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* About */}
      <section className="bg-white border border-brand-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
          About Section
        </h3>
        <Input label="About Title" value={values.about_title} onChange={(e) => handleChange("about_title", e.target.value)} />
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">About Content</label>
          <textarea
            value={values.about_content}
            onChange={(e) => handleChange("about_content", e.target.value)}
            rows={5}
            className="w-full border border-brand-gray-200 bg-white px-4 py-3 text-sm font-sans placeholder:text-brand-gray-400 focus:border-brand-black focus:outline-none resize-none"
          />
        </div>
        <ImageUploadField label="About Image" fieldKey="about_image" />
      </section>

      {/* Contact */}
      <section className="bg-white border border-brand-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
          Contact Info
        </h3>
        <Input label="Email" type="email" value={values.contact_email} onChange={(e) => handleChange("contact_email", e.target.value)} />
        <Input label="Phone" value={values.contact_phone} onChange={(e) => handleChange("contact_phone", e.target.value)} />
        <Input label="Address" value={values.contact_address} onChange={(e) => handleChange("contact_address", e.target.value)} />
      </section>

      {/* Social */}
      <section className="bg-white border border-brand-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
          Social Media Links
        </h3>
        <Input label="Instagram URL" value={values.instagram_url} onChange={(e) => handleChange("instagram_url", e.target.value)} placeholder="https://instagram.com/sashico" />
        <Input label="Facebook URL" value={values.facebook_url} onChange={(e) => handleChange("facebook_url", e.target.value)} placeholder="https://facebook.com/sashico" />
        <Input label="TikTok URL" value={values.tiktok_url} onChange={(e) => handleChange("tiktok_url", e.target.value)} placeholder="https://tiktok.com/@sashico" />
      </section>

      {/* Shipping */}
      <section className="bg-white border border-brand-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
          Shipping Settings
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Shipping Cost (৳)"
            type="number"
            value={values.shipping_cost}
            onChange={(e) => handleChange("shipping_cost", parseFloat(e.target.value))}
          />
          <Input
            label="Free Shipping Threshold (৳)"
            type="number"
            value={values.free_shipping_threshold}
            onChange={(e) => handleChange("free_shipping_threshold", parseFloat(e.target.value))}
          />
        </div>
      </section>

      {/* Announcement */}
      <section className="bg-white border border-brand-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
          Announcement Bar
        </h3>
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={values.announcement_bar_enabled}
            onChange={(e) => handleChange("announcement_bar_enabled", e.target.checked)}
            className="h-4 w-4 accent-brand-black"
          />
          <span className="text-sm font-sans text-brand-gray-700">Enable announcement bar</span>
        </label>
        <Input
          label="Announcement Text"
          value={values.announcement_bar_text}
          onChange={(e) => handleChange("announcement_bar_text", e.target.value)}
          placeholder="Free shipping on orders above ৳2,000"
        />
        <div className="grid grid-cols-2 gap-4 pt-2 border-t border-brand-gray-100">
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">Background Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={values.announcement_bar_bg_color}
                onChange={(e) => handleChange("announcement_bar_bg_color", e.target.value)}
                className="h-9 w-9 border border-brand-gray-200 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                value={values.announcement_bar_bg_color}
                onChange={(e) => handleChange("announcement_bar_bg_color", e.target.value)}
                placeholder="#000000"
                className="flex-1 border border-brand-gray-200 bg-white px-3 py-2 text-sm font-sans font-mono focus:border-brand-black focus:outline-none"
              />
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {["#000000", "#1a1a1a", "#111827", "#7f1d1d", "#1e3a5f"].map((c) => (
                <button key={c} onClick={() => handleChange("announcement_bar_bg_color", c)}
                  className="h-6 w-6 border border-brand-gray-200 flex-shrink-0"
                  style={{ background: c }} title={c} />
              ))}
            </div>
          </div>
          <div>
            <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">Text Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={values.announcement_bar_text_color}
                onChange={(e) => handleChange("announcement_bar_text_color", e.target.value)}
                className="h-9 w-9 border border-brand-gray-200 cursor-pointer p-0.5 bg-white"
              />
              <input
                type="text"
                value={values.announcement_bar_text_color}
                onChange={(e) => handleChange("announcement_bar_text_color", e.target.value)}
                placeholder="#FFFFFF"
                className="flex-1 border border-brand-gray-200 bg-white px-3 py-2 text-sm font-sans font-mono focus:border-brand-black focus:outline-none"
              />
            </div>
            <div className="flex gap-2 mt-2 flex-wrap">
              {["#FFFFFF", "#F5F5F5", "#FDE68A", "#BAE6FD", "#BBF7D0"].map((c) => (
                <button key={c} onClick={() => handleChange("announcement_bar_text_color", c)}
                  className="h-6 w-6 border border-brand-gray-200 flex-shrink-0"
                  style={{ background: c }} title={c} />
              ))}
            </div>
          </div>
        </div>
        {/* Live preview */}
        {values.announcement_bar_enabled && values.announcement_bar_text && (
          <div className="py-2.5 text-center text-xs font-sans rounded" style={{ background: values.announcement_bar_bg_color, color: values.announcement_bar_text_color }}>
            {values.announcement_bar_text}
          </div>
        )}
      </section>

      {/* Appearance / Font */}
      <section className="bg-white border border-brand-gray-100 p-6 space-y-4">
        <h3 className="text-sm font-sans font-semibold text-brand-black uppercase tracking-wider">
          Global Font
        </h3>
        <p className="text-xs text-brand-gray-400 font-sans">Choose the body/UI font for the website. Headings always use Bebas Neue.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {["Manrope", "Inter", "DM Sans", "Plus Jakarta Sans", "Nunito", "Poppins"].map((font) => (
            <button
              key={font}
              type="button"
              onClick={() => handleChange("font_family", font)}
              className={`border px-4 py-3 text-sm transition-all text-left ${values.font_family === font ? "border-brand-black bg-brand-black text-white" : "border-brand-gray-200 text-brand-gray-700 hover:border-brand-black"}`}
              style={{ fontFamily: font }}
            >
              {font}
              <span className="block text-xs opacity-60 mt-0.5">Aa Bb Cc</span>
            </button>
          ))}
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-brand-gray-700 font-sans">Custom Font Name</label>
          <Input
            value={values.font_family}
            onChange={(e) => handleChange("font_family", e.target.value)}
            placeholder="e.g. Manrope"
          />
          <p className="mt-1 text-xs text-brand-gray-400 font-sans">Must be a Google Font. Add the import to your layout.tsx manually.</p>
        </div>
      </section>

      <Button onClick={handleSave} loading={saving} size="lg">
        Save Settings
      </Button>
    </div>
  );
}
