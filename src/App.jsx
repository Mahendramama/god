import { useMemo, useState } from "react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { looksOdia } from "./utils/odia.js";
import { wrapLines, paginateLines } from "./canvas/textChunk.js";
import { renderSlide } from "./canvas/drawSlide.js";

const CANVAS_W = 1280;
const CANVAS_H = 720;
const LEFT_W = CANVAS_W / 2;
const PAD = 48;

export default function App() {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [slides, setSlides] = useState([]); // {dataUrl, idx}
  const [meta, setMeta] = useState(null); // { title, imageUrl }

  async function onGenerate(e) {
    e.preventDefault();
    if (!url) return;
    setLoading(true);
    setSlides([]);
    setMeta(null);
    try {
      // 1) Extract
      const ex = await fetch("/api/extract", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url })
      });
      if (!ex.ok) throw new Error(await ex.text());
      const { title, text, imageUrl } = await ex.json();

      // 2) Ensure Odia: detect simple, else translate
      const needTranslate = !looksOdia(title + "\n" + text);
      const toTranslate = `${title}\n\n${text}`;
      let odiaTitle = title, odiaBody = text;

      if (needTranslate) {
        const tr = await fetch("/api/translate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ text: toTranslate, target: "or" })
        });
        if (!tr.ok) throw new Error(await tr.text());
        const { translated } = await tr.json();
        const [t, ...rest] = translated.split("\n");
        odiaTitle = (t || title).trim();
        odiaBody = rest.join("\n").trim() || text;
      }

      // 3) Build slides on a temp canvas context for measurements
      const temp = document.createElement("canvas");
      temp.width = CANVAS_W; temp.height = CANVAS_H;
      const ctx = temp.getContext("2d");
      ctx.font = `400 44px "Noto Sans Oriya","Noto Serif Oriya",system-ui,sans-serif`;

      const maxTextWidth = LEFT_W - PAD * 2;
      const bodyLines = wrapLines(ctx, odiaBody, maxTextWidth);

      // Lines per page (accounting for header)
      const lineHeight = 56;
      const headerSpace = 56 + 16 + 40; // title + divider + margin
      const usableHeight = CANVAS_H - PAD*2 - headerSpace;
      const maxPerPage = Math.floor(usableHeight / lineHeight);

      const pages = paginateLines(bodyLines, maxPerPage, { firstPageLineOffset: 0 });

      // 4) Render canvases
      const canvases = [];
      for (let i = 0; i < Math.max(1, pages.length); i++) {
        const lines = pages[i] || [];
        const { canvas } = await renderSlide({
          titleOdia: odiaTitle,
          bodyLines: lines,
          pageIndex: i,
          totalPages: Math.max(1, pages.length),
          imageUrl
        });
        canvases.push(canvas);
      }

      // 5) Convert to data URLs for preview
      const data = canvases.map((c, i) => ({ idx: i, dataUrl: c.toDataURL("image/png"), canvas: c }));
      setSlides(data);
      setMeta({ title: odiaTitle, imageUrl });
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setLoading(false);
    }
  }

  async function downloadAll() {
    const zip = new JSZip();
    slides.forEach(({ dataUrl }, i) => {
      const base64 = dataUrl.split(",")[1];
      zip.file(`slide-${i + 1}.png`, base64, { base64: true });
    });
    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "slides.zip");
  }

  return (
    <div style={{ maxWidth: 1100, margin: "40px auto", padding: "0 16px" }}>
      <h1 style={{ margin: 0, fontSize: 28 }}>News → Odia Slides (1280×720)</h1>
      <p style={{ color: "#666", marginTop: 8 }}>
        50% Odia text · 50% image (from the article). Multiple slides if needed.
      </p>

      <form onSubmit={onGenerate} style={{ display: "flex", gap: 8, marginTop: 24 }}>
        <input
          type="url"
          required
          placeholder="Paste news URL…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          style={{
            flex: 1,
            padding: "12px 14px",
            fontSize: 16,
            borderRadius: 8,
            border: "1px solid #ccc"
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "12px 16px",
            fontSize: 16,
            borderRadius: 8,
            border: "none",
            background: "#111",
            color: "white",
            cursor: "pointer",
            opacity: loading ? 0.7 : 1
          }}
        >
          {loading ? "Working…" : "Generate"}
        </button>
      </form>

      {meta && (
        <div style={{ marginTop: 16, fontSize: 14, color: "#333" }}>
          <strong>Title (Odia):</strong> {meta.title}
        </div>
      )}

      {slides.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <button
            onClick={downloadAll}
            style={{
              padding: "10px 14px",
              fontSize: 14,
              borderRadius: 8,
              border: "1px solid #222",
              background: "#fff",
              cursor: "pointer"
            }}
          >
            Download all (ZIP)
          </button>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: 16,
          marginTop: 24
        }}
      >
        {slides.map(({ idx, dataUrl }) => (
          <figure key={idx} style={{ margin: 0, border: "1px solid #e5e5e5", borderRadius: 12, overflow: "hidden" }}>
            <img
              src={dataUrl}
              alt={`slide ${idx + 1}`}
              style={{ width: "100%", height: "auto", display: "block" }}
            />
            <figcaption style={{ padding: 8, fontSize: 13, color: "#666" }}>Slide {idx + 1}</figcaption>
          </figure>
        ))}
      </div>

      <div style={{ height: 60 }} />
    </div>
  );
}
