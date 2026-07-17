"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import toast from "react-hot-toast";
import { Send, Webhook, CheckCircle, XCircle, Loader2, Eye, EyeOff } from "lucide-react";

interface TelegramSettings {
  id?: number;
  is_enabled?: boolean;
  bot_token?: string | null;
  chat_id?: string | null;
  notify_new_order?: boolean;
  notify_new_customer?: boolean;
  notify_contact_form?: boolean;
  notify_new_review?: boolean;
  notify_low_stock?: boolean;
  notify_out_of_stock?: boolean;
  notify_newsletter?: boolean;
  low_stock_threshold?: number;
  daily_summary_enabled?: boolean;
  weekly_summary_enabled?: boolean;
  monthly_summary_enabled?: boolean;
}

interface Props {
  settings: TelegramSettings | null;
}

export default function TelegramSettingsForm({ settings }: Props) {
  const supabase = createClient();

  const [values, setValues] = useState({
    is_enabled: settings?.is_enabled ?? false,
    bot_token: settings?.bot_token ?? "",
    chat_id: settings?.chat_id ?? "",
    notify_new_order: settings?.notify_new_order ?? true,
    notify_new_customer: settings?.notify_new_customer ?? true,
    notify_contact_form: settings?.notify_contact_form ?? true,
    notify_new_review: settings?.notify_new_review ?? true,
    notify_low_stock: settings?.notify_low_stock ?? true,
    notify_out_of_stock: settings?.notify_out_of_stock ?? true,
    notify_newsletter: settings?.notify_newsletter ?? true,
    low_stock_threshold: settings?.low_stock_threshold ?? 5,
    daily_summary_enabled: settings?.daily_summary_enabled ?? false,
    weekly_summary_enabled: settings?.weekly_summary_enabled ?? false,
    monthly_summary_enabled: settings?.monthly_summary_enabled ?? false,
  });

  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settingWebhook, setSettingWebhook] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"untested" | "ok" | "fail">("untested");

  function set(key: string, value: boolean | string | number) {
    setValues((p) => ({ ...p, [key]: value }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const { error } = await supabase.from("telegram_settings").upsert(
        { id: 1, ...values, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
      if (error) throw error;
      toast.success("Telegram settings saved!");
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  async function handleTest() {
    if (!values.bot_token || !values.chat_id) {
      toast.error("Enter Bot Token and Chat ID first");
      return;
    }
    setTesting(true);
    setConnectionStatus("untested");
    try {
      const res = await fetch("/api/telegram/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_token: values.bot_token, chat_id: values.chat_id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setConnectionStatus("ok");
        toast.success("Test message sent! Check your Telegram.");
      } else {
        setConnectionStatus("fail");
        toast.error(data.error || "Test failed — check your credentials.");
      }
    } catch {
      setConnectionStatus("fail");
      toast.error("Network error — try again.");
    } finally {
      setTesting(false);
    }
  }

  async function handleSetupWebhook() {
    if (!values.bot_token) {
      toast.error("Save your Bot Token first");
      return;
    }
    setSettingWebhook(true);
    try {
      const res = await fetch("/api/telegram/setup-webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bot_token: values.bot_token }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Webhook registered:\n${data.webhook_url}`);
      } else {
        toast.error(data.error || "Failed to register webhook.");
      }
    } catch {
      toast.error("Network error.");
    } finally {
      setSettingWebhook(false);
    }
  }

  return (
    <div className="space-y-8">

      {/* ── Connection Status ── */}
      {connectionStatus !== "untested" && (
        <div
          className={`flex items-center gap-3 px-4 py-3 rounded-lg border font-sans text-sm ${
            connectionStatus === "ok"
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-red-50 border-red-200 text-red-800"
          }`}
        >
          {connectionStatus === "ok" ? (
            <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
          ) : (
            <XCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
          )}
          {connectionStatus === "ok"
            ? "Connected — bot is active and receiving messages."
            : "Connection failed — verify your Bot Token and Chat ID."}
        </div>
      )}

      {/* ── Enable / Disable ── */}
      <div className="bg-brand-gray-50 border border-brand-gray-100 rounded-lg p-5">
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="font-sans font-semibold text-brand-black text-sm">Enable Telegram Bot</p>
            <p className="font-sans text-xs text-brand-gray-500 mt-0.5">
              When disabled, no notifications will be sent.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={values.is_enabled}
            onClick={() => set("is_enabled", !values.is_enabled)}
            className={`relative inline-flex h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none ${
              values.is_enabled ? "bg-black" : "bg-brand-gray-300"
            }`}
          >
            <span
              className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 mt-0.5 ${
                values.is_enabled ? "translate-x-5.5 ml-0.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </label>
      </div>

      {/* ── Credentials ── */}
      <div className="space-y-4">
        <h2 className="font-sans font-semibold text-brand-black text-sm uppercase tracking-widest">
          Bot Credentials
        </h2>

        <div>
          <label className="block font-sans text-xs font-medium text-brand-gray-700 mb-1.5">
            Bot Token
            <span className="text-brand-gray-400 font-normal ml-1">(from @BotFather)</span>
          </label>
          <div className="relative">
            <input
              type={showToken ? "text" : "password"}
              value={values.bot_token}
              onChange={(e) => set("bot_token", e.target.value)}
              placeholder="1234567890:ABCdefGHIjklmNOPQrSTUvwxYZ"
              className="w-full border border-brand-gray-200 rounded-lg px-3 py-2.5 text-sm font-sans focus:outline-none focus:border-black pr-10 font-mono"
              autoComplete="off"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-gray-400 hover:text-black"
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block font-sans text-xs font-medium text-brand-gray-700 mb-1.5">
            Chat ID
            <span className="text-brand-gray-400 font-normal ml-1">
              (your Telegram user ID or group chat ID)
            </span>
          </label>
          <input
            type="text"
            value={values.chat_id}
            onChange={(e) => set("chat_id", e.target.value)}
            placeholder="123456789"
            className="w-full border border-brand-gray-200 rounded-lg px-3 py-2.5 text-sm font-sans focus:outline-none focus:border-black font-mono"
          />
          <p className="text-xs text-brand-gray-400 mt-1 font-sans">
            Send /start to your bot then visit{" "}
            <span className="font-mono">api.telegram.org/bot&lt;token&gt;/getUpdates</span> to find your Chat ID.
          </p>
        </div>

        {/* Test + Webhook buttons */}
        <div className="flex gap-3 flex-wrap pt-1">
          <button
            type="button"
            onClick={handleTest}
            disabled={testing || !values.bot_token || !values.chat_id}
            className="flex items-center gap-2 px-4 py-2.5 bg-black text-white rounded-lg text-sm font-sans font-medium hover:bg-brand-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {testing ? "Sending..." : "Send Test Notification"}
          </button>

          <button
            type="button"
            onClick={handleSetupWebhook}
            disabled={settingWebhook || !values.bot_token}
            className="flex items-center gap-2 px-4 py-2.5 border border-brand-gray-200 text-brand-gray-700 rounded-lg text-sm font-sans font-medium hover:border-black hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {settingWebhook ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Webhook className="h-4 w-4" />
            )}
            {settingWebhook ? "Registering..." : "Setup Webhook"}
          </button>
        </div>
      </div>

      {/* ── Notification Toggles ── */}
      <div className="space-y-4">
        <h2 className="font-sans font-semibold text-brand-black text-sm uppercase tracking-widest">
          Notifications
        </h2>

        <div className="border border-brand-gray-100 rounded-lg divide-y divide-brand-gray-100">
          {[
            { key: "notify_new_order", label: "🛍 New Order", desc: "Alert on every new order with action buttons" },
            { key: "notify_new_customer", label: "👤 New Customer", desc: "New account registration" },
            { key: "notify_contact_form", label: "📩 Contact Form", desc: "When a customer sends a message" },
            { key: "notify_new_review", label: "⭐ Product Review", desc: "New review submitted (pending approval)" },
            { key: "notify_low_stock", label: "⚠️ Low Stock", desc: `Alert when stock drops to or below threshold` },
            { key: "notify_out_of_stock", label: "🚨 Out of Stock", desc: "Alert when a size runs out" },
            { key: "notify_newsletter", label: "📧 Newsletter Subscriber", desc: "New email subscription" },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-center justify-between px-4 py-3.5 cursor-pointer">
              <div>
                <p className="font-sans text-sm text-brand-black">{label}</p>
                <p className="font-sans text-xs text-brand-gray-500">{desc}</p>
              </div>
              <Toggle
                checked={values[key as keyof typeof values] as boolean}
                onChange={(v) => set(key, v)}
              />
            </label>
          ))}
        </div>

        {/* Low stock threshold */}
        <div className="flex items-center gap-4">
          <label className="font-sans text-xs font-medium text-brand-gray-700 whitespace-nowrap">
            Low Stock Threshold
          </label>
          <input
            type="number"
            min={1}
            max={50}
            value={values.low_stock_threshold}
            onChange={(e) => set("low_stock_threshold", Number(e.target.value))}
            className="w-20 border border-brand-gray-200 rounded-lg px-3 py-2 text-sm font-sans text-center focus:outline-none focus:border-black"
          />
          <span className="text-xs text-brand-gray-400 font-sans">units</span>
        </div>
      </div>

      {/* ── Scheduled Summaries ── */}
      <div className="space-y-4">
        <h2 className="font-sans font-semibold text-brand-black text-sm uppercase tracking-widest">
          Scheduled Summaries
        </h2>

        <div className="border border-brand-gray-100 rounded-lg divide-y divide-brand-gray-100">
          {[
            { key: "daily_summary_enabled", label: "📊 Daily Summary", desc: "Sent at 9 PM (Bangladesh time)" },
            { key: "weekly_summary_enabled", label: "📊 Weekly Summary", desc: "Sent every Monday at 9 AM" },
            { key: "monthly_summary_enabled", label: "📊 Monthly Summary", desc: "Sent on the 1st of each month" },
          ].map(({ key, label, desc }) => (
            <label key={key} className="flex items-center justify-between px-4 py-3.5 cursor-pointer">
              <div>
                <p className="font-sans text-sm text-brand-black">{label}</p>
                <p className="font-sans text-xs text-brand-gray-500">{desc}</p>
              </div>
              <Toggle
                checked={values[key as keyof typeof values] as boolean}
                onChange={(v) => set(key, v)}
              />
            </label>
          ))}
        </div>

        {/* Manual trigger */}
        <div className="flex gap-2 flex-wrap">
          {(["daily", "weekly", "monthly"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={async () => {
                const res = await fetch("/api/telegram/summary", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ type }),
                });
                if (res.ok) toast.success(`${type} summary sent!`);
                else toast.error("Failed to send summary");
              }}
              className="px-3 py-1.5 text-xs font-sans border border-brand-gray-200 rounded-lg hover:border-black transition-colors text-brand-gray-600 hover:text-black"
            >
              Send {type} now
            </button>
          ))}
        </div>
      </div>

      {/* ── Setup Guide ── */}
      <details className="border border-brand-gray-100 rounded-lg">
        <summary className="px-4 py-3.5 cursor-pointer font-sans text-sm font-medium text-brand-black list-none flex items-center justify-between">
          <span>How to set up your Telegram bot</span>
          <span className="text-brand-gray-400 text-xs">Click to expand</span>
        </summary>
        <div className="px-4 pb-4 pt-0 space-y-3 border-t border-brand-gray-100">
          {[
            ["1", "Open Telegram and search for @BotFather"],
            ["2", 'Send /newbot and follow the prompts to create a bot'],
            ["3", "Copy the Bot Token BotFather gives you and paste it above"],
            ["4", 'Send any message to your new bot, then visit: <code>api.telegram.org/bot{TOKEN}/getUpdates</code> to find your <code>chat.id</code>'],
            ["5", "Paste your Chat ID above, save settings, then click Send Test Notification"],
            ["6", "Click Setup Webhook so Telegram knows where to send button-click events (order status updates)"],
          ].map(([num, text]) => (
            <div key={num} className="flex gap-3">
              <span className="flex-shrink-0 h-5 w-5 rounded-full bg-black text-white text-[10px] flex items-center justify-center font-sans font-bold">
                {num}
              </span>
              <p
                className="font-sans text-xs text-brand-gray-600 leading-relaxed"
                dangerouslySetInnerHTML={{ __html: text }}
              />
            </div>
          ))}
        </div>
      </details>

      {/* ── Save Button ── */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-black text-white rounded-lg text-sm font-sans font-medium hover:bg-brand-gray-900 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 rounded-full transition-colors duration-200 flex-shrink-0 ${
        checked ? "bg-black" : "bg-brand-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 mt-0.5 ${
          checked ? "translate-x-4 ml-0.5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}
