// src/utils/parseReceipt.js
// Simple parser: split lines, try to detect name, qty, and unit
export function parseReceiptText(text) {
  const lines = (text || "")
    .split("\n")
    .map(l => l.trim())
    .filter(Boolean);

  const items = lines.map(line => {
    // Match "Name 200g" or "Name 500 ml" or "Maggi 2 pack"
    const match = line.match(/(.+?)\s+(\d+)\s*(g|ml|kg|ltr|pack|pcs|count)?$/i);
    if (match) {
      let [, name, qty, unit] = match;
      qty = Number(qty);
      unit = unit ? normalizeUnit(unit) : "count";
      return { name: name.trim(), qty, unit };
    }
    return { name: line, qty: 1, unit: "count" }; // fallback
  });

  return items;
}

function normalizeUnit(u) {
  u = u.toLowerCase();
  if (u === "g" || u === "gram" || u === "grams") return "g";
  if (u === "kg") return "g";
  if (u === "ml" || u === "milliliter") return "ml";
  if (u === "ltr" || u === "liter" || u === "litre") return "ml";
  if (u === "pack" || u === "pcs" || u === "count") return "count";
  return "count";
}
