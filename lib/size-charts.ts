export interface SizeChartRow {
  size: string;
  length: string;
  chest: string;
  sleeve: string;
}

export interface SizeChart {
  label: string;
  unit: string;
  headers: string[];
  rows: SizeChartRow[];
}

const SIZE_CHARTS: Record<string, SizeChart> = {
  "T-Shirts": {
    label: "T-Shirt Size Chart",
    unit: "inches",
    headers: ["Size", "Length", "Chest", "Sleeve"],
    rows: [
      { size: "S",   length: '26.5"', chest: '39"', sleeve: '7"'   },
      { size: "M",   length: '27.5"', chest: '41"', sleeve: '7.5"' },
      { size: "L",   length: '28.5"', chest: '43"', sleeve: '8"'   },
      { size: "XL",  length: '29"',   chest: '45"', sleeve: '8.5"' },
    ],
  },
  "Polo": {
    label: "Polo Size Chart",
    unit: "inches",
    headers: ["Size", "Length", "Chest", "Sleeve"],
    rows: [
      { size: "S",   length: '26.5"', chest: '39"', sleeve: '7"'   },
      { size: "M",   length: '27.5"', chest: '41"', sleeve: '7.5"' },
      { size: "L",   length: '28.5"', chest: '43"', sleeve: '8"'   },
      { size: "XL",  length: '29"',   chest: '45"', sleeve: '8.5"' },
    ],
  },
  "Cuban Shirts": {
    label: "Cuban Shirt Size Chart",
    unit: "inches",
    headers: ["Size", "Length", "Chest", "Sleeve"],
    rows: [
      { size: "S",   length: '26"', chest: '42"', sleeve: '10"'   },
      { size: "M",   length: '27"', chest: '44"', sleeve: '10.5"' },
      { size: "L",   length: '28"', chest: '48"', sleeve: '11"'   },
      { size: "XL",  length: '29"', chest: '50"', sleeve: '11.5"' },
    ],
  },
  "Winter": {
    label: "Sweatshirt & Hoodie Size Chart",
    unit: "inches",
    headers: ["Size", "Length", "Chest", "Sleeve"],
    rows: [
      { size: "S",   length: '26"', chest: '44"', sleeve: '21"' },
      { size: "M",   length: '27"', chest: '48"', sleeve: '22"' },
      { size: "L",   length: '28"', chest: '50"', sleeve: '23"' },
      { size: "XL",  length: '29"', chest: '54"', sleeve: '24"' },
    ],
  },
};

// Product-page charts for hoodies and sweatshirts. Measurements are the brand's
// existing "Sweatshirt & Hoodie" chart — update here if hoodie specs differ.
const WINTER_ROWS = SIZE_CHARTS["Winter"].rows;
const PRODUCT_CHARTS: Record<string, SizeChart> = {
  hoodie: { label: "Hoodie Size Chart", unit: "inches", headers: ["Size", "Length", "Chest", "Sleeve"], rows: WINTER_ROWS },
  sweatshirt: { label: "Sweatshirt Size Chart", unit: "inches", headers: ["Size", "Length", "Chest", "Sleeve"], rows: WINTER_ROWS },
};

/**
 * The one chart that applies to a product (product page). Explicit category
 * mapping — substring matching wrongly gave Cuban shirts ("shirts") the T-shirt
 * chart and hoodies/sweatshirts none. Returns null for free-size items
 * (beanies, bags) and categories without a chart (e.g. jackets).
 */
export function getProductSizeChart(product: { category: string; name?: string }): SizeChart | null {
  const cat = (product.category || "").toLowerCase().trim();
  const name = (product.name || "").toLowerCase();
  switch (cat) {
    case "t-shirts":
      return name.includes("polo") ? SIZE_CHARTS["Polo"] : SIZE_CHARTS["T-Shirts"];
    case "shirts":
    case "cuban shirts":
      return SIZE_CHARTS["Cuban Shirts"];
    case "hoodies":
      return PRODUCT_CHARTS.hoodie;
    case "sweatshirts":
      return PRODUCT_CHARTS.sweatshirt;
    default:
      return null;
  }
}

/** Returns the size chart for a given product category, or null if none defined. */
export function getSizeChart(category: string): SizeChart | null {
  // Exact match first
  if (SIZE_CHARTS[category]) return SIZE_CHARTS[category];
  // Partial match (e.g. "Cuban Shirt" → "Cuban Shirts")
  const key = Object.keys(SIZE_CHARTS).find((k) =>
    category.toLowerCase().includes(k.toLowerCase()) ||
    k.toLowerCase().includes(category.toLowerCase())
  );
  return key ? SIZE_CHARTS[key] : null;
}
