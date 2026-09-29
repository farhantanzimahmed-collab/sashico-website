/**
 * COD fraud check: a customer's track record with Sashico, matched by phone.
 * success rate = delivered ÷ (delivered + cancelled/returned); orders still
 * in progress don't count either way.
 */

/** "+880 1712-345678", "8801712345678", "01712345678" → "01712345678" */
export function normalizeBdPhone(phone: string | null | undefined): string {
  const d = (phone || "").replace(/\D/g, "");
  if (d.startsWith("880") && d.length === 13) return `0${d.slice(3)}`;
  if (d.length === 10 && d.startsWith("1")) return `0${d}`;
  return d;
}

export interface CustomerHistory {
  phone: string;
  total: number;
  delivered: number;
  cancelled: number;
  inProgress: number;
  successRate: number | null; // 0–100, null when nothing finished yet
  risk: "new" | "good" | "watch" | "risky";
}

type OrderLite = { id: string; customer_phone: string; order_status: string };

export function summarizeHistory(phone: string, orders: OrderLite[], excludeOrderId?: string): CustomerHistory {
  const key = normalizeBdPhone(phone);
  const mine = orders.filter((o) => normalizeBdPhone(o.customer_phone) === key && o.id !== excludeOrderId);
  const delivered = mine.filter((o) => o.order_status === "delivered").length;
  const cancelled = mine.filter((o) => o.order_status === "cancelled").length;
  const finished = delivered + cancelled;
  const successRate = finished ? Math.round((delivered / finished) * 100) : null;
  const risk: CustomerHistory["risk"] =
    successRate === null ? "new" : successRate >= 80 ? "good" : successRate >= 50 ? "watch" : "risky";
  return { phone: key, total: mine.length, delivered, cancelled, inProgress: mine.length - finished, successRate, risk };
}

export const RISK_STYLES: Record<CustomerHistory["risk"], { label: string; className: string }> = {
  new: { label: "New customer", className: "bg-gray-100 text-gray-700" },
  good: { label: "Reliable", className: "bg-green-100 text-green-800" },
  watch: { label: "Check first", className: "bg-yellow-100 text-yellow-800" },
  risky: { label: "High risk", className: "bg-red-100 text-red-800" },
};
