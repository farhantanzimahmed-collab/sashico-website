import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function GET(req: NextRequest) {
  const type = req.nextUrl.searchParams.get("type") || "orders";
  const supabase = getAdmin();

  let rows: Record<string, any>[] = [];
  let sheetName = "Export";
  let fileName = `${type}-${Date.now()}.xlsx`;

  if (type === "orders") {
    const { data } = await supabase
      .from("orders")
      .select("order_number,customer_name,customer_email,customer_phone,total_amount,payment_method,payment_status,order_status,tracking_number,notes,created_at")
      .order("created_at", { ascending: false });

    rows = (data || []).map((o) => ({
      "Order #": o.order_number,
      "Customer": o.customer_name,
      "Email": o.customer_email,
      "Phone": o.customer_phone,
      "Total (৳)": o.total_amount,
      "Payment": o.payment_method?.toUpperCase(),
      "Payment Status": o.payment_status,
      "Order Status": o.order_status,
      "Tracking #": o.tracking_number || "",
      "Notes": o.notes || "",
      "Date": new Date(o.created_at).toLocaleDateString("en-GB"),
    }));
    sheetName = "Orders";
    fileName = `sashico-orders-${Date.now()}.xlsx`;

  } else if (type === "customers") {
    const { data } = await supabase
      .from("customers")
      .select("name,email,phone,total_orders,total_spent,created_at")
      .order("total_spent", { ascending: false });

    rows = (data || []).map((c) => ({
      "Name": c.name,
      "Email": c.email,
      "Phone": c.phone || "",
      "Total Orders": c.total_orders,
      "Total Spent (৳)": c.total_spent,
      "Joined": new Date(c.created_at).toLocaleDateString("en-GB"),
    }));
    sheetName = "Customers";
    fileName = `sashico-customers-${Date.now()}.xlsx`;

  } else if (type === "subscribers") {
    const { data } = await supabase
      .from("newsletter_subscribers")
      .select("email,phone,is_active,subscribed_at")
      .order("subscribed_at", { ascending: false });

    rows = (data || []).map((s) => ({
      "Email": s.email,
      "Phone": s.phone || "",
      "Status": s.is_active ? "Active" : "Unsubscribed",
      "Subscribed": new Date(s.subscribed_at).toLocaleDateString("en-GB"),
    }));
    sheetName = "Subscribers";
    fileName = `sashico-subscribers-${Date.now()}.xlsx`;

  } else if (type === "contacts") {
    const { data } = await supabase
      .from("contact_submissions")
      .select("name,email,subject,message,is_read,created_at")
      .order("created_at", { ascending: false });

    rows = (data || []).map((c) => ({
      "Name": c.name,
      "Email": c.email,
      "Subject": c.subject || "",
      "Message": c.message,
      "Status": c.is_read ? "Read" : "Unread",
      "Date": new Date(c.created_at).toLocaleDateString("en-GB"),
    }));
    sheetName = "Contact Messages";
    fileName = `sashico-contacts-${Date.now()}.xlsx`;
  }

  if (rows.length === 0) {
    rows = [{ "Note": "No data found" }];
  }

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto column widths
  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String(r[key] || "").length), 10),
  }));
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${fileName}"`,
    },
  });
}
