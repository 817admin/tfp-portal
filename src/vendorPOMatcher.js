// vendorPOMatcher.js
import { CRATE_CATALOG, SKU_NAMES } from "./vendorPOCatalog";

export function modificationAffectsDimensions(text) {
  if (!text) return false;
  const t = text.toLowerCase();
  if (/\b(same|standard|stock|unchanged|no change|as before|as previous)\s+(size|sized|dimension|dimensions|measurement|measurements)\b/.test(t)) {
    return false;
  }
  const dimWords = /\b(dimension|dimensions|size|sized|sizing|resize|resized|oversized|oversize|undersized|taller|shorter|wider|narrower|deeper|shallower|longer|bigger|larger|smaller|enlarge|enlarged|shrink|shrunk|extend|extended|extension|widen|widened|heighten|custom size|custom dimension|medida|medidas|tama[nñ]o|altura|ancho|largo|profundidad)\b/;
  if (dimWords.test(t)) return true;
  const measure = /\d+(\.\d+)?\s?(cm|mm|in|inch|inches|"|'|ft|foot|feet)\b/;
  if (measure.test(t)) return true;
  return false;
}

function greedyPack(configs, qty) {
  const sorted = [...configs].sort((a, b) => b.pieces - a.pieces);
  let remaining = qty;
  const lines = [];
  while (remaining > 0) {
    const fit = sorted.find((c) => c.pieces <= remaining);
    if (!fit) return { success: false, packed: lines, remaining };
    lines.push(fit);
    remaining -= fit.pieces;
  }
  return { success: true, lines };
}

export function matchItemToCrates(item) {
  const sku = item.id;
  const qty = item.qty;
  const pieceName = item.name || SKU_NAMES[sku] || sku;
  const note = item.modifications && item.modifications.trim() ? item.modifications.trim() : null;
  const dimFlag = modificationAffectsDimensions(note);

  const configs = CRATE_CATALOG[sku];
  if (!configs) {
    return { status: "REQUIRES_REVIEW", reason: "no catalog entry for this SKU", sku, pieceName, qty, note };
  }

  if (configs[0].structural) {
    const lines = configs[0].components.map((component) => ({
      sku,
      pieceName: component.name,
      boxDim: component.boxDim,
      itemDim: component.itemDim,
      notes: component.notes || null,
      quantity: qty,
      cost: component.cost,
    }));
    return { status: "OK", sku, pieceName, qty, lines, note, dimFlag };
  }

  const pack = greedyPack(configs, qty);
  if (!pack.success) {
    return {
      status: "REQUIRES_REVIEW",
      reason: `cannot pack qty=${qty} into available configs [${configs.map((c) => c.pieces).join(", ")}]`,
      sku,
      pieceName,
      qty,
      note,
    };
  }

  const lines = pack.lines.map((config) => ({
    sku,
    pieceName,
    boxDim: config.boxDim,
    itemDim: config.itemDim,
    quantity: 1,
    piecesInBox: config.pieces,
    cost: config.cost,
  }));
  return { status: "OK", sku, pieceName, qty, lines, note, dimFlag };
}

export function matchItemToCovers(item) {
  const sku = item.id;
  const qty = item.qty;
  const pieceName = item.name || SKU_NAMES[sku] || sku;
  const note = item.modifications && item.modifications.trim() ? item.modifications.trim() : null;
  const dimFlag = modificationAffectsDimensions(note);

  if (!CRATE_CATALOG[sku] && !SKU_NAMES[sku]) {
    return { status: "REQUIRES_REVIEW", reason: "no catalog entry for this SKU", sku, pieceName, qty, note };
  }

  return {
    status: "OK",
    sku,
    pieceName,
    qty,
    lines: [{ sku, pieceName, quantity: qty, cost: null }],
    note,
    dimFlag,
  };
}

export function matchOrderItems(items) {
  const realPieces = (items || []).filter((it) => it.id !== "SAM-817");
  return {
    crates: realPieces.map(matchItemToCrates),
    covers: realPieces.map(matchItemToCovers),
  };
}
