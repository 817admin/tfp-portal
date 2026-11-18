// api/send-invoice.js
// Sent when 817 moves an order to In Production: the final Invoice (with the
// 817 project ID and TFP PO #) as a PDF. 817 always gets it; TFP only when
// 817 chooses "Email the invoice to TFP".
import { invoiceAttachment } from "./_lib/invoicePdf.js";
import { invoiceForOrder } from "../src/clientInvoiceDocument.js";

const ADMIN_EMAILS = ["julian@817hospitality.com", "eddy@817hospitality.com"];
const CLIENT_EMAILS = ["jp@thefutureperfect.com", "purchasing@thefutureperfect.com", "julianlopezbirlain@gmail.com"];
const FROM_EMAIL = "julian@817hospitality.com";

const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function buildHtml(order, ids, hasPdf) {
  const idRow = (label, val) => val ? `<td style="padding-right:28px;"><div style="font-family:monospace;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:#888;margin-bottom:4px;">${label}</div><div style="font-family:monospace;font-size:13px;font-weight:600;color:#0A0A0A;">${esc(val)}</div></td>` : "";
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#F5F4F1;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:40px 0;"><tr><td align="center"><table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E0DDD8;"><tr><td style="background:#0A0A0A;padding:24px 32px;"><div style="font-family:monospace;font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#fff;">8 1 7 &nbsp; HOSPITALITY</div><div style="font-family:monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#555;margin-top:4px;">× THE FUTURE PERFECT — TRADE PORTAL</div></td></tr><tr><td style="background:#F5F4F1;padding:14px 32px;border-bottom:2px solid #0A0A0A;"><span style="font-family:monospace;font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;">INVOICE &nbsp;&nbsp;</span><span style="font-family:monospace;font-size:9px;letter-spacing:0.14em;color:#999;">${esc(order.id)}</span></td></tr><tr><td style="padding:28px 32px 20px;"><p style="font-size:14px;color:#333;line-height:1.6;margin:0;">Your order <strong>${esc(order.id)}</strong> has been approved and is now in production. ${hasPdf ? "The invoice is attached as a PDF." : "The invoice is available in the trade portal under Order History."}</p></td></tr><tr><td style="padding:0 32px 28px;"><table cellpadding="0" cellspacing="0"><tr>${idRow("817 Project ID", ids.p817)}${idRow("TFP PO #", ids.tfp)}</tr></table></td></tr><tr><td style="background:#0A0A0A;padding:20px 32px;"><div style="font-family:monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#555;">817 Hospitality × The Future Perfect Trade Portal</div></td></tr></table></td></tr></table></body></html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  const { order, notifyClient } = req.body || {};
  if (!order) return res.status(400).json({ error: "Missing order" });
  const KEY = process.env.RESEND_API_KEY;
  if (!KEY) return res.status(500).json({ error: "Missing RESEND_API_KEY" });
  const ids = invoiceForOrder(order).ids || { p817: "", tfp: "" };
  const att = await invoiceAttachment(order);
  const ref = `<${order.id}@817hospitality.com>`;
  const idText = [ids.p817, ids.tfp && `TFP ${ids.tfp}`].filter(Boolean).join(" // ");
  const subject = `Invoice — ${order.id}${idText ? ` // ${idText}` : ""}`;
  const toClient = notifyClient === true;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: toClient ? CLIENT_EMAILS : ADMIN_EMAILS,
        ...(toClient ? { cc: ADMIN_EMAILS } : {}),
        subject: toClient ? subject : `[817 copy — TFP not emailed] ${subject}`,
        html: buildHtml(order, ids, !!att),
        headers: { "In-Reply-To": ref, References: ref },
        ...(att ? { attachments: [att] } : {}),
      }),
    });
    if (!r.ok) throw new Error(JSON.stringify(await r.json()));
    return res.status(200).json({ success: true, pdf: !!att, toClient });
  } catch (e) {
    console.error("Invoice email error:", e);
    return res.status(500).json({ error: e.message });
  }
}
