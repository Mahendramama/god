const W = 1280;
const H = 720;

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawCoverImage(ctx, img, x, y, w, h) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const ir = iw / ih;
  const r = w / h;

  let dw = w, dh = h, dx = x, dy = y;
  if (ir > r) {
    // image is wider -> fit height, crop width
    dh = h;
    dw = dh * ir;
    dx = x + (w - dw) / 2;
  } else {
    // image is taller -> fit width, crop height
    dw = w;
    dh = dw / ir;
    dy = y + (h - dh) / 2;
  }
  ctx.drawImage(img, dx, dy, dw, dh);
}

/**
 * Render a single slide canvas.
 * Left half: text. Right half: image.
 * Returns {canvas}
 */
export async function renderSlide({ titleOdia, bodyLines, pageIndex, totalPages, imageUrl }) {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // Background split
  ctx.fillStyle = "#0b0b0b";
  ctx.fillRect(0, 0, W, H);

  // Right side image area
  ctx.fillStyle = "#111";
  ctx.fillRect(W/2, 0, W/2, H);

  // Load image via proxy for clean canvas
  try {
    if (imageUrl) {
      const proxied = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
      const img = await loadImage(proxied);
      drawCoverImage(ctx, img, W/2, 0, W/2, H);
    }
  } catch {
    // Fade if image fails
    ctx.fillStyle = "#222";
    ctx.fillRect(W/2, 0, W/2, H);
  }

  // Left text panel
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W/2, H);

  const pad = 48;
  const textX = pad;
  let y = pad;

  // Title (small persistent header)
  ctx.fillStyle = "#0b0b0b";
  ctx.font = `700 40px "Noto Sans Oriya","Noto Serif Oriya",system-ui,sans-serif`;
  ctx.textBaseline = "top";
  ctx.fillText(titleOdia.slice(0, 120), textX, y);
  y += 56;

  // Divider
  ctx.fillStyle = "#e7e7e7";
  ctx.fillRect(pad, y, W/2 - pad*2, 2);
  y += 16;

  // Body
  ctx.fillStyle = "#0a0a0a";
  ctx.font = `400 44px "Noto Sans Oriya","Noto Serif Oriya",system-ui,sans-serif`;
  const lineHeight = 56;

  for (const line of bodyLines) {
    ctx.fillText(line, textX, y);
    y += lineHeight;
    if (y > H - pad - 60) break;
  }

  // Footer: page x/y
  ctx.fillStyle = "#666";
  ctx.font = `600 28px system-ui, sans-serif`;
  ctx.textAlign = "right";
  ctx.fillText(`${pageIndex + 1} / ${totalPages}`, W/2 - pad, H - pad);

  // Reset align
  ctx.textAlign = "left";

  return { canvas };
}
