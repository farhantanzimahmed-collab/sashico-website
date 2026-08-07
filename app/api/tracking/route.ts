import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const ORDER_COLS = "order_number,customer_name,customer_email,customer_phone,order_status,payment_status,payment_method,total_amount,items,shipping_address,tracking_number,created_at,updated_at";

export async function GET(req: NextRequest) {
  const orderNumber = req.nextUrl.searchParams.get("order")?.trim();
  const phone       = req.nextUrl.searchParams.get("phone")?.trim();

  if (!orderNumber && !phone) {
    return NextResponse.json({ error: "Enter your order number or phone number." }, { status: 400 });
  }

  const supabase = getAdmin();

  // Search by order number (exact match)
  if (orderNumber) {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_COLS)
      .ilike("order_number", orderNumber)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "Order not found. Please check your order number." }, { status: 404 });
    }
    return NextResponse.json({ order: data });
  }

  // Search by phone number — return most recent order
  if (phone) {
    const { data, error } = await supabase
      .from("orders")
      .select(ORDER_COLS)
      .ilike("customer_phone", phone)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "No orders found for this phone number." }, { status: 404 });
    }
    return NextResponse.json({ order: data });
  }
}
