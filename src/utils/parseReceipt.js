// src/utils/parseReceipt.js
// Very basic parser to split receipt lines into { name, qty, unit }
export function parseReceiptText(text) {
  const lines = (text || '').split(/\n+/).map(l => l.trim()).filter(Boolean);
  const items = [];

  for (const line of lines) {
    // Try to capture "200g", "500 ml", "2 pack" etc.
    const match = line.match(/(.+?)\s+(\d+)\s*(g|kg|ml|l|pack|pcs|piece|count)?$/i);
    if (match) {
      let [, name, qty, unit] = match;
      name = name.trim();
      qty = parseInt(qty, 10);
      unit = (unit || 'g').toLowerCase();

      // Normalize units
      if (unit === 'kg') { qty = qty * 1000; unit = 'g'; }
      if (unit === 'l') { qty = qty * 1000; unit = 'ml'; }
      if (['pcs', 'piece'].includes(unit)) { unit = 'count'; }
      if (unit === 'pack') { unit = 'count'; }

      items.push({ name, qty, unit });
    } else {
      // fallback: no qty/unit found
      items.push({ name: line, qty: 1, unit: 'count' });
    }
  }

  return items;
}
