/**
 * Guilloche: the fine, interlacing line patterns that a geometric lathe engraves on banknotes.
 * Ours come from a handful of numbers and a little trigonometry, so a rosette is the same on every
 * device, and no design ever needs to store a picture of one.
 *
 * A rosette is a nest of closed curves. Each ring is a circle whose radius breathes in and out as
 * it goes round: a slow wave makes the petals, and a finer wave rides on them. Each ring is smaller
 * than the one outside it and turned a little against it, which is what makes the lines cross.
 *
 * Everything here is pure and capped: at most 12 rings of 720 points, in whole tenths of a millimetre.
 */
import type { Border, Rosette } from './model';

export interface Point {
  x: number;
  y: number;
}

/** No ring is drawn with more points than this, whatever the numbers ask for. */
export const MAX_RING_POINTS = 720;
/** The innermost ring's size, as a share of the outermost. */
const INNER = 0.18;

const TAU = Math.PI * 2;

/** How many points a ring needs: enough to keep the finest wave smooth, never more than the cap. */
export function ringPoints(rosette: Rosette): number {
  const waves = rosette.ripple > 0 ? rosette.lobes * rosette.twist : rosette.depth > 0 ? rosette.lobes : 0;
  return Math.min(MAX_RING_POINTS, Math.max(96, waves * 16));
}

/** The radius of each ring, outermost first, for a rosette of the given radius. */
export function ringRadii(rosette: Rosette, radius: number): number[] {
  const n = Math.max(1, Math.round(rosette.rings));
  return Array.from({ length: n }, (_, k) => radius * (n === 1 ? 1 : 1 - ((1 - INNER) * k) / (n - 1)));
}

/** True when the numbers ask for nothing but circles, as on the first mock-up. */
export const isPlain = (rosette: Rosette): boolean => rosette.depth === 0 && rosette.ripple === 0;

/** The rings of a rosette centred on 0,0: one list of points per ring, outermost first. */
export function rosetteRings(rosette: Rosette, radius: number): Point[][] {
  const count = ringPoints(rosette);
  return ringRadii(rosette, radius).map((ringRadius, k) => {
    const phase = TAU * rosette.turn * k;
    const points: Point[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (TAU * i) / count;
      const petal = (rosette.depth * (1 - Math.cos(rosette.lobes * angle + phase))) / 2;
      const fine = (rosette.ripple * (1 - Math.cos(rosette.lobes * rosette.twist * angle - phase))) / 2;
      const r = ringRadius * Math.max(0, 1 - petal - fine);
      points.push({ x: r * Math.cos(angle), y: r * Math.sin(angle) });
    }
    return points;
  });
}

/**
 * Points as SVG path data, rounded to whole units and written as small steps from one point to the
 * next, which keeps a rosette of a few thousand points to a few kilobytes.
 */
export function pathFrom(points: readonly Point[], closed = true): string {
  if (points.length === 0) return '';
  let px = Math.round((points[0] as Point).x);
  let py = Math.round((points[0] as Point).y);
  let d = `M${px} ${py}l`;
  let steps = 0;
  for (let i = 1; i < points.length; i++) {
    const x = Math.round((points[i] as Point).x);
    const y = Math.round((points[i] as Point).y);
    if (x === px && y === py) continue;
    const dx = x - px;
    const dy = y - py;
    d += `${steps > 0 && dx >= 0 ? ' ' : ''}${dx}${dy >= 0 ? ' ' : ''}${dy}`;
    px = x;
    py = y;
    steps++;
  }
  if (steps === 0) return '';
  return closed ? `${d}z` : d;
}

const circlePath = (cx: number, cy: number, r: number): string => {
  const [x, y, rr] = [Math.round(cx), Math.round(cy), Math.round(r)];
  return rr > 0 ? `M${x - rr} ${y}a${rr} ${rr} 0 1 0 ${rr * 2} 0a${rr} ${rr} 0 1 0 ${-rr * 2} 0z` : '';
};

/** A rosette as SVG path data, one path per ring, centred on cx,cy. Stroke them; never fill. */
export function rosettePaths(rosette: Rosette, cx: number, cy: number, radius: number): string[] {
  if (isPlain(rosette)) return ringRadii(rosette, radius).map((r) => circlePath(cx, cy, r)).filter(Boolean);
  return rosetteRings(rosette, radius)
    .map((ring) => pathFrom(ring.map((p) => ({ x: p.x + cx, y: p.y + cy }))))
    .filter(Boolean);
}

/** One line of a border: path data, how heavy to stroke it, and dashes if it has them. */
export interface BorderLine {
  d: string;
  /** The stroke's width, in units. */
  width: number;
  dash?: string;
}

interface Frame {
  /** The length of the whole way round. */
  length: number;
  /** A point on the frame at distance t along it, pushed outwards (or, negative, inwards) by `offset`. */
  at(t: number, offset: number): Point;
}

