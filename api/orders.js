const ORDERS_KEY = "tfp_orders";
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  const KV_REST_API_URL = process.env.KV_REST_API_URL;
  const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;
  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) return res.status(200).json([]);
  const headers = { Authorization: `Bearer ${KV_REST_API_TOKEN}`, "Content-Type": "application/json" };
  if (req.method === "GET") {
    try {
      const r = await fetch(`${KV_REST_API_URL}/get/${ORDERS_KEY}`, { headers });
      const data = await r.json();
      if (!data.result) return res.status(200).json([]);
      let orders = data.result;
      if (typeof orders === "string") orders = JSON.parse(orders);
      if (!Array.isArray(orders)) orders = [];
      return res.status(200).json(orders);
    } catch (e) { return res.status(200).json([]); }
  }
  if (req.method === "POST") {
    try {
      const orders = req.body;
      if (!Array.isArray(orders)) return res.status(400).json({ error: "Expected array" });
      await fetch(`${KV_REST_API_URL}/set/${ORDERS_KEY}`, { method: "POST", headers, body: JSON.stringify(JSON.stringify(orders)) });
      return res.status(200).json({ success: true });
    } catch (e) { return res.status(500).json({ error: "Failed to save" }); }
  }
  return res.status(405).json({ error: "Method not allowed" });
}
