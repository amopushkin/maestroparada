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

    // ✨ priamo čítanie JSON
    const data = (await store.getJSON(key)) ?? [];

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-cache, no-store, must-revalidate" },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: `get-data error: ${err.message}` };
  }
}
