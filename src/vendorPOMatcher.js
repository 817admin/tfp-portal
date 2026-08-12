// vendorPOMatcher.js
// Turns an order's line items into crate PO lines (Empaques Fuertes) and
// cover PO lines (Duco). Pure functions — no side effects, safe to reuse
// anywhere. Verified against 9 edge cases in vendor-po-dev/test-matcher.js
// before being wired into the app.
//
// Reads directly from the app's order.items shape:
//   { id: "TB-001", name: "Pointue Side Table", qty: 5, modifications: "" }
// SAM-817 (Material Samples) is filtered out by the caller before matching —
// it isn't a real catalog piece.

import { CRATE_CATALOG, SKU_NAMES } from "./vendorPOCatalog";

function greedyPack(configs, qty) {
  const sorted = [...configs].sort((a, b) => b.pieces - a.pieces);
  let remaining = qty;
  const lines = [];
  while (remaining > 0) {
    const fit = sorted.find((c) => c.pieces <= remaining);
    if (!fit) {
      return { success: false, packed: lines, remaining };
    }
    lines.push(fit);
    remaining -= fit.pieces;
  }
  return { success: true, lines };
}

export function matchItemToCrates(item) {
  const sku = item.id;
  const qty = item.qty;
  const pieceName = item.name || SKU_NAMES[sku] || sku;
  const modifications = item.modifications;

  if (modifications && modifications.trim().length > 0) {
    const configs = CRATE_CATALOG[sku];
    return {
      status: "REQUIRES_REVIEW",
      reason: "custom dimensions",
      sku,
      pieceName,
      qty,
      modifications,
      suggestion: configs ? configs[0] : null,
    };
  }

  const configs = CRATE_CATALOG[sku];
  if (!configs) {
    return {
      status: "REQUIRES_REVIEW",
      reason: "no catalog entry for this SKU",
      sku,
      pieceName,
      qty,
      suggestion: null,
    };
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
    return { status: "OK", sku, pieceName, qty, lines };
  }

  const pack = greedyPack(configs, qty);
  if (!pack.success) {
    return {
      status: "REQUIRES_REVIEW",
      reason: `cannot pack qty=${qty} into available configs [${configs
        .map((c) => c.pieces)
        .join(", ")}]`,
      sku,
      pieceName,
      qty,
      suggestion: configs[configs.length - 1],
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
  return { status: "OK", sku, pieceName, qty, lines };
}

export function matchItemToCovers(item) {
  const sku = item.id;
  const qty = item.qty;
  const pieceName = item.name || SKU_NAMES[sku] || sku;
  const modifications = item.modifications;

  if (modifications && modifications.trim().length > 0) {
    return { status: "REQUIRES_REVIEW", reason: "custom dimensions", sku, pieceName, qty, modifications };
  }

  if (!CRATE_CATALOG[sku] && !SKU_NAMES[sku]) {
    return { status: "REQUIRES_REVIEW", reason: "no catalog entry for this SKU", sku, pieceName, qty };
  }

  return {
    status: "OK",
    sku,
    pieceName,
    qty,
    lines: [{ sku, pieceName, quantity: qty, cost: null }],
  };
}

/**
 * Runs an order's real items (as stored in Upstash) through both matchers.
 * Filters out SAM-817 (Material Samples) — not a real catalog piece.
 */
export function matchOrderItems(items) {
  const realPieces = (items || []).filter((it) => it.id !== "SAM-817");
  return {
    crates: realPieces.map(matchItemToCrates),
    covers: realPieces.map(matchItemToCovers),
  };
}
