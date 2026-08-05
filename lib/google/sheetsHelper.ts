import { google } from "googleapis";
import { getGoogleAuth } from "./googleAuth";

export interface SheetProduct {
  product_code: string;
  name: string;
  description: string;
  price: number;
  sale_price: number | null;
  category: string;
  /** "S:10,M:15,L:5,XL:3" */
  sizes_raw: string;
  is_active: boolean;
  is_featured: boolean;
  is_new_arrival: boolean;
  is_best_seller: boolean;
  tags: string[];
  meta_title: string;
  meta_description: string;
}

const HEADERS = [
  "product_code", "name", "description", "price", "sale_price",
  "category", "sizes", "is_active", "is_featured", "is_new_arrival",
  "is_best_seller", "tags", "meta_title", "meta_description",
];

function bool(val: string): boolean {
  return val?.toString().trim().toUpperCase() === "TRUE";
}

function num(val: string): number {
  const n = parseFloat(val?.toString().replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

export async function readSheetProducts(sheetId: string): Promise<SheetProduct[]> {
  const sheets = google.sheets({ version: "v4", auth: getGoogleAuth() });

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "Sheet1!A:N",
  });

  const rows = res.data.values ?? [];
  if (rows.length < 2) return [];

  // First row is header — we map by position using HEADERS order
  const products: SheetProduct[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const code = (row[0] ?? "").toString().trim().toUpperCase();
    if (!code) continue; // skip blank rows

    const price = num(row[3]);
    if (price <= 0) continue; // skip rows with no price

    products.push({
      product_code:    code,
      name:            (row[1] ?? "").toString().trim(),
      description:     (row[2] ?? "").toString().trim(),
      price,
      sale_price:      row[4] ? num(row[4]) : null,
      category:        (row[5] ?? "").toString().trim().toLowerCase(),
      sizes_raw:       (row[6] ?? "").toString().trim(),
      is_active:       row[7] !== undefined ? bool(row[7]) : true,
      is_featured:     bool(row[8]),
      is_new_arrival:  bool(row[9]),
      is_best_seller:  bool(row[10]),
      tags:            (row[11] ?? "").toString().split(",").map((t: string) => t.trim()).filter(Boolean),
      meta_title:      (row[12] ?? "").toString().trim(),
      meta_description:(row[13] ?? "").toString().trim(),
    });
  }

  return products;
}

/** Parse "S:10,M:15,L:5" → [{size:"S",stock:10},…] */
export function parseSizes(raw: string): Array<{ size: string; stock: number }> {
  if (!raw) return [];
  return raw.split(",").map(part => {
    const [size, stockStr] = part.trim().split(":");
    return { size: size?.trim().toUpperCase() ?? "", stock: parseInt(stockStr ?? "0", 10) || 0 };
  }).filter(s => s.size);
}
