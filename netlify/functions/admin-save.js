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

  // Overenie hesla – v Netlify je ENV premenná ADMIN_PASSWORD=Bratislava83
  const auth = event.headers["authorization"] || event.headers["Authorization"];
  const token = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || token !== expected) return err(401, "Unauthorized");

  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); }
  catch { return err(400, "Invalid JSON body"); }

  const kind = String(payload.kind || "").toLowerCase();
  const data = payload.data;
  if (!["cennik", "rezervacie"].includes(kind)) return err(400, "kind must be cennik|rezervacie");
  if (!Array.isArray(data)) return err(400, "data must be array");

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

  const key = kind === "cennik" ? "prices" : "booked";
  const store = getStore("kv");
  await store.set(key, data);

  return ok({ saved: key, count: data.length });
}
