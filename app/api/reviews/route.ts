import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    return NextResponse.json({ success: true, message: "Review submitted and pending approval" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
