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
    label: "T-Shirt Size Guide",
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
    label: "Polo Size Guide",
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
    label: "Cuban Shirt Size Guide",
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
    label: "Sweatshirt & Hoodie Size Guide",
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
