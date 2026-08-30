import { useState, useEffect, useCallback } from "react";
import { matchOrderItems, crateDisplayRows, calcPOTotals, defaultPOState, advanceStatusPatch, nextStatus, poNumberPreview, STATUS_COLORS } from "./vendorPOMatcher";

const CATALOG = [
  { id: "TB-001", name: "Pointue Side Table", category: "Tables", price: 890, description: 'Materials: lacquer / stainless steel | Finish: high gloss lacquer solid color / polished stainless steel | Dimensions: 13" W × 13" D × 22" H' },
  { id: "TB-002", name: "L'eclat Coffee Table", category: "Tables", price: 3268, description: 'Materials: MDF / smoked glass / stainless steel | Finish: high gloss lacquer solid color / polished stainless steel | Dimensions: 3\'9.75" W × 3\'9.75" D × 15.25" H' },
  { id: "TB-003", name: "Courbe Side Table", category: "Tables", price: 1658, description: 'Materials: lacquer / solid walnut / stainless steel | Finish: high gloss lacquer / polished stainless steel | Dimensions: 18" diam. × 21" H' },
  { id: "TB-004", name: "Noailles Coffee Table", category: "Tables", price: 1826, description: 'Materials: parchment / lacquer / stainless steel | Finish: high gloss lacquer parchment / polished stainless steel | Dimensions: 44" W × 26" D × 15.5" H | Notes: vegan parchment' },
  { id: "TB-005", name: "Noailles Side Table", category: "Tables", price: 1283, description: 'Materials: parchment / lacquer / stainless steel | Finish: high gloss lacquer parchment / polished stainless steel | Dimensions: 16" W × 16" D × 22.5" H | Notes: vegan parchment' },
  { id: "TB-006", name: "Mettre Dining Table", category: "Tables", price: 4488, description: 'Materials: in-set smoked glass top / solid walnut / walnut veneer / stainless steel | Finish: polished stainless steel / high gloss walnut lacquer | Dimensions: 5\'6" × 3\'1.5" × 2\'5"' },
  { id: "ST-001", name: "Epure Sofa", category: "Seating", price: 6954, description: 'Materials: walnut veneer / HD foam / down filling | Finish: high gloss lacquer walnut | Dimensions: 10\'W × 3\'8"D × 2\'3"H | Fabric: COM 13.5 yds | 5 down cushions included' },
  { id: "ST-002", name: "Biseau Armchair", category: "Seating", price: 2121, description: 'Materials: walnut veneer / HD foam / stainless steel | Finish: high gloss lacquer walnut / solid color lacquer / polished SS | Dimensions: 22"W × 22"D × 23"H; 16.5"SH | Fabric: COM 1.75 yds' },
  { id: "ST-003", name: "Gaillon Dining Chair", category: "Seating", price: 1101, description: 'Materials: parchment / lacquer / stainless steel | Finish: high gloss lacquer parchment / polished stainless steel | Notes: vegan parchment' },
  { id: "ST-004", name: "Incline Counter Stool", category: "Seating", price: 1121, description: 'Materials: walnut / lacquer / stainless steel | Dimensions: 1\'8.25" × 1\'6" × 2\'8" | Fabric: COM' },
  { id: "ST-005", name: "Monde Sofa", category: "Seating", price: 4516, description: 'Materials: walnut / HD foam | Dimensions: 8\'5"L × 3\'2"W × 2\'7" | Fabric: COM' },
  { id: "CG-001", name: "Noailles Screen", category: "Case Goods", price: 2859, description: 'Materials: parchment / lacquer / stainless steel | Finish: high gloss lacquer parchment / polished SS | Dimensions: 3\'4"W × 4\'2"H | Notes: vegan parchment. One neutral, one red.' },
  { id: "CG-002", name: "Epure Ottoman", category: "Case Goods", price: 1424, description: 'Materials: plywood / walnut veneer / HD foam | Finish: high gloss lacquer walnut | Dimensions: 2\'W × 2\'L × 1\'4" | Fabric: COM' },
  { id: "CG-003", name: "Semblant Pedestal", category: "Case Goods", price: 753, description: 'Materials: walnut veneer / stainless steel | Finish: high gloss lacquer walnut / polished SS | Dimensions: 13" × 13" × 4\'2"H' },
];

const ADMIN_PASSWORD = "eddysilverlake817";
const CLIENT_PASSWORD = "TFPAthena817";
const STATUSES = ["Requested", "Quote Sent", "In Production", "Completed", "Cancelled"];
const STATUS_STYLE = {
  "Requested":     { color: "#7A5500", bg: "#FFF8E6", border: "#C8A000" },
  "Quote Sent":    { color: "#003580", bg: "#E6EEFF", border: "#0055CC" },
  "In Production": { color: "#004D1A", bg: "#E6F5EC", border: "#009933" },
  "Completed":     { color: "#333",    bg: "#F0F0EE", border: "#999"    },
  "Cancelled":     { color: "#800000", bg: "#FFE6E6", border: "#CC0000" },
};

const fmt = n => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(n);
const fmtDate = d => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const effectiveType = order => ["In Production", "Completed"].includes(order.status) ? "Purchase Order" : order.requestType;

function genId(type) {
  const d = new Date();
  const p = type === "Purchase Order" ? "PO" : "QR";
  return `${p}-${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}${String(d.getDate()).padStart(2,"0")}-${String(Math.floor(Math.random()*999)+1).padStart(3,"0")}`;
}

async function loadOrders() {
  try {
    const r = await fetch("/api/orders");
    if (!r.ok) return [];
    return await r.json();
  } catch { return []; }
}
async function saveOrders(orders) {
  try {
    await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(orders),
    });
  } catch {}
}

