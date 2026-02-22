import { getStore } from "@netlify/blobs";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Authorization, Content-Type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ok = (body) => ({
  statusCode: 200,
  headers: {
    "Content-Type": "application/json",
    "Cache-Control": "no-cache, no-store, must-revalidate",
    ...CORS,
  },
  body: JSON.stringify(body),
});
const err = (code, msg) => ({
  statusCode: code,
  headers: { "Content-Type": "text/plain; charset=utf-8", ...CORS },
  body: msg,
});

export async function handler(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS, body: "" };
  if (event.httpMethod !== "POST") return err(405, "POST only");

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

  // Blobs store (manuálna konfigurácia)
  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_BLOBS_TOKEN;
  const store  = getStore({ name: "kv", siteID, token });

  const key = kind === "cennik" ? "prices" : "booked";

  // ✨ kľúčová zmena – uložiť ako JSON
  await store.setJSON(key, data);

  return ok({ saved: key, count: data.length });
}
