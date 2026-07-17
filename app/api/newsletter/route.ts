import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { notifyNewsletter } from "@/lib/telegram/notificationService";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("newsletter_subscribers")
      .upsert({ email, is_active: true }, { onConflict: "email" });

    if (error) throw error;

    // Telegram notification (best-effort)
    notifyNewsletter(email).catch((e) => console.error("[telegram:newsletter]", e));

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to subscribe" }, { status: 500 });
  }
}
