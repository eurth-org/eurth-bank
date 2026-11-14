/**
 * Signatures: generated scribbles. Nobody's real hand is copied; a name is turned into numbers and
 * the numbers into a scrawl, so the same signatory always signs the same way, on every note of the
 * series and on every device.
 */
import type { Point } from './guilloche';
import { rng } from './random';

/** Smooths a run of points into cubic curves (Catmull-Rom), as SVG path data in whole units. */
function smoothPath(points: readonly Point[]): string {
  if (points.length < 2) return '';
  const p = (i: number): Point => points[Math.min(points.length - 1, Math.max(0, i))] as Point;
  const n = (v: number): string => String(Math.round(v));
  let d = `M${n(p(0).x)} ${n(p(0).y)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const [a, b, c, e] = [p(i - 1), p(i), p(i + 1), p(i + 2)];
    d += `C${n(b.x + (c.x - a.x) / 6)} ${n(b.y + (c.y - a.y) / 6)} ${n(c.x - (e.x - b.x) / 6)} ${n(c.y - (e.y - b.y) / 6)} ${n(c.x)} ${n(c.y)}`;
  }
  return d;
}

const signable = (name: string): string => name.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');

/**
 * A signature for a name, to fit a box `width` by `height` units with its top left at 0,0.
 * Path data to stroke, never to fill. An empty name signs nothing.
 */
export function signaturePath(name: string, width: number, height: number): string {
  const text = signable(name);
  if (!text || width <= 0 || height <= 0) return '';
  const r = rng('signature', text);
  const words = text.split(' ').slice(0, 3);
  const letters = Math.min(16, Math.max(5, [...text.replace(/ /g, '')].length));
  const base = height * r.range(0.56, 0.64);
  const slant = r.range(0.12, 0.3);
  const left = width * 0.05;
  const right = width * r.range(0.8, 0.9);
  const advance = (right - left) / (letters + words.length * 1.5);
  const at = (x: number, y: number): Point => ({ x: x + (base - y) * slant, y });

  const strokes: string[] = [];
  let x = left;
  let made = 0;
  for (const word of words) {
    const points: Point[] = [];
    const count = Math.max(1, Math.round(([...word].length / [...text.replace(/ /g, '')].length) * letters));
    // The capital: a tall stroke up and a loop back down to the line.
    const tall = height * r.range(0.42, 0.52);
    points.push(at(x, base - height * r.range(0, 0.1)), at(x + advance * 0.3, base - tall), at(x + advance * 0.9, base - tall * r.range(0.55, 0.9)), at(x + advance * 0.7, base + height * r.range(0, 0.06)));
    x += advance * 1.5;
    for (let i = 0; i < count && made < letters; i++, made++) {
      const kind = r.next();
      const up = height * (kind > 0.82 ? r.range(0.34, 0.46) : r.range(0.1, 0.22));
      const down = kind < 0.14 ? height * r.range(0.14, 0.26) : height * r.range(-0.02, 0.04);
      points.push(at(x + advance * r.range(0.25, 0.45), base - up));
      // Now and then the pen loops back on itself.
      if (r.next() > 0.6) points.push(at(x + advance * r.range(-0.05, 0.15), base - up * r.range(0.3, 0.6)));
      points.push(at(x + advance * r.range(0.6, 0.85), base + down));
      x += advance;
    }
    strokes.push(smoothPath(points));
    x += advance * 0.5;
  }
  // The flourish: a line swept back under the name.
  const end = Math.min(width * 0.97, x + advance);
  const under = base + height * r.range(0.18, 0.28);
  strokes.push(
    smoothPath([
      { x: end, y: base - height * r.range(0.05, 0.2) },
      { x: end - width * 0.04, y: under - height * 0.04 },
      { x: width * r.range(0.4, 0.6), y: under + height * r.range(-0.03, 0.05) },
      { x: width * r.range(0.04, 0.16), y: under + height * r.range(0, 0.08) },
    ]),
  );
  return strokes.filter(Boolean).join('');
}

/** Whether a signatory signs at all: a name, or failing that a title, to make the scribble from. */
export function signatureFor(signatory: { name: string; title: string }, width: number, height: number): string {
  return signaturePath(signatory.name || signatory.title, width, height);
}
