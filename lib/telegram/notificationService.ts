import { createClient } from "@supabase/supabase-js";
import { getTelegramConfig } from "./config";
import { sendMessage, editMessage } from "./telegramService";
import {
  formatOrderMessage,
  getOrderKeyboard,
  formatLowStockAlert,
  formatOutOfStockAlert,
  formatNewCustomerMessage,
  formatContactMessage,
  formatReviewMessage,
  formatNewsletterMessage,
} from "./formatters";
import { Order } from "@/lib/types";

function serviceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

export async function notifyNewOrder(order: Order): Promise<void> {
  const config = await getTelegramConfig();
  if (!config?.isEnabled || !config.notifications.newOrder) return;

  const text = formatOrderMessage(order);
  const keyboard = getOrderKeyboard(order.id, order.order_status);

  const messageId = await sendMessage(config.botToken, config.chatId, text, {
    parse_mode: "HTML",
    reply_markup: keyboard,
  });

  if (messageId) {
    await serviceClient()
      .from("orders")
      .update({ telegram_message_id: String(messageId) })
      .eq("id", order.id);
  }
}

export async function notifyOrderStatusUpdate(
  order: Order & { telegram_message_id?: string | null }
): Promise<void> {
  const config = await getTelegramConfig();
  if (!config?.isEnabled) return;
  if (!order.telegram_message_id) return;

  const text = formatOrderMessage(order);
  const keyboard = getOrderKeyboard(order.id, order.order_status);

  await editMessage(
    config.botToken,
    config.chatId,
    parseInt(order.telegram_message_id, 10),
    text,
    { parse_mode: "HTML", reply_markup: keyboard }
  );
}

export async function notifyLowStock(
  productName: string,
  size: string,
  remaining: number
): Promise<void> {
  const config = await getTelegramConfig();
  if (!config?.isEnabled || !config.notifications.lowStock) return;

  await sendMessage(
    config.botToken,
    config.chatId,
    formatLowStockAlert(productName, size, remaining),
    { parse_mode: "HTML" }
  );
}

export async function notifyOutOfStock(productName: string, size: string): Promise<void> {
  const config = await getTelegramConfig();
  if (!config?.isEnabled || !config.notifications.outOfStock) return;

  await sendMessage(
    config.botToken,
    config.chatId,
    formatOutOfStockAlert(productName, size),
    { parse_mode: "HTML" }
  );
}

export async function notifyNewCustomer(
  name: string,
  email: string,
  phone?: string | null
): Promise<void> {
  const config = await getTelegramConfig();
  if (!config?.isEnabled || !config.notifications.newCustomer) return;

  await sendMessage(
    config.botToken,
    config.chatId,
    formatNewCustomerMessage(name, email, phone),
    { parse_mode: "HTML" }
  );
}

export async function notifyContactForm(
  name: string,
  email: string,
  subject: string | null,
  message: string
): Promise<void> {
  const config = await getTelegramConfig();
  if (!config?.isEnabled || !config.notifications.contactForm) return;

  await sendMessage(
    config.botToken,
    config.chatId,
    formatContactMessage(name, email, subject, message),
    { parse_mode: "HTML" }
  );
}

export async function notifyNewReview(
  customerName: string,
  rating: number,
  productName: string,
  comment: string | null
): Promise<void> {
  const config = await getTelegramConfig();
  if (!config?.isEnabled || !config.notifications.newReview) return;

  await sendMessage(
    config.botToken,
    config.chatId,
    formatReviewMessage(customerName, rating, productName, comment),
    { parse_mode: "HTML" }
  );
}

export async function notifyNewsletter(email: string): Promise<void> {
  const config = await getTelegramConfig();
  if (!config?.isEnabled || !config.notifications.newsletter) return;

  await sendMessage(
    config.botToken,
    config.chatId,
    formatNewsletterMessage(email),
    { parse_mode: "HTML" }
  );
}

// Check all sizes in an order's products for low/out-of-stock after purchase
export async function checkAndNotifyStockLevels(
  orderItems: Array<{ product_id: string; product_name: string; size: string }>,
  threshold: number
): Promise<void> {
  const config = await getTelegramConfig();
  if (!config?.isEnabled) return;
  if (!config.notifications.lowStock && !config.notifications.outOfStock) return;

  const supabase = serviceClient();
  const productIds = [...new Set(orderItems.map((i) => i.product_id))];

  const { data: products } = await supabase
    .from("products")
    .select("id, name, sizes")
    .in("id", productIds);

  if (!products) return;

  for (const product of products) {
    const sizes = (product.sizes as Array<{ size: string; stock: number }>) ?? [];
    for (const sizeEntry of sizes) {
      if (sizeEntry.stock === 0 && config.notifications.outOfStock) {
        notifyOutOfStock(product.name, sizeEntry.size).catch(console.error);
      } else if (sizeEntry.stock > 0 && sizeEntry.stock <= threshold && config.notifications.lowStock) {
        notifyLowStock(product.name, sizeEntry.size, sizeEntry.stock).catch(console.error);
      }
    }
  }
}
