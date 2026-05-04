// api/orders.js
// Handles reading and writing all orders using Upstash Redis

const ORDERS_KEY = "tfp_orders";

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();

  const KV_REST_API_URL = process.env.KV_REST_API_URL;
  const KV_REST_API_TOKEN = process.env.KV_REST_API_TOKEN;

  if (!KV_REST_API_URL || !KV_REST_API_TOKEN) {
    return res.status(500).json({ error: "Missing database credentials" });
  }

  const headers = {
    Authorization: `Bearer ${KV_REST_API_TOKEN}`,
    "Content-Type": "application/json",
  };

  if (req.method === "GET") {
    try {
      const r = await fetch(`${KV_REST_API_URL}/get/${ORDERS_KEY}`, { headers });
      const data = await r.json();
      const orders = data.result ? JSON.parse(data.result) : [];
      return res.status(200).json(orders);
    } catch (error) {
      console.error("Failed to load orders:", error);
      return res.status(500).json({ error: "Failed to load orders" });
    }
  }

  if (req.method === "POST") {
    try {
      const orders = req.body;
      if (!Array.isArray(orders)) {
        return res.status(400).json({ error: "Orders must be an array" });
      }
      await fetch(`${KV_REST_API_URL}/set/${ORDERS_KEY}`, {
        method: "POST",
        headers,
        body: JSON.stringify(JSON.stringify(orders)),
      });
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error("Failed to save orders:", error);
      return res.status(500).json({ error: "Failed to save orders" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
