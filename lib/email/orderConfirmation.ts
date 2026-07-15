import { Order } from "@/lib/types";

function formatBDT(amount: number) {
  return `৳${amount.toLocaleString("en-BD")}`;
}

export function buildOrderConfirmationHtml(order: Order, siteName = "Sashico"): string {
  const itemsHtml = order.items
    .map(
      (item) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;font-size:14px;color:#1a1a1a;">
          ${item.product_name} <span style="color:#999;">× ${item.quantity}</span>
          <br/><span style="font-size:12px;color:#999;">Size: ${item.size}</span>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f0f0f0;font-size:14px;text-align:right;font-weight:600;color:#1a1a1a;">
          ${formatBDT(item.total_price)}
        </td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border:1px solid #e5e5e5;">
    <!-- Header -->
    <div style="background:#1a1a1a;padding:32px;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:28px;letter-spacing:0.2em;font-weight:900;text-transform:uppercase;">${siteName}</h1>
    </div>

    <!-- Body -->
    <div style="padding:40px 32px;">
      <h2 style="font-size:22px;color:#1a1a1a;margin:0 0 8px;font-weight:700;">Order Confirmed!</h2>
      <p style="color:#666;font-size:14px;margin:0 0 32px;">Hi ${order.customer_name}, your order has been placed successfully.</p>

      <!-- Order Info -->
      <div style="background:#f9f9f9;border:1px solid #f0f0f0;padding:16px;margin-bottom:32px;border-radius:2px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="font-size:13px;color:#999;padding:4px 0;">Order Number</td>
            <td style="font-size:13px;color:#1a1a1a;font-weight:700;text-align:right;">${order.order_number}</td>
          </tr>
          <tr>
            <td style="font-size:13px;color:#999;padding:4px 0;">Payment Method</td>
            <td style="font-size:13px;color:#1a1a1a;text-align:right;">${order.payment_method === "cod" ? "Cash on Delivery" : order.payment_method?.toUpperCase()}</td>
          </tr>
        </table>
      </div>

      <!-- Items -->
      <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#999;margin:0 0 12px;">Your Items</h3>
      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <tbody>${itemsHtml}</tbody>
      </table>

      <!-- Totals -->
      <table style="width:100%;border-collapse:collapse;border-top:2px solid #1a1a1a;padding-top:16px;">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#666;">Subtotal</td>
          <td style="padding:6px 0;font-size:13px;text-align:right;color:#666;">${formatBDT(order.subtotal)}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#666;">Shipping</td>
          <td style="padding:6px 0;font-size:13px;text-align:right;color:#666;">${order.shipping_cost === 0 ? "Free" : formatBDT(order.shipping_cost)}</td>
        </tr>
        <tr>
          <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#1a1a1a;">Total</td>
          <td style="padding:12px 0 0;font-size:16px;font-weight:700;text-align:right;color:#1a1a1a;">${formatBDT(order.total_amount)}</td>
        </tr>
      </table>

      <!-- Delivery Address -->
      <div style="margin-top:32px;padding-top:24px;border-top:1px solid #f0f0f0;">
        <h3 style="font-size:12px;text-transform:uppercase;letter-spacing:0.1em;color:#999;margin:0 0 10px;">Delivery Address</h3>
        <p style="font-size:14px;color:#444;line-height:1.6;margin:0;">
          ${order.shipping_address.street}<br/>
          ${order.shipping_address.city}, ${order.shipping_address.district}<br/>
          ${order.shipping_address.country}
        </p>
      </div>

      <!-- COD reminder -->
      ${order.payment_method === "cod" ? `
      <div style="margin-top:24px;background:#fffbeb;border:1px solid #fde68a;padding:16px;border-radius:2px;">
        <p style="font-size:13px;color:#92400e;margin:0;">
          <strong>Cash on Delivery Reminder:</strong> Please keep the exact amount of <strong>${formatBDT(order.total_amount)}</strong> ready at delivery.
        </p>
      </div>` : ""}

      <!-- Track order -->
      <div style="margin-top:32px;text-align:center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL}/order-tracking?order=${order.order_number}" style="display:inline-block;background:#1a1a1a;color:#fff;text-decoration:none;padding:14px 32px;font-size:13px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;">
          Track Your Order
        </a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f9f9f9;border-top:1px solid #f0f0f0;padding:24px 32px;text-align:center;">
      <p style="font-size:12px;color:#999;margin:0;">Thank you for shopping with ${siteName}!</p>
      <p style="font-size:12px;color:#bbb;margin:6px 0 0;">Questions? Reply to this email or visit our website.</p>
    </div>
  </div>
</body>
</html>`;
}

export async function sendOrderConfirmationEmail(order: Order, siteName = "Sashico"): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.FROM_EMAIL || "Sashico Orders <onboarding@resend.dev>";

  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY not set — skipping order confirmation email");
    return;
  }

  const html = buildOrderConfirmationHtml(order, siteName);

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: `${siteName} <${fromEmail}>`,
        to: [order.customer_email],
        subject: `Order Confirmed: ${order.order_number}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("[email] Resend error:", err);
    } else {
      console.log("[email] Order confirmation sent to", order.customer_email);
    }
  } catch (err) {
    console.error("[email] Failed to send email:", err);
  }
}
