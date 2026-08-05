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

// ─── Simple flat sheet reader ─────────────────────────────────────────────────
//
// Reads from the first tab (Sheet1 / Products / any name).
// Row 1 = headers, data starts row 2.
//
// Expected headers (A–Y):
//   product_code | name | color | product_type | price | sale_price |
//   description | is_featured | is_new_arrival | is_best_seller |
//   gulshan_s | gulshan_m | gulshan_l | gulshan_xl | gulshan_free |
//   banani_s  | banani_m  | banani_l  | banani_xl  | banani_free  |
//   factory_s | factory_m | factory_l | factory_xl | factory_free

async function readSimpleSheet(sheetId: string): Promise<SheetProduct[]> {
  const sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });

  // Try first sheet by default
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: "sheets.properties" });
  const firstTab = meta.data.sheets?.[0]?.properties?.title ?? "Sheet1";

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `'${firstTab}'!A1:Y500`,
    valueRenderOption: "UNFORMATTED_VALUE",
  });

  const rows = (res.data.values ?? []) as unknown[][];
  if (rows.length < 2) return [];

  // Build header→index map from row 1
  const headerRow = rows[0].map(h => str(h).toLowerCase().replace(/\s+/g, "_"));
  const col = (name: string) => headerRow.indexOf(name);

  // Required columns
  const cCode  = col("product_code");
  const cName  = col("name");
  const cColor = col("color");
  const cType  = col("product_type");
  const cPrice = col("price");
  const cSale  = col("sale_price");
  const cDesc  = col("description");
  const cFeat  = col("is_featured");
  const cNew   = col("is_new_arrival");
  const cBest  = col("is_best_seller");

  // Per-store per-size columns
  const stores = [
    { prefix: "gulshan", cols: ["gulshan_s","gulshan_m","gulshan_l","gulshan_xl","gulshan_free"] },
    { prefix: "banani",  cols: ["banani_s", "banani_m", "banani_l", "banani_xl", "banani_free"] },
    { prefix: "factory", cols: ["factory_s","factory_m","factory_l","factory_xl","factory_free"] },
  ];

  const products: SheetProduct[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const code = cCode >= 0 ? str(row[cCode]).toUpperCase() : "";
    if (!code.startsWith("SS-")) continue;

    const price = cPrice >= 0 ? num(row[cPrice]) : 0;
    if (price <= 0) continue;

    // Aggregate stock per size across all stores
    const SIZE_LABELS = ["S", "M", "L", "XL", "FREE"];
    const sizeStock = [0, 0, 0, 0, 0];
    for (const store of stores) {
      store.cols.forEach((colName, idx) => {
        const ci = col(colName);
        if (ci >= 0) sizeStock[idx] += num(row[ci]);
      });
    }

    const sizes = SIZE_LABELS
      .map((size, idx) => ({ size, stock: sizeStock[idx] }))
      .filter(s => s.stock > 0);

    const totalStock = sizeStock.reduce((a, b) => a + b, 0);

    const name        = cName  >= 0 ? str(row[cName])  : code;
    const color       = cColor >= 0 ? str(row[cColor]) : "";
    const productType = cType  >= 0 ? str(row[cType])  : "";
    const displayName = name || (color ? `${color} ${productType}` : productType) || code;
    const description = cDesc  >= 0 ? str(row[cDesc])  : "";
    const salePrice   = cSale  >= 0 ? num(row[cSale])  : 0;
    const category    = categoryFromCode(code);

    products.push({
      product_code:    code,
      name:            displayName,
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
      meta_title:      `${displayName} | Sashico`,
      meta_description: description || `${displayName} by Sashico`,
      color,
      product_type:    productType,
      design_name:     name,
    });
  }

  return products;
}

// ─── Fancy sheet reader (Apps Script built sheet) ────────────────────────────
//
// Reads from "🛍️ Products" tab, data starts row 6, col layout A–AK

async function readFancySheet(sheetId: string): Promise<SheetProduct[]> {
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

    const designName  = str(row[2]);
    const color       = str(row[3]);
    const productType = str(row[4]);
    const name        = designName || (color ? `${color} ${productType}` : productType) || code;
    const salePrice   = num(row[7]);
    const description = str(row[10]);

    products.push({
      product_code:    code,
      name,
      description,
      price,
      sale_price:      salePrice > 0 ? salePrice : null,
      category:        str(row[5]) || categoryFromCode(code),
      sizes,
      total_stock:     totalAll,
      is_active:       totalAll > 0,
      is_featured:     bool(row[11]),
      is_new_arrival:  bool(row[12]),
      is_best_seller:  bool(row[13]),
      tags:            [],
      meta_title:      `${name} | Sashico`,
      meta_description: description || `${name} by Sashico`,
      color,
      product_type:    productType,
      design_name:     designName,
    });
  }

  return products;
}

// ─── Auto-detect and read ────────────────────────────────────────────────────

export async function readMasterSheet(sheetId: string): Promise<SheetProduct[]> {
  const sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });
  const meta = await sheets.spreadsheets.get({ spreadsheetId: sheetId, fields: "sheets.properties" });
  const tabNames = meta.data.sheets?.map(s => s.properties?.title ?? "") ?? [];

  // If Apps Script built the fancy sheet, use it
  if (tabNames.includes("🛍️ Products")) {
    return readFancySheet(sheetId);
  }

  // Otherwise fall back to simple flat format
  return readSimpleSheet(sheetId);
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
