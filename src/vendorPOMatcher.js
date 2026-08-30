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

// Attaches a stable itemIndex to every result (position within the real,
// non-sample pieces of the order). Custom lines reference this index so a
// resolved review item can be matched back to the piece that spawned it,
// independent of SKU collisions.
export function matchOrderItems(items) {
  const realPieces = (items || []).filter((it) => it.id !== "SAM-817");
  return {
    crates: realPieces.map((it, i) => ({ ...matchItemToCrates(it), itemIndex: i })),
    covers: realPieces.map((it, i) => ({ ...matchItemToCovers(it), itemIndex: i })),
  };
}

// Consolidates a crate result's per-crate lines into display rows with
// PIECE QTY, CRATE QTY, and cost info for the review/cost panel.
// costKey uniquely identifies a priceable config: "SKU|boxDim".
export function crateDisplayRows(result) {
  const lines = result.lines || [];
  if (!lines.length) return [];
  if (lines[0].piecesInBox === undefined) {
    // Structural: one row per named component.
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

// Resolves the effective unit cost for a crate row: order-specific override
// wins, else the catalog default, else null (needs input).
export function effectiveCost(costKey, overrides, catalogCost) {
  if (overrides && Object.prototype.hasOwnProperty.call(overrides, costKey)) {
    const v = overrides[costKey];
    return v === "" || v === null || v === undefined ? null : Number(v);
  }
  return catalogCost === null || catalogCost === undefined ? null : Number(catalogCost);
}

// Computes Subtotal / IVA(16%) / Total for one PO (crates or covers).
// matchResults: the .crates or .covers array from matchOrderItems.
// mode: "crates" | "covers"
// overrides: { [costKey]: number|"" } per-order cost overrides
// customLines: [{ itemIndex, pieceName, boxDim, qty, cost }] resolving REQUIRES_REVIEW items
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

// PO numbering + status tracking (pure helpers, no side effects).

export const STATUS_ORDER = ["Pending", "Sent", "Confirmed", "Delivered"];

export const STATUS_COLORS = {
  Pending: { bg: "#FFF8E6", fg: "#C8A000" },
  Sent: { bg: "#E8F0FE", fg: "#2563EB" },
  Confirmed: { bg: "#E8F5E9", fg: "#2E7D32" },
  Delivered: { bg: "#F0F0F0", fg: "#666666" },
};

export function nextStatus(current) {
  const i = STATUS_ORDER.indexOf(current || "Pending");
  if (i < 0 || i >= STATUS_ORDER.length - 1) return null;
  return STATUS_ORDER[i + 1];
}

// Live PO number preview from the order's 817 PO ID. Returns null until the
// PO ID is set. This is NOT the frozen number — see poState below.
export function poNumberPreview(orderPoId, suffix) {
  if (!orderPoId) return null;
  return `${orderPoId}-${suffix}`;
}

// Normalizes a possibly-missing vendorPOs sub-state (crates or covers) to a
// safe default shape.
export function defaultPOState() {
  return {
    overrides: {},
    customLines: [],
    status: "Pending",
    poNumber: null,
    locked: false,
    sentAt: null,
    confirmedAt: null,
    deliveredAt: null,
  };
}

// Computes the patch to apply when advancing to the next status.
// Freezes the PO number the first time status leaves "Pending".
// Always re-locks on advance (locking is a separate, reversible toggle).
export function advanceStatusPatch(poState, orderPoId, suffix) {
  const current = poState.status || "Pending";
  const next = nextStatus(current);
  if (!next) return null;
  const now = new Date().toISOString();
  const patch = { status: next, locked: true };
  if (current === "Pending") {
    patch.poNumber = poState.poNumber || poNumberPreview(orderPoId, suffix);
  }
  if (next === "Sent") patch.sentAt = now;
  if (next === "Confirmed") patch.confirmedAt = now;
  if (next === "Delivered") patch.deliveredAt = now;
  return patch;
}
