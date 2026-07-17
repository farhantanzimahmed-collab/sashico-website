import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TelegramSettingsForm from "./TelegramSettingsForm";

export const revalidate = 0;

export default async function TelegramSettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/admin/login");

  // Use maybeSingle — row might not exist yet
  const { data: settings } = await supabase
    .from("telegram_settings")
    .select("*")
    .eq("id", 1)
    .maybeSingle();

  return (
    <div className="p-6 lg:p-10">
      <div className="mb-8">
        <h1 className="font-sans text-2xl font-bold text-brand-black">Telegram Notifications</h1>
        <p className="text-sm text-brand-gray-500 font-sans mt-1">
          Receive instant alerts for orders, reviews, stock levels, and more — straight to Telegram.
        </p>
      </div>
      <div className="max-w-2xl">
        <TelegramSettingsForm settings={settings} />
      </div>
    </div>
  );
}
