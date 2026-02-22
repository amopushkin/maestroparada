exports.handler = async () => {
  const hasSite = !!process.env.NETLIFY_SITE_ID;
  const hasToken = !!process.env.NETLIFY_BLOBS_TOKEN;
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ hasSite, hasToken })
  };
};