const G = `
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&display=swap');
*{box-sizing:border-box;margin:0;padding:0;}
body,#root{background:#F5F4F1;min-height:100vh;}
.app{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;color:#0A0A0A;background:#F5F4F1;min-height:100vh;}
.hdr{background:#0A0A0A;height:60px;display:flex;align-items:center;justify-content:space-between;padding:0 36px;position:sticky;top:0;z-index:100;}
.wm{font-family:'IBM Plex Mono',monospace;font-size:12px;font-weight:600;letter-spacing:0.22em;text-transform:uppercase;color:#fff;}
.wm-sub{font-size:9px;letter-spacing:0.2em;color:#555;margin-top:3px;text-transform:uppercase;font-family:'IBM Plex Mono',monospace;}
.nav{display:flex;gap:2px;}
.nb{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.18em;text-transform:uppercase;background:transparent;color:#666;border:1px solid transparent;padding:8px 20px;cursor:pointer;font-weight:600;transition:all 0.12s;}
.nb:hover{color:#fff;border-color:#333;}
.nb.on{background:#fff;color:#0A0A0A;border-color:#fff;}
.nbadge{display:inline-flex;align-items:center;justify-content:center;background:#0A0A0A;color:#fff;font-size:8px;border-radius:50%;width:15px;height:15px;margin-left:7px;font-weight:700;}
.nb.on .nbadge{background:#0A0A0A;}
.tkr{background:#111;border-bottom:1px solid #1E1E1E;padding:10px 36px;display:flex;gap:0;overflow:hidden;}
.tkr-item{font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.16em;text-transform:uppercase;color:#555;white-space:nowrap;padding-right:48px;}
.tkr-item b{color:#888;font-weight:500;}
.layout{display:grid;grid-template-columns:1fr 390px;min-height:calc(100vh - 60px);}
.cat-panel{background:#fff;border-right:1px solid #E8E6E0;}
.cat-hdr{padding:24px 32px 20px;border-bottom:2px solid #0A0A0A;display:flex;gap:10px;align-items:center;flex-wrap:wrap;}
.si{flex:1;min-width:160px;font-family:'IBM Plex Mono',monospace;font-size:10px;letter-spacing:0.08em;border:1px solid #C8C5BE;background:#F5F4F1;padding:9px 14px;outline:none;color:#0A0A0A;text-transform:uppercase;}
.si::placeholder{color:#BBB;}
.si:focus{border-color:#0A0A0A;background:#fff;}
.cb{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;background:transparent;color:#888;border:1px solid #C8C5BE;padding:8px 14px;cursor:pointer;white-space:nowrap;font-weight:600;transition:all 0.1s;}
.cb:hover{border-color:#0A0A0A;color:#0A0A0A;}
.cb.on{background:#0A0A0A;color:#fff;border-color:#0A0A0A;}
.cat-list{padding:0 32px;}
.crow{display:grid;grid-template-columns:72px 1fr auto;gap:18px;align-items:center;padding:18px 0;border-bottom:1px solid #ECEAE5;}
.crow:last-child{border-bottom:none;}
.pid{font-family:'IBM Plex Mono',monospace;font-size:9px;color:#BBB;letter-spacing:0.1em;}
.pname{font-size:12px;font-weight:500;color:#0A0A0A;letter-spacing:0.04em;text-transform:uppercase;margin-bottom:3px;}
.pdesc{font-size:11px;color:#999;line-height:1.5;}
.pprice{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:#0A0A0A;text-align:right;margin-bottom:8px;letter-spacing:0.02em;}
.abtn{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;background:#0A0A0A;color:#fff;border:none;padding:8px 14px;cursor:pointer;display:block;width:100%;font-weight:600;transition:opacity 0.1s;}
.abtn:hover{opacity:0.8;}
.abtn.inc{background:#fff;color:#0A0A0A;border:1px solid #0A0A0A;}
.ord-panel{background:#F5F4F1;display:flex;flex-direction:column;position:sticky;top:60px;max-height:calc(100vh - 60px);}
.ord-hdr{padding:22px 24px 18px;border-bottom:2px solid #0A0A0A;}
.ord-lbl{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.22em;text-transform:uppercase;color:#888;margin-bottom:5px;font-weight:600;}
.ord-ttl{font-size:18px;font-weight:300;color:#0A0A0A;letter-spacing:-0.01em;}
.cscroll{flex:1;overflow-y:auto;padding:16px 20px;}
.ci{border:1px solid #DDDAD3;background:#fff;margin-bottom:10px;padding:14px;}
.ci-hdr{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:11px;}
.ci-id{font-family:'IBM Plex Mono',monospace;font-size:8px;color:#BBB;letter-spacing:0.14em;text-transform:uppercase;margin-bottom:2px;}
.ci-name{font-size:11px;font-weight:500;color:#0A0A0A;text-transform:uppercase;letter-spacing:0.05em;}
.rmbtn{background:none;border:none;color:#CCC;cursor:pointer;font-size:20px;line-height:1;transition:color 0.1s;}
.rmbtn:hover{color:#0A0A0A;}
.fl{font-family:'IBM Plex Mono',monospace;font-size:8px;color:#999;letter-spacing:0.16em;text-transform:uppercase;display:block;margin-bottom:5px;font-weight:600;}
.qi{width:100%;font-family:'IBM Plex Mono',monospace;font-size:13px;border:1px solid #DDDAD3;background:#F5F4F1;padding:7px 10px;outline:none;color:#0A0A0A;font-weight:500;}
.qi:focus{border-color:#0A0A0A;background:#fff;}
.mta{width:100%;font-family:'IBM Plex Mono',monospace;font-size:9px;border:1px solid #DDDAD3;background:#F5F4F1;padding:8px 10px;outline:none;color:#0A0A0A;resize:vertical;letter-spacing:0.02em;line-height:1.7;}
.mta::placeholder{color:#CCC;}
.mta:focus{border-color:#0A0A0A;background:#fff;}
.ofoot{border-top:2px solid #0A0A0A;padding:20px 20px;background:#fff;}
.trow{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:16px;}
.tlbl{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.22em;text-transform:uppercase;color:#888;font-weight:600;}
.tamt{font-family:'IBM Plex Mono',monospace;font-size:24px;font-weight:600;color:#0A0A0A;letter-spacing:-0.02em;}
.ttog{display:grid;grid-template-columns:1fr 1fr;border:2px solid #0A0A0A;margin-bottom:14px;}
.tbtn{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.16em;text-transform:uppercase;background:transparent;color:#888;border:none;border-right:1px solid #0A0A0A;padding:11px 0;cursor:pointer;font-weight:600;transition:all 0.1s;}
.tbtn:last-child{border-right:none;}
.tbtn.on{background:#0A0A0A;color:#fff;}
.nta{width:100%;font-family:'IBM Plex Mono',monospace;font-size:9px;border:1px solid #DDDAD3;background:#F5F4F1;padding:8px 10px;outline:none;color:#0A0A0A;resize:none;letter-spacing:0.02em;line-height:1.7;margin-bottom:14px;}
.nta::placeholder{color:#CCC;}
.nta:focus{border-color:#0A0A0A;background:#fff;}
.sbtn{width:100%;background:#0A0A0A;color:#fff;border:none;padding:14px 0;font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.24em;text-transform:uppercase;font-weight:700;cursor:pointer;transition:opacity 0.1s;}
.sbtn:hover{opacity:0.85;}
.ecart{text-align:center;padding:60px 20px;}
.ecart-ico{font-family:'IBM Plex Mono',monospace;font-size:24px;color:#E0DDD8;margin-bottom:14px;letter-spacing:-0.05em;}
.ecart-txt{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.22em;text-transform:uppercase;color:#CCC;}
.success{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - 60px);background:#fff;text-align:center;padding:60px 40px;}
.smark{width:60px;height:60px;border:2px solid #0A0A0A;display:flex;align-items:center;justify-content:center;font-size:22px;margin:0 auto 28px;}
.stitle{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.26em;text-transform:uppercase;color:#888;margin-bottom:10px;font-weight:600;}
.sref{font-family:'IBM Plex Mono',monospace;font-size:28px;font-weight:600;color:#0A0A0A;letter-spacing:0.04em;margin-bottom:8px;}
.ssub{font-size:12px;color:#BBB;letter-spacing:0.04em;margin-bottom:36px;}
.abtnx{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;background:transparent;color:#0A0A0A;border:2px solid #0A0A0A;padding:12px 28px;cursor:pointer;font-weight:700;transition:all 0.12s;}
.abtnx:hover{background:#0A0A0A;color:#fff;}
.adm{padding:32px 40px;}
.sgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:1px;background:#0A0A0A;border:2px solid #0A0A0A;margin-bottom:28px;}
.scell{background:#fff;padding:18px 20px;}
.slbl{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.22em;text-transform:uppercase;color:#888;margin-bottom:6px;font-weight:600;}
.sval{font-family:'IBM Plex Mono',monospace;font-size:22px;font-weight:600;color:#0A0A0A;letter-spacing:-0.02em;}
.frow{display:flex;gap:6px;margin-bottom:20px;flex-wrap:wrap;align-items:center;}
.fb{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.16em;text-transform:uppercase;background:transparent;color:#888;border:1px solid #D8D5CE;padding:7px 14px;cursor:pointer;font-weight:600;transition:all 0.1s;}
.fb:hover{border-color:#0A0A0A;color:#0A0A0A;}
.fb.on{background:#0A0A0A;color:#fff;border-color:#0A0A0A;}
.rfbtn{margin-left:auto;font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.16em;text-transform:uppercase;background:transparent;color:#AAA;border:1px solid #D8D5CE;padding:7px 14px;cursor:pointer;font-weight:500;}
.rfbtn:hover{color:#0A0A0A;border-color:#AAA;}
.otbl{width:100%;background:#fff;border:2px solid #0A0A0A;border-collapse:collapse;}
.otbl th{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.2em;text-transform:uppercase;color:#888;padding:12px 16px;text-align:left;border-bottom:2px solid #0A0A0A;font-weight:700;background:#F5F4F1;white-space:nowrap;}
.otbl td{padding:14px 16px;border-bottom:1px solid #ECEAE5;vertical-align:middle;}
.orow{cursor:pointer;transition:background 0.08s;}
.orow:hover td{background:#FAFAF8;}
.orow.ex td{background:#F5F4F1;border-bottom:none;}
.oid{font-family:'IBM Plex Mono',monospace;font-size:11px;color:#0A0A0A;font-weight:600;letter-spacing:0.04em;white-space:nowrap;}
.tpill{display:inline-block;font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.18em;text-transform:uppercase;font-weight:700;padding:3px 8px;}
.tpill.po{background:#0A0A0A;color:#fff;}
.tpill.qr{background:transparent;color:#0A0A0A;border:1px solid #0A0A0A;}
.icell{font-size:12px;color:#666;max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.dcell{font-family:'IBM Plex Mono',monospace;font-size:10px;color:#AAA;white-space:nowrap;}
.acell{font-family:'IBM Plex Mono',monospace;font-size:13px;font-weight:600;color:#0A0A0A;white-space:nowrap;}
.sssel{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.12em;text-transform:uppercase;border:1px solid;padding:6px 8px;cursor:pointer;font-weight:700;background:transparent;width:100%;min-width:130px;}
.ecell{font-family:'IBM Plex Mono',monospace;font-size:10px;color:#CCC;text-align:center;width:28px;}
.drow td{padding:0;border-bottom:2px solid #0A0A0A;}
.dinn{padding:24px 32px;display:grid;grid-template-columns:1fr 1fr;gap:32px;background:#F5F4F1;}
.dslbl{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.22em;text-transform:uppercase;color:#888;margin-bottom:14px;padding-bottom:8px;border-bottom:1px solid #DDDAD3;font-weight:700;}
.ltbl{width:100%;border-collapse:collapse;}
.ltbl th{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.14em;text-transform:uppercase;color:#BBB;text-align:left;padding:0 0 8px;font-weight:600;}
.ltbl td{font-size:12px;color:#333;padding:7px 0;border-bottom:1px solid #ECEAE5;vertical-align:top;}
.ltbl tr:last-child td{border-bottom:none;}
.lid{font-family:'IBM Plex Mono',monospace;font-size:9px;color:#BBB;}
.mblk{background:#fff;border-left:2px solid #0A0A0A;padding:10px 14px;margin-bottom:10px;}
.mpc{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.12em;text-transform:uppercase;color:#0A0A0A;font-weight:700;margin-bottom:5px;}
.mtxt{font-size:11px;color:#555;line-height:1.7;}
.nblk{background:#fff;border:1px solid #DDDAD3;padding:12px 14px;font-size:11px;color:#555;line-height:1.7;}
.dftr{display:flex;justify-content:space-between;align-items:center;padding:14px 32px;background:#F5F4F1;border-top:1px solid #DDDAD3;}
.dttl{font-family:'IBM Plex Mono',monospace;font-size:11px;font-weight:700;color:#0A0A0A;}
.delbtn{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.16em;text-transform:uppercase;background:none;border:1px solid #DDDAD3;padding:7px 16px;cursor:pointer;color:#AAA;font-weight:600;}
.delbtn:hover{border-color:#0A0A0A;color:#0A0A0A;}
.lgwrap{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:calc(100vh - 60px);background:#F5F4F1;}
.lgbox{background:#fff;border:2px solid #0A0A0A;padding:44px 40px;width:360px;}
.lgtitle{font-family:'IBM Plex Mono',monospace;font-size:8px;letter-spacing:0.24em;text-transform:uppercase;color:#888;margin-bottom:6px;font-weight:600;}
.lgsub{font-size:24px;font-weight:300;color:#0A0A0A;margin-bottom:28px;letter-spacing:-0.02em;}
.lgi{width:100%;font-family:'IBM Plex Mono',monospace;font-size:13px;border:1px solid #AAAAAA;background:#F5F4F1;padding:12px 14px;outline:none;color:#0A0A0A;margin-bottom:12px;letter-spacing:0.1em;}
.lgi:focus{border-color:#0A0A0A;background:#fff;}
.lgi.err{border-color:#CC0000;}
.lgbtn{width:100%;background:#0A0A0A;color:#fff;border:none;padding:13px 0;font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.22em;text-transform:uppercase;font-weight:700;cursor:pointer;}
.lgbtn:hover{opacity:0.85;}
.lgerr{font-family:'IBM Plex Mono',monospace;font-size:8px;color:#CC0000;letter-spacing:0.1em;text-transform:uppercase;margin-top:8px;}
.noord{text-align:center;padding:80px;font-family:'IBM Plex Mono',monospace;font-size:9px;letter-spacing:0.2em;text-transform:uppercase;color:#CCC;}
`;

