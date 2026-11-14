import { describe, expect, it } from 'vitest';
import { MAX_RING_POINTS, borderLines, isPlain, pathFrom, ringPoints, ringRadii, rosettePaths, rosetteRings } from '../src/bank/guilloche';
import { borders, defaultDesign, type Rosette } from '../src/bank/model';
import { serialNumber } from '../src/bank/serial';
import { signatureFor, signaturePath } from '../src/bank/signature';

const base: Rosette = { lobes: 12, rings: 8, depth: 0.28, ripple: 0.1, turn: 0.5, twist: 3 };

/** Every coordinate a path reaches, following its relative steps. */
function extent(d: string): { minX: number; maxX: number; minY: number; maxY: number } {
  const start = /^M(-?\d+) (-?\d+)l/.exec(d);
  if (!start) throw new Error(`not a stepped path: ${d.slice(0, 40)}`);
  let x = Number(start[1]);
  let y = Number(start[2]);
  const box = { minX: x, maxX: x, minY: y, maxY: y };
  const numbers = (d.slice(start[0].length).match(/-?\d+/g) ?? []).map(Number);
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    x += numbers[i]!;
    y += numbers[i + 1]!;
    box.minX = Math.min(box.minX, x);
    box.maxX = Math.max(box.maxX, x);
    box.minY = Math.min(box.minY, y);
    box.maxY = Math.max(box.maxY, y);
  }
  return box;
}

describe('rosettes', () => {
  it('are the same every time', () => {
    expect(rosettePaths(base, 800, 400, 270)).toEqual(rosettePaths({ ...base }, 800, 400, 270));
  });

  it('change when a number changes', () => {
    const paths = rosettePaths(base, 800, 400, 270).join();
    for (const change of [{ lobes: 13 }, { depth: 0.3 }, { ripple: 0.2 }, { turn: 0.25 }, { twist: 4 }, { rings: 7 }]) {
      expect(rosettePaths({ ...base, ...change }, 800, 400, 270).join(), JSON.stringify(change)).not.toBe(paths);
    }
  });

  it('have one closed path per ring, in whole numbers only', () => {
    const paths = rosettePaths(base, 800, 400, 270);
    expect(paths.length).toBe(8);
    for (const d of paths) expect(d).toMatch(/^M-?\d+ -?\d+l[-\d ]+z$/);
  });

  it('stay inside their radius, and reach it', () => {
    for (const rosette of [base, { ...base, depth: 0.6, ripple: 0.4 }, { ...base, lobes: 3, rings: 1 }, { ...base, lobes: 24, twist: 6, rings: 12 }]) {
      const boxes = rosettePaths(rosette, 800, 400, 270).map(extent);
      for (const box of boxes) {
        expect(box.minX).toBeGreaterThanOrEqual(800 - 271);
        expect(box.maxX).toBeLessThanOrEqual(800 + 271);
        expect(box.minY).toBeGreaterThanOrEqual(400 - 271);
        expect(box.maxY).toBeLessThanOrEqual(400 + 271);
      }
      // The outermost ring touches the radius where its waves peak (angle 0).
      expect(boxes[0]!.maxX).toBe(1070);
    }
  });

  it('nest: each ring is smaller than the one outside it', () => {
    const radii = ringRadii(base, 100);
    expect(radii[0]).toBe(100);
    expect(radii.at(-1)).toBeCloseTo(18, 5);
    for (let i = 1; i < radii.length; i++) expect(radii[i]!).toBeLessThan(radii[i - 1]!);
    expect(ringRadii({ ...base, rings: 1 }, 100)).toEqual([100]);
  });

  it('are plain circles when there are no waves, as on the mock-up', () => {
    const plain = { ...base, depth: 0, ripple: 0, rings: 10 };
    expect(isPlain(plain)).toBe(true);
    const paths = rosettePaths(plain, 1150, 400, 275);
    expect(paths.length).toBe(10);
    for (const d of paths) expect(d).toMatch(/^M\d+ \d+a\d+ \d+ 0 1 0 \d+ 0a\d+ \d+ 0 1 0 -\d+ 0z$/);
  });

  it('are capped, whatever is asked', () => {
    const wild = { lobes: 24, rings: 12, depth: 0.6, ripple: 0.4, turn: 1, twist: 6 };
    expect(ringPoints(wild)).toBe(MAX_RING_POINTS);
    const rings = rosetteRings(wild, 300);
    expect(rings.length).toBe(12);
    for (const ring of rings) expect(ring.length).toBeLessThanOrEqual(MAX_RING_POINTS);
    expect(rosettePaths(wild, 0, 0, 300).join('').length).toBeLessThan(80_000);
    expect(rosettePaths(base, 0, 0, 300).join('').length).toBeLessThan(24_000);
  });

  it('never leave the plane: no NaN, no radius below zero', () => {
    for (const ring of rosetteRings({ ...base, depth: 0.6, ripple: 0.4 }, 100)) {
      for (const p of ring) {
        expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
        expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(100.0001);
      }
    }
  });
});

describe('paths', () => {
  it('are written as steps from point to point', () => {
    expect(pathFrom([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: -5.4 }, { x: 0.2, y: 0.2 }])).toBe('M0 0l10 0 0-5-10 5z');
    expect(pathFrom([{ x: 1, y: 2 }, { x: 3, y: 4 }], false)).toBe('M1 2l2 2');
    expect(pathFrom([])).toBe('');
    expect(pathFrom([{ x: 1, y: 1 }, { x: 1.2, y: 0.9 }])).toBe('');
  });
});

