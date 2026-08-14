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

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Reader for "Sashico Master Sheet" → tab "🛍️ Products" ─────────────────
//
// Data starts row 6. Columns A–AK (0-indexed from A=0):
//
//  idx  col  field
//   0    A   # (row number — auto)
//   1    B   product_code
//   2    C   Design Name / Product Name
//   3    D   color
//   4    E   product_type
//   5    F   category (auto)
//   6    G   price (৳)           ← manual
//   7    H   sale_price (৳)      ← manual (blank = no discount)
//   8    I   on_sale (auto)
//   9    J   discount % (auto)
//  10    K   description (for website)
//  11    L   is_featured (checkbox)
//  12    M   is_new_arrival (checkbox)
//  13    N   is_best_seller (checkbox)
//  14    O   is_active (auto)
// 15-19  P-T  Gulshan S M L XL FREE
// 20-24  U-Y  Banani  S M L XL FREE
// 25-29  Z-AD Factory S M L XL FREE
//  30   AE   total S  (auto)
//  31   AF   total M  (auto)
//  32   AG   total L  (auto)
//  33   AH   total XL (auto)
//  34   AI   total FREE (auto)
//  35   AJ   all stock  (auto)
//  36   AK   status     (auto)

export async function readMasterSheet(sheetId: string): Promise<SheetProduct[]> {
  const sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "'🛍️ Products'!A6:AK500",
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = (res.data.values ?? []) as unknown[][];
  const products: SheetProduct[] = [];

  for (const row of rows) {
    const code = str(row[1]).toUpperCase();
    if (!code.startsWith("SS-")) continue;

    const price = num(row[6]);
    if (price <= 0) continue;

    // Stock totals (auto-calculated by sheet formulas)
    const stockS    = num(row[30]);
    const stockM    = num(row[31]);
    const stockL    = num(row[32]);
    const stockXL   = num(row[33]);
    const stockFree = num(row[34]);
    const totalAll  = num(row[35]);

    const sizes = [
      { size: "S",         stock: stockS    },
      { size: "M",         stock: stockM    },
      { size: "L",         stock: stockL    },
      { size: "XL",        stock: stockXL   },
      { size: "FREE SIZE", stock: stockFree },
    ].filter(s => s.stock > 0);

    const name        = str(row[2]);
    const color       = str(row[3]);
    const productType = str(row[4]);
    const description = str(row[10]);
    const salePrice   = num(row[7]);
    const category    = str(row[5]) || categoryFromCode(code);

    products.push({
      product_code:    code,
      name:            name || code,
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
      meta_title:      `${name || code} | Sashico`,
      meta_description: description || `${name || code} by Sashico`,
      color,
      product_type:    productType,
      design_name:     name,
    });
  }

  return products;
}

// ─── Legacy aliases ───────────────────────────────────────────────────────────

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
