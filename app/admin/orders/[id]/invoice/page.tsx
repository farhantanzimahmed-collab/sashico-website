import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createClient as createServiceClient } from "@supabase/supabase-js";
import { Order } from "@/lib/types";
import { formatPrice, formatDate } from "@/lib/utils";

function getAdmin() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const authClient = await createClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) redirect("/admin/login");

  const supabase = getAdmin();
  const { data: order } = await supabase.from("orders").select("*").eq("id", id).single();
  if (!order) notFound();
  const o = order as Order;

  const { data: settings } = await supabase.from("site_settings").select("site_name,contact_email,contact_phone,contact_address").eq("id", 1).single();

  return (
    <html>
      <head>
        <title>Invoice {o.order_number}</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 13px; color: #1a1a1a; background: #fff; }
          .page { max-width: 800px; margin: 0 auto; padding: 48px; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 48px; }
          .brand { font-size: 28px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase; }
          .invoice-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #666; margin-bottom: 4px; }
          .invoice-number { font-size: 22px; font-weight: 700; }
          .divider { border: none; border-top: 1px solid #e5e5e5; margin: 24px 0; }
          .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-bottom: 40px; }
          .section-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.12em; color: #999; margin-bottom: 10px; }
          .info-block p { line-height: 1.7; color: #444; }
          table { width: 100%; border-collapse: collapse; }
          th { text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; color: #999; border-bottom: 1px solid #e5e5e5; padding: 8px 0; }
          td { padding: 14px 0; border-bottom: 1px solid #f5f5f5; vertical-align: top; }
          .amount { text-align: right; }
          .totals { margin-top: 24px; }
          .total-row { display: flex; justify-content: space-between; padding: 6px 0; color: #666; }
          .total-grand { display: flex; justify-content: space-between; padding: 14px 0; font-size: 16px; font-weight: 700; border-top: 2px solid #1a1a1a; margin-top: 8px; }
          .status-badge { display: inline-block; padding: 4px 10px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; background: #f5f5f5; border-radius: 2px; }
          .footer { margin-top: 64px; padding-top: 24px; border-top: 1px solid #e5e5e5; color: #999; font-size: 11px; text-align: center; }
          @media print {
            @page { margin: 0; }
            body { padding: 0; }
            .no-print { display: none !important; }
            .page { padding: 32px; }
          }
        `}</style>
      </head>
      <body>
        <div className="no-print" style={{ background: '#f5f5f5', padding: '12px 24px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button onClick={() => window.print()} style={{ background: '#1a1a1a', color: '#fff', border: 'none', padding: '8px 20px', cursor: 'pointer', fontSize: '13px' }}>
            Print / Save PDF
          </button>
          <button onClick={() => window.close()} style={{ background: '#fff', border: '1px solid #ccc', padding: '8px 20px', cursor: 'pointer', fontSize: '13px' }}>
            Close
          </button>
        </div>

        <div className="page">
          {/* Header */}
          <div className="header">
            <div>
              <div className="brand">{settings?.site_name || "Sashico"}</div>
              <p style={{ color: '#666', marginTop: '6px', fontSize: '12px' }}>
                {settings?.contact_address || "Dhaka, Bangladesh"}<br />
                {settings?.contact_email}<br />
                {settings?.contact_phone}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="invoice-label">Invoice</div>
              <div className="invoice-number">{o.order_number}</div>
              <p style={{ color: '#666', marginTop: '8px', fontSize: '12px' }}>
                Date: {formatDate(o.created_at)}<br />
                <span className="status-badge">{o.order_status}</span>
              </p>
            </div>
          </div>

          <hr className="divider" />

          {/* Bill To */}
          <div className="two-col">
            <div className="info-block">
              <div className="section-label">Bill To</div>
              <p><strong>{o.customer_name}</strong></p>
              <p>{o.customer_email}</p>
              <p>{o.customer_phone}</p>
            </div>
            <div className="info-block">
              <div className="section-label">Deliver To</div>
              <p>{o.shipping_address.street}</p>
              <p>{o.shipping_address.city}, {o.shipping_address.district}</p>
              {o.shipping_address.postal_code && <p>{o.shipping_address.postal_code}</p>}
              <p>{o.shipping_address.country}</p>
            </div>
          </div>

          {/* Items */}
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Size</th>
                <th style={{ textAlign: 'center' }}>Qty</th>
                <th className="amount">Unit Price</th>
                <th className="amount">Total</th>
              </tr>
            </thead>
            <tbody>
              {o.items?.map((item: any, i: number) => (
                <tr key={i}>
                  <td><strong>{item.product_name}</strong></td>
                  <td style={{ color: '#666' }}>{item.size}</td>
                  <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                  <td className="amount">{formatPrice(item.unit_price)}</td>
                  <td className="amount"><strong>{formatPrice(item.total_price)}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Totals */}
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div className="totals" style={{ minWidth: '240px' }}>
              <div className="total-row">
                <span>Subtotal</span>
                <span>{formatPrice(o.subtotal)}</span>
              </div>
              <div className="total-row">
                <span>Shipping</span>
                <span>{o.shipping_cost === 0 ? "Free" : formatPrice(o.shipping_cost)}</span>
              </div>
              {o.discount_amount > 0 && (
                <div className="total-row" style={{ color: '#16a34a' }}>
                  <span>Discount</span>
                  <span>−{formatPrice(o.discount_amount)}</span>
                </div>
              )}
              <div className="total-grand">
                <span>Total</span>
                <span>{formatPrice(o.total_amount)}</span>
              </div>
            </div>
          </div>

          {/* Payment Info */}
          <div style={{ marginTop: '40px', padding: '16px', background: '#f9f9f9' }}>
            <p style={{ fontSize: '12px', color: '#666' }}>
              <strong>Payment Method:</strong> {o.payment_method === 'cod' ? 'Cash on Delivery' : o.payment_method?.toUpperCase()}{' '}
              &nbsp;|&nbsp; <strong>Status:</strong> {o.payment_status?.toUpperCase()}
            </p>
            {o.notes && <p style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}><strong>Notes:</strong> {o.notes}</p>}
          </div>

          <div className="footer">
            <p>Thank you for shopping with {settings?.site_name || "Sashico"}!</p>
            <p style={{ marginTop: '4px' }}>For questions about this order, contact {settings?.contact_email || "sashicofficial2020@gmail.com"}</p>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: `
          document.querySelectorAll('button').forEach(btn => {
            if (btn.textContent.includes('Print')) btn.addEventListener('click', () => window.print());
            if (btn.textContent.includes('Close')) btn.addEventListener('click', () => window.close());
          });
        ` }} />
      </body>
    </html>
  );
}