function ClientView({ onSubmitted }) {
  const [cart, setCart] = useState([]);
  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("All");
  const [rtype, setRtype] = useState("Quote Request");
  const [notes, setNotes] = useState("");
  const [done, setDone] = useState(false);
  const [lastId, setLastId] = useState("");
  const [sample, setSample] = useState({ inCart: false, dimensions: "", description: "" });
  const [pricingAcked, setPricingAcked] = useState(false);
  const [category, setCategory] = useState("Gallery");

  const cats = ["All", "Tables", "Seating", "Case Goods"];
  const list = CATALOG.filter(i =>
    (cat === "All" || i.category === cat) &&
    (i.name.toLowerCase().includes(search.toLowerCase()) || i.id.toLowerCase().includes(search.toLowerCase()))
  );

  const add = item => setCart(c => c.find(x => x.id === item.id)
    ? c.map(x => x.id === item.id ? { ...x, qty: x.qty + 1 } : x)
    : [...c, { ...item, qty: 1, modifications: "" }]);
  const upd = (id, f, v) => setCart(c => c.map(x => x.id === id ? { ...x, [f]: v } : x));
  const rem = id => setCart(c => c.filter(x => x.id !== id));
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const hasItems = cart.length > 0 || sample.inCart;

  const submit = async () => {
    if (!hasItems) return;
    if (rtype === "Quote Request" && !pricingAcked) return;
    const orders = await loadOrders();
    const id = genId(rtype);
    const items = cart.map(i => ({ id: i.id, name: i.name, qty: i.qty, price: i.price, modifications: i.modifications }));
    if (sample.inCart) items.push({ id: "SAM-817", name: "Material Samples", qty: 1, price: 0, modifications: "", sampleDimensions: sample.dimensions, sampleDescription: sample.description });
    const order = { id, requestType: rtype, category, status: "Requested", date: new Date().toISOString(), client: "The Future Perfect", items, total, notes };
    await saveOrders([order, ...orders]);
    // Send confirmation emails — fire and forget, don't block the UI
    fetch("/api/send-confirmation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    }).catch(err => console.error("Email send failed:", err));
    setLastId(id); setDone(true); setCart([]); setNotes(""); setSample({ inCart: false, dimensions: "", description: "" }); setPricingAcked(false); setCategory("Gallery"); onSubmitted();
  };

  if (done) return (
    <div className="success">
      <div className="smark">✓</div>
      <div className="stitle">Request Received</div>
      <div className="sref">{lastId}</div>
      <div className="ssub">817 Hospitality will be in touch.</div>
      <button className="abtnx" onClick={() => setDone(false)}>Submit Another Request</button>
    </div>
  );

  return (
    <div className="layout">
      <div className="cat-panel">
        <div className="cat-hdr">
          <input className="si" placeholder="Search collection..." value={search} onChange={e => setSearch(e.target.value)} />
          {cats.map(c => <button key={c} className={"cb" + (cat === c ? " on" : "")} onClick={() => setCat(c)}>{c}</button>)}
        </div>
        <div className="cat-list">
          {list.map(item => {
            const ic = cart.find(x => x.id === item.id);
            return (
              <div key={item.id} className="crow">
                <div className="pid">{item.id}</div>
                <div>
                  <div className="pname">{item.name}</div>
                  <div className="pdesc">{item.description.split("|")[0].trim()}</div>
                </div>
                <div style={{ textAlign: "right", minWidth: 110 }}>
                  <div className="pprice">{fmt(item.price)}</div>
                  <button className={"abtn" + (ic ? " inc" : "")} onClick={() => add(item)}>
                    {ic ? `In Cart ×${ic.qty}` : "+ Add"}
                  </button>
                </div>
              </div>
            );
          })}
          {/* SAM-817 row — always shown, not filtered */}
          <div className="crow" style={{ borderTop: "2px solid #0A0A0A", marginTop: 8 }}>
            <div className="pid" style={{ color: "#0A0A0A", fontWeight: 600 }}>SAM-817</div>
            <div>
              <div className="pname">Material Samples</div>
              <div className="pdesc">Request finish, fabric, or material samples for quotation</div>
            </div>
            <div style={{ textAlign: "right", minWidth: 110 }}>
              <div className="pprice" style={{ color: "#888", fontSize: 11, fontWeight: 400, letterSpacing: "0.1em" }}>TBD</div>
              <button className={"abtn" + (sample.inCart ? " inc" : "")} onClick={() => setSample(s => ({ ...s, inCart: !s.inCart }))}>
                {sample.inCart ? "In Cart" : "+ Add"}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="ord-panel">
        <div className="ord-hdr">
          <div className="ord-lbl">Request Summary</div>
          <div className="ord-ttl">{!hasItems ? "Empty" : `${cart.length + (sample.inCart ? 1 : 0)} item${(cart.length + (sample.inCart ? 1 : 0)) !== 1 ? "s" : ""} selected`}</div>
        </div>
        <div className="cscroll">
          {!hasItems ? (
            <div className="ecart">
              <div className="ecart-ico">— ○ —</div>
              <div className="ecart-txt">Add pieces from the catalog</div>
            </div>
          ) : (
            <>
              {cart.map(item => (
                <div key={item.id} className="ci">
                  <div className="ci-hdr">
                    <div>
                      <div className="ci-id">{item.id}</div>
                      <div className="ci-name">{item.name}</div>
                    </div>
                    <button className="rmbtn" onClick={() => rem(item.id)}>×</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
                    <div>
                      <label className="fl">Qty</label>
                      <input className="qi" type="number" min={1} value={item.qty} onChange={e => upd(item.id, "qty", Math.max(1, parseInt(e.target.value) || 1))} />
                    </div>
                    <div>
                      <label className="fl">Subtotal</label>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 15, fontWeight: 600, paddingTop: 8 }}>{fmt(item.price * item.qty)}</div>
                    </div>
                  </div>
                  <div>
                    <label className="fl">Modifications</label>
                    <textarea className="mta" rows={2} placeholder="Materials, finish, dimensions..." value={item.modifications} onChange={e => upd(item.id, "modifications", e.target.value)} />
                  </div>
                </div>
              ))}
              {sample.inCart && (
                <div className="ci" style={{ borderLeft: "2px solid #0A0A0A" }}>
                  <div className="ci-hdr">
                    <div>
                      <div className="ci-id" style={{ color: "#0A0A0A", fontWeight: 700 }}>SAM-817</div>
                      <div className="ci-name">Material Samples</div>
                    </div>
                    <button className="rmbtn" onClick={() => setSample(s => ({ ...s, inCart: false }))}>×</button>
                  </div>
                  <div style={{ marginBottom: 10 }}>
                    <label className="fl">Dimensions</label>
                    <input className="qi" type="text" placeholder='e.g. 12" × 12"' value={sample.dimensions} onChange={e => setSample(s => ({ ...s, dimensions: e.target.value }))} />
                  </div>
                  <div>
                    <label className="fl">Description</label>
                    <textarea className="mta" rows={3} placeholder="Specify materials, finishes, or colors you'd like sampled..." value={sample.description} onChange={e => setSample(s => ({ ...s, description: e.target.value }))} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
        {hasItems && (
          <div className="ofoot">
            <div className="trow">
              <span className="tlbl">Total</span>
              <span className="tamt">{fmt(total)}</span>
            </div>
            <div className="ttog">
              {["Quote Request", "Purchase Order"].map(t => (
                <button key={t} className={"tbtn" + (rtype === t ? " on" : "")} onClick={() => setRtype(t)}>
                  {t === "Quote Request" ? "Quote" : "Purchase Order"}
                </button>
              ))}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label className="fl" style={{ marginBottom: 6 }}>Order Category</label>
              <div className="ttog">
                {["Gallery", "Retail"].map(c => (
                  <button key={c} className={"tbtn" + (category === c ? " on" : "")} onClick={() => setCategory(c)}>{c}</button>
                ))}
              </div>
            </div>
            <textarea className="nta" rows={2} placeholder="Timeline, project notes..." value={notes} onChange={e => setNotes(e.target.value)} />
            {rtype === "Quote Request" && (
              <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14, padding: "12px 14px", background: "#F5F4F1", border: "1px solid #DDDAD3" }}>
                <input type="checkbox" id="pricing-ack" checked={pricingAcked} onChange={e => setPricingAcked(e.target.checked)} style={{ marginTop: 2, cursor: "pointer", accentColor: "#0A0A0A", flexShrink: 0 }} />
                <label htmlFor="pricing-ack" style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: "0.08em", color: "#666", lineHeight: 1.6, cursor: "pointer" }}>I understand that prices shown are indicative of standard dimensions only and are subject to change pending review of any requested modifications.</label>
              </div>
            )}
            <button className="sbtn" onClick={submit} style={{ opacity: (rtype === "Quote Request" && !pricingAcked) ? 0.3 : 1 }}>Submit {rtype === "Quote Request" ? "Quote Request" : "Purchase Order"} →</button>
          </div>
        )}
      </div>
    </div>
  );
}

