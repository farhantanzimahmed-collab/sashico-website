import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendOrderConfirmationEmail } from "@/lib/email/orderConfirmation";

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getAdmin();

    const {
      customer_name,
      customer_email,
      customer_phone,
      shipping_address,
      items,
      subtotal,
      shipping_cost,
      discount_amount,
      total_amount,
      payment_method,
      notes,
    } = body;

    if (!customer_name || !customer_email || !customer_phone || !shipping_address || !items?.length) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Upsert customer record
    const { data: customer } = await supabase
      .from("customers")
      .upsert(
        {
          name: customer_name,
          email: customer_email,
          phone: customer_phone,
          address: shipping_address,
        },
        { onConflict: "email", ignoreDuplicates: false }
      )
      .select()
      .single();

    // Create order
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        customer_id: customer?.id || null,
        customer_name,
        customer_email,
        customer_phone,
        shipping_address,
        items,
        subtotal,
        shipping_cost,
        discount_amount: discount_amount || 0,
        total_amount,
        payment_method,
        notes,
        order_status: "pending",
        payment_status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    // Update customer stats (best-effort)
    if (customer?.id) {
      supabase.from("customers").update({
        total_orders: (customer.total_orders || 0) + 1,
        total_spent: (customer.total_spent || 0) + total_amount,
      }).eq("id", customer.id).then(() => {});
    }

    // Send confirmation email (best-effort, non-blocking)
    sendOrderConfirmationEmail(order).catch((e) => console.error("[email]", e));

    return NextResponse.json({ order }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to create order" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const authSupabase = await createClient();
    const { data: { user } } = await authSupabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const adminSupabase = getAdmin();
    const { data: adminUser } = await adminSupabase
      .from("admin_users")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (!adminUser) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const supabase = getAdmin();
    const { data, error } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ orders: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
