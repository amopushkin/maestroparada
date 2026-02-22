import { getStore } from "@netlify/blobs";

export async function handler(event) {
  try {
    const kind = (event.queryStringParameters?.kind || "").toLowerCase();
    if (!["cennik", "rezervacie"].includes(kind)) {
      return { statusCode: 400, body: "Missing or invalid ?kind=cennik|rezervacie" };
    }

    const store = getStore("kv");
    const key = kind === "cennik" ? "prices" : "booked";
    const data = (await store.get(key, { type: "json" })) || [];

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
      body: JSON.stringify(data),
    };
  } catch (err) {
    return { statusCode: 500, body: `get-data error: ${err.message}` };
  }
}
