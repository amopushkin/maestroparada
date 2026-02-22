import { getStore } from "@netlify/blobs";

export async function handler() {
  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token  = process.env.NETLIFY_BLOBS_TOKEN;
    const store  = getStore({ name: "kv", siteID, token });

    // zmažeme existujúce kľúče (ak tam je zlý obsah)
    await store.delete("prices").catch(()=>{});
    await store.delete("booked").catch(()=>{});

    return { statusCode: 200, body: "deleted prices & booked" };
  } catch (e) {
    return { statusCode: 500, body: String(e) };
  }
}
