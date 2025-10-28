// Measure + wrap text to given width, return lines.
export function wrapLines(ctx, text, maxWidth) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = "";

  for (const w of words) {
    const test = line ? line + " " + w : w;
    const m = ctx.measureText(test);
    if (m.width <= maxWidth) {
      line = test;
    } else {
      if (line) lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

// Chunk lines into pages given height/lineHeight and optional firstPageOffset
export function paginateLines(allLines, maxLinesPerPage, options = {}) {
  const pages = [];
  let i = 0;
  if (options.firstPageLineOffset && options.firstPageLineOffset > 0) {
    const firstCount = Math.max(0, maxLinesPerPage - options.firstPageLineOffset);
    pages.push(allLines.slice(0, firstCount));
    i = firstCount;
  }
  while (i < allLines.length) {
    pages.push(allLines.slice(i, i + maxLinesPerPage));
    i += maxLinesPerPage;
  }
  return pages;
}
