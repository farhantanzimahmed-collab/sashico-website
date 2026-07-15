import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const orderNumber = req.nextUrl.searchParams.get("order");
  const email = req.nextUrl.searchParams.get("email");
  const phone = req.nextUrl.searchParams.get("phone");

  if (!orderNumber) {
    return NextResponse.json({ error: "Order number required" }, { status: 400 });
  }

  const supabase = getAdmin();
  let query = supabase
    .from("orders")
    .select("order_number,customer_name,customer_email,customer_phone,order_status,payment_status,payment_method,total_amount,items,shipping_address,tracking_number,created_at,updated_at")
    .eq("order_number", orderNumber);

  if (email) {
    query = query.ilike("customer_email", email);
  } else if (phone) {
    query = query.ilike("customer_phone", phone);
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ order: data });
}