function ClientHistory() {
  const [orders, setOrders] = useState([]);
  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadOrders().then(o => { setOrders(o); setLoading(false); }); }, []);

  if (loading) return <div className="noord">Loading...</div>;
  if (orders.length === 0) return (
    <div className="noord" style={{ padding: "80px 40px" }}>
      No requests submitted yet
    </div>
  );

  return (
    <div className="adm">
      <div className="sgrid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        {[
          ["Total Submitted", orders.length],
          ["Confirmed Value", fmt(orders.filter(o => o.status !== "Cancelled" && !o.items.some(i => i.id === "SAM-817" && i.price === 0)).reduce((s, o) => s + o.total, 0))],
          ["Pending Pricing", orders.filter(o => o.items.some(i => i.id === "SAM-817" && (!i.price || i.price === 0))).length],
        ].map(([l, v]) => (
          <div key={l} className="scell"><div className="slbl">{l}</div><div className="sval">{v}</div></div>
        ))}
      </div>
      <table className="otbl">
        <thead><tr><th>Reference</th><th>Type</th><th>Pieces</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {orders.map(order => {
            const ss = STATUS_STYLE[order.status] || {};
            const isOpen = exp === order.id;
            const hasPendingSample = order.items.some(i => i.id === "SAM-817" && (!i.price || i.price === 0));
            return (
              <>
                <tr key={order.id} className={"orow" + (isOpen ? " ex" : "")} onClick={() => setExp(isOpen ? null : order.id)}>
                  <td className="oid">{order.id}</td>
                  <td>
                    <span className={"tpill " + (effectiveType(order) === "Purchase Order" ? "po" : "qr")}>{effectiveType(order) === "Purchase Order" ? "PO" : "Quote"}</span>
                    {order.category && <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, letterSpacing: "0.14em", textTransform: "uppercase", color: "#888", marginLeft: 6 }}>{order.category}</span>}
                  </td>
                  <td className="icell">{order.items.map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}</td>
                  <td className="dcell">{fmtDate(order.date)}</td>
                  <td className="acell">
                    {hasPendingSample
                      ? <span>{fmt(order.total)} <span style={{ fontSize: 9, color: "#C8A000", fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.1em" }}>+ SAMPLES TBD</span></span>
                      : fmt(order.total)}
                  </td>
                  <td>
                    <span style={{ display: "inline-block", fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 700, padding: "3px 10px", color: ss.color, background: ss.bg, border: `1px solid ${ss.border}` }}>
                      {order.status}
                    </span>
                  </td>
                  <td className="ecell">{isOpen ? "▲" : "▼"}</td>
                </tr>
                {isOpen && (
                  <tr key={order.id + "-d"} className="drow">
                    <td colSpan={7}>
                      <div style={{ padding: "20px 32px", background: "#F5F4F1" }}>
                        <div className="dslbl">Line Items</div>
                        <table className="ltbl">
                          <thead><tr><th>ID</th><th>Piece</th><th>Qty</th><th>Unit Price</th><th style={{ textAlign: "right" }}>Subtotal</th></tr></thead>
                          <tbody>
                            {order.items.map((it, i) => (
                              <tr key={i}>
                                <td className="lid">{it.id}</td>
                                <td style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 500 }}>{it.name}</td>
                                <td>{it.id === "SAM-817" ? "—" : it.qty}</td>
                                <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>
                                  {it.id === "SAM-817" ? (it.price > 0 ? fmt(it.price) : <span style={{ color: "#C8A000", fontSize: 10, letterSpacing: "0.08em" }}>Pending pricing</span>) : fmt(it.price)}
                                </td>
                                <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600, textAlign: "right" }}>
                                  {it.id === "SAM-817" ? (it.price > 0 ? fmt(it.price) : <span style={{ color: "#C8A000", fontSize: 10 }}>TBD</span>) : fmt(it.price * it.qty)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div style={{ borderTop: "1px solid #DDDAD3", marginTop: 14, paddingTop: 14, display: "flex", justifyContent: "flex-end", gap: 24, alignItems: "baseline" }}>
                          {hasPendingSample && <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, color: "#C8A000", letterSpacing: "0.12em", textTransform: "uppercase" }}>Sample pricing pending from 817 Hospitality</span>}
                          <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 700, color: "#0A0A0A" }}>
                            {hasPendingSample ? `${fmt(order.total)} + samples` : `Total: ${fmt(order.total)}`}
                          </span>
                        </div>
                        {order.notes && (
                          <div style={{ marginTop: 16 }}>
                            <div className="dslbl">Notes</div>
                            <div className="nblk">{order.notes}</div>
                          </div>
                        )}
                        {(order.approvalDate || order.leadTime || order.poId) && (
                          <div style={{ marginTop: 16, background: "#0A0A0A", padding: "16px 20px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                            {order.approvalDate && (
                              <div>
                                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: "#666", marginBottom: 5, fontWeight: 600 }}>Approval Date</div>
                                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, color: "#fff", letterSpacing: "0.04em" }}>
                                  {new Date(order.approvalDate + "T12:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                                </div>
                              </div>
                            )}
                            {order.leadTime && (
                              <div>
                                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: "#666", marginBottom: 5, fontWeight: 600 }}>Estimated Lead Time</div>
                                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, color: "#fff", letterSpacing: "0.04em" }}>{order.leadTime}</div>
                              </div>
                            )}
                            {order.poId && (
                              <div>
                                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, letterSpacing: "0.22em", textTransform: "uppercase", color: "#666", marginBottom: 5, fontWeight: 600 }}>817 PO ID</div>
                                <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 13, fontWeight: 600, color: "#fff", letterSpacing: "0.04em" }}>{order.poId}</div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function CostField({ value, isOverridden, onCommit, placeholder, disabled }) {
  const str = (v) => (v === null || v === undefined ? "" : String(v));
  const [local, setLocal] = useState(str(value));
  useEffect(() => { setLocal(str(value)); }, [value]);
  if (disabled) {
    return <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, color: "#666" }}>{str(value) || "—"}</span>;
  }
  return (
    <input
      type="number"
      value={local}
      placeholder={placeholder || "0"}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== str(value)) onCommit(local); }}
      style={{
        width: 88, fontFamily: "'IBM Plex Mono',monospace", fontSize: 11,
        padding: "4px 6px", border: "1px solid #DDDAD3",
        background: isOverridden ? "#FFFDE0" : "#fff",
      }}
    />
  );
}

