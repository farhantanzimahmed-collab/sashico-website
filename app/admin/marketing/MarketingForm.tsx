"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MarketingSettings } from "@/lib/types";
import Button from "@/components/ui/Button";
import toast from "react-hot-toast";

interface Integration {
  key: keyof MarketingSettings;
  enabledKey: keyof MarketingSettings;
  label: string;
  description: string;
  placeholder: string;
  helpLink: string;
  color: string;
}

const INTEGRATIONS: Integration[] = [
  {
    key: "meta_pixel_id",
    enabledKey: "meta_pixel_enabled",
    label: "Meta Pixel (Facebook & Instagram)",
    description: "Track conversions from Facebook and Instagram ads",
    placeholder: "Enter your Meta Pixel ID (e.g. 123456789012345)",
    helpLink: "https://www.facebook.com/business/help/952192354843755",
    color: "bg-blue-50 border-blue-200",
  },
  {
    key: "ga4_id",
    enabledKey: "ga4_enabled",
    label: "Google Analytics 4",
    description: "Track website traffic and user behavior",
    placeholder: "Enter your GA4 Measurement ID (e.g. G-XXXXXXXXXX)",
    helpLink: "https://support.google.com/analytics/answer/9304153",
    color: "bg-orange-50 border-orange-200",
  },
  {
    key: "gtm_id",
    enabledKey: "gtm_enabled",
    label: "Google Tag Manager",
    description: "Manage all your tags from one place (recommended)",
    placeholder: "Enter your GTM Container ID (e.g. GTM-XXXXXXX)",
    helpLink: "https://support.google.com/tagmanager/answer/6103696",
    color: "bg-green-50 border-green-200",
  },
  {
    key: "tiktok_pixel_id",
    enabledKey: "tiktok_pixel_enabled",
    label: "TikTok Pixel",
    description: "Track conversions from TikTok ads",
    placeholder: "Enter your TikTok Pixel ID",
    helpLink: "https://ads.tiktok.com/help/article/tiktok-pixel",
    color: "bg-pink-50 border-pink-200",
  },
  {
    key: "snapchat_pixel_id",
    enabledKey: "snapchat_pixel_enabled",
    label: "Snapchat Pixel",
    description: "Track conversions from Snapchat ads",
    placeholder: "Enter your Snapchat Pixel ID",
    helpLink: "https://businesshelp.snapchat.com/s/article/snap-pixel-about",
    color: "bg-yellow-50 border-yellow-200",
  },
];

interface MarketingFormProps {
  settings: MarketingSettings | null;
}

export default function MarketingForm({ settings }: MarketingFormProps) {
  const supabase = createClient();

  const [values, setValues] = useState<Partial<MarketingSettings>>({
    meta_pixel_id: settings?.meta_pixel_id || "",
    meta_pixel_enabled: settings?.meta_pixel_enabled || false,
    ga4_id: settings?.ga4_id || "",
    ga4_enabled: settings?.ga4_enabled || false,
    gtm_id: settings?.gtm_id || "",
    gtm_enabled: settings?.gtm_enabled || false,
    tiktok_pixel_id: settings?.tiktok_pixel_id || "",
    tiktok_pixel_enabled: settings?.tiktok_pixel_enabled || false,
    snapchat_pixel_id: settings?.snapchat_pixel_id || "",
    snapchat_pixel_enabled: settings?.snapchat_pixel_enabled || false,
  });

  const [saving, setSaving] = useState(false);

  function handleToggle(enabledKey: string, value: boolean) {
    setValues((prev) => ({ ...prev, [enabledKey]: value }));
  }

  function handleInput(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("marketing_settings")
        .update({
          ...values,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (error) throw error;
      toast.success("Marketing settings saved! Changes are now live.");
    } catch (err: any) {
      toast.error(err.message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  const activeCount = INTEGRATIONS.filter(
    (i) => values[i.enabledKey] && values[i.key]
  ).length;

  return (
    <div className="space-y-6">
      {/* Active count */}
      <div className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <p className="text-xs font-sans text-brand-gray-600">
          {activeCount} integration{activeCount !== 1 ? "s" : ""} currently active
        </p>
      </div>

      {INTEGRATIONS.map((integration) => {
        const isEnabled = !!values[integration.enabledKey];
        const pixelValue = (values[integration.key] as string) || "";

        return (
          <div
            key={integration.key}
            className={`border p-6 transition-all duration-200 ${
              isEnabled ? integration.color : "bg-white border-brand-gray-100"
            }`}
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <h3 className="text-sm font-sans font-semibold text-brand-black">
                    {integration.label}
                  </h3>
                  {isEnabled && pixelValue && (
                    <span className="text-2xs bg-green-100 text-green-700 px-2 py-0.5 uppercase tracking-wider font-sans">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-xs text-brand-gray-500 font-sans mt-1">
                  {integration.description}
                </p>
              </div>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => handleToggle(integration.enabledKey as string, !isEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
                  isEnabled ? "bg-brand-black" : "bg-brand-gray-200"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform duration-200 ${
                    isEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Input */}
            <div className="mt-4">
              <input
                type="text"
                value={pixelValue}
                onChange={(e) => handleInput(integration.key as string, e.target.value)}
                placeholder={integration.placeholder}
                className="w-full border border-brand-gray-200 bg-white px-4 py-3 text-sm font-sans text-brand-black placeholder:text-brand-gray-400 focus:border-brand-black focus:outline-none transition-colors font-mono"
              />
            </div>

            {/* Help link */}
            <a
              href={integration.helpLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-2xs text-brand-gray-400 hover:text-brand-black transition-colors font-sans underline underline-offset-2"
            >
              How to find your {integration.label.split(" ")[0]} ID →
            </a>
          </div>
        );
      })}

      {/* Tracked Events Info */}
      <div className="bg-brand-gray-50 border border-brand-gray-200 p-6">
        <h3 className="text-sm font-sans font-semibold text-brand-black mb-4">
          Tracked Events
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            "Page View",
            "Product View",
            "Add to Cart",
            "Begin Checkout",
            "Purchase",
            "Form Submission",
          ].map((event) => (
            <div key={event} className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-brand-black flex-shrink-0" />
              <span className="text-xs font-sans text-brand-gray-600">{event}</span>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={handleSave} loading={saving} size="lg">
        Save All Settings
      </Button>
    </div>
  );
}
