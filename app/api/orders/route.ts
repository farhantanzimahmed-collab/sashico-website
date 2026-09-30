import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { sendOrderConfirmationEmail } from "@/lib/email/orderConfirmation";
import { notifyNewOrder, notifyNewCustomer, checkAndNotifyStockLevels } from "@/lib/telegram/notificationService";
import { getTelegramConfig } from "@/lib/telegram/config";
import { sendMetaEvent, requestContext } from "@/lib/meta/capi";

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

const ATTR_KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "landing_page", "captured_at"] as const;

/** Keep only known attribution fields, as short strings */
function sanitizeAttribution(raw: unknown): Record<string, string | number> | null {
  if (!raw || typeof raw !== "object") return null;
  const out: Record<string, string | number> = {};
  for (const k of ATTR_KEYS) {
    const v = (raw as Record<string, unknown>)[k];
    if (typeof v === "string" && v) out[k] = v.slice(0, 200);
    if (typeof v === "number" && k === "captured_at") out[k] = v;
  }
  return Object.keys(out).length ? out : null;
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
      tracking,
      attribution,
      checkout_session,
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
    const cleanAttribution = sanitizeAttribution(attribution);
    const insertOrder = (withAttribution: boolean) => supabase
      .from("orders")
      .insert({
        ...(withAttribution && cleanAttribution ? { attribution: cleanAttribution } : {}),
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

    let { data: order, error } = await insertOrder(true);
    // attribution column not added yet (migration pending) → save the order without it
    if (error && /attribution/.test(error.message)) ({ data: order, error } = await insertOrder(false));
    if (error) throw error;

    // Update customer stats (best-effort)
    if (customer?.id) {
      supabase.from("customers").update({
        total_orders: (customer.total_orders || 0) + 1,
        total_spent: (customer.total_spent || 0) + total_amount,
      }).eq("id", customer.id).then(() => {});

      // Notify if this is a brand-new customer (total_orders was 0 before this order)
      if ((customer.total_orders || 0) === 0) {
        notifyNewCustomer(customer_name, customer_email, customer_phone).catch(
          (e) => console.error("[telegram:customer]", e)
        );
      }
    }

    // This checkout was being tracked as possibly abandoned → mark it recovered
    if (checkout_session) {
      supabase.from("abandoned_checkouts")
        .update({ status: "recovered", recovered_order_id: order.id, updated_at: new Date().toISOString() })
        .eq("session_id", String(checkout_session))
        .then(() => {});
    }

    // Send confirmation email (best-effort, non-blocking)
    sendOrderConfirmationEmail(order).catch((e) => console.error("[email]", e));

    // Meta CAPI Purchase — sent the moment the order exists, so it's counted even if
    // the customer never reaches the thank-you page. Same event_id as the browser
    // Pixel Purchase on the success page → Meta dedupes the pair.
    const orderItems = order.items as { product_id: string; quantity: number; unit_price: number }[];
    sendMetaEvent({
      eventName: "Purchase",
      eventId: `purchase_${order.order_number}`,
      eventSourceUrl: tracking?.eventSourceUrl,
      fbc: tracking?.fbc,
      fbp: tracking?.fbp,
      ...requestContext(req.headers),
      userData: {
        email: customer_email,
        phone: customer_phone,
        name: customer_name,
        city: shipping_address?.district || shipping_address?.city,
        country: "bd",
      },
      customData: {
        currency: "BDT",
        value: total_amount,
        order_id: order.order_number,
        content_type: "product",
        content_ids: [...new Set(orderItems.map((i) => i.product_id))],
        contents: orderItems.map((i) => ({ id: i.product_id, quantity: i.quantity, item_price: i.unit_price })),
        num_items: orderItems.reduce((s, i) => s + i.quantity, 0),
      },
    }).catch((e) => console.error("[capi:purchase]", e));

    // Send Telegram notification (best-effort, non-blocking)
    notifyNewOrder(order).catch((e) => console.error("[telegram:order]", e));

    // Check stock levels for ordered items and send low/out-of-stock alerts
    getTelegramConfig().then((config) => {
      if (config?.isEnabled) {
        checkAndNotifyStockLevels(
          order.items.map((i: { product_id: string; product_name: string; size: string }) => ({
            product_id: i.product_id,
            product_name: i.product_name,
            size: i.size,
          })),
          config.lowStockThreshold
        ).catch((e) => console.error("[telegram:stock]", e));
      }
    });

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
