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
  const v = String(val ?? "").trim().toUpperCase();
  return v === "TRUE" || v === "YES" || v === "1";
}

function str(val: unknown): string {
  return String(val ?? "").trim();
}

function categoryFromCode(code: string): string {
  const map: Record<string, string> = {
    "SS-T-":  "t-shirts",
    "SS-PT-": "t-shirts",
    "SS-S-":  "shirts",
    "SS-WS-": "sweatshirts",
    "SS-WH-": "hoodies",
    "SS-WJ-": "jackets",
    "SS-WB-": "accessories",
    "SS-TB-": "bags",
    "SS-PB-": "bags",
    "SS-DB-": "bags",
  };
  for (const [prefix, cat] of Object.entries(map)) {
    if (code.toUpperCase().startsWith(prefix)) return cat;
  }
  return "other";
}

// ─── New sheet reader ────────────────────────────────────────────────────────
//
// Reads the "🛍️ Products" tab built by buildSashicoSheet.gs
//
// Column layout (data starts row 6, read from col A = index 0):
//   0  A  Row #   (auto)
//   1  B  Product Code        ← required
//   2  C  Design Name / Name
//   3  D  Color
//   4  E  Product Type
//   5  F  Category            (auto)
//   6  G  Price (৳)           ← required
//   7  H  Sale Price (৳)
//   8  I  On Sale?            (auto)
//   9  J  Discount %          (auto)
//  10  K  Description
//  11  L  Is Featured         (checkbox)
//  12  M  Is New Arrival      (checkbox)
//  13  N  Is Best Seller      (checkbox)
//  14  O  Is Active           (auto)
//  15-19  P–T  Gulshan S M L XL FREE
//  20-24  U–Y  Banani  S M L XL FREE
//  25-29  Z–AD Factory S M L XL FREE
//  30  AE  Total S            (auto)
//  31  AF  Total M            (auto)
//  32  AG  Total L            (auto)
//  33  AH  Total XL           (auto)
//  34  AI  Total FREE         (auto)
//  35  AJ  All Stock          (auto)
//  36  AK  Status             (auto)

export async function readMasterSheet(sheetId: string): Promise<SheetProduct[]> {
  const sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "'🛍️ Products'!A6:AK500",
    valueRenderOption: "UNFORMATTED_VALUE", // get raw numbers, not formatted strings
  });

  const rows = (res.data.values ?? []) as unknown[][];
  const products: SheetProduct[] = [];

  for (const row of rows) {
    const code = str(row[1]).toUpperCase();
    if (!code.startsWith("SS-")) continue;

    const price = num(row[6]);
    if (price <= 0) continue; // skip if no price

    const designName  = str(row[2]);
    const color       = str(row[3]);
    const productType = str(row[4]);
    const name        = designName || (color ? `${color} ${productType}` : productType) || code;

    // Total stock per size (auto-calculated by sheet)
    const totalS    = num(row[30]);
    const totalM    = num(row[31]);
    const totalL    = num(row[32]);
    const totalXL   = num(row[33]);
    const totalFree = num(row[34]);
    const totalAll  = num(row[35]);

    const sizes = [
      { size: "S",    stock: totalS    },
      { size: "M",    stock: totalM    },
      { size: "L",    stock: totalL    },
      { size: "XL",   stock: totalXL   },
      { size: "FREE", stock: totalFree },
    ].filter(s => s.stock > 0);

    const salePrice = num(row[7]);
    const description = str(row[10]);
    const category = str(row[5]) || categoryFromCode(code);

    products.push({
      product_code:    code,
      name,
      description,
      price,
      sale_price:      salePrice > 0 ? salePrice : null,
      category,
      sizes,
      total_stock:     totalAll,
      is_active:       totalAll > 0,
      is_featured:     bool(row[11]),
      is_new_arrival:  bool(row[12]),
      is_best_seller:  bool(row[13]),
      tags:            [],
      meta_title:      `${name} | Sashico`,
      meta_description: description || `${name} — ${productType} by Sashico`,
      color,
      product_type:    productType,
      design_name:     designName,
    });
  }

  return products;
}

// ─── Legacy alias ─────────────────────────────────────────────────────────────

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
