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
    crates: realPieces.map((it, i) => ({ ...matchItemToCrates(it), itemIndex: i })),
    covers: realPieces.map((it, i) => ({ ...matchItemToCovers(it), itemIndex: i })),
  };
}

export function crateDisplayRows(result) {
  const lines = result.lines || [];
  if (!lines.length) return [];
  if (lines[0].piecesInBox === undefined) {
    return lines.map((l) => ({
      pieceName: l.pieceName,
      pieceQty: result.qty,
      crateQty: l.quantity,
      piecesInBox: null,
      boxDim: l.boxDim,
      costKey: `${result.sku}|${l.boxDim}`,
      catalogCost: l.cost,
    }));
  }
  const groups = new Map();
  for (const l of lines) {
    const key = `${l.piecesInBox}|${l.boxDim}`;
    const g = groups.get(key) || { pieceName: l.pieceName, piecesInBox: l.piecesInBox, boxDim: l.boxDim, crateQty: 0, cost: l.cost };
    g.crateQty += 1;
    groups.set(key, g);
  }
  return [...groups.values()].map((g) => ({
    pieceName: g.pieceName,
    pieceQty: g.piecesInBox * g.crateQty,
    crateQty: g.crateQty,
    piecesInBox: g.piecesInBox,
    boxDim: g.boxDim,
    costKey: `${result.sku}|${g.boxDim}`,
    catalogCost: g.cost,
  }));
}

export function effectiveCost(costKey, overrides, catalogCost) {
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, costKey)) {
    const v = overrides[costKey];
    return v === "" || v === null || v === undefined ? null : Number(v);
  }
  return catalogCost === null || catalogCost === undefined ? null : Number(catalogCost);
}

export function calcPOTotals(matchResults, mode, overrides, customLines) {
  const ov = overrides || {};
  const custom = customLines || [];
  const resolvedIndexes = new Set(custom.map((c) => c.itemIndex));

  let subtotal = 0;
  let missingCost = 0;
  let unresolvedCount = 0;

  for (const r of matchResults) {
    if (r.status === "REQUIRES_REVIEW") {
      if (!resolvedIndexes.has(r.itemIndex)) unresolvedCount += 1;
      continue;
    }
    if (mode === "crates") {
      for (const row of crateDisplayRows(r)) {
        const cost = effectiveCost(row.costKey, ov, row.catalogCost);
        if (cost === null) missingCost += 1;
        else subtotal += cost * row.crateQty;
      }
    } else {
      const costKey = r.sku;
      const catalogCost = r.lines[0] ? r.lines[0].cost : null;
      const cost = effectiveCost(costKey, ov, catalogCost);
      if (cost === null) missingCost += 1;
      else subtotal += cost * r.qty;
    }
  }

  for (const c of custom) {
    const cost = c.cost === "" || c.cost === null || c.cost === undefined ? null : Number(c.cost);
    const qty = c.qty === "" || c.qty === null || c.qty === undefined ? null : Number(c.qty);
    if (cost === null || qty === null) missingCost += 1;
    else subtotal += cost * qty;
  }

  const iva = subtotal * 0.16;
  const total = subtotal + iva;
  return { subtotal, iva, total, missingCost, unresolvedCount };
}
