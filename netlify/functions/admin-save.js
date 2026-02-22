import { getStore } from "@netlify/blobs";

// Spoločné CORS hlavičky (bezpečné aj na rovnakej doméne)
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
  headers: {
    "Content-Type": "text/plain; charset=utf-8",
    ...CORS,
  },
  body: msg,
});

export async function handler(event) {
  // 1) Preflight – nech prehliadač dostane 204 a pokračuje.
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: CORS, body: "" };
  }

  if (event.httpMethod !== "POST") return err(405, "POST only");

  // 2) Overenie hesla z Authorization: Bearer <pwd>
  const auth = event.headers["authorization"] || event.headers["Authorization"];
  const tokenHeader = auth?.startsWith("Bearer ") ? auth.slice(7) : "";
  const expected = process.env.ADMIN_PASSWORD || "";
  if (!expected || tokenHeader !== expected) return err(401, "Unauthorized");

  // 3) JSON telo
  let payload = {};
  try { payload = JSON.parse(event.body || "{}"); }
  catch { return err(400, "Invalid JSON body"); }

  const kind = String(payload.kind || "").toLowerCase();
  const data = payload.data;
  if (!["cennik", "rezervacie"].includes(kind)) return err(400, "kind must be cennik|rezervacie");
  if (!Array.isArray(data)) return err(400, "data must be array");

  // 4) Validácia záznamov
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

  // 5) Blobs store (manuálna konfigurácia pomocou env premených)
  const siteID = process.env.NETLIFY_SITE_ID;
  const token  = process.env.NETLIFY_BLOBS_TOKEN;
  const store  = getStore({ name: "kv", siteID, token });

  const key = kind === "cennik" ? "prices" : "booked";
  await store.set(key, data);

  return ok({ saved: key, count: data.length });
}
