import { readFile } from "fs/promises";
import path from "path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Order } from "@/lib/types";

/**
 * A4 invoice PDF for an order: logo, store + customer details, items,
 * totals, payment and delivery (Pathao consignment when booked).
 * Standard PDF fonts have no "৳" glyph, so amounts are shown as "Tk".
 */

interface Store { name: string; address: string; phone: string; email: string; website: string }

const BLACK = rgb(0.07, 0.07, 0.07);
const GREY = rgb(0.42, 0.42, 0.42);
const LIGHT = rgb(0.88, 0.88, 0.88);
const OXBLOOD = rgb(0.5, 0.11, 0.11);

const money = (n: number) => `Tk ${Math.round(Number(n) || 0).toLocaleString("en-US")}`;
// Standard fonts are WinAnsi-only: replace characters they can't draw
const safe = (s: unknown) =>
  String(s ?? "")
    .replace(/[–—]/g, "-")
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/৳/g, "Tk ")
    .replace(/[^\x20-\x7E\xA0-\xFF]/g, "");

function wrap(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = safe(text).split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      lines.push(line);
      line = w;
    } else line = test;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

async function loadLogo(): Promise<Uint8Array | null> {
  try {
    return await readFile(path.join(process.cwd(), "public", "sashico-logo.png"));
  } catch {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || "https://sashico.net"}/sashico-logo.png`);
      return res.ok ? new Uint8Array(await res.arrayBuffer()) : null;
    } catch {
      return null;
    }
  }
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pending", confirmed: "Confirmed", processing: "Processing",
  shipped: "Shipped", delivered: "Delivered", cancelled: "Cancelled",
};

export async function buildInvoicePdf(o: Order, store: Store): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Invoice ${o.order_number}`);
  pdf.setAuthor(store.name);
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const W = 595.28, H = 841.89, M = 48; // A4, 48pt margins
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;

  const text = (s: string, x: number, yy: number, o2: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; right?: boolean } = {}) => {
    const size = o2.size ?? 9.5, font = o2.font ?? regular;
    const str = safe(s);
    const xx = o2.right ? x - font.widthOfTextAtSize(str, size) : x;
    page.drawText(str, { x: xx, y: yy, size, font, color: o2.color ?? BLACK });
  };
  const rule = (yy: number, thick = 0.6, color = LIGHT) =>
    page.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness: thick, color });

  // ── Header: logo + invoice meta ──
  const logoBytes = await loadLogo();
  if (logoBytes) {
    const logo = await pdf.embedPng(logoBytes);
    const lw = 140, lh = (logo.height / logo.width) * lw;
    page.drawImage(logo, { x: M, y: y - lh, width: lw, height: lh });
  } else {
    text(store.name.toUpperCase(), M, y - 24, { size: 24, font: bold });
  }
  text("INVOICE", W - M, y - 10, { size: 9, font: bold, color: GREY, right: true });
  text(o.order_number, W - M, y - 30, { size: 18, font: bold, right: true });
  const placed = new Date(o.created_at).toLocaleDateString("en-GB", { timeZone: "Asia/Dhaka", day: "numeric", month: "long", year: "numeric" });
  text(`Date: ${placed}`, W - M, y - 46, { size: 9, color: GREY, right: true });
  text(`Status: ${STATUS_LABEL[o.order_status] || o.order_status}`, W - M, y - 59, { size: 9, color: GREY, right: true });
  y -= 72;
  text(store.address, M, y, { size: 8.5, color: GREY });
  text([store.phone, store.email, store.website].filter(Boolean).join("   |   "), M, y - 12, { size: 8.5, color: GREY });
  y -= 28;
  rule(y, 1.2, BLACK);
  y -= 26;

  // ── Bill to / Deliver to ──
  const colW = (W - 2 * M - 24) / 2;
  const a = (o.shipping_address || {}) as unknown as Record<string, string>;
  const addressLines = [
    ...wrap(a.street || "", regular, 9.5, colW),
    [a.city, a.district].filter(Boolean).join(", "),
    [a.division, a.postal_code].filter(Boolean).join(" - "),
    a.country || "Bangladesh",
  ].filter(Boolean);
  const blocks: [string, string[]][] = [
    ["BILL TO", [o.customer_name, o.customer_phone, o.customer_email].filter(Boolean)],
    ["DELIVER TO", [o.customer_name, ...addressLines]],
  ];
  let blockBottom = y;
  blocks.forEach(([label, lines], i) => {
    const x = M + i * (colW + 24);
    text(label, x, y, { size: 8, font: bold, color: GREY });
    lines.forEach((l, n) => text(l, x, y - 16 - n * 13, { size: 9.5, font: n === 0 ? bold : regular }));
    blockBottom = Math.min(blockBottom, y - 16 - lines.length * 13);
  });
  y = blockBottom - 18;

  // ── Items table ──
  const cols = { item: M, size: M + 270, qty: M + 345, unit: W - M - 85, total: W - M };
  const header = () => {
    page.drawRectangle({ x: M, y: y - 6, width: W - 2 * M, height: 20, color: rgb(0.96, 0.96, 0.96) });
    text("ITEM", cols.item + 6, y, { size: 8, font: bold, color: GREY });
    text("SIZE", cols.size, y, { size: 8, font: bold, color: GREY });
    text("QTY", cols.qty, y, { size: 8, font: bold, color: GREY });
    text("UNIT PRICE", cols.unit, y, { size: 8, font: bold, color: GREY, right: true });
    text("TOTAL", cols.total - 6, y, { size: 8, font: bold, color: GREY, right: true });
    y -= 24;
  };
  header();
  const items = (o.items || []) as { product_name: string; size: string; quantity: number; unit_price: number; total_price: number }[];
  for (const it of items) {
    const nameLines = wrap(it.product_name, regular, 9.5, 255);
    const rowH = Math.max(1, nameLines.length) * 12 + 10;
    if (y - rowH < 170) { // new page, repeat header
      page = pdf.addPage([W, H]);
      y = H - M;
      header();
    }
    nameLines.forEach((l, n) => text(l, cols.item + 6, y - n * 12, { size: 9.5 }));
    text(it.size, cols.size, y, { size: 9.5 });
    text(String(it.quantity), cols.qty + 6, y, { size: 9.5 });
    text(money(it.unit_price), cols.unit, y, { size: 9.5, right: true });
    text(money(it.total_price), cols.total - 6, y, { size: 9.5, font: bold, right: true });
    y -= rowH;
    rule(y + 8);
  }

  // ── Totals ──
  y -= 10;
  const tx = W - M - 200;
  const row = (label: string, value: string, opts: { bold?: boolean; color?: ReturnType<typeof rgb> } = {}) => {
    text(label, tx, y, { size: 9.5, font: opts.bold ? bold : regular, color: opts.color ?? GREY });
    text(value, W - M - 6, y, { size: opts.bold ? 12 : 9.5, font: opts.bold ? bold : regular, color: opts.color ?? BLACK, right: true });
    y -= opts.bold ? 22 : 16;
  };
  row("Subtotal", money(o.subtotal));
  row("Delivery charge", Number(o.shipping_cost) === 0 ? "Free" : money(o.shipping_cost));
  if (Number(o.discount_amount) > 0) row("Discount", `- ${money(o.discount_amount)}`);
  page.drawLine({ start: { x: tx, y: y + 10 }, end: { x: W - M, y: y + 10 }, thickness: 1.2, color: BLACK });
  y -= 4;
  row("TOTAL", money(o.total_amount), { bold: true });

  // ── Payment & delivery ──
  y -= 6;
  rule(y);
  y -= 22;
  const cod = o.payment_method === "cod";
  const paid = o.payment_status === "paid";
  const collect = cod && !paid ? Number(o.total_amount) : 0;
  const info: [string, string][] = [
    ["Payment method", cod ? "Cash on Delivery" : safe(o.payment_method).toUpperCase()],
    ["Payment status", paid ? "Paid" : "Unpaid"],
    ["Courier", o.tracking_number ? "Pathao Courier" : "To be assigned"],
    ...(o.tracking_number ? ([["Consignment ID", o.tracking_number]] as [string, string][]) : []),
    ["Delivery time", /dhaka/i.test(`${a.district} ${a.division}`) ? "2-4 business days (inside Dhaka)" : "4-6 business days (outside Dhaka)"],
  ];
  text("PAYMENT & DELIVERY", M, y, { size: 8, font: bold, color: GREY });
  y -= 16;
  for (const [k, v] of info) {
    text(k, M, y, { size: 9.5, color: GREY });
    text(v, M + 110, y, { size: 9.5 });
    y -= 14;
  }
  // Highlighted COD box for the rider / customer
  const boxH = 46, boxW = 200, bx = W - M - boxW, by = y + 14 * info.length - boxH + 6;
  page.drawRectangle({ x: bx, y: by, width: boxW, height: boxH, borderColor: collect ? OXBLOOD : LIGHT, borderWidth: 1.2 });
  text(collect ? "AMOUNT TO COLLECT (COD)" : "AMOUNT TO COLLECT", bx + 12, by + boxH - 16, { size: 8, font: bold, color: collect ? OXBLOOD : GREY });
  text(collect ? money(collect) : "Tk 0 (paid)", bx + 12, by + 12, { size: 16, font: bold, color: collect ? OXBLOOD : BLACK });

  if (o.notes) {
    y -= 8;
    text("CUSTOMER NOTE", M, y, { size: 8, font: bold, color: GREY });
    y -= 14;
    wrap(o.notes, regular, 9.5, W - 2 * M).slice(0, 4).forEach((l) => { text(l, M, y, { size: 9.5 }); y -= 12; });
  }

  // ── Footer (every page) ──
  for (const [i, p] of pdf.getPages().entries()) {
    page = p;
    rule(M + 26);
    text(`Thank you for shopping with ${store.name}!  Exchanges within 72 hours of delivery - ${store.website}/returns`, M, M + 10, { size: 8, color: GREY });
    text(`Page ${i + 1} of ${pdf.getPageCount()}`, W - M, M + 10, { size: 8, color: GREY, right: true });
  }

  return pdf.save();
}
