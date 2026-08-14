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
    "SS-T-":   "t-shirts",
    "SS-PT-":  "t-shirts",
    "SS-S-":   "shirts",
    "SS-WS-":  "sweatshirts",
    "SS-WH-":  "hoodies",
    "SS-WJ-":  "jackets",
    "SS-WB-":  "accessories",   // Bennies / beanies
    "SS-TB-":  "bags",
    "SS-PB-":  "bags",
    "SS-DB-":  "bags",
  };
  for (const [prefix, cat] of Object.entries(map)) {
    if (code.toUpperCase().startsWith(prefix)) return cat;
  }
  return "other";
}

// ─── Reader for the current Sashico master sheet ──────────────────────────────
//
// Reads TWO tabs and merges by product code:
//
// Tab: "📦 Inventory"  |  Headers row 9  |  Data from row 10
//
//  idx  col  field
//   1    B   product_code
//   2    C   name
//   3    D   color
//   4    E   design_name
//   5    F   product_image (Google Drive link — ignored, Drive folder used instead)
//   6    G   sizes_available (text — used as fallback)
//   8    I   Banani S       (physical store — ignored for website stock)
//   9    J   Banani M
//  10    K   Banani L
//  11    L   Banani XL
//  12    M   Banani FREE/XXL
//  13    N   Website S      ← website-specific stock
//  14    O   Website M
//  15    P   Website L
//  16    Q   Website XL
//  17    R   Website FREE/XXL
//  18    S   TOTAL STOCK (all locations combined)
//  20    U   Selling Price  ← main sell price
//  23    X   Sale/Discount Price  ← optional; blank = no discount
//
// Tab: "🧵 Product Costing"  |  Headers row 8  |  Data from row 9
//  (used only as fallback when Inventory is missing price)
//  18    S   SUGGESTED SELL PRICE
//

async function fetchWithAuth(tabName: string, range: string, sheetId: string): Promise<unknown[][]> {
  const sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${tabName}'!${range}`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });
  return (res.data.values ?? []) as unknown[][];
}

export async function readMasterSheet(sheetId: string): Promise<SheetProduct[]> {
  // ── 1. Read Inventory tab (primary source) ──
  const invRows = await fetchWithAuth("📦 Inventory", "A10:AZ500", sheetId);

  // ── 2. Read Product Costing tab (for description / fallback pricing) ──
  let costRows: unknown[][] = [];
  try {
    costRows = await fetchWithAuth("🧵 Product Costing", "A9:AZ500", sheetId);
  } catch {
    // Non-fatal — we can live without it
  }

  // Build costing lookup: code → row
  const costMap = new Map<string, unknown[]>();
  for (const row of costRows) {
    const code = str(row[1]).toUpperCase();
    if (code.startsWith("SS-")) costMap.set(code, row);
  }

  const products: SheetProduct[] = [];

  for (const row of invRows) {
    const code = str(row[1]).toUpperCase();
    if (!code.startsWith("SS-")) continue;

    // ── Pricing ──────────────────────────────────────────────────
    // Primary: Inventory col U (idx 20) = "Selling Price"
    // Fallback: Product Costing col S (idx 18) = "Suggested Sell Price"
    let price = num(row[20]);
    if (price <= 0) {
      const costRow = costMap.get(code);
      if (costRow) price = num(costRow[18]);
    }
    if (price <= 0) continue; // skip rows with no price at all

    // Optional: Inventory col X (idx 23) = "Sale/Discount Price"
    // Add this column to your sheet to enable per-product discounts
    const salePrice = num(row[23]);

    // ── Website stock per size (cols N–R = idx 13–17) ────────────
    const webS    = num(row[13]);
    const webM    = num(row[14]);
    const webL    = num(row[15]);
    const webXL   = num(row[16]);
    const webFree = num(row[17]);

    const sizes = [
      { size: "S",         stock: webS    },
      { size: "M",         stock: webM    },
      { size: "L",         stock: webL    },
      { size: "XL",        stock: webXL   },
      { size: "FREE SIZE", stock: webFree },
    ].filter(s => s.stock > 0);

    // Website total = sum of website-specific sizes
    // Fall back to grand total (idx 18) if website cols are all blank
    const webTotal = webS + webM + webL + webXL + webFree;
    const totalStock = webTotal > 0 ? webTotal : num(row[18]);

    // ── Product info ─────────────────────────────────────────────
    const name       = str(row[2]);
    const color      = str(row[3]);
    const designName = str(row[4]);
    const category   = categoryFromCode(code);

    // Pull description from Product Costing if available
    const costRow    = costMap.get(code);
    const description = costRow ? str(costRow[8]) : ""; // col I = SEASON/COLLECTION as description placeholder

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
      is_featured:     false,
      is_new_arrival:  false,
      is_best_seller:  false,
      tags:            [],
      meta_title:      `${name || code} | Sashico`,
      meta_description: description || `${name || code} by Sashico`,
      color,
      product_type:    category,
      design_name:     designName || name,
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
