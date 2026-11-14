/**
 * The model. A design is three things: a currency, a series of denominations, and one note design
 * that every denomination shares. From those, Bank draws each note, front and back.
 *
 * Whatever arrives from a link or a file is someone else's input: `cleanDesign` checks and clamps
 * all of it, and a real ISO 4217 code never gets through.
 */
import { cleanColor } from './colors';
import { isRealCode, normaliseCode } from './fiction';
import { schemeColours, type NoteColours } from './schemes';

export const layouts = ['portrait-left', 'centred', 'vertical'] as const;
export type Layout = (typeof layouts)[number];

export const borders = ['rules', 'stitch', 'wave', 'scallop', 'key', 'guilloche'] as const;
export type Border = (typeof borders)[number];

/** How the paper looks: flat colour, or one of three generated textures. See render.ts. */
export const textures = ['plain', 'grain', 'laid', 'aged'] as const;
export type Texture = (typeof textures)[number];

export const slotKinds = ['none', 'silhouette', 'building', 'landscape', 'arms', 'flag'] as const;
export type SlotKind = (typeof slotKinds)[number];

export const sides = ['front', 'back'] as const;
export type Side = (typeof sides)[number];

export interface Currency {
  /** The unit, as one of them is called: "selun". */
  name: string;
  /** More than one: "selun", "tessels". */
  plural: string;
  /** A short sign for prices. */
  symbol: string;
  /** Three letters, never a real ISO 4217 code. Empty until the person gives one. */
  code: string;
  /** Who issues the notes: "Bank of Teland". */
  issuer: string;
}

export interface Denomination extends NoteColours {
  /** A whole number, 0 to a million million. */
  value: number;
}

export interface Series {
  /** Smallest first, no value twice. */
  denominations: Denomination[];
  /** The smallest note's long side and short side, in millimetres. */
  width: number;
  height: number;
  /** How much longer and taller each next value is, in millimetres. */
  stepWidth: number;
  stepHeight: number;
}

/** A guilloche rosette, as a handful of numbers. See guilloche.ts. */
export interface Rosette {
  /** How many petals go round, 3 to 24. */
  lobes: number;
  /** How many curves are nested, 1 to 12. */
  rings: number;
  /** How deep the petals cut, 0 (plain circles) to 0.6. */
  depth: number;
  /** How strong the finer second wave is, 0 to 0.4. */
  ripple: number;
  /** How far each ring is turned against the one outside it, 0 to 1 of a petal. */
  turn: number;
  /** How many fine waves ride on each petal, 2 to 6. */
  twist: number;
}

/** What fills the portrait slot on the front, or the vignette on the back. */
export interface Slot {
  kind: SlotKind;
  /** Which of our drawings, for the silhouette, building and landscape kinds. */
  art: string;
}

export interface Signatory {
  name: string;
  title: string;
}

export interface Serial {
  /** Letters and digits before the number: "TL". */
  prefix: string;
  /** How many digits the number has, 4 to 10. */
  digits: number;
}

export interface NoteDesign {
  layout: Layout;
  border: Border;
  /** The texture of the paper. */
  texture: Texture;
  rosette: Rosette;
  front: Slot;
  back: Slot;
  /** Up to two people who sign the front. */
  signatories: Signatory[];
  serial: Serial;
  /** Where the serial numbers come from. */
  seed: number;
  /** The SPECIMEN overprint. On unless the person switches it off. */
  specimen: boolean;
}

export interface Design {
  currency: Currency;
  series: Series;
  note: NoteDesign;
}

export const LIMITS = {
  name: 40,
  symbol: 4,
  issuer: 60,
  person: 40,
  title: 40,
  art: 24,
  prefix: 4,
  denominations: 12,
  value: 1_000_000_000_000,
  signatories: 2,
  width: [100, 200],
  height: [50, 100],
  stepWidth: [0, 10],
  stepHeight: [0, 5],
  seed: 0xffffffff,
} as const;

