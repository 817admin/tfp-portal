// vendorPODocument.js
// Builds the printable/downloadable PO document and the mailto payload for
// sending it. Pure functions — no DOM, no side effects, safe to unit test.

import { crateDisplayRows, effectiveCost } from "./vendorPOMatcher";
import { VENDOR_INFO, DELIVERY_ADDRESS, PAYMENT_TERMS } from "./vendorPOCatalog";

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
// the caller can warn before sending, per Julian's "warn, don't block" call.
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
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Full standalone HTML document matching the sample PO template. Suitable
// for opening in a new tab (preview / print-to-PDF) or downloading directly.
export function buildPOHtml({ mode, poNumber, items, subtotal, iva, total }) {
  const vendor = VENDOR_INFO[mode];
  const rows = items.map((it) => `
    <tr>
      <td>${escapeHtml(it.id)}</td>
      <td>${escapeHtml(it.nombre)}</td>
      <td>${escapeHtml(it.descripcion)}</td>
      <td style="text-align:center">${it.cantidad}</td>
      <td style="text-align:right">${it.costo === null ? "—" : "$" + fmt(it.costo)}</td>
      <td style="text-align:right">${it.total === null ? "—" : "$" + fmt(it.total)}</td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>Orden de Compra ${escapeHtml(poNumber || "")}</title>
<style>
  body { font-family: Arial, Helvetica, sans-serif; color: #0A0A0A; max-width: 720px; margin: 40px auto; padding: 0 20px; }
  h1 { font-size: 20px; letter-spacing: 0.05em; margin-bottom: 0; }
  .sub { color: #666; font-size: 13px; margin-top: 4px; }
  .meta { margin: 20px 0; font-size: 13px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 13px; }
  th { text-align: left; border-bottom: 2px solid #0A0A0A; padding: 8px 6px; font-size: 11px; letter-spacing: 0.05em; text-transform: uppercase; }
  td { border-bottom: 1px solid #DDDAD3; padding: 8px 6px; }
  .totals { margin-top: 16px; width: 280px; margin-left: auto; font-size: 13px; }
  .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
  .totals .total { font-weight: 700; border-top: 1px solid #0A0A0A; margin-top: 4px; padding-top: 8px; }
  .terms { margin-top: 30px; font-size: 12px; color: #666; }
</style>
</head>
<body>
  <h1>8 1 7 Hospitality</h1>
  <div class="sub">LOS ANGELES, CALIFORNIA</div>
  <div class="meta">
    <div><strong>Fecha:</strong> ${todayMx()}</div>
    <div><strong>Orden de Compra:</strong> ${escapeHtml(poNumber || "—")}</div>
    <div><strong>Proveedor:</strong> ${escapeHtml(vendor.name)}</div>
    <div><strong>Entrega:</strong> ${escapeHtml(DELIVERY_ADDRESS)}</div>
  </div>
  <table>
    <thead><tr><th>ID</th><th>Nombre de la Pieza</th><th>Descripción</th><th>Cantidad</th><th>Costo</th><th>Total</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="totals">
    <div><span>Subtotal</span><span>$${fmt(subtotal)} MXN</span></div>
    <div><span>IVA (16%)</span><span>$${fmt(iva)} MXN</span></div>
    <div class="total"><span>Total</span><span>$${fmt(total)} MXN</span></div>
  </div>
  <div class="terms">${escapeHtml(PAYMENT_TERMS)}</div>
</body>
</html>`;
}

// Plain-text version for the mailto body fallback (mailto cannot render
// HTML — most clients show raw tags as text). Column widths are fixed-width
// padded for basic alignment in a monospace font.
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
  const subject = `Orden de Compra ${poNumber || ""} — ${vendor.name}`;
  const greeting = `Hola,\n\nAdjunto el detalle de la orden de compra ${poNumber || ""} para su revisión y confirmación.\n\n`;
  const closing = `\n\nQuedamos atentos a su confirmación.\n\nSaludos,\n817 Hospitality`;
  const body = greeting + plainTextBody + closing;
  return `mailto:${encodeURIComponent(vendor.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