describe('borders', () => {
  it('every pattern draws lines that stay on the note', () => {
    for (const border of borders) {
      for (const [w, h] of [[1300, 680], [1600, 780], [680, 1300], [2000, 1000]] as const) {
        const lines = borderLines(border, w, h, 45, 40);
        expect(lines.length, border).toBeGreaterThan(0);
        for (const line of lines) {
          expect(line.d.length, border).toBeGreaterThan(10);
          expect(line.d).not.toMatch(/NaN|Infinity|\./);
          expect(line.width).toBeGreaterThan(0);
          if (/^M-?\d+ -?\d+l/.test(line.d)) {
            const box = extent(line.d);
            expect(box.minX, border).toBeGreaterThanOrEqual(0);
            expect(box.minY, border).toBeGreaterThanOrEqual(0);
            expect(box.maxX, border).toBeLessThanOrEqual(w);
            expect(box.maxY, border).toBeLessThanOrEqual(h);
          }
        }
      }
    }
  });

  it('each pattern is its own', () => {
    const drawn = borders.map((border) => JSON.stringify(borderLines(border, 1600, 800, 45, 40)));
    expect(new Set(drawn).size).toBe(borders.length);
  });

  it('the stitch is a dashed line', () => {
    expect(borderLines('stitch', 1600, 800, 45, 40)[0]?.dash).toMatch(/^\d+ \d+$/);
  });

  it('gives nothing when there is no room', () => {
    expect(borderLines('guilloche', 100, 100, 45, 40)).toEqual([]);
  });

  it('stays light enough to draw twelve times on a sheet', () => {
    for (const border of borders) {
      const size = borderLines(border, 2000, 1000, 45, 40).reduce((sum, line) => sum + line.d.length, 0);
      expect(size, border).toBeLessThan(40_000);
    }
  });
});

describe('signatures', () => {
  it('the same name always signs the same way', () => {
    expect(signaturePath('Mara Venn', 300, 100)).toBe(signaturePath('Mara Venn', 300, 100));
    expect(signaturePath('  mara   VENN ', 300, 100)).toBe(signaturePath('Mara Venn', 300, 100));
  });

  it('different names sign differently', () => {
    const names = ['Mara Venn', 'Ilse Tarrow', 'Mara Vern', 'A', 'Zo', 'Bartholomew Quillfeather-Ashdown the Third'];
    expect(new Set(names.map((name) => signaturePath(name, 300, 100))).size).toBe(names.length);
  });

  it('is curves in whole numbers, inside its box, give or take a flourish', () => {
    for (const name of ['Mara Venn', 'Ilse Tarrow', 'X', 'Bartholomew Quillfeather-Ashdown the Third', 'Ǻñgström Ølsen', '李雷']) {
      const d = signaturePath(name, 300, 100);
      expect(d, name).toMatch(/^(M-?\d+ -?\d+(C(-?\d+ ){5}-?\d+)+)+$/);
      const numbers = (d.match(/-?\d+/g) ?? []).map(Number);
      for (let i = 0; i + 1 < numbers.length; i += 2) {
        expect(numbers[i]!, name).toBeGreaterThanOrEqual(-30);
        expect(numbers[i]!, name).toBeLessThanOrEqual(330);
        expect(numbers[i + 1]!, name).toBeGreaterThanOrEqual(-25);
        expect(numbers[i + 1]!, name).toBeLessThanOrEqual(125);
      }
      expect(d.length).toBeLessThan(2500);
    }
  });

  it('signs nothing for nobody, and from the title when there is no name', () => {
    expect(signaturePath('', 300, 100)).toBe('');
    expect(signaturePath('   ', 300, 100)).toBe('');
    expect(signaturePath('Mara Venn', 0, 100)).toBe('');
    expect(signatureFor({ name: '', title: 'Governor' }, 300, 100)).toBe(signaturePath('Governor', 300, 100));
    expect(signatureFor({ name: '', title: '' }, 300, 100)).toBe('');
  });
});

describe('serial numbers', () => {
  it('follow the format', () => {
    const design = defaultDesign();
    for (let i = 0; i < design.series.denominations.length; i++) expect(serialNumber(design, i)).toMatch(/^TL \d{7}$/);
    design.note.serial = { prefix: '', digits: 10 };
    expect(serialNumber(design, 0)).toMatch(/^\d{10}$/);
    design.note.serial = { prefix: 'A7', digits: 4 };
    expect(serialNumber(design, 0)).toMatch(/^A7 \d{4}$/);
  });

  it('are the same every time, one per value, and new with a new seed', () => {
    const design = defaultDesign();
    const numbers = design.series.denominations.map((_, i) => serialNumber(design, i));
    expect(design.series.denominations.map((_, i) => serialNumber(defaultDesign(), i))).toEqual(numbers);
    expect(new Set(numbers).size).toBe(numbers.length);
    const reseeded = { ...design, note: { ...design.note, seed: design.note.seed + 1 } };
    expect(serialNumber(reseeded, 0)).not.toBe(numbers[0]);
  });

  it('belong to the value, not to its place in the series', () => {
    const design = defaultDesign();
    const hundred = serialNumber(design, 4);
    design.series.denominations.shift();
    expect(serialNumber(design, 3)).toBe(hundred);
  });
});
