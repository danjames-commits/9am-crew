// Claude's avatar drawings are checked against a strict allow-list before we keep them.
// Only plain shapes and colours: no scripts, links, images, text, fonts or outside references.

const TAGS = new Set([
  'svg', 'g', 'defs', 'circle', 'ellipse', 'rect', 'path', 'polygon', 'polyline', 'line',
  'lineargradient', 'radialgradient', 'stop',
]);

const ATTRS = new Set([
  'xmlns', 'viewbox', 'width', 'height', 'id', 'transform', 'opacity',
  'cx', 'cy', 'r', 'rx', 'ry', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'd', 'points',
  'fill', 'fill-opacity', 'fill-rule', 'clip-rule', 'stroke', 'stroke-width', 'stroke-opacity',
  'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-miterlimit',
  'offset', 'stop-color', 'stop-opacity', 'gradientunits', 'gradienttransform', 'fx', 'fy',
]);

const MAX = 16000;

/** Returns a cleaned SVG string, or null if the drawing has anything we don't allow. */
export function cleanSvg(raw: string): string | null {
  let s = raw.trim();
  // Claude sometimes wraps it in a code fence.
  s = s.replace(/^```(?:svg|xml)?\s*/i, '').replace(/\s*```$/, '').trim();
  if (!s.startsWith('<svg') || !s.endsWith('</svg>') || s.length > MAX) return null;
  // No comments, doctypes, CDATA, processing instructions or entities (other than the basic five).
  if (/<!|<\?/.test(s)) return null;
  if (/&(?!(?:amp|lt|gt|quot|apos|#\d{1,5});)/.test(s)) return null;

  const tag = /<(\/?)([a-zA-Z][a-zA-Z0-9]*)((?:\s+[a-zA-Z][a-zA-Z0-9:-]*\s*=\s*"[^"<>]*")*)\s*(\/?)>/g;
  let out = '';
  let last = 0;
  let depth = 0;
  let m: RegExpExecArray | null;
  while ((m = tag.exec(s))) {
    // Anything between tags must be whitespace (no text in drawings).
    if (s.slice(last, m.index).trim()) return null;
    last = tag.lastIndex;
    const [, close, name, attrs, selfClose] = m;
    if (!TAGS.has(name.toLowerCase())) return null;
    if (close) {
      if (attrs.trim() || selfClose) return null;
      depth--;
      out += `</${name}>`;
      continue;
    }
    let cleaned = '';
    for (const a of attrs.matchAll(/([a-zA-Z][a-zA-Z0-9:-]*)\s*=\s*"([^"<>]*)"/g)) {
      const key = a[1].toLowerCase();
      const value = a[2];
      if (!ATTRS.has(key)) return null;
      if (key === 'xmlns' && value !== 'http://www.w3.org/2000/svg') return null;
      // url() is only allowed for gradients defined in this same drawing.
      if (/url\(/i.test(value) && !/^url\(#[a-zA-Z][\w-]*\)$/.test(value)) return null;
      if (/javascript:|expression|@import/i.test(value)) return null;
      cleaned += ` ${a[1]}="${value}"`;
    }
    out += `<${name}${cleaned}${selfClose ? '/' : ''}>`;
    if (!selfClose) depth++;
  }
  if (s.slice(last).trim() || depth !== 0) return null;
  if (!/^<svg[^>]*\sviewBox="/.test(out)) return null;
  if (!/\sxmlns="/.test(out.slice(0, out.indexOf('>')))) out = out.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
  return out;
}

/** Short version tag for a drawing, so phones fetch the new one when it changes. */
export function svgVersion(svg: string) {
  let h = 5381;
  for (let i = 0; i < svg.length; i++) h = ((h * 33) ^ svg.charCodeAt(i)) >>> 0;
  return h.toString(36);
}
