const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }
    const { text, target = "or" } = JSON.parse(event.body || "{}");
    if (!text) return { statusCode: 400, body: "Missing text" };

    const apiKey = process.env.TRANSLATE_API_KEY;
    if (!apiKey) return { statusCode: 500, body: "Missing TRANSLATE_API_KEY env" };

    // Google Cloud Translate v2 simple endpoint
    const res = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${apiKey}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ q: text, target })
    });

    if (!res.ok) {
      const txt = await res.text();
      return { statusCode: res.status, body: txt };
    }

    const data = await res.json();
    const translated = data?.data?.translations?.map(t => t.translatedText).join("\n") || "";
    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ translated })
    };
  } catch (err) {
    return { statusCode: 500, body: `translate error: ${err.message}` };
  }
};
