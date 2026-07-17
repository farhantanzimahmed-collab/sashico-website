import { Order } from "@/lib/types";

// Escape HTML special chars for Telegram HTML parse_mode
function esc(text: string | null | undefined): string {
  return (text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function taka(amount: number): string {
  return `৳${amount.toLocaleString("en-BD")}`;
}

function formatDateTime(isoString: string): { date: string; time: string } {
  const d = new Date(isoString);
  return {
    date: d.toLocaleDateString("en-BD", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    time: d.toLocaleTimeString("en-BD", {
      timeZone: "Asia/Dhaka",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

export function statusEmoji(status: string): string {
  const map: Record<string, string> = {
    pending: "⏳",
    confirmed: "✅",
    processing: "📦",
    shipped: "🚚",
    delivered: "🎉",
    cancelled: "❌",
  };
  return map[status] ?? "⏳";
}

function capitalise(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatOrderMessage(order: Order & { telegram_message_id?: string | null }): string {
  const { date, time } = formatDateTime(order.created_at);
  const addr = order.shipping_address;
  const orderNum = order.order_number || order.id.slice(-8).toUpperCase();

  const paymentLabel: Record<string, string> = {
    cod: "💵 Cash on Delivery",
    bkash: "🟣 bKash",
    nagad: "🟠 Nagad",
    card: "💳 Card",
  };

  const itemLines = order.items
    .map((item, i) => {
      return [
        ``,
        `<b>${i + 1}. ${esc(item.product_name)}</b>`,
        `   📏 Size: <b>${esc(item.size)}</b>`,
        `   🔢 Qty: <b>${item.quantity}</b>`,
        `   💰 Price: <b>${taka(item.total_price)}</b>`,
      ].join("\n");
    })
    .join("\n");

  const lines: (string | null)[] = [
    `🛍 <b>NEW ORDER RECEIVED</b>`,
    ``,
    `🆔 <b>Order:</b> #${esc(orderNum)}`,
    `📅 <b>Date:</b> ${date}`,
    `⏰ <b>Time:</b> ${time}`,
    ``,
    `👤 <b>Customer</b>`,
    `• Name: <b>${esc(order.customer_name)}</b>`,
    `• Phone: <b>${esc(order.customer_phone)}</b>`,
    order.customer_email ? `• Email: ${esc(order.customer_email)}` : null,
    ``,
    `📍 <b>Delivery Address</b>`,
    esc(addr?.street || ""),
    `${esc(addr?.city || "")}, ${esc(addr?.district || "")}`,
    addr?.postal_code ? `Postal: ${esc(addr.postal_code)}` : null,
    ``,
    `🛒 <b>Ordered Items</b>`,
    itemLines,
    ``,
    `━━━━━━━━━━━━━━━`,
    `Subtotal: <b>${taka(order.subtotal)}</b>`,
    `Delivery: <b>${taka(order.shipping_cost)}</b>`,
    order.discount_amount > 0 ? `Discount: <b>-${taka(order.discount_amount)}</b>` : null,
    `<b>TOTAL: ${taka(order.total_amount)}</b>`,
    ``,
    `💳 <b>Payment:</b> ${paymentLabel[order.payment_method] ?? esc(order.payment_method)}`,
    ``,
    `${statusEmoji(order.order_status)} <b>Status:</b> ${capitalise(order.order_status)}`,
    order.notes ? `\n📝 <i>Notes: ${esc(order.notes)}</i>` : null,
  ];

  return lines.filter((l) => l !== null).join("\n");
}

export function getOrderKeyboard(orderId: string, currentStatus: string) {
  const all = [
    { label: "✅ Confirm", status: "confirmed" },
    { label: "📦 Processing", status: "processing" },
    { label: "🚚 Shipped", status: "shipped" },
    { label: "🎉 Delivered", status: "delivered" },
    { label: "❌ Cancel", status: "cancelled" },
  ];

  const buttons = all
    .filter((b) => b.status !== currentStatus)
    .map((b) => ({
      text: b.label,
      callback_data: `order_status:${b.status}:${orderId}`,
    }));

  // 2 buttons per row
  const rows: typeof buttons[] = [];
  for (let i = 0; i < buttons.length; i += 2) {
    rows.push(buttons.slice(i, i + 2));
  }

  return { inline_keyboard: rows };
}

export function formatLowStockAlert(productName: string, size: string, remaining: number): string {
  return [
    `⚠️ <b>LOW STOCK ALERT</b>`,
    ``,
    `📦 <b>Product:</b> ${esc(productName)}`,
    `📏 <b>Size:</b> ${size}`,
    `🔢 <b>Remaining:</b> <b>${remaining} pcs</b>`,
    ``,
    `<i>Restock soon to avoid missed sales.</i>`,
  ].join("\n");
}

export function formatOutOfStockAlert(productName: string, size: string): string {
  return [
    `🚨 <b>OUT OF STOCK</b>`,
    ``,
    `📦 <b>Product:</b> ${esc(productName)}`,
    `📏 <b>Size:</b> ${size}`,
    ``,
    `<i>This size is now completely out of stock.</i>`,
  ].join("\n");
}

export function formatNewCustomerMessage(name: string, email: string, phone?: string | null): string {
  const lines: (string | null)[] = [
    `👤 <b>NEW CUSTOMER REGISTERED</b>`,
    ``,
    `• Name: <b>${esc(name)}</b>`,
    `• Email: ${esc(email)}`,
    phone ? `• Phone: ${esc(phone)}` : null,
  ];
  return lines.filter(Boolean).join("\n");
}

export function formatContactMessage(
  name: string,
  email: string,
  subject: string | null,
  message: string
): string {
  const lines: (string | null)[] = [
    `📩 <b>NEW CONTACT MESSAGE</b>`,
    ``,
    `👤 <b>Name:</b> ${esc(name)}`,
    `📧 <b>Email:</b> ${esc(email)}`,
    subject ? `📋 <b>Subject:</b> ${esc(subject)}` : null,
    ``,
    `💬 <b>Message:</b>`,
    esc(message),
  ];
  return lines.filter(Boolean).join("\n");
}

export function formatReviewMessage(
  customerName: string,
  rating: number,
  productName: string,
  comment: string | null
): string {
  const stars = "⭐".repeat(Math.max(1, Math.min(5, rating)));
  const lines: (string | null)[] = [
    `⭐ <b>NEW REVIEW SUBMITTED</b>`,
    ``,
    `👤 <b>Customer:</b> ${esc(customerName)}`,
    `${stars} <b>${rating}/5</b>`,
    `📦 <b>Product:</b> ${esc(productName)}`,
    comment ? `\n💬 <i>"${esc(comment)}"</i>` : null,
    ``,
    `<i>Review pending approval.</i>`,
  ];
  return lines.filter(Boolean).join("\n");
}

export function formatNewsletterMessage(email: string): string {
  return [
    `📧 <b>NEW NEWSLETTER SUBSCRIBER</b>`,
    ``,
    `• Email: <b>${esc(email)}</b>`,
    ``,
    `<i>Ready to receive promotional updates.</i>`,
  ].join("\n");
}

export function formatDailySummary(stats: {
  date: string;
  totalOrders: number;
  revenue: number;
  pendingOrders: number;
  cancelledOrders: number;
  topProducts: Array<{ name: string; qty: number }>;
}): string {
  const topLines =
    stats.topProducts.length > 0
      ? stats.topProducts
          .slice(0, 5)
          .map((p, i) => `${i + 1}. ${esc(p.name)} — ${p.qty} sold`)
          .join("\n")
      : "No sales today";

  return [
    `📊 <b>DAILY SUMMARY</b>`,
    `📅 ${stats.date}`,
    ``,
    `📦 <b>Orders:</b> ${stats.totalOrders}`,
    `💰 <b>Revenue:</b> ${taka(stats.revenue)}`,
    `⏳ <b>Pending:</b> ${stats.pendingOrders}`,
    `❌ <b>Cancelled:</b> ${stats.cancelledOrders}`,
    ``,
    `🏆 <b>Top Selling Products</b>`,
    topLines,
  ].join("\n");
}

export function formatWeeklySummary(stats: {
  startDate: string;
  endDate: string;
  totalOrders: number;
  revenue: number;
  newCustomers: number;
  cancelledOrders: number;
}): string {
  return [
    `📊 <b>WEEKLY SUMMARY</b>`,
    `📅 ${stats.startDate} → ${stats.endDate}`,
    ``,
    `📦 <b>Total Orders:</b> ${stats.totalOrders}`,
    `💰 <b>Revenue:</b> ${taka(stats.revenue)}`,
    `👤 <b>New Customers:</b> ${stats.newCustomers}`,
    `❌ <b>Cancelled:</b> ${stats.cancelledOrders}`,
  ].join("\n");
}

export function formatMonthlySummary(stats: {
  month: string;
  totalOrders: number;
  revenue: number;
  newCustomers: number;
  cancelledOrders: number;
  topProducts: Array<{ name: string; qty: number }>;
}): string {
  const topLines =
    stats.topProducts.length > 0
      ? stats.topProducts
          .slice(0, 5)
          .map((p, i) => `${i + 1}. ${esc(p.name)} — ${p.qty} sold`)
          .join("\n")
      : "No data";

  return [
    `📊 <b>MONTHLY SUMMARY — ${stats.month}</b>`,
    ``,
    `📦 <b>Total Orders:</b> ${stats.totalOrders}`,
    `💰 <b>Revenue:</b> ${taka(stats.revenue)}`,
    `👤 <b>New Customers:</b> ${stats.newCustomers}`,
    `❌ <b>Cancelled:</b> ${stats.cancelledOrders}`,
    ``,
    `🏆 <b>Top Products</b>`,
    topLines,
  ].join("\n");
}