function fmtMoney(n) {
  return "$" + (Math.round((n || 0) * 100) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function VendorPOTotals({ totals, currency }) {
  const { subtotal, iva, total, missingCost, unresolvedCount } = totals;
  return (
    <div style={{ borderTop: "1px solid #DDDAD3", marginTop: 10, paddingTop: 10, fontSize: 11, fontFamily: "'IBM Plex Mono',monospace" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}><span>SUBTOTAL</span><span>{fmtMoney(subtotal)} {currency}</span></div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2, color: "#999" }}><span>IVA (16%)</span><span>{fmtMoney(iva)} {currency}</span></div>
      <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700 }}><span>TOTAL</span><span>{fmtMoney(total)} {currency}</span></div>
      {(missingCost > 0 || unresolvedCount > 0) && (
        <div style={{ marginTop: 8, fontSize: 10, color: "#C8A000", letterSpacing: "0.04em" }}>
          {unresolvedCount > 0 && <div>⚠ {unresolvedCount} item(s) still need a custom crate line before this PO is complete.</div>}
          {missingCost > 0 && <div>⚠ {missingCost} line(s) missing a cost — fill in the highlighted field(s).</div>}
        </div>
      )}
    </div>
  );
}

function CustomLineForm({ itemIndex, defaultName, onAdd }) {
  const [name, setName] = useState(defaultName || "");
  const [boxDim, setBoxDim] = useState("");
  const [qty, setQty] = useState("1");
  const [cost, setCost] = useState("");
  const inputStyle = { fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, padding: "4px 6px", border: "1px solid #C8A000", background: "#fff" };
  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 8 }}>
      <input style={{ ...inputStyle, width: 160 }} value={name} onChange={e => setName(e.target.value)} placeholder="Piece name" />
      <input style={{ ...inputStyle, width: 140 }} value={boxDim} onChange={e => setBoxDim(e.target.value)} placeholder="Box dim (W x D x H)" />
      <input style={{ ...inputStyle, width: 60 }} type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="Qty" />
      <input style={{ ...inputStyle, width: 90 }} type="number" value={cost} onChange={e => setCost(e.target.value)} placeholder="Cost" />
      <button
        onClick={() => { if (name && boxDim && qty && cost) onAdd({ itemIndex, pieceName: name, boxDim, qty, cost }); }}
        style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase", padding: "6px 12px", background: "#0A0A0A", color: "#fff", border: "none", cursor: "pointer" }}
      >
        Add Line
      </button>
    </div>
  );
}

function StatusPill({ status }) {
  const c = STATUS_COLORS[status] || STATUS_COLORS.Pending;
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase",
      padding: "3px 8px", background: c.bg, color: c.fg, fontWeight: 700,
    }}>
      {status}
    </span>
  );
}

