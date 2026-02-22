import { getStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    const kind = (event.queryStringParameters?.kind || "").toLowerCase();
    if (!["cennik", "rezervacie"].includes(kind)) {
      return { statusCode: 400, body: "Missing or invalid ?kind=cennik|rezervacie" };
    }

    const siteID = process.env.NETLIFY_SITE_ID;
    const token  = process.env.NETLIFY_BLOBS_TOKEN;
    const store  = getStore({ name: "kv", siteID, token });

    const key = kind === "cennik" ? "prices" : "booked";

    // ✅ Tolerantné čítanie – ak je v Blobs „starý“ reťazec, vrátime prázdne pole
    let data = [];
    try {
      const value = await store.get(key, { type: "text" });   // prečítaj surový text
      if (!value) {
        data = [];
      } else {
        try {
          const parsed = JSON.parse(value);
          data = Array.isArray(parsed) ? parsed : [];
        } catch {
          // ak je to starý "[object Object]" alebo neplatný JSON → nech je radšej []
          data = [];
        }
      }
    } catch {
      data = [];
    }

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache, no-store, must-revalidate" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    // aj v úplnom emergency aspoň vráť JSON ([]), nie text
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: "[]"
    };
  }
}
