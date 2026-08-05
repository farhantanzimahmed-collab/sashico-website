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

// ─── Main reader ──────────────────────────────────────────────────────────────
//
// Reads from the first visible sheet tab.
// Row 1 = headers, data from row 2.
//
// Columns (A–Q):
//   product_code | product_name | product_color | product_description |
//   product_category | size_available |
//   s | m | l | xl | free_size | total_stock |
//   price | sale_price |
//   is_featured | is_new_arrival | is_best_seller

export async function readMasterSheet(sheetId: string): Promise<SheetProduct[]> {
  const sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });

  // Get first tab name
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: sheetId,
    fields: "sheets.properties",
  });
  const firstTab = meta.data.sheets?.[0]?.properties?.title ?? "Sheet1";

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${firstTab}'!A1:Q500`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = (res.data.values ?? []) as unknown[][];
  if (rows.length < 2) return [];

  // Map header names → column index
  const headers = rows[0].map(h => str(h).toLowerCase().replace(/[\s-]+/g, "_"));
  const col = (name: string) => headers.indexOf(name);

  const cCode  = col("product_code");
  const cName  = col("product_name");
  const cColor = col("product_color");
  const cDesc  = col("product_description");
  const cCat   = col("product_category");
  const cS     = col("s");
  const cM     = col("m");
  const cL     = col("l");
  const cXL    = col("xl");
  const cFree  = col("free_size");
  const cPrice = col("price");
  const cSale  = col("sale_price");
  const cFeat  = col("is_featured");
  const cNew   = col("is_new_arrival");
  const cBest  = col("is_best_seller");

  const products: SheetProduct[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];

    const code = cCode >= 0 ? str(row[cCode]).toUpperCase() : "";
    if (!code.startsWith("SS-")) continue;

    const price = cPrice >= 0 ? num(row[cPrice]) : 0;
    if (price <= 0) continue;

    // Per-size stock
    const stockS    = cS    >= 0 ? num(row[cS])    : 0;
    const stockM    = cM    >= 0 ? num(row[cM])    : 0;
    const stockL    = cL    >= 0 ? num(row[cL])    : 0;
    const stockXL   = cXL   >= 0 ? num(row[cXL])   : 0;
    const stockFree = cFree >= 0 ? num(row[cFree]) : 0;

    const sizes = [
      { size: "S",         stock: stockS    },
      { size: "M",         stock: stockM    },
      { size: "L",         stock: stockL    },
      { size: "XL",        stock: stockXL   },
      { size: "FREE SIZE", stock: stockFree },
    ].filter(s => s.stock > 0);

    const totalStock = stockS + stockM + stockL + stockXL + stockFree;

    const name        = cName  >= 0 ? str(row[cName])  : code;
    const color       = cColor >= 0 ? str(row[cColor]) : "";
    const description = cDesc  >= 0 ? str(row[cDesc])  : "";
    const salePrice   = cSale  >= 0 ? num(row[cSale])  : 0;
    const category    = (cCat >= 0 && str(row[cCat]))
                          ? str(row[cCat]).toLowerCase()
                          : categoryFromCode(code);

    products.push({
      product_code:    code,
      name:            name || code,
      description,
      price,
      sale_price:      salePrice > 0 ? salePrice : null,
      category,
      sizes,
      total_stock:     totalStock,
      is_active:       totalStock > 0,
      is_featured:     cFeat >= 0 ? bool(row[cFeat]) : false,
      is_new_arrival:  cNew  >= 0 ? bool(row[cNew])  : false,
      is_best_seller:  cBest >= 0 ? bool(row[cBest]) : false,
      tags:            [],
      meta_title:      `${name || code} | Sashico`,
      meta_description: description || `${name || code} by Sashico`,
      color,
      product_type:    "",
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