function VendorPOSubCard({ title, vendor, results, mode, overrides, customLines, onCostChange, onAddCustom, onRemoveCustom, onEditCustom, totals, currency, poId, poState, onAdvance, onToggleLock }) {
  const ok = results.filter(r => r.status === "OK");
  const review = results.filter(r => r.status === "REQUIRES_REVIEW");
  const isCrates = mode === "crates";
  const cols = isCrates ? 7 : 5;
  const customByIndex = new Map((customLines || []).map(c => [c.itemIndex, c]));
  const status = poState.status || "Pending";
  const locked = !!poState.locked;
  const displayPoNumber = poState.poNumber || poNumberPreview(poId, isCrates ? "C" : "V");
  const next = nextStatus(status);

  return (
    <div style={{ background: "#fff", border: "1px solid #DDDAD3", padding: 16, marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
        <div className="dslbl">{title} — {vendor}</div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {displayPoNumber && (
            <span style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#999" }}>
              PO# {displayPoNumber}{!poState.poNumber && " (preview)"}
            </span>
          )}
          <StatusPill status={status} />
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div style={{ fontSize: 10, color: "#C8A000", fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.04em" }}>
          {locked && "🔒 Locked — click Unlock to edit costs or lines"}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {locked ? (
            <button onClick={() => onToggleLock(false)} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", padding: "6px 12px", background: "#fff", color: "#0A0A0A", border: "1px solid #0A0A0A", cursor: "pointer" }}>
              Unlock to Edit
            </button>
          ) : status !== "Pending" && (
            <button onClick={() => onToggleLock(true)} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", padding: "6px 12px", background: "#fff", color: "#0A0A0A", border: "1px solid #0A0A0A", cursor: "pointer" }}>
              Lock
            </button>
          )}
          {next && (
            <button onClick={onAdvance} style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, letterSpacing: "0.06em", textTransform: "uppercase", padding: "6px 12px", background: "#0A0A0A", color: "#fff", border: "none", cursor: "pointer" }}>
              Mark as {next} →
            </button>
          )}
        </div>
      </div>
      {(ok.length > 0 || review.length > 0) && (
        <table className="ltbl" style={{ marginBottom: 0 }}>
          <thead>
            <tr>
              <th>SKU</th><th>Piece</th>
              {isCrates ? (<><th>Piece Qty</th><th>Crate Qty</th><th>Box Dim</th></>) : (<th>Qty</th>)}
              <th>Cost</th><th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            {ok.flatMap((r, ri) => {
              let rows;
              if (isCrates) {
                rows = crateDisplayRows(r).map((row, li) => {
                  const cost = (overrides && Object.prototype.hasOwnProperty.call(overrides, row.costKey)) ? overrides[row.costKey] : row.catalogCost;
                  const isOverridden = overrides && Object.prototype.hasOwnProperty.call(overrides, row.costKey);
                  const lineTotal = (cost === null || cost === undefined || cost === "") ? null : Number(cost) * row.crateQty;
                  return (
                    <tr key={`${ri}-${li}`} style={r.dimFlag ? { background: "#FFF8E6" } : undefined}>
                      <td className="lid">{r.sku}</td>
                      <td style={{ textTransform: "uppercase", fontSize: 11 }}>{row.pieceName}</td>
                      <td>{row.pieceQty}</td>
                      <td>{row.crateQty}{row.piecesInBox ? ` (${row.piecesInBox}/box)` : ""}</td>
                      <td style={{ fontSize: 10, color: "#999" }}>{row.boxDim || "—"}</td>
                      <td><CostField value={cost} isOverridden={isOverridden} disabled={locked} onCommit={(v) => onCostChange(row.costKey, v)} /></td>
                      <td style={{ fontSize: 11 }}>{lineTotal === null ? "—" : fmtMoney(lineTotal)}</td>
                    </tr>
                  );
                });
              } else {
                const costKey = r.sku;
                const catalogCost = r.lines[0] ? r.lines[0].cost : null;
                const cost = (overrides && Object.prototype.hasOwnProperty.call(overrides, costKey)) ? overrides[costKey] : catalogCost;
                const isOverridden = overrides && Object.prototype.hasOwnProperty.call(overrides, costKey);
                const lineTotal = (cost === null || cost === undefined || cost === "") ? null : Number(cost) * r.qty;
                rows = [(
                  <tr key={`${ri}-0`} style={r.dimFlag ? { background: "#FFF8E6" } : undefined}>
                    <td className="lid">{r.sku}</td>
                    <td style={{ textTransform: "uppercase", fontSize: 11 }}>{r.pieceName}</td>
                    <td>{r.qty}</td>
                    <td><CostField value={cost} isOverridden={isOverridden} disabled={locked} onCommit={(v) => onCostChange(costKey, v)} /></td>
                    <td style={{ fontSize: 11 }}>{lineTotal === null ? "—" : fmtMoney(lineTotal)}</td>
                  </tr>
                )];
              }
              if (r.dimFlag) {
                rows.push(
                  <tr key={`${ri}-dim`}>
                    <td colSpan={cols} style={{ background: "#FFF8E6", fontSize: 10, color: "#7A5500", letterSpacing: "0.04em", fontWeight: 600 }}>
                      ⚠ Verify crate size — modification may affect dimensions: {r.note}
                    </td>
                  </tr>
                );
              } else if (r.note) {
                rows.push(
                  <tr key={`${ri}-note`}>
                    <td colSpan={cols} style={{ fontSize: 10, color: "#AAA", letterSpacing: "0.04em" }}>
                      Finish: {r.note}
                    </td>
                  </tr>
                );
              }
              return rows;
            })}
            {review.map((r, ri) => {
              const custom = customByIndex.get(r.itemIndex);
              if (custom) {
                const lineTotal = (custom.cost === "" || custom.qty === "") ? null : Number(custom.cost) * Number(custom.qty);
                return (
                  <tr key={`rev-${ri}`}>
                    <td className="lid">{r.sku}</td>
                    <td style={{ textTransform: "uppercase", fontSize: 11 }}>{custom.pieceName} <span style={{ color: "#C8A000", fontSize: 9 }}>(custom)</span></td>
                    {isCrates ? (<><td>{custom.qty}</td><td>{custom.qty}</td><td style={{ fontSize: 10, color: "#999" }}>{custom.boxDim}</td></>) : (<td>{custom.qty}</td>)}
                    <td><CostField value={custom.cost} isOverridden={true} disabled={locked} onCommit={(v) => onEditCustom(r.itemIndex, { cost: v })} /></td>
                    <td style={{ fontSize: 11 }}>
                      {lineTotal === null ? "—" : fmtMoney(lineTotal)}
                      {!locked && <button onClick={() => onRemoveCustom(r.itemIndex)} style={{ marginLeft: 8, border: "none", background: "none", color: "#C8A000", cursor: "pointer", fontSize: 13 }}>×</button>}
                    </td>
                  </tr>
                );
              }
              return (
                <tr key={`rev-${ri}`}>
                  <td colSpan={cols} style={{ padding: 0 }}>
                    <div style={{ border: "1px solid #C8A000", background: "#FFF8E6", padding: "10px 12px" }}>
                      <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 8, letterSpacing: "0.16em", textTransform: "uppercase", color: "#7A5500", fontWeight: 700, marginBottom: 4 }}>
                        Requires Review — {r.sku} ×{r.qty}
                      </div>
                      <div style={{ fontSize: 11, color: "#7A5500" }}>{r.reason}</div>
                      {locked ? (
                        <div style={{ fontSize: 10, color: "#7A5500", marginTop: 8 }}>Locked — unlock to add a custom crate line.</div>
                      ) : (
                        <CustomLineForm itemIndex={r.itemIndex} defaultName={r.pieceName} onAdd={onAddCustom} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
      {ok.length === 0 && review.length === 0 && (
        <div style={{ color: "#CCC", fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          No pieces on this order
        </div>
      )}
      {(ok.length > 0 || (customLines && customLines.length > 0)) && <VendorPOTotals totals={totals} currency="MXN" />}
    </div>
  );
}

function VendorPOPanel({ order, onSave }) {
  if (order.status !== "In Production") return null;
  const vp = order.vendorPOs || {};
  const crateState = { ...defaultPOState(), ...(vp.crates || {}) };
  const coverState = { ...defaultPOState(), ...(vp.covers || {}) };
  const { crates, covers } = matchOrderItems(order.items);

  const save = (patch) => onSave({ ...vp, ...patch });

  const cTotals = calcPOTotals(crates, "crates", crateState.overrides, crateState.customLines);
  const vTotals = calcPOTotals(covers, "covers", coverState.overrides, coverState.customLines);

  const advanceCrates = () => {
    const patch = advanceStatusPatch(crateState, order.poId, "C");
    if (patch) save({ crates: { ...crateState, ...patch } });
  };
  const advanceCovers = () => {
    const patch = advanceStatusPatch(coverState, order.poId, "V");
    if (patch) save({ covers: { ...coverState, ...patch } });
  };

  return (
    <div style={{ background: "#F5F4F1", borderTop: "1px solid #DDDAD3", padding: "18px 32px" }}>
      <div className="dslbl" style={{ marginBottom: 14 }}>Vendor POs</div>
      {!order.poId ? (
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 10, color: "#AAA", letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Set the 817 PO ID first.
        </div>
      ) : (
        <>
          <VendorPOSubCard
            title="Crates" vendor="Empaques Fuertes" mode="crates" results={crates}
            overrides={crateState.overrides} customLines={crateState.customLines} totals={cTotals} currency="MXN"
            poId={order.poId} poState={crateState}
            onAdvance={advanceCrates}
            onToggleLock={(val) => save({ crates: { ...crateState, locked: val } })}
            onCostChange={(costKey, val) => save({ crates: { ...crateState, overrides: { ...crateState.overrides, [costKey]: val } } })}
            onAddCustom={(line) => save({ crates: { ...crateState, customLines: [...crateState.customLines, line] } })}
            onRemoveCustom={(itemIndex) => save({ crates: { ...crateState, customLines: crateState.customLines.filter(c => c.itemIndex !== itemIndex) } })}
            onEditCustom={(itemIndex, patch) => save({ crates: { ...crateState, customLines: crateState.customLines.map(c => c.itemIndex === itemIndex ? { ...c, ...patch } : c) } })}
          />
          <VendorPOSubCard
            title="Covers" vendor="Duco" mode="covers" results={covers}
            overrides={coverState.overrides} customLines={coverState.customLines} totals={vTotals} currency="MXN"
            poId={order.poId} poState={coverState}
            onAdvance={advanceCovers}
            onToggleLock={(val) => save({ covers: { ...coverState, locked: val } })}
            onCostChange={(costKey, val) => save({ covers: { ...coverState, overrides: { ...coverState.overrides, [costKey]: val } } })}
            onAddCustom={(line) => save({ covers: { ...coverState, customLines: [...coverState.customLines, line] } })}
            onRemoveCustom={(itemIndex) => save({ covers: { ...coverState, customLines: coverState.customLines.filter(c => c.itemIndex !== itemIndex) } })}
            onEditCustom={(itemIndex, patch) => save({ covers: { ...coverState, customLines: coverState.customLines.map(c => c.itemIndex === itemIndex ? { ...c, ...patch } : c) } })}
          />
        </>
      )}
    </div>
  );
}

function AdminView() {
  const [orders, setOrders] = useState([]);
  const [sf, setSf] = useState("All");
  const [tf, setTf] = useState("All");
  const [cf, setCf] = useState("All Categories");
  const [exp, setExp] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => { const d = await loadOrders(); setOrders(d); setLoading(false); }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const updStatus = async (id, s) => {
    const u = orders.map(o => o.id === id ? { ...o, status: s } : o);
    setOrders(u); await saveOrders(u);
    if (s === "Quote Sent") {
      const order = u.find(o => o.id === id);
      if (order) fetch("/api/send-quote-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order }) }).catch(() => {});
    }
  };
  const updSamplePrice = async (orderId, price) => {
    const parsed = parseFloat(price) || 0;
    const u = orders.map(o => {
      if (o.id !== orderId) return o;
      const items = o.items.map(it => it.id === "SAM-817" ? { ...it, price: parsed } : it);
      const total = items.reduce((s, it) => s + (it.id === "SAM-817" ? parsed : it.price * it.qty), 0);
      return { ...o, items, total };
    });
    setOrders(u); await saveOrders(u);
    const updatedOrder = u.find(o => o.id === orderId);
    if (updatedOrder) fetch("/api/send-quote-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: updatedOrder }) }).catch(() => {});
  };
  const updProjectInfo = async (orderId, field, value) => {
    const u = orders.map(o => o.id === orderId ? { ...o, [field]: value } : o);
    setOrders(u); await saveOrders(u);
  };
  const del = async id => {
    if (!confirm("Delete this request?")) return;
    const u = orders.filter(o => o.id !== id);
    setOrders(u); await saveOrders(u); setExp(null);
  };

  const list = orders.filter(o =>
    (sf === "All" || o.status === sf) &&
    (tf === "All" || (tf === "QR" ? effectiveType(o) === "Quote Request" : effectiveType(o) === "Purchase Order")) &&
    (cf === "All Categories" || o.category === cf)
  );
  const tv = list.reduce((s, o) => s + o.total, 0);
  const pend = orders.filter(o => o.status === "Requested").length;
  const inprod = orders.filter(o => o.status === "In Production").length;

  if (loading) return <div className="noord">Loading...</div>;

  return (
    <div className="adm">
      <div className="sgrid">
        {[["Total Requests", orders.length], ["Pending Review", pend], ["In Production", inprod], ["All Orders Value", fmt(orders.reduce((s,o) => s+o.total,0))], ["Filtered Value", fmt(tv)]].map(([l, v]) => (
          <div key={l} className="scell"><div className="slbl">{l}</div><div className="sval">{v}</div></div>
        ))}
      </div>
      <div className="frow">
        {["All", "QR", "PO"].map(t => <button key={t} className={"fb" + (tf === t ? " on" : "")} onClick={() => setTf(t)}>{t === "All" ? "All Types" : t === "QR" ? "Quotes" : "Purchase Orders"}</button>)}
        <div style={{ width: 1, height: 18, background: "#D8D5CE", margin: "0 4px" }} />
        {["All", ...STATUSES].map(s => <button key={s} className={"fb" + (sf === s ? " on" : "")} onClick={() => setSf(s)}>{s}</button>)}
        <div style={{ width: 1, height: 18, background: "#D8D5CE", margin: "0 4px" }} />
        {["All Categories", "Gallery", "Retail"].map(c => <button key={c} className={"fb" + (cf === c ? " on" : "")} onClick={() => setCf(c)}>{c}</button>)}
        <button className="rfbtn" onClick={refresh}>↻ Refresh</button>
      </div>
      {list.length === 0 ? <div className="noord">No requests match current filters</div> : (
        <table className="otbl">
          <thead><tr><th>Reference</th><th>Type</th><th>Pieces</th><th>Date</th><th>Total</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {list.map(order => {
              const ss = STATUS_STYLE[order.status] || {};
              const isOpen = exp === order.id;
              return (
                <>
                  <tr key={order.id} className={"orow" + (isOpen ? " ex" : "")} onClick={() => setExp(isOpen ? null : order.id)}>
                    <td className="oid">{order.id}</td>
                    <td><span className={"tpill " + (effectiveType(order) === "Purchase Order" ? "po" : "qr")}>{effectiveType(order) === "Purchase Order" ? "PO" : "Quote"}</span></td>
                    <td className="icell">{order.items.map(i => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}</td>
                    <td className="dcell">{fmtDate(order.date)}</td>
                    <td className="acell">{fmt(order.total)}</td>
                    <td onClick={e => e.stopPropagation()}>
                      <select className="sssel" value={order.status} onChange={e => updStatus(order.id, e.target.value)} style={{ color: ss.color, borderColor: ss.border, background: ss.bg }}>
                        {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="ecell">{isOpen ? "▲" : "▼"}</td>
                  </tr>
                  {isOpen && (
                    <tr key={order.id + "-d"} className="drow">
                      <td colSpan={7}>
                        <div className="dinn">
                          <div>
                            <div className="dslbl">Line Items</div>
                            <table className="ltbl">
                              <thead><tr><th>ID</th><th>Piece</th><th>Qty</th><th>Unit</th><th style={{ textAlign: "right" }}>Subtotal</th></tr></thead>
                              <tbody>
                                {order.items.map((it, i) => {
                                  const isQuote = order.requestType === "Quote Request";
                                  const isSample = it.id === "SAM-817";
                                  return (
                                    <tr key={i}>
                                      <td className="lid">{it.id}</td>
                                      <td style={{ textTransform: "uppercase", fontSize: 11, fontWeight: 500 }}>{it.name}</td>
                                      <td>{isSample ? "—" : it.qty}</td>
                                      <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11 }}>
                                        {isQuote ? (
                                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <span style={{ color: "#888", fontSize: 10 }}>$</span>
                                            <input type="number" min={0}
                                              placeholder={String(it.price || 0)}
                                              defaultValue={it.price || ""}
                                              onChange={e => {
                                                const val = parseFloat(e.target.value) || 0;
                                                setOrders(prev => prev.map(o => {
                                                  if (o.id !== order.id) return o;
                                                  const items = o.items.map(x => x.id === it.id ? { ...x, price: val } : x);
                                                  const total = items.reduce((s, x) => s + (x.id === "SAM-817" ? x.price : x.price * x.qty), 0);
                                                  return { ...o, items, total };
                                                }));
                                              }}
                                              onClick={e => e.stopPropagation()}
                                              style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, border: "1px solid #C8C5BE", background: "#FFF9EE", padding: "3px 6px", width: 90, outline: "none", color: "#0A0A0A" }}
                                            />
                                          </div>
                                        ) : fmt(it.price)}
                                      </td>
                                      <td style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, fontWeight: 600, textAlign: "right" }}>
                                        {isSample ? (it.price > 0 ? fmt(it.price) : <span style={{ color: "#AAA", fontSize: 10, letterSpacing: "0.1em" }}>TBD</span>) : fmt(it.price * it.qty)}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          <div>
                            {order.items.some(i => i.modifications) && <>
                              <div className="dslbl">Requested Modifications</div>
                              {order.items.filter(i => i.modifications).map((it, i) => (
                                <div key={i} className="mblk">
                                  <div className="mpc">{it.id} — {it.name}</div>
                                  <div className="mtxt">{it.modifications}</div>
                                </div>
                              ))}
                            </>}
                            {order.items.some(i => i.id === "SAM-817") && (() => {
                              const s = order.items.find(i => i.id === "SAM-817");
                              return (
                                <>
                                  <div className="dslbl" style={{ marginTop: order.items.some(i => i.modifications) ? 20 : 0 }}>Sample Request — SAM-817</div>
                                  <div className="mblk">
                                    {s.sampleDimensions && <><div className="mpc" style={{ marginBottom: 4, color: "#666" }}>Dimensions</div><div className="mtxt" style={{ marginBottom: 8 }}>{s.sampleDimensions}</div></>}
                                    {s.sampleDescription && <><div className="mpc" style={{ marginBottom: 4, color: "#666" }}>Description</div><div className="mtxt">{s.sampleDescription}</div></>}
                                  </div>
                                </>
                              );
                            })()}
                            {order.notes && <>
                              <div className="dslbl" style={{ marginTop: order.items.some(i => i.modifications) ? 20 : 0 }}>Notes</div>
                              <div className="nblk">{order.notes}</div>
                            </>}
                            {!order.notes && !order.items.some(i => i.modifications) && !order.items.some(i => i.id === "SAM-817") && (
                              <div style={{ color: "#CCC", fontSize: 11, fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "0.08em", textTransform: "uppercase" }}>No modifications requested</div>
                            )}
                          </div>
                        </div>
                        <div style={{ background: "#fff", borderTop: "1px solid #DDDAD3", padding: "18px 32px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
                          <div>
                            <div className="dslbl" style={{ marginBottom: 10 }}>Order Category</div>
                            <div style={{ display: "flex", gap: 0, border: "1.5px solid #0A0A0A" }}>
                              {["Gallery", "Retail"].map(c => (
                                <button key={c} onClick={async e => { e.stopPropagation(); await updProjectInfo(order.id, "category", c); }}
                                  style={{ flex: 1, fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", background: order.category === c ? "#0A0A0A" : "#fff", color: order.category === c ? "#fff" : "#888", border: "none", borderRight: c === "Gallery" ? "1px solid #0A0A0A" : "none", padding: "9px 0", cursor: "pointer", fontWeight: 700 }}>
                                  {c}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0 }} />
                        </div>
                        {["Quote Sent", "In Production", "Completed"].includes(order.status) && (
                          <div style={{ background: "#fff", borderTop: "1px solid #DDDAD3", padding: "18px 32px", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 20 }}>
                            <div>
                              <div className="dslbl" style={{ marginBottom: 10 }}>Approval Date</div>
                              <input
                                type="date"
                                defaultValue={order.approvalDate || ""}
                                onBlur={e => updProjectInfo(order.id, "approvalDate", e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, border: "1px solid #C8C5BE", background: "#F5F4F1", padding: "7px 10px", outline: "none", color: "#0A0A0A", width: "100%", letterSpacing: "0.04em" }}
                              />
                            </div>
                            <div>
                              <div className="dslbl" style={{ marginBottom: 10 }}>Estimated Lead Time</div>
                              <input
                                type="text"
                                placeholder="e.g. 10–12 weeks"
                                defaultValue={order.leadTime || ""}
                                onBlur={e => updProjectInfo(order.id, "leadTime", e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, border: "1px solid #C8C5BE", background: "#F5F4F1", padding: "7px 10px", outline: "none", color: "#0A0A0A", width: "100%", letterSpacing: "0.04em" }}
                              />
                            </div>
                            <div>
                              <div className="dslbl" style={{ marginBottom: 10 }}>817 PO ID</div>
                              <input
                                type="text"
                                placeholder="e.g. 817-2026-001"
                                defaultValue={order.poId || ""}
                                onBlur={e => updProjectInfo(order.id, "poId", e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 11, border: "1px solid #C8C5BE", background: "#F5F4F1", padding: "7px 10px", outline: "none", color: "#0A0A0A", width: "100%", letterSpacing: "0.04em" }}
                              />
                            </div>
                          </div>
                        )}
                        <VendorPOPanel order={order} onSave={(vp) => updProjectInfo(order.id, "vendorPOs", vp)} />
                        <div className="dftr">
                          <div className="dttl">Order Total: {fmt(order.total)}</div>
                          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                            {order.requestType === "Quote Request" && order.status !== "Cancelled" && order.status !== "Completed" && (
                              <button
                                onClick={async e => {
                                  e.stopPropagation();
                                  e.preventDefault();
                                  // Get the current order from state (includes any edited prices)
                                  const current = orders.find(o => o.id === order.id);
                                  const updated = orders.map(o => o.id === order.id ? { ...o, status: "Quote Sent" } : o);
                                  setOrders(updated);
                                  await saveOrders(updated);
                                  const final = updated.find(o => o.id === order.id);
                                  const emailRes = await fetch("/api/send-quote-update", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ order: final }) });
                                  if (emailRes.ok) {
                                    alert("Quote confirmed and email sent to The Future Perfect.");
                                  } else {
                                    alert("Quote saved but email failed. Check Vercel logs.");
                                  }
                                }}
                                style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", background: "#0A0A0A", color: "#fff", border: "none", padding: "8px 18px", cursor: "pointer", fontWeight: 700 }}>
                                Confirm &amp; Send Quote →
                              </button>
                            )}
                            <button className="delbtn" onClick={() => del(order.id)}>Delete Request</button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}

function PortalLogin({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const go = () => {
    if (pw === ADMIN_PASSWORD) { onLogin(true); }
    else if (pw === CLIENT_PASSWORD) { onLogin(false); }
    else { setErr(true); setPw(""); }
  };
  return (
    <div className="lgwrap">
      <div className="lgbox">
        <div className="lgtitle">817 Hospitality</div>
        <div className="lgsub">Trade Portal</div>
        <div style={{ fontFamily: "'IBM Plex Mono',monospace", fontSize: 9, letterSpacing: "0.14em", textTransform: "uppercase", color: "#888", marginBottom: 20, lineHeight: 1.6 }}>
          Restricted access — authorized clients only.
        </div>
        <input className={"lgi" + (err ? " err" : "")} type="password" value={pw}
          placeholder="Enter access code" autoFocus
          onChange={e => { setPw(e.target.value); setErr(false); }}
          onKeyDown={e => e.key === "Enter" && go()} />
        <button className="lgbtn" onClick={go}>Enter →</button>
        {err && <div className="lgerr">Incorrect access code</div>}
      </div>
    </div>
  );
}

function AdminLogin({ onLogin }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  const go = () => { if (pw === ADMIN_PASSWORD) onLogin(); else { setErr(true); setPw(""); } };
  return (
    <div className="lgwrap">
      <div className="lgbox">
        <div className="lgtitle">817 Hospitality</div>
        <div className="lgsub">Admin Access</div>
        <input className={"lgi" + (err ? " err" : "")} type="password" value={pw} placeholder="Password" autoFocus
          onChange={e => { setPw(e.target.value); setErr(false); }} onKeyDown={e => e.key === "Enter" && go()} />
        <button className="lgbtn" onClick={go}>Enter →</button>
        {err && <div className="lgerr">Incorrect password</div>}
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState("client");
  const [authed, setAuthed] = useState(false);
  const [portalAccess, setPortalAccess] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [count, setCount] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => { loadOrders().then(o => setCount(o.length)); }, [tick]);

  if (!portalAccess) return (
    <div className="app">
      <style>{G}</style>
      <PortalLogin onLogin={(admin) => { setPortalAccess(true); setIsAdmin(admin); if (admin) setView("admin"); }} />
    </div>
  );

  return (
    <div className="app">
      <style>{G}</style>
      <div className="hdr">
        <div>
          <div className="wm">8 1 7 &nbsp; Hospitality</div>
          <div className="wm-sub">× The Future Perfect — Trade Portal</div>
        </div>
        <div className="nav">
          {!isAdmin && <button className={"nb" + (view === "client" ? " on" : "")} onClick={() => setView("client")}>New Request</button>}
          {!isAdmin && <button className={"nb" + (view === "history" ? " on" : "")} onClick={() => setView("history")}>Order History</button>}
          {isAdmin && <button className={"nb" + (view === "admin" ? " on" : "")} onClick={() => setView("admin")}>
            Admin{count > 0 && <span className="nbadge">{count}</span>}
          </button>}
          {isAdmin && <button className={"nb" + (view === "client" ? " on" : "")} onClick={() => setView("client")}>Client View</button>}
        </div>
      </div>
      {(view === "client" || view === "history") && (
        <div className="tkr">
          {[["Client","The Future Perfect"],["Studio","817 Hospitality"],["Location","Los Angeles, CA"],["Collection","14 Pieces"],["Production","Made to Order"],["Crating","Included"]].map(([k,v]) => (
            <div key={k} className="tkr-item">{k}&nbsp;&nbsp;<b>{v}</b></div>
          ))}
        </div>
      )}
      {view === "client" && <ClientView onSubmitted={() => setTick(t => t+1)} />}
      {view === "history" && <ClientHistory key={tick} />}
      {view === "admin" && (isAdmin ? <AdminView key={tick} /> : <AdminLogin onLogin={() => { setIsAdmin(true); setView("admin"); }} />)}
    </div>
  );
}
