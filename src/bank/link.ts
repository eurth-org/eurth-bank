/**
 * A design lives in its link. Everything Bank needs to draw the series again is packed, compactly
 * and with a version number, into the query string: ?d=1-… A design holds no pictures, only names,
 * numbers and choices, so it always fits. Nothing is kept on a server or in the browser.
 *
 * Whatever arrives in a link is someone else's input: it goes through `cleanDesign`, which checks
 * and clamps all of it, and a real ISO 4217 code never comes out the other side.
 */
import { cleanDesign, sides, type Design, type Side } from './model';

/** The version of the packed form. A link from a newer Bank is not guessed at. */
export const LINK_VERSION = 1;
/** Where Bank lives. */
export const SITE = 'https://bank.eurth.org/';
/** Longer than any design can be; anything beyond it isn't one of ours. */
export const MAX_PACKED = 6000;

/** Which note of the series is in view, and which side. */
export interface View {
  /** The value of the note in view. */
  value: number;
  side: Side;
}

const hex = (colour: string): string => colour.replace(/^#/, '');

/** The design as a short positional list. Order is part of version 1: add at the end, never in the middle. */
function pack(design: Design): unknown[] {
  const { currency: c, series: s, note: n } = design;
  return [
    [c.name, c.plural, c.symbol, c.code, c.issuer],
    [s.width, s.height, s.stepWidth, s.stepHeight],
    s.denominations.map((d) => [d.value, hex(d.paper), hex(d.ink), hex(d.accent)]),
    [n.layout, n.border, n.texture],
    [n.rosette.lobes, n.rosette.rings, n.rosette.depth, n.rosette.ripple, n.rosette.turn, n.rosette.twist],
    [n.front.kind, n.front.art, n.back.kind, n.back.art],
    n.signatories.map((p) => [p.name, p.title]),
    [n.serial.prefix, n.serial.digits],
    n.seed,
    n.specimen ? 1 : 0,
  ];
}

const list = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

function unpack(packed: unknown): Design | null {
  if (!Array.isArray(packed) || packed.length < 10) return null;
  const [c, s, d, n, r, slots, people, serial, seed, specimen] = packed.map((part, i) => (i < 8 ? list(part) : part)) as [
    unknown[], unknown[], unknown[], unknown[], unknown[], unknown[], unknown[], unknown[], unknown, unknown,
  ];
  return cleanDesign({
    currency: { name: c[0], plural: c[1], symbol: c[2], code: c[3], issuer: c[4] },
    series: {
      width: s[0],
      height: s[1],
      stepWidth: s[2],
      stepHeight: s[3],
      denominations: d.map((item) => {
        const [value, paper, ink, accent] = list(item);
        return { value, paper, ink, accent };
      }),
    },
    note: {
      layout: n[0],
      border: n[1],
      texture: n[2],
      rosette: { lobes: r[0], rings: r[1], depth: r[2], ripple: r[3], turn: r[4], twist: r[5] },
      front: { kind: slots[0], art: slots[1] },
      back: { kind: slots[2], art: slots[3] },
      signatories: people.map((item) => {
        const [name, title] = list(item);
        return { name, title };
      }),
      serial: { prefix: serial[0], digits: serial[1] },
      seed,
      // The overprint is on unless the link says, in so many words, that it is off.
      specimen: specimen !== 0,
    },
  });
}

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null;
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
    const bytes = Uint8Array.from(binary, (ch) => ch.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** A design packed for a link: "1-" and then letters, digits, hyphens and underscores only. */
export function encodeDesign(design: Design): string {
  return `${LINK_VERSION}-${toBase64Url(JSON.stringify(pack(cleanDesign(design))))}`;
}

/** The design in a packed text, checked and clamped, or null when the text isn't one of ours. */
export function decodeDesign(packed: unknown): Design | null {
  if (typeof packed !== 'string' || packed.length > MAX_PACKED) return null;
  const match = /^(\d{1,3})-([A-Za-z0-9_-]+)$/.exec(packed);
  if (!match || Number(match[1]) !== LINK_VERSION) return null;
  const json = fromBase64Url(match[2] as string);
  if (json === null) return null;
  try {
    return unpack(JSON.parse(json));
  } catch {
    return null;
  }
}

/** The query string for a design, and for the note in view when it isn't the first one's front. */
export function designQuery(design: Design, view?: View): string {
  const params = new URLSearchParams({ d: encodeDesign(design) });
  if (view && design.series.denominations.some((d) => d.value === view.value)) {
    params.set('n', String(view.value));
    if (view.side === 'back') params.set('s', 'back');
  }
  return params.toString();
}

/** The whole link to a design. */
export function designLink(design: Design, view?: View, site = SITE): string {
  return `${site}?${designQuery(design, view)}`;
}

/** Reads a query string ("?d=1-…&n=100&s=back", with or without the question mark). */
export function readQuery(query: string): { design: Design; view: View } | null {
  if (typeof query !== 'string' || query.length > MAX_PACKED + 200) return null;
  const params = new URLSearchParams(query.replace(/^[^?]*\?/, '').replace(/#.*$/, ''));
  const design = decodeDesign(params.get('d'));
  if (!design) return null;
  const wanted = Number(params.get('n'));
  const found = design.series.denominations.find((d) => d.value === wanted && params.get('n') !== null && /^\d+$/.test(params.get('n') ?? ''));
  const side = params.get('s');
  return {
    design,
    view: { value: (found ?? (design.series.denominations[0] as { value: number })).value, side: sides.includes(side as Side) ? (side as Side) : 'front' },
  };
}

/** Reads a whole link, but only one to Bank itself: a design is never loaded from someone else's address. */
export function readLink(link: unknown, site = SITE): { design: Design; view: View } | null {
  if (typeof link !== 'string' || link.length > MAX_PACKED + 400) return null;
  try {
    const url = new URL(link);
    const home = new URL(site);
    if (url.protocol !== 'https:' || url.host !== home.host) return null;
    return readQuery(url.search);
  } catch {
    return null;
  }
}
