// vendorPODocument.js
// Builds the branded PO document (letterhead layout, 817 palette, embedded
// logo) and the mailto payload. Pure functions — no DOM, no side effects.

import { crateDisplayRows, effectiveCost } from "./vendorPOMatcher";
import { VENDOR_INFO, DELIVERY_ADDRESS, PAYMENT_TERMS } from "./vendorPOCatalog";

// 817 brand palette
const BLACK = "#000000";
const OFFWHITE = "#F3F2EC";
const BONE = "#E9DFD5";
const YELLOW = "#DEFF99";

// Logo embedded as base64 so the document survives download/email/offline use.
// Grayscale+alpha PNG (transparent background) — sits cleanly on any brand color.
const LOGO_B64 = "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";

function fmt(n) {
  return (Math.round((n || 0) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function todayMx() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// Builds the flat list of resolved line items ready to print: only items
// with a status of OK, or REQUIRES_REVIEW items that have a matching custom
// line, are included. Genuinely unresolved items are reported separately so
// the caller can warn before sending.
export function buildPOLineItems(matchResults, mode, overrides, customLines) {
  const custom = customLines || [];
  const customByIndex = new Map(custom.map((c) => [c.itemIndex, c]));
  const items = [];
  const unresolved = [];

  for (const r of matchResults) {
    if (r.status === "REQUIRES_REVIEW") {
      const c = customByIndex.get(r.itemIndex);
      if (!c) {
        unresolved.push({ sku: r.sku, pieceName: r.pieceName, qty: r.qty, reason: r.reason });
        continue;
      }
      const qty = Number(c.qty) || 0;
      const cost = c.cost === "" || c.cost === null || c.cost === undefined ? null : Number(c.cost);
      items.push({
        id: r.sku,
        nombre: c.pieceName,
        descripcion: mode === "crates" ? c.boxDim : "",
        cantidad: qty,
        costo: cost,
        total: cost === null ? null : cost * qty,
      });
      continue;
    }
    if (mode === "crates") {
      for (const row of crateDisplayRows(r)) {
        const cost = effectiveCost(row.costKey, overrides, row.catalogCost);
        items.push({
          id: r.sku,
          nombre: row.pieceName,
          descripcion: row.boxDim || "",
          cantidad: row.crateQty,
          costo: cost,
          total: cost === null ? null : cost * row.crateQty,
        });
      }
    } else {
      const costKey = r.sku;
      const catalogCost = r.lines[0] ? r.lines[0].cost : null;
      const cost = effectiveCost(costKey, overrides, catalogCost);
      items.push({
        id: r.sku,
        nombre: r.pieceName,
        descripcion: "",
        cantidad: r.qty,
        costo: cost,
        total: cost === null ? null : cost * r.qty,
      });
    }
  }

  return { items, unresolved };
}

function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"\']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "\'": "&#39;" }[c]));
}

// Branded standalone HTML document following the 817 letterhead layout.
// Suitable for opening in a new tab (preview / print-to-PDF) or downloading.
export function buildPOHtml({ mode, poNumber, items, subtotal, iva, total }) {
  const vendor = VENDOR_INFO[mode];
  const rows = items.map((it) => `
      <tr>
        <td class="mono">${escapeHtml(it.id)}</td>
        <td class="name">${escapeHtml(it.nombre)}</td>
        <td class="mono dim">${escapeHtml(it.descripcion)}</td>
        <td class="num">${it.cantidad}</td>
        <td class="num">${it.costo === null ? "\u2014" : "$" + fmt(it.costo)}</td>
        <td class="num strong">${it.total === null ? "\u2014" : "$" + fmt(it.total)}</td>
      </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Orden de Compra ${escapeHtml(poNumber || "")}</title>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
    color: ${BLACK}; background: ${OFFWHITE};
    margin: 0; padding: 48px 40px;
  }
  .sheet { max-width: 760px; margin: 0 auto; background: ${OFFWHITE}; }
  .mono, .lbl, .meta, th, .terms, .dim, .num {
    font-family: "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
  }
  /* Letterhead */
  .letterhead { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; }
  .lh-col { font-family: "IBM Plex Mono", monospace; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; line-height: 1.9; }
  .dot { font-size: 11px; line-height: 1; margin-bottom: 8px; }
  .logo { display: block; width: 320px; max-width: 60%; margin: 0 auto 44px; }
  /* Meta block */
  .meta-grid { display: flex; gap: 48px; flex-wrap: wrap; margin-bottom: 32px; }
  .lbl { font-size: 8px; letter-spacing: 0.22em; text-transform: uppercase; color: #8A8A85; margin-bottom: 5px; }
  .val { font-size: 13px; letter-spacing: 0.02em; }
  .po-badge { background: ${YELLOW}; padding: 3px 9px; display: inline-block; font-family: "IBM Plex Mono", monospace; font-weight: 600; }
  .addr { max-width: 340px; line-height: 1.55; }
  /* Table */
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th {
    text-align: left; font-size: 8px; letter-spacing: 0.18em; text-transform: uppercase;
    font-weight: 600; color: ${BLACK}; padding: 10px 8px;
    background: ${BONE}; border-bottom: 1px solid ${BLACK};
  }
  td { padding: 11px 8px; font-size: 12px; border-bottom: 1px solid #DDDAD3; vertical-align: top; }
  td.name { text-transform: uppercase; letter-spacing: 0.04em; font-size: 11px; }
  td.mono { font-size: 10px; letter-spacing: 0.04em; }
  td.dim { color: #8A8A85; }
  td.num { text-align: right; font-size: 11px; white-space: nowrap; }
  td.strong { font-weight: 600; }
  th:nth-child(4), th:nth-child(5), th:nth-child(6) { text-align: right; }
  /* Totals */
  .totals { width: 300px; margin: 22px 0 0 auto; font-size: 12px; }
  .totals .row { display: flex; justify-content: space-between; padding: 6px 8px; }
  .totals .row span:first-child { font-family: "IBM Plex Mono", monospace; font-size: 9px; letter-spacing: 0.16em; text-transform: uppercase; color: #8A8A85; }
  .totals .grand { background: ${BLACK}; color: ${OFFWHITE}; font-weight: 600; margin-top: 6px; padding: 10px 8px; }
  .totals .grand span:first-child { color: ${OFFWHITE}; }
  /* Terms */
  .terms { margin-top: 40px; padding-top: 16px; border-top: 1px solid ${BLACK}; font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase; color: #6A6A65; }
  @media print {
    body { background: #fff; padding: 0; }
    .sheet { background: #fff; }
    @page { margin: 16mm; }
  }
</style>
</head>
<body>
  <div class="sheet">
    <div class="letterhead">
      <div class="lh-col">
        <div class="dot">&bull;</div>
        Los Angeles, California
      </div>
      <div class="lh-col">
        <div class="dot">&bull;</div>
        817hospitality.com<br>
        @817hospitality on all socials<br>
        info@817hospitality.com
      </div>
      <div class="lh-col"><div class="dot">&bull;</div></div>
    </div>

    <img class="logo" src="data:image/png;base64,${LOGO_B64}" alt="817 Hospitality">

    <div class="meta-grid">
      <div>
        <div class="lbl">Orden de Compra</div>
        <div class="val"><span class="po-badge">${escapeHtml(poNumber || "\u2014")}</span></div>
      </div>
      <div>
        <div class="lbl">Fecha</div>
        <div class="val mono">${todayMx()}</div>
      </div>
      <div>
        <div class="lbl">Proveedor</div>
        <div class="val">${escapeHtml(vendor.name)}</div>
      </div>
    </div>

    <div class="meta-grid">
      <div>
        <div class="lbl">Direcci\u00f3n de Entrega</div>
        <div class="val addr">${escapeHtml(DELIVERY_ADDRESS)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>ID</th><th>Nombre de la Pieza</th><th>Descripci\u00f3n</th>
          <th>Cant</th><th>Costo</th><th>Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="totals">
      <div class="row"><span>Subtotal</span><span>$${fmt(subtotal)} MXN</span></div>
      <div class="row"><span>IVA (16%)</span><span>$${fmt(iva)} MXN</span></div>
      <div class="row grand"><span>Total</span><span>$${fmt(total)} MXN</span></div>
    </div>

    <div class="terms">${escapeHtml(PAYMENT_TERMS)}</div>
  </div>
</body>
</html>`;
}

// Plain-text version for the mailto body fallback (mailto cannot render
// HTML — most clients show raw tags as text).
export function buildPOPlainText({ mode, poNumber, items, subtotal, iva, total }) {
  const pad = (s, n) => String(s).slice(0, n).padEnd(n, " ");
  const lines = items.map((it) =>
    `${pad(it.id, 10)}${pad(it.nombre, 28)}${pad(it.cantidad, 6)}${pad(it.costo === null ? "-" : "$" + fmt(it.costo), 12)}${it.total === null ? "-" : "$" + fmt(it.total)}`
  );
  return [
    `ORDEN DE COMPRA ${poNumber || ""}`,
    `Fecha: ${todayMx()}`,
    `Entrega: ${DELIVERY_ADDRESS}`,
    "",
    `${pad("ID", 10)}${pad("PIEZA", 28)}${pad("CANT", 6)}${pad("COSTO", 12)}TOTAL`,
    "-".repeat(70),
    ...lines,
    "-".repeat(70),
    `Subtotal: $${fmt(subtotal)} MXN`,
    `IVA (16%): $${fmt(iva)} MXN`,
    `Total: $${fmt(total)} MXN`,
    "",
    PAYMENT_TERMS,
  ].join("\n");
}

export function buildMailtoUrl({ mode, poNumber, plainTextBody }) {
  const vendor = VENDOR_INFO[mode];
  const subject = `817 Hospitality \u2014 Orden de Compra ${poNumber || ""}`;
  const greeting = `Hola,\n\nAdjunto el detalle de la orden de compra ${poNumber || ""} para su revisi\u00f3n y confirmaci\u00f3n.\n\n`;
  const closing = `\n\nQuedamos atentos a su confirmaci\u00f3n.\n\nSaludos,\nJulian`;
  const body = greeting + plainTextBody + closing;
  return `mailto:${encodeURIComponent(vendor.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
