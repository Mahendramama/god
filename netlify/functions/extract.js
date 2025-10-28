// CommonJS in functions for wider compatibility with Netlify bundler.
const { JSDOM } = require("jsdom");
const { Readability } = require("@mozilla/readability");
const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== "POST") {
      return { statusCode: 405, body: "Method Not Allowed" };
    }

    const { url } = JSON.parse(event.body || "{}");
    if (!url) return { statusCode: 400, body: "Missing url" };

    const res = await fetch(url, {
      headers: {
        "user-agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      redirect: "follow"
    });

    if (!res.ok) {
      return { statusCode: res.status, body: `Fetch failed (${res.status})` };
    }

    const html = await res.text();
    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // Try opengraph / twitter image first
    const ogImg =
      doc.querySelector('meta[property="og:image"]')?.getAttribute("content") ||
      doc.querySelector('meta[name="twitter:image"]')?.getAttribute("content") ||
      doc.querySelector('meta[property="og:image:url"]')?.getAttribute("content");

    // Readability for main content
    const reader = new Readability(doc);
    const article = reader.parse();

    let title = article?.title?.trim() || doc.querySelector("title")?.textContent?.trim() || "";
    let textContent = article?.textContent?.trim() || "";

    // Fallback image: first <img> inside article content or page
    let contentImage = null;
    if (article?.content) {
      const frag = JSDOM.fragment(article.content);
      const firstImg = frag.querySelector("img");
      contentImage = firstImg?.getAttribute("src") || firstImg?.getAttribute("data-src") || null;
    }
    let imageUrl = ogImg || contentImage || null;

    // Resolve relative URLs
    if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
      try {
        imageUrl = new URL(imageUrl, url).href;
      } catch {}
    }

    // Trim text a bit (super long pages)
    if (textContent.length > 30000) {
      textContent = textContent.slice(0, 30000);
    }

    return {
      statusCode: 200,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ title, text: textContent, imageUrl })
    };
  } catch (err) {
    return { statusCode: 500, body: `extract error: ${err.message}` };
  }
};
