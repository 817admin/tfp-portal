const ORDERS_KEY = "tfp_orders";
export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  const BASE_URL = process.env.KV_REST_API_URL;
  const TOKEN = process.env.KV_REST_API_TOKEN;
  if (!BASE_URL || !TOKEN) return res.status(200).json([]);
  const auth = { Authorization: `Bearer ${TOKEN}` };
  if (req.method === "GET") {
    try {
      const r = await fetch(`${BASE_URL}/get/${ORDERS_KEY}`, { headers: auth });
      const data = await r.json();
      console.log("Raw GET:", JSON.stringify(data));
      if (!data.result) return res.status(200).json([]);
      let val = data.result;
      if (typeof val === "string") val = JSON.parse(val);
      if (typeof val === "string") val = JSON.parse(val);
      if (!Array.isArray(val)) val = [];
      return res.status(200).json(val);
    } catch(e) { return res.status(200).json([]); }
  }
  if (req.method === "POST") {
    try {
      const orders = req.body;
      if (!Array.isArray(orders)) return res.status(400).json({ error: "Expected array" });
      const payload = JSON.stringify(orders);
      const r = await fetch(`${BASE_URL}/set/${ORDERS_KEY}`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await r.json();
      console.log("SET result:", JSON.stringify(result));
      return res.status(200).json({ saved: true, count: orders.length });
    } catch(e) { return res.status(500).json({ error: "Failed to save" }); }
  }
  return res.status(405).json({ error: "Method not allowed" });
}