const clamp = (value: unknown, min: number, max: number, fallback: number): number => {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};
const int = (value: unknown, min: number, max: number, fallback: number): number => Math.round(clamp(value, min, max, fallback));
const round = (value: number, places: number): number => Math.round(value * 10 ** places) / 10 ** places;
const pick = <T extends string>(value: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value as T) ? (value as T) : fallback;
const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** Plain text of at most `max` characters: no markup, no control characters, single spaces. */
export function cleanText(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  const text = value
    .replace(/[<>\u0000-\u001f\u007f\u2028\u2029]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return [...text].slice(0, max).join('').trim();
}

/** A value a note can carry: a whole number from 0 to a million million, or null. */
export function cleanValue(value: unknown): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' && /^\s*\d+(\.\d+)?\s*$/.test(value) ? Number(value) : NaN;
  if (!Number.isFinite(n) || n < 0 || n > LIMITS.value) return null;
  return Math.round(n);
}

/** A code for the model: three letters, or empty. A real ISO 4217 code is dropped. */
export function cleanCode(value: unknown): string {
  const code = normaliseCode(value);
  return code.length === 3 && !isRealCode(code) ? code : '';
}

const DEFAULT_ROSETTE: Rosette = { lobes: 12, rings: 8, depth: 0.28, ripple: 0.1, turn: 0.5, twist: 3 };

function cleanRosette(value: unknown, base: Rosette): Rosette {
  const r = record(value);
  return {
    lobes: int(r.lobes, 3, 24, base.lobes),
    rings: int(r.rings, 1, 12, base.rings),
    depth: round(clamp(r.depth, 0, 0.6, base.depth), 2),
    ripple: round(clamp(r.ripple, 0, 0.4, base.ripple), 2),
    turn: round(clamp(r.turn, 0, 1, base.turn), 2),
    twist: int(r.twist, 2, 6, base.twist),
  };
}

function cleanSlot(value: unknown, base: Slot): Slot {
  const s = record(value);
  const kind = pick(s.kind, slotKinds, base.kind);
  const art = typeof s.art === 'string' && /^[a-z0-9-]{1,24}$/.test(s.art) ? s.art : kind === base.kind ? base.art : '';
  return { kind, art };
}

function cleanDenominations(value: unknown, base: Denomination[]): Denomination[] {
  if (!Array.isArray(value)) return base.map((d) => ({ ...d }));
  const seen = new Set<number>();
  const list: Denomination[] = [];
  for (const item of value.slice(0, 200)) {
    const d = record(item);
    const v = cleanValue(d.value);
    if (v === null || seen.has(v)) continue;
    seen.add(v);
    list.push({ value: v, paper: cleanColor(d.paper, ''), ink: cleanColor(d.ink, ''), accent: cleanColor(d.accent, '') });
    if (list.length === LIMITS.denominations) break;
  }
  if (list.length === 0) return base.map((d) => ({ ...d }));
  list.sort((a, b) => a.value - b.value);
  const fallback = schemeColours('heritage', list.length);
  return list.map((d, i) => {
    const f = fallback[i] as NoteColours;
    return { value: d.value, paper: d.paper || f.paper, ink: d.ink || f.ink, accent: d.accent || f.accent };
  });
}

/** The design Bank opens with: the 100 selun note of the Bank of Teland, and its five siblings. */
export function defaultDesign(): Design {
  const values = [5, 10, 20, 50, 100, 200];
  const colours = schemeColours('heritage', values.length);
  return {
    currency: { name: 'selun', plural: 'selun', symbol: 'Ŝ', code: 'TLS', issuer: 'Bank of Teland' },
    series: {
      denominations: values.map((value, i) => ({ value, ...(colours[i] as NoteColours) })),
      width: 130,
      height: 68,
      stepWidth: 6,
      stepHeight: 2,
    },
    note: {
      layout: 'portrait-left',
      border: 'stitch',
      texture: 'grain',
      rosette: { ...DEFAULT_ROSETTE },
      front: { kind: 'silhouette', art: 'founder' },
      back: { kind: 'building', art: 'lighthouse' },
      signatories: [
        { name: 'Mara Venn', title: 'Governor' },
        { name: 'Ilse Tarrow', title: 'Chief Cashier' },
      ],
      serial: { prefix: 'TL', digits: 7 },
      seed: 447192,
      specimen: true,
    },
  };
}

