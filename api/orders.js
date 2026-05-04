const ORDERS_KEY = "tfp_orders";
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  const URL = process.env.KV_REST_API_URL;
  const TOKEN = process.env.KV_REST_API_TOKEN;
  if (!URL || !TOKEN) return res.status(200).json([]);
  const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
  if (req.method === "GET") {
    try {
      const r = await fetch(`${URL}/get/${ORDERS_KEY}`, { method: "GET", headers });
      const data = await r.json();
      if (!data.result) return res.status(200).json([]);
      let orders = data.result;
      if (typeof orders === "string") { try { orders = JSON.parse(orders); } catch(e) { return res.status(200).json([]); } }
      if (!Array.isArray(orders)) return res.status(200).json([]);
      return res.status(200).json(orders);
    } catch(e) { return res.status(200).json([]); }
  }
  if (req.method === "POST") {
    try {
      const orders = req.body;
      if (!Array.isArray(orders)) return res.status(400).json({ error: "Expected array" });
      const stored = JSON.stringify(orders);
      const r = await fetch(`${URL}/set/${ORDERS_KEY}`, { method: "POST", headers, body: JSON.stringify(stored) });
      const data = await r.json();
      return res.status(200).json({ saved: true, count: orders.length });
    } catch(e) { return res.status(500).json({ error: "Failed to save" }); }
  }
  return res.status(405).json({ error: "Method not allowed" });
}
