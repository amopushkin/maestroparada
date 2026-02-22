import { getStore } from "@netlify/blobs";

const ok = (body) => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate"
  },
  body: JSON.stringify(body),
});
const err = (code, msg) => ({ statusCode: code, body: msg });

export async function handler(event) {
  if (event.httpMethod !== "POST") return err(405, "POST only");

  // Overenie hesla – ADMIN_PASSWORD v Netlify env
  const auth = event.headers["authorization"] || event.headers["Authorization"];
  const tokenHeader = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || tokenHeader !== expected) return err(401, "Unauthorized");

  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); }
  catch { return err(400, "Invalid JSON body"); }

  const kind = String(payload.kind || "").toLowerCase();
  const data = payload.data;
  if (!["cennik", "rezervacie"].includes(kind)) return err(400, "kind must be cennik|rezervacie");
  if (!Array.isArray(data)) return err(400, "data must be array");

  // základná validácia
  const bad = (msg) => err(400, `Invalid item: ${msg}`);
  if (kind === "rezervacie") {
    for (const it of data) {
      if (!it?.from || !it?.to) return bad("missing from/to");
    }
  } else {
    for (const it of data) {
      if (!it?.from || !it?.to) return bad("missing from/to");
      if (typeof it?.price !== "number") return bad("price must be number");
      if (typeof it?.electricity !== "boolean") return bad("electricity must be boolean");
    }
  }

  // manuálna konfigurácia Blobs cez env premenné
  const options = {};
  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_BLOBS_TOKEN;
  if (siteID && token) {
    options.siteID = siteID;
    options.token  = token;
  }

  const key = kind === "cennik" ? "prices" : "booked";
  const store = getStore("kv", options);
  await store.set(key, data);

  return ok({ saved: key, count: data.length });
}
