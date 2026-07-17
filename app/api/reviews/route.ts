import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { notifyNewReview } from "@/lib/telegram/notificationService";

export async function POST(req: NextRequest) {
  try {
    const { product_id, customer_name, customer_email, rating, comment } =
      await req.json();

    if (!product_id || !customer_name || !customer_email || !rating) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ error: "Rating must be 1-5" }, { status: 400 });
    }

    const supabase = await createClient();
    const { error } = await supabase.from("reviews").insert({
      product_id,
      customer_name,
      customer_email,
      rating,
      comment: comment || null,
      is_approved: false,
    });

    if (error) throw error;

    // Fetch product name for the Telegram notification (best-effort)
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );
    serviceSupabase
      .from("products")
      .select("name")
      .eq("id", product_id)
      .single()
      .then(({ data }) => {
        notifyNewReview(customer_name, rating, data?.name ?? "Unknown Product", comment || null).catch(
          (e) => console.error("[telegram:review]", e)
        );
      });

    return NextResponse.json({ success: true, message: "Review submitted and pending approval" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
