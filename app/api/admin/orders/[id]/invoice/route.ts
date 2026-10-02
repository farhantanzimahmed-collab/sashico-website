import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, serviceClient } from "@/lib/adminAuth";
import { buildInvoicePdf } from "@/lib/invoicePdf";
import type { Order } from "@/lib/types";

// GET → invoice PDF download. Add ?inline=1 to open it in the browser instead.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const db = serviceClient();
  const { data: order } = await db.from("orders").select("*").eq("id", id).single();
  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  const { data: s } = await db.from("site_settings").select("site_name, contact_email, contact_phone, contact_address").eq("id", 1).single();

  const bytes = await buildInvoicePdf(order as Order, {
    name: s?.site_name || "Sashico",
    address: s?.contact_address || "Dhaka, Bangladesh",
    phone: s?.contact_phone || "",
    email: s?.contact_email || "",
    website: (process.env.NEXT_PUBLIC_APP_URL || "https://sashico.net").replace(/^https?:\/\//, ""),
  });

  const inline = req.nextUrl.searchParams.get("inline") === "1";
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="Sashico-Invoice-${(order as Order).order_number}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
