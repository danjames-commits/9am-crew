import { describe, expect, it } from 'vitest';
import { stillSvg, cleanSvg, svgVersion } from './svg-clean';

const beaver = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs><linearGradient id="fur"><stop offset="0" stop-color="#8b5a2b"/><stop offset="1" stop-color="#6b4220"/></linearGradient></defs>
  <ellipse cx="50" cy="55" rx="34" ry="30" fill="url(#fur)"/>
  <path d="M40 48 L46 44" stroke="#222" stroke-width="3" stroke-linecap="round"/>
  <rect x="45" y="66" width="10" height="9" rx="2" fill="#fff"/>
</svg>`;

describe('cleanSvg', () => {
  it('keeps a plain drawing', () => {
    const out = cleanSvg(beaver);
    expect(out).toContain('<ellipse cx="50"');
    expect(out).toContain('fill="url(#fur)"');
  });
  it('strips a code fence and adds xmlns', () => {
    expect(cleanSvg('```svg\n<svg viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>\n```')).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>',
    );
  });
  it.each([
    ['script', '<svg viewBox="0 0 1 1"><script>alert(1)</script></svg>'],
    ['event handler', '<svg viewBox="0 0 1 1"><circle onload="alert(1)" r="1"/></svg>'],
    ['link', '<svg viewBox="0 0 1 1"><a href="https://x.com"><circle r="1"/></a></svg>'],
    ['image', '<svg viewBox="0 0 1 1"><image href="https://x.com/a.png"/></svg>'],
    ['outside url', '<svg viewBox="0 0 1 1"><circle fill="url(https://x.com/a)" r="1"/></svg>'],
    ['style', '<svg viewBox="0 0 1 1"><circle style="fill:red" r="1"/></svg>'],
    ['text', '<svg viewBox="0 0 1 1"><text>hi</text></svg>'],
    ['stray text', '<svg viewBox="0 0 1 1">hello<circle r="1"/></svg>'],
    ['entity', '<!DOCTYPE svg [<!ENTITY a "b">]><svg viewBox="0 0 1 1">&a;</svg>'],
    ['comment', '<svg viewBox="0 0 1 1"><!-- x --></svg>'],
    ['unbalanced', '<svg viewBox="0 0 1 1"><g><circle r="1"/></svg>'],
    ['no viewBox', '<svg><circle r="1"/></svg>'],
    ['single quotes', "<svg viewBox='0 0 1 1'><circle r='1'/></svg>"],
  ])('rejects %s', (_, svg) => {
    expect(cleanSvg(svg)).toBeNull();
  });
  it('gives a short stable version', () => {
    expect(svgVersion(beaver)).toBe(svgVersion(beaver));
    expect(svgVersion(beaver)).toMatch(/^[a-z0-9]{1,16}$/);
    expect(svgVersion(beaver)).not.toBe(svgVersion(beaver + ' '));
  });
});

describe('animated drawings', () => {
  const head = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">';
  const bob = '<g><animateTransform attributeName="transform" type="translate" values="0 0;0 6;0 0" dur="1.6s" repeatCount="indefinite"/><circle cx="50" cy="50" r="20" fill="#a86"/></g>';
  it('allows simple looping motion only when asked', () => {
    expect(cleanSvg(head + bob + '</svg>', { animated: true })).toContain('animateTransform');
    expect(cleanSvg(head + bob + '</svg>')).toBeNull();
  });
  it('blocks event triggers, links and odd targets', () => {
    expect(cleanSvg(head + '<g><animate attributeName="opacity" values="1;0" dur="1s" begin="click"/></g></svg>', { animated: true })).toBeNull();
    expect(cleanSvg(head + '<g><animate attributeName="href" values="a;b" dur="1s"/></g></svg>', { animated: true })).toBeNull();
    expect(cleanSvg(head + '<g><animate attributeName="opacity" values="1;0" dur="1s" href="#x"/></g></svg>', { animated: true })).toBeNull();
    expect(cleanSvg(head + '<set attributeName="opacity" to="0"/></svg>', { animated: true })).toBeNull();
  });
  it('can be shown standing still', () => {
    const svg = cleanSvg(head + bob + '<g><animate attributeName="opacity" values="1;0.5" dur="2s"></animate></g></svg>', { animated: true })!;
    const still = stillSvg(svg);
    expect(still).not.toMatch(/animate/i);
    expect(still).toContain('<circle');
  });
});
