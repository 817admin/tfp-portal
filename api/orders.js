const ORDERS_KEY = "tfp_orders";

// Reads the stored order list. Throws on any failure so callers never
// write back based on a failed or partial read.
async function readOrders(BASE_URL, auth) {
  const r = await fetch(`${BASE_URL}/get/${ORDERS_KEY}`, { headers: auth });
  if (!r.ok) throw new Error("read failed " + r.status);
  const data = await r.json();
  if (!data.result) return [];
  let val = data.result;
  if (typeof val === "string") val = JSON.parse(val);
  if (typeof val === "string") val = JSON.parse(val);
  if (!Array.isArray(val)) throw new Error("stored value is not a list");
  return val;
}

async function writeOrders(BASE_URL, auth, orders) {
  const payload = JSON.stringify(orders);
  const r = await fetch(`${BASE_URL}/set/${ORDERS_KEY}`, { method: "POST", headers: { ...auth, "Content-Type": "application/json" }, body: JSON.stringify(payload) });
  if (!r.ok) throw new Error("write failed " + r.status);
  return r.json();
}

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
      return res.status(200).json(await readOrders(BASE_URL, auth));
    } catch (e) { return res.status(200).json([]); }
  }

  if (req.method === "POST") {
    try {
      const body = req.body;
      // Never replace the whole list. Every write is a merge into the
      // CURRENT stored list, so a browser holding an old copy can't erase
      // orders it hasn't seen. A plain array (older cached page) is
      // treated as a merge too.
      let op, incoming, deleteId;
      if (Array.isArray(body)) { op = "merge"; incoming = body; }
      else if (body && body.op === "merge" && Array.isArray(body.orders)) { op = "merge"; incoming = body.orders; }
      else if (body && body.op === "delete" && body.id) { op = "delete"; deleteId = body.id; }
      else return res.status(400).json({ error: "Expected {op:'merge',orders:[...]} or {op:'delete',id}" });

      const current = await readOrders(BASE_URL, auth); // throws -> nothing is written
      let next;
      if (op === "delete") {
        next = current.filter(o => o.id !== deleteId);
      } else {
        const byId = new Map(incoming.filter(o => o && o.id).map(o => [o.id, o]));
        const existingIds = new Set(current.map(o => o.id));
        const added = incoming.filter(o => o && o.id && !existingIds.has(o.id));
        next = [...added, ...current.map(o => byId.get(o.id) || o)];
      }
      await writeOrders(BASE_URL, auth, next);
      return res.status(200).json({ saved: true, count: next.length });
    } catch (e) {
      console.error("orders POST failed:", e && e.message);
      return res.status(500).json({ error: "Failed to save" });
    }
  }
  return res.status(405).json({ error: "Method not allowed" });
}
