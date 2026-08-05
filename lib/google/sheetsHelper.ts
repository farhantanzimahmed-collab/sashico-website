import { google } from "googleapis";
import { getGoogleAuth } from "./googleAuth";

export interface SheetProduct {
  product_code: string;
  name: string;
  description: string;
  price: number;
  sale_price: number | null;
  category: string;
  sizes: Array<{ size: string; stock: number }>;
  total_stock: number;
  is_active: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  tags: string[];
  meta_title: string;
  meta_description: string;
  color: string;
  product_type: string;
  design_name: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function num(val: unknown): number {
  const n = parseFloat(String(val ?? "").replace(/[৳,\s]/g, ""));
  return isNaN(n) ? 0 : n;
}

function bool(val: unknown): boolean {
  return String(val ?? "").trim().toUpperCase() === "TRUE";
}

function str(val: unknown): string {
  return String(val ?? "").trim();
}

/** Derive website category slug from Sashico product code prefix */
function categoryFromCode(code: string): string {
  const map: Record<string, string> = {
    "SS-T":  "t-shirts",
    "SS-PT": "t-shirts",
    "SS-S":  "shirts",
    "SS-WS": "sweatshirts",
    "SS-WH": "hoodies",
    "SS-WJ": "jackets",
    "SS-WB": "accessories",
    "SS-TB": "bags",
    "SS-PB": "bags",
    "SS-DB": "bags",
  };
  // Match first two segments: SS-T-001 → SS-T
  const prefix = code.split("-").slice(0, 2).join("-");
  return map[prefix] ?? "other";
}

/** Build product display name from parts */
function buildName(designName: string, color: string, productType: string): string {
  if (designName) return designName; // "Vejita", "Baby Goku"
  if (color)      return `${color} ${productType}`; // "Olive Shirt"
  return productType;
}

// ─── Aggregate per-size stock across Gulshan + Banani + Factory ─────────────

const SIZE_LABELS = ["S", "M", "L", "XL", "FREE"] as const;

function aggregateSizes(row: string[]): Array<{ size: string; stock: number }> {
  // Inventory tab columns (from B=0):
  // 8–12  → Gulshan  S M L XL FREE
  // 13–17 → Banani   S M L XL FREE
  // 18–22 → Factory  S M L XL FREE
  return SIZE_LABELS.map((size, i) => ({
    size,
    stock: num(row[8 + i]) + num(row[13 + i]) + num(row[18 + i]),
  })).filter(s => s.stock > 0);
}

// ─── Main export ─────────────────────────────────────────────────────────────

/**
 * Read products from the Sashico master Google Sheet.
 * Combines 📦 Inventory tab (stock per size per store) with
 * 🧵 Product Costing tab (sell price).
 *
 * Optional extra columns in Product Costing (after Margin %):
 *   col U: SALE PRICE (৳)
 *   col V: DESCRIPTION
 *   col W: IS FEATURED   (TRUE/FALSE)
 *   col X: IS NEW ARRIVAL (TRUE/FALSE)
 *   col Y: IS BEST SELLER (TRUE/FALSE)
 */
export async function readMasterSheet(sheetId: string): Promise<SheetProduct[]> {
  const sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });

  // ── 1. Read Inventory tab (stock per size) ─────────────────────────────
  const invRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "'📦 Inventory'!B9:Z200",
  });
  const invRows = (invRes.data.values ?? []) as string[][];
  // row 0 is the header, data starts row 1
  const invMap = new Map<string, string[]>();
  for (let i = 1; i < invRows.length; i++) {
    const code = str(invRows[i][0]).toUpperCase();
    if (code.startsWith("SS-")) invMap.set(code, invRows[i]);
  }

  // ── 2. Read Product Costing tab (price + optional website fields) ───────
  const costRes = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "'🧵 Product Costing'!B8:Z200",
  });
  const costRows = (costRes.data.values ?? []) as string[][];
  // row 0 is header, data starts row 1
  const products: SheetProduct[] = [];

  for (let i = 1; i < costRows.length; i++) {
    const row = costRows[i];
    const code = str(row[0]).toUpperCase();
    if (!code.startsWith("SS-")) continue;

    const price = num(row[17]); // SUGGESTED SELL PRICE (৳) — col S (index 17 from B)
    if (price <= 0) continue;   // skip if no price set

    const productType = str(row[1]);
    const color       = str(row[2]);
    const designName  = str(row[3]);

    // Optional extra columns (added by user after Margin %)
    // Index 19 = col T offset from B = col U in sheet
    const sale_price     = row[19] ? num(row[19]) : null;   // U: SALE PRICE
    const description    = str(row[20]);                      // V: DESCRIPTION
    const is_featured    = bool(row[21]);                     // W: IS FEATURED
    const is_new_arrival = bool(row[22]);                     // X: IS NEW ARRIVAL
    const is_best_seller = bool(row[23]);                     // Y: IS BEST SELLER

    // Get stock from inventory
    const invRow = invMap.get(code);
    const sizes  = invRow ? aggregateSizes(invRow) : [];
    const total_stock = sizes.reduce((s, x) => s + x.stock, 0);

    products.push({
      product_code: code,
      name:         buildName(designName, color, productType),
      description,
      price,
      sale_price:   sale_price && sale_price > 0 ? sale_price : null,
      category:     categoryFromCode(code),
      sizes,
      total_stock,
      is_active:    total_stock > 0,    // auto: only show if stock exists
      is_featured,
      is_new_arrival,
      is_best_seller,
      tags:         [],
      meta_title:   buildName(designName, color, productType) + " | Sashico",
      meta_description: description || `${buildName(designName, color, productType)} — ${color} ${productType} by Sashico`,
      color,
      product_type: productType,
      design_name:  designName,
    });
  }

  return products;
}

// ─── Legacy helpers kept for compatibility ───────────────────────────────────

/** @deprecated Use readMasterSheet() for the Sashico master sheet */
export async function readSheetProducts(sheetId: string): Promise<SheetProduct[]> {
  return readMasterSheet(sheetId);
}

export function parseSizes(raw: string): Array<{ size: string; stock: number }> {
  if (!raw) return [];
  return raw.split(",").map(part => {
    const [size, stockStr] = part.trim().split(":");
    return { size: (size ?? "").trim().toUpperCase(), stock: parseInt(stockStr ?? "0", 10) || 0 };
  }).filter(s => s.size);
}
