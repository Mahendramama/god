const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
  try {
    const url = event.queryStringParameters?.url;
    if (!url) return { statusCode: 400, body: "Missing url" };

    const res = await fetch(url, { redirect: "follow" });
    if (!res.ok) return { statusCode: res.status, body: `Upstream error ${res.status}` };

    // Stream back as-is with liberal CORS
    const contentType = res.headers.get("content-type") || "application/octet-stream";
    const buf = await res.arrayBuffer();
    return {
      statusCode: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*"
      },
      body: Buffer.from(buf).toString("base64"),
      isBase64Encoded: true
    };
  } catch (err) {
    return { statusCode: 500, body: `proxy error: ${err.message}` };
  }
};