/** A rectangle with rounded corners, walked clockwise from the top left, with its outward normal. */
function frame(x: number, y: number, w: number, h: number, corner: number): Frame {
  const c = Math.max(0, Math.min(corner, w / 2, h / 2));
  const arc = (Math.PI / 2) * c;
  const sides = [w - 2 * c, h - 2 * c, w - 2 * c, h - 2 * c];
  const length = 2 * (sides[0] as number) + 2 * (sides[1] as number) + 4 * arc;
  // Each stretch: a straight side then the corner after it.
  const corners: [number, number, number][] = [
    [x + w - c, y + c, -Math.PI / 2],
    [x + w - c, y + h - c, 0],
    [x + c, y + h - c, Math.PI / 2],
    [x + c, y + c, Math.PI],
  ];
  const starts: [number, number, number, number][] = [
    [x + c, y, 1, 0],
    [x + w, y + c, 0, 1],
    [x + w - c, y + h, -1, 0],
    [x, y + h - c, 0, -1],
  ];
  return {
    length,
    at(t, offset) {
      let rest = ((t % length) + length) % length;
      for (let i = 0; i < 4; i++) {
        const side = sides[i] as number;
        const [sx, sy, dx, dy] = starts[i] as [number, number, number, number];
        if (rest <= side) {
          // The outward normal of a clockwise walk is the direction turned a quarter turn left.
          return { x: sx + dx * rest + dy * offset, y: sy + dy * rest - dx * offset };
        }
        rest -= side;
        if (rest <= arc || i === 3) {
          const [cx, cy, from] = corners[i] as [number, number, number];
          const angle = from + (c > 0 ? rest / c : 0);
          return { x: cx + (c + offset) * Math.cos(angle), y: cy + (c + offset) * Math.sin(angle) };
        }
        rest -= arc;
      }
      return { x, y };
    },
  };
}

function roundedRect(x: number, y: number, w: number, h: number, corner: number): string {
  const [X, Y, W, H] = [x, y, w, h].map(Math.round) as [number, number, number, number];
  const c = Math.round(Math.max(0, Math.min(corner, W / 2, H / 2)));
  if (W <= 0 || H <= 0) return '';
  if (c === 0) return `M${X} ${Y}h${W}v${H}h${-W}z`;
  return `M${X + c} ${Y}h${W - 2 * c}a${c} ${c} 0 0 1 ${c} ${c}v${H - 2 * c}a${c} ${c} 0 0 1 ${-c} ${c}h${-(W - 2 * c)}a${c} ${c} 0 0 1 ${-c} ${-c}v${-(H - 2 * c)}a${c} ${c} 0 0 1 ${c} ${-c}z`;
}

/** A line that follows the frame with a wave on it: `waves` whole waves, so it meets itself. */
function waveLine(f: Frame, waves: number, amplitude: number, phase: number, shape: (angle: number) => number = Math.sin): string {
  const count = Math.min(2400, Math.max(24, Math.round(waves * 14)));
  const points: Point[] = [];
  for (let i = 0; i < count; i++) {
    const t = (f.length * i) / count;
    points.push(f.at(t, amplitude * shape((TAU * waves * i) / count + phase)));
  }
  return pathFrom(points);
}

/**
 * The border of a note: lines that run round a frame set `inset` units in from the edge, in a band
 * `band` units wide. Six patterns, from two plain rules to a braided guilloche.
 */
export function borderLines(border: Border, width: number, height: number, inset: number, band: number): BorderLine[] {
  const w = width - 2 * inset;
  const h = height - 2 * inset;
  if (w <= band * 4 || h <= band * 4) return [];
  const corner = band * 1.2;
  const fine = Math.max(2, Math.round(band * 0.08));
  const bold = fine * 2;
  const rule = (shift: number, weight = fine, dash?: string, round = corner): BorderLine => ({
    d: roundedRect(inset + shift, inset + shift, w - 2 * shift, h - 2 * shift, Math.max(0, round - shift)),
    width: weight,
    ...(dash ? { dash } : {}),
  });
  const f = frame(inset + band / 2, inset + band / 2, w - band, h - band, Math.max(0, corner - band / 2));
  const waves = (length: number): number => Math.max(8, Math.round(f.length / length));

  switch (border) {
    case 'rules':
      return [rule(0, bold), rule(band * 0.6)];
    case 'stitch':
      return [rule(band * 0.3, fine, `${fine * 3} ${fine * 4}`)];
    case 'wave':
      return [rule(0), { d: waveLine(f, waves(band * 1.6), band * 0.32, 0), width: fine }, rule(band)];
    case 'scallop': {
      const n = waves(band * 1.4);
      // Half waves, all bulging inwards from the outer rule: a row of scallops.
      return [rule(0, bold), { d: waveLine(f, n / 2, band * 0.75, 0, (a) => 0.66 - Math.abs(Math.sin(a))), width: fine }];
    }
    case 'key': {
      // A battlement, side by side: each side has a whole number of teeth and starts and ends on
      // the inner line, so the corners are square and nothing cuts across them.
      const [x0, y0, x1, y1] = [inset + band * 0.8, inset + band * 0.8, inset + w - band * 0.8, inset + h - band * 0.8];
      const tooth = band * 0.6;
      const cornersIn: [number, number][] = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      const points: Point[] = [];
      for (let side = 0; side < 4; side++) {
        const [ax, ay] = cornersIn[side] as [number, number];
        const [bx, by] = cornersIn[(side + 1) % 4] as [number, number];
        const length = Math.hypot(bx - ax, by - ay);
        const [dx, dy] = [(bx - ax) / length, (by - ay) / length];
        const teeth = Math.max(1, Math.round(length / (band * 2)));
        const period = length / teeth;
        points.push({ x: ax, y: ay });
        for (let j = 0; j < teeth; j++) {
          for (const [along, out] of [[0.25, 0], [0.25, 1], [0.75, 1], [0.75, 0]] as const) {
            const s = (j + along) * period;
            points.push({ x: ax + dx * s + dy * tooth * out, y: ay + dy * s - dx * tooth * out });
          }
        }
      }
      return [rule(0, fine, undefined, band * 0.3), { d: pathFrom(points), width: fine }, rule(band, fine, undefined, band)];
    }
    case 'guilloche': {
      const n = waves(band * 2.4);
      return [
        rule(0),
        ...[0, 1, 2].map((k) => ({ d: waveLine(f, n, band * 0.36, (TAU * k) / 3), width: fine })),
        { d: waveLine(f, n * 2, band * 0.14, 0), width: fine },
        rule(band),
      ];
    }
  }
}
