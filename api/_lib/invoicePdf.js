// api/_lib/invoicePdf.js
// Turns the client invoice (the exact same HTML the portal previews) into a
// real PDF on the server, for email attachments. Files under api/_lib are
// helpers, not public endpoints.
import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";
import { invoiceForOrder } from "../../src/clientInvoiceDocument.js";

// Returns a Resend attachment { filename, content (base64) }, or null if the
// PDF could not be made — the email then still goes out, without the file.
export async function invoiceAttachment(order) {
  let browser;
  try {
    const { html, filename } = invoiceForOrder(order);
    chromium.setGraphicsMode = false;
    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0", timeout: 15000 }).catch(() => {});
    const pdf = await page.pdf({ format: "Letter", printBackground: true, preferCSSPageSize: true });
    return { filename, content: Buffer.from(pdf).toString("base64") };
  } catch (e) {
    console.error("Invoice PDF failed:", e && e.message);
    return null;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}