/**
 * Any value at all, made into a design that is safe to draw: every text capped and stripped of
 * markup, every number clamped, every unknown choice replaced by the default, and no real code.
 */
export function cleanDesign(input: unknown): Design {
  const base = defaultDesign();
  const root = record(input);
  const c = record(root.currency);
  const s = record(root.series);
  const n = record(root.note);
  const has = (object: Record<string, unknown>, key: string): boolean => typeof object[key] === 'string';

  const name = has(c, 'name') ? cleanText(c.name, LIMITS.name) : base.currency.name;
  const signatories = Array.isArray(n.signatories)
    ? n.signatories
        .slice(0, 20)
        .map((item) => {
          const p = record(item);
          return { name: cleanText(p.name, LIMITS.person), title: cleanText(p.title, LIMITS.title) };
        })
        .filter((p) => p.name || p.title)
        .slice(0, LIMITS.signatories)
    : base.note.signatories;
  const serial = record(n.serial);

  return {
    currency: {
      name,
      plural: has(c, 'plural') ? cleanText(c.plural, LIMITS.name) || name : has(c, 'name') ? name : base.currency.plural,
      symbol: has(c, 'symbol') ? cleanText(c.symbol, LIMITS.symbol) : base.currency.symbol,
      code: 'code' in c ? cleanCode(c.code) : base.currency.code,
      issuer: has(c, 'issuer') ? cleanText(c.issuer, LIMITS.issuer) : base.currency.issuer,
    },
    series: {
      denominations: cleanDenominations(s.denominations, base.series.denominations),
      width: int(s.width, LIMITS.width[0], LIMITS.width[1], base.series.width),
      height: int(s.height, LIMITS.height[0], LIMITS.height[1], base.series.height),
      stepWidth: round(clamp(s.stepWidth, LIMITS.stepWidth[0], LIMITS.stepWidth[1], base.series.stepWidth), 1),
      stepHeight: round(clamp(s.stepHeight, LIMITS.stepHeight[0], LIMITS.stepHeight[1], base.series.stepHeight), 1),
    },
    note: {
      layout: pick(n.layout, layouts, base.note.layout),
      border: pick(n.border, borders, base.note.border),
      texture: pick(n.texture, textures, base.note.texture),
      rosette: cleanRosette(n.rosette, base.note.rosette),
      front: cleanSlot(n.front, base.note.front),
      back: cleanSlot(n.back, base.note.back),
      signatories,
      serial: {
        prefix:
          typeof serial.prefix === 'string'
            ? serial.prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, LIMITS.prefix)
            : base.note.serial.prefix,
        digits: int(serial.digits, 4, 10, base.note.serial.digits),
      },
      seed: int(n.seed, 0, LIMITS.seed, base.note.seed),
      // Only an explicit `false` switches the overprint off; anything else, or nothing, leaves it on.
      specimen: n.specimen !== false,
    },
  };
}

/** Tenths of a millimetre: the unit of every drawing, so coordinates stay whole numbers. */
export const UNITS_PER_MM = 10;

/**
 * The size of one note of the series, in millimetres. Each next value is a step longer and taller.
 * The vertical layout stands the same note on its short side.
 */
export function noteSize(design: Design, index: number): { width: number; height: number } {
  const { series, note } = design;
  const i = Math.min(Math.max(0, Math.round(index)), series.denominations.length - 1);
  const long = Math.round((series.width + series.stepWidth * i) * 10) / 10;
  const short = Math.round((series.height + series.stepHeight * i) * 10) / 10;
  return note.layout === 'vertical' ? { width: short, height: long } : { width: long, height: short };
}

/** The place of a value in the series, or -1. */
export function indexOfValue(design: Design, value: number): number {
  return design.series.denominations.findIndex((d) => d.value === value);
}
