// api/send-confirmation.js
// Vercel serverless function — runs on the server, never exposed to the client

const ADMIN_EMAILS = ["julian@817hospitality.com", "eddy@817hospitality.com"];
const CLIENT_EMAILS = ["jp@thefutureperfect.com", "purchasing@thefutureperfect.com", "julianlopezbirlain@gmail.com"];
const FROM_EMAIL = "julian@817hospitality.com";

const fmt = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(n);

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

function buildLineItemsHtml(items) {
  return items
    .map((it) => {
      const subtotal =
        it.id === "SAM-817" ? "TBD" : fmt(it.price * it.qty);
      const unit = it.id === "SAM-817" ? "TBD" : fmt(it.price);
      const qty = it.id === "SAM-817" ? "—" : it.qty;
      const mod = it.modifications
        ? `<div style="font-size:11px;color:#888;margin-top:4px;">Modification: ${it.modifications}</div>`
        : "";
      const sample =
        it.id === "SAM-817" && (it.sampleDimensions || it.sampleDescription)
          ? `<div style="font-size:11px;color:#888;margin-top:4px;">${it.sampleDimensions ? `Dimensions: ${it.sampleDimensions}<br/>` : ""}${it.sampleDescription ? `Description: ${it.sampleDescription}` : ""}</div>`
          : "";
      return `
        <tr>
          <td style="font-family:monospace;font-size:11px;color:#999;padding:10px 12px 10px 0;border-bottom:1px solid #ECEAE5;">${it.id}</td>
          <td style="font-size:13px;padding:10px 12px 10px 0;border-bottom:1px solid #ECEAE5;text-transform:uppercase;font-weight:500;">
            ${it.name}${mod}${sample}
          </td>
          <td style="font-family:monospace;font-size:12px;padding:10px 12px 10px 0;border-bottom:1px solid #ECEAE5;">${qty}</td>
          <td style="font-family:monospace;font-size:12px;padding:10px 12px 10px 0;border-bottom:1px solid #ECEAE5;">${unit}</td>
          <td style="font-family:monospace;font-size:12px;font-weight:700;padding:10px 0;border-bottom:1px solid #ECEAE5;text-align:right;">${subtotal}</td>
        </tr>`;
    })
    .join("");
}

