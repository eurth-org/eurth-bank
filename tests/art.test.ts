import { describe, expect, it } from 'vitest';
import { artKinds, artList, artOf, artworks, drawArt } from '../src/bank/art';

describe('our own line art', () => {
  it('has a choice of every kind', () => {
    expect(artList('silhouette').length).toBeGreaterThanOrEqual(6);
    expect(artList('building').length).toBeGreaterThanOrEqual(6);
    expect(artList('landscape').length).toBeGreaterThanOrEqual(4);
    expect(artworks.length).toBe(artKinds.reduce((sum, kind) => sum + artList(kind).length, 0));
  });

  it('gives every drawing its own id, a name and a description', () => {
    const ids = artworks.map((art) => art.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const art of artworks) {
      expect(art.id).toMatch(/^[a-z0-9-]{1,24}$/);
      expect(art.name.length).toBeGreaterThan(2);
      expect(art.about).toMatch(/^a /);
      expect(art.width).toBeGreaterThan(0);
      expect(art.height).toBeGreaterThan(0);
    }
  });

  it('is nothing but path data: no markup, no scripts, no pictures from elsewhere', () => {
    for (const art of artworks) {
      expect(art.shapes.length).toBeGreaterThan(0);
      for (const shape of art.shapes) {
        expect(shape.d, art.id).toMatch(/^M[MLHVCSQTAZmlhvcsqtaz0-9 .-]+$/);
        expect(shape.d).not.toMatch(/NaN|undefined|Infinity|\.\./);
        expect(['fill', 'line', 'wash']).toContain(shape.mode);
      }
    }
  });

  it('has no yurt: that is Eurth\'s own mark', () => {
    expect(artworks.some((art) => /yurt/i.test(art.id + art.name + art.about))).toBe(false);
  });

  it('falls back to the first of a kind for an unknown id', () => {
    expect(artOf('building', 'lighthouse').id).toBe('lighthouse');
    expect(artOf('building', 'no-such-thing').kind).toBe('building');
    expect(artOf('silhouette', '').id).toBe('founder');
    expect(artOf('landscape', 'lighthouse').kind).toBe('landscape');
  });

  it('draws into a box, in one ink, standing silhouettes on the bottom', () => {
    const box = { x: 100, y: 50, w: 400, h: 600 };
    for (const art of artworks) {
      const svg = drawArt(art, box, '#1b6fa0');
      expect(svg).toMatch(/^<g transform="translate\([\d.]+ [\d.]+\) scale\([\d.]+\)">.*<\/g>$/);
      expect(svg).not.toMatch(/<script|<image|href|style=|on\w+=/);
      const colours = svg.match(/#[0-9a-f]{6}/g) ?? [];
      expect(new Set(colours)).toEqual(new Set(['#1b6fa0']));
    }
    const founder = /translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/.exec(drawArt(artOf('silhouette', 'founder'), box, '#000000'))!;
    expect(Number(founder[3])).toBe(4);
    expect(Number(founder[2]) + 120 * Number(founder[3])).toBe(650);
    const hills = /translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/.exec(drawArt(artOf('landscape', 'mountains'), box, '#000000'))!;
    expect(Number(hills[2])).toBeCloseTo(50 + (600 - 80 * Number(hills[3])) / 2, 1);
  });
});