function buildEmailHtml({ order, isAdmin }) {
  const typeLabel =
    order.requestType === "Purchase Order" ? "PURCHASE ORDER" : "QUOTE REQUEST";
  const hasSample = order.items.some((i) => i.id === "SAM-817");

  const intro = isAdmin
    ? `A new <strong>${typeLabel}</strong> has been submitted by The Future Perfect.`
    : `Your <strong>${typeLabel}</strong> has been received by 817 Hospitality. We will be in touch shortly.`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"/></head>
<body style="margin:0;padding:0;background:#F5F4F1;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F5F4F1;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid #E0DDD8;">

        <!-- Header -->
        <tr>
          <td style="background:#0A0A0A;padding:24px 32px;">
            <div style="font-family:monospace;font-size:13px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#ffffff;">
              8 1 7 &nbsp; HOSPITALITY
            </div>
            <div style="font-family:monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;color:#555555;margin-top:4px;">
              × THE FUTURE PERFECT — TRADE PORTAL
            </div>
          </td>
        </tr>

        <!-- Type bar -->
        <tr>
          <td style="background:#F5F4F1;padding:14px 32px;border-bottom:2px solid #0A0A0A;">
            <span style="font-family:monospace;font-size:9px;font-weight:700;letter-spacing:0.2em;text-transform:uppercase;color:#0A0A0A;">
              ${typeLabel}
            </span>
            &nbsp;&nbsp;
            <span style="font-family:monospace;font-size:9px;letter-spacing:0.14em;color:#999;">
              ${order.id}
            </span>
          </td>
        </tr>

        <!-- Intro -->
        <tr>
          <td style="padding:28px 32px 20px;">
            <p style="font-size:14px;color:#333;line-height:1.6;margin:0;">
              ${intro}
            </p>
          </td>
        </tr>

        <!-- Meta -->
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E0DDD8;">
              <tr>
                <td style="padding:12px 16px;border-right:1px solid #E0DDD8;width:50%;">
                  <div style="font-family:monospace;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:#999;margin-bottom:4px;">Reference</div>
                  <div style="font-family:monospace;font-size:13px;font-weight:700;color:#0A0A0A;">${order.id}</div>
                </td>
                <td style="padding:12px 16px;width:50%;">
                  <div style="font-family:monospace;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:#999;margin-bottom:4px;">Date</div>
                  <div style="font-family:monospace;font-size:13px;font-weight:700;color:#0A0A0A;">${fmtDate(order.date)}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Line items -->
        <tr>
          <td style="padding:0 32px 24px;">
            <div style="font-family:monospace;font-size:8px;letter-spacing:0.22em;text-transform:uppercase;color:#999;margin-bottom:12px;font-weight:600;">Line Items</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <thead>
                <tr style="border-bottom:2px solid #0A0A0A;">
                  <th style="font-family:monospace;font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:#AAA;text-align:left;padding:0 12px 8px 0;font-weight:600;">ID</th>
                  <th style="font-family:monospace;font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:#AAA;text-align:left;padding:0 12px 8px 0;font-weight:600;">Piece</th>
                  <th style="font-family:monospace;font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:#AAA;text-align:left;padding:0 12px 8px 0;font-weight:600;">Qty</th>
                  <th style="font-family:monospace;font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:#AAA;text-align:left;padding:0 12px 8px 0;font-weight:600;">Unit</th>
                  <th style="font-family:monospace;font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:#AAA;text-align:right;padding:0 0 8px;font-weight:600;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${buildLineItemsHtml(order.items)}
              </tbody>
            </table>

            <!-- Total -->
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;border-top:2px solid #0A0A0A;padding-top:14px;">
              <tr>
                <td style="font-family:monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#888;">Total</td>
                <td style="font-family:monospace;font-size:18px;font-weight:700;color:#0A0A0A;text-align:right;">
                  ${hasSample ? fmt(order.total) + " + samples TBD" : fmt(order.total)}
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Notes -->
        ${
          order.notes
            ? `<tr>
          <td style="padding:0 32px 24px;">
            <div style="font-family:monospace;font-size:8px;letter-spacing:0.22em;text-transform:uppercase;color:#999;margin-bottom:8px;font-weight:600;">Notes</div>
            <div style="background:#F5F4F1;border:1px solid #E0DDD8;padding:12px 16px;font-size:13px;color:#555;line-height:1.6;">${order.notes}</div>
          </td>
        </tr>`
            : ""
        }

        <!-- Footer -->
        <tr>
          <td style="background:#0A0A0A;padding:20px 32px;">
            <div style="font-family:monospace;font-size:9px;letter-spacing:0.14em;text-transform:uppercase;color:#555;">
              817 Hospitality &nbsp;×&nbsp; The Future Perfect Trade Portal
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { order } = req.body;

  if (!order) {
    return res.status(400).json({ error: "Missing order data" });
  }

  const RESEND_API_KEY = process.env.RESEND_API_KEY;

  if (!RESEND_API_KEY) {
    return res.status(500).json({ error: "Missing RESEND_API_KEY environment variable" });
  }

  const typeLabel =
    order.requestType === "Purchase Order" ? "Purchase Order" : "Quote Request";

  try {
    // Send admin notification
    const adminRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: ADMIN_EMAILS,
        subject: `[817 Portal] New ${typeLabel} — ${order.id}`,
        html: buildEmailHtml({ order, isAdmin: true }),
      }),
    });

    if (!adminRes.ok) {
      const err = await adminRes.json();
      throw new Error(`Admin email failed: ${JSON.stringify(err)}`);
    }

    // Send client confirmation
    const clientRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: CLIENT_EMAILS,
        subject: `Your ${typeLabel} has been received — ${order.id}`,
        html: buildEmailHtml({ order, isAdmin: false }),
      }),
    });

    if (!clientRes.ok) {
      const err = await clientRes.json();
      throw new Error(`Client email failed: ${JSON.stringify(err)}`);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Email error:", error);
    return res.status(500).json({ error: error.message });
  }
}
