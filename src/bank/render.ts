/**
 * Drawing a note. One pure function from a design, a place in the series and a side to an SVG:
 * paper, border, rosettes, the portrait slot or vignette, the issuer, the value in numerals and
 * words, signatures, the serial number, a line of microprint, the SPECIMEN overprint and the fine
 * print. Nothing here touches the page, the network or the clock, so the same design is the same
 * picture everywhere.
 *
 * All measures are in tenths of a millimetre, and written as fractions of the note's short side,
 * so every size of note in a series is laid out the same way.
 */
import { artOf, drawArt, type ArtKind, type Box } from './art';
import { mix } from './colors';
import { describeNote, noteName } from './describe';
import { FINE_PRINT, SPECIMEN_TEXT } from './fiction';
import { borderLines, rosettePaths } from './guilloche';
import { UNITS_PER_MM, noteSize, type Denomination, type Design, type Side, type Slot, type Texture } from './model';
import { serialNumber } from './serial';
import { signatureFor } from './signature';
import { esc, fitLines, fitSize, textElement, textWidth, type TextOptions } from './text';
import { noteNumeral, valueInWords } from './words';

/** The colour of the small text on every note. */
export const TEXT_COLOUR = '#222222';
/** The colour of the overprint. It is a word, so it never rests on being red. */
export const SPECIMEN_COLOUR = '#a3231d';

/**
 * Pictures from a loaded profile for the "arms" and "flag" slots, as `data:image/svg+xml` addresses
 * (what @eurth/profile's `svgDataUrl` gives). They are only ever placed as images, never as markup.
 */
export interface Pictures {
  arms?: string;
  flag?: string;
}

export interface RenderOptions {
  pictures?: Pictures;
  /** Makes the ids inside the SVG unique when several notes share a page. */
  idPrefix?: string;
  /** The width of the picture in pixels. The height follows. */
  pixelWidth?: number;
}

export interface NoteParts {
  /** In units: tenths of a millimetre. */
  width: number;
  height: number;
  /** The drawing, without the <svg> element round it. */
  body: string;
  title: string;
  description: string;
}

const r1 = (value: number): number => Math.round(value * 10) / 10;

/**
 * Paper, made rather than photographed: a little generated noise, lit from one side so it reads as
 * the tooth of a sheet, and coloured with the paper's own colour. No picture is downloaded or
 * stored; the same numbers give the same sheet everywhere.
 *  - grain: the fine, even tooth of banknote paper;
 *  - laid: long fibres running with the sheet;
 *  - aged: grain, with the soft clouding of a note that has been about.
 * `seed` varies the sheet from one value to the next, as real sheets differ.
 */
export function paperFilter(id: string, texture: Texture, paper: string, seed: number): string {
  if (texture === 'plain') return '';
  const s = Math.abs(Math.round(seed)) % 997;
  const lit = (frequency: string, octaves: number, scale: number, azimuth: number, elevation: number, result = ''): string =>
    `<feTurbulence type="fractalNoise" baseFrequency="${frequency}" numOctaves="${octaves}" seed="${s}" result="noise"/>` +
    `<feDiffuseLighting in="noise" lighting-color="${paper}" surfaceScale="${scale}" diffuseConstant="${Math.round(100 / Math.sin((elevation * Math.PI) / 180)) / 100}"${result ? ` result="${result}"` : ''}>` +
    `<feDistantLight azimuth="${azimuth}" elevation="${elevation}"/></feDiffuseLighting>`;
  const clip = (input = ''): string => `<feComposite${input ? ` in="${input}"` : ''} in2="SourceGraphic" operator="in"/>`;
  const body =
    texture === 'laid'
      ? lit('0.012 0.12', 4, 1.1, 100, 70) + clip()
      : texture === 'aged'
        ? lit('0.11', 3, 1.3, 135, 72, 'sheet') +
          `<feTurbulence type="fractalNoise" baseFrequency="0.004" numOctaves="3" seed="${s + 1}" result="cloud"/>` +
          '<feColorMatrix in="cloud" type="matrix" values="0 0 0 0 0.45 0 0 0 0 0.3 0 0 0 0 0.1 0 0 0 0.42 -0.1" result="stain"/>' +
          '<feMerge result="both"><feMergeNode in="sheet"/><feMergeNode in="stain"/></feMerge>' +
          clip('both')
        : lit('0.09', 4, 1.6, 135, 70) + clip();
  return `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">${body}</filter>`;
}

/** A picture address we are willing to place: an SVG data address, with nothing that could close the attribute. */
export function safePicture(value: unknown): string {
  if (typeof value !== 'string' || value.length > 800_000) return '';
  return /^data:image\/svg\+xml[;,][A-Za-z0-9%+/=;,.\-_~!*'()@:$&?#[\]]*$/.test(value) ? value : '';
}

interface Ctx {
  design: Design;
  d: Denomination;
  index: number;
  W: number;
  H: number;
  /** The short side: every measure is a fraction of it. */
  m: number;
  /** The margin inside which all content stays. */
  c: number;
  id: string;
  pictures: Pictures;
  tint: string;
}

const text = (x: number, y: number, value: string, options: Omit<TextOptions, 'fill'> & { fill?: string }): string =>
  textElement(x, y, value, { fill: TEXT_COLOUR, ...options });

function rosette(ctx: Ctx, cx: number, cy: number, radius: number): string {
  const paths = rosettePaths(ctx.design.note.rosette, cx, cy, radius);
  return `<g fill="none" stroke="${ctx.d.ink}" stroke-width="${r1(ctx.m * 0.005)}" stroke-opacity="0.5" stroke-linejoin="round">${paths.map((p) => `<path d="${p}"/>`).join('')}</g>`;
}

/** A slot's contents inside a frame: an oval for the portrait, a rounded panel for the vignette. */
function slot(ctx: Ctx, which: Slot, fallback: ArtKind, frame: { oval: true; cx: number; cy: number; rx: number; ry: number } | ({ oval: false } & Box), clipId: string): string {
  if (which.kind === 'none') return '';
  const stroke = r1(ctx.m * 0.0095);
  const shape = frame.oval
    ? `<ellipse cx="${r1(frame.cx)}" cy="${r1(frame.cy)}" rx="${r1(frame.rx)}" ry="${r1(frame.ry)}"`
    : `<rect x="${r1(frame.x)}" y="${r1(frame.y)}" width="${r1(frame.w)}" height="${r1(frame.h)}" rx="${r1(ctx.m * 0.03)}"`;
  const outer: Box = frame.oval ? { x: frame.cx - frame.rx, y: frame.cy - frame.ry, w: frame.rx * 2, h: frame.ry * 2 } : frame;
  const picture = which.kind === 'arms' ? safePicture(ctx.pictures.arms) : which.kind === 'flag' ? safePicture(ctx.pictures.flag) : '';

  let inside: string;
  if (picture) {
    // A picture sits wholly inside the frame: in an oval, inside the rectangle the oval can hold.
    const k = frame.oval ? 0.66 : 0.86;
    const box = { x: outer.x + (outer.w * (1 - k)) / 2, y: outer.y + (outer.h * (1 - k)) / 2, w: outer.w * k, h: outer.h * k };
    inside = `<image href="${esc(picture)}" x="${r1(box.x)}" y="${r1(box.y)}" width="${r1(box.w)}" height="${r1(box.h)}" preserveAspectRatio="xMidYMid meet"/>`;
  } else {
    // Arms or a flag without a profile to take them from: our own line art stands in.
    const kind: ArtKind = which.kind === 'arms' || which.kind === 'flag' ? fallback : (which.kind as ArtKind);
    const art = artOf(kind, which.kind === kind ? which.art : '');
    const box: Box =
      kind === 'silhouette'
        ? { x: outer.x + outer.w * 0.04, y: outer.y + outer.h * 0.12, w: outer.w * 0.92, h: outer.h * 0.88 }
        : frame.oval
          ? { x: outer.x + outer.w * 0.14, y: outer.y + outer.h * 0.16, w: outer.w * 0.72, h: outer.h * 0.68 }
          : { x: outer.x + outer.w * 0.06, y: outer.y + outer.h * 0.07, w: outer.w * 0.88, h: outer.h * 0.86 };
    inside = drawArt(art, box, ctx.d.ink);
  }
  return (
    `<clipPath id="${clipId}">${shape}/></clipPath>` +
    `${shape} fill="${ctx.tint}"/>` +
    `<g clip-path="url(#${clipId})">${inside}</g>` +
    `${shape} fill="none" stroke="${ctx.d.ink}" stroke-width="${stroke}"/>`
  );
}

/** The value in words, in capitals, in up to `maxLines` lines. `grow` says which way extra lines go. */
function wordsFit(ctx: Ctx, x: number, baseline: number, maxWidth: number, maxLines: number, anchor: 'start' | 'middle' | 'end', grow: 'up' | 'down'): { svg: string; size: number } {
  const { currency } = ctx.design;
  if (!currency.name) return { svg: '', size: ctx.m * 0.056 };
  const value = valueInWords(ctx.d.value, currency).toUpperCase();
  const style = { size: ctx.m * 0.056, tracking: ctx.m * 0.006 };
  const fitted = fitLines(value, style, maxWidth, maxLines);
  const leading = fitted.size * 1.22;
  const tracking = (style.tracking * fitted.size) / style.size;
  const svg = fitted.lines
    .map((line, i) => {
      const y = grow === 'up' ? baseline - (fitted.lines.length - 1 - i) * leading : baseline + i * leading;
      return text(x, y, line, { size: fitted.size, tracking, anchor });
    })
    .join('');
  return { svg, size: fitted.size };
}

const words = (...args: Parameters<typeof wordsFit>): string => wordsFit(...args).svg;

/** The numeral, as large as its box allows. Returns the markup and how wide it came out. */
function numeral(ctx: Ctx, x: number, baseline: number, maxSize: number, maxWidth: number, anchor: 'start' | 'middle' | 'end'): { svg: string; width: number; size: number } {
  const value = noteNumeral(ctx.d.value);
  const size = fitSize(value, { size: maxSize }, maxWidth);
  return { svg: text(x, baseline, value, { size, anchor, fill: ctx.d.ink }), width: textWidth(value, { size }), size };
}

/** The signatures, side by side in a row, each over its title. */
function signatures(ctx: Ctx, x: number, y: number, width: number, height: number): string {
  const people = ctx.design.note.signatories;
  if (people.length === 0) return '';
  const gap = ctx.m * 0.04;
  const each = (width - gap * (people.length - 1)) / people.length;
  // Signatures are drawn in a box of 300 by 100 and scaled to fit, so the pen keeps its weight.
  const scale = Math.min(each / 300, height / 100);
  return people
    .map((person, i) => {
      const px = x + i * (each + gap);
      const path = signatureFor(person, 300, 100);
      const scribble = path
        ? `<path d="${path}" transform="translate(${r1(px)} ${r1(y)}) scale(${Math.round(scale * 1000) / 1000})" fill="none" stroke="${TEXT_COLOUR}" stroke-width="${r1((ctx.m * 0.006) / scale)}" stroke-linecap="round" stroke-linejoin="round"/>`
        : '';
      const title = person.title ? text(px, y + height + ctx.m * 0.045, person.title.toUpperCase(), { size: ctx.m * 0.03, tracking: ctx.m * 0.003, maxWidth: each }) : '';
      return scribble + title;
    })
    .join('');
}

/** A hairline of tiny capitals repeating the issuer's name: the microprint. */
function microprint(ctx: Ctx, x: number, baseline: number, width: number, anchor: 'start' | 'middle' = 'start'): string {
  const issuer = ctx.design.currency.issuer.toUpperCase();
  if (!issuer || width <= 0) return '';
  const size = ctx.m * 0.011;
  const count = Math.max(1, Math.floor(width / (size * 0.66)));
  const line = `${issuer} · `.repeat(Math.ceil(count / (issuer.length + 3)) + 1);
  return text(x, baseline, [...line].slice(0, count).join('').trim(), { size, anchor, exactWidth: r1(width), opacity: 0.8 });
}

function front(ctx: Ctx): string {
  const { design, W, H, m, c } = ctx;
  const { currency, note } = design;
  const issuer = currency.issuer.toUpperCase();
  const serial = serialNumber(design, ctx.index);
  const clip = `${ctx.id}-slot`;
  const foot = H - c;

  if (note.layout === 'vertical') {
    const x0 = c;
    const col = W - 2 * c;
    const num = numeral(ctx, W / 2, H * 0.685, m * 0.3, col * 0.92, 'middle');
    return (
      rosette(ctx, W / 2, H * 0.655, m * 0.37) +
      slot(ctx, note.front, 'silhouette', { oval: true, cx: W / 2, cy: H * 0.325, rx: m * 0.3, ry: H * 0.17 }, clip) +
      text(W / 2, c + m * 0.075, issuer, { size: m * 0.075, anchor: 'middle', maxWidth: col }) +
      microprint(ctx, W / 2, c + m * 0.105, col * 0.9, 'middle') +
      num.svg +
      words(ctx, W / 2, H * 0.735, col, 3, 'middle', 'down') +
      signatures(ctx, x0, H * 0.835, col, H * 0.05) +
      text(W / 2, foot, serial, { size: m * 0.05, mono: true, anchor: 'middle' })
    );
  }

  if (note.layout === 'centred') {
    const rx = m * 0.21;
    const ry = m * 0.245;
    const side = W / 2 - rx - m * 0.05 - c; // the room on either side of the portrait
    const lx = c + side / 2;
    const rxc = W - c - side / 2;
    const cy = H * 0.46;
    const radius = Math.min(m * 0.25, side / 2);
    const serialSize = m * 0.04;
    const serialWidth = textWidth(serial, { size: serialSize, mono: true });
    const numSize = m * 0.22;
    const left = numeral(ctx, lx, cy + numSize * 0.36, numSize, side * 0.96, 'middle');
    const right = numeral(ctx, rxc, cy + numSize * 0.36, numSize, side * 0.96, 'middle');
    const sigH = m * 0.1;
    const sigY = foot - m * 0.05 - sigH;
    const people = note.signatories;
    // One signature under each rosette: the first on the left, the second on the right.
    const sign = (who: number, x: number): string =>
      people[who] ? signatures({ ...ctx, design: { ...design, note: { ...note, signatories: [people[who]] } } }, x, sigY, side * 0.8, sigH) : '';
    return (
      rosette(ctx, lx, cy, radius) +
      rosette(ctx, rxc, cy, radius) +
      slot(ctx, note.front, 'silhouette', { oval: true, cx: W / 2, cy: H * 0.49, rx, ry }, clip) +
      text(W / 2, c + m * 0.07, issuer, { size: m * 0.07, anchor: 'middle', maxWidth: W - 2 * (c + serialWidth + m * 0.05) }) +
      microprint(ctx, W / 2, c + m * 0.098, Math.min(W - 2 * (c + serialWidth + m * 0.05), m * 0.9), 'middle') +
      text(W - c, c + m * 0.055, serial, { size: serialSize, mono: true, anchor: 'end' }) +
      text(c, c + m * 0.055, currency.code, { size: serialSize, mono: true }) +
      left.svg +
      right.svg +
      sign(0, c + side * 0.1) +
      sign(1, W - c - side * 0.9) +
      words(ctx, W / 2, foot, W - 2 * c - 2 * side, 2, 'middle', 'up')
    );
  }

  // Portrait left, as on the mock-up: the portrait in an oval, everything else in a column to its right.
  const cx = m * 0.55;
  const rx = m * 0.2375;
  const x0 = cx + rx + m * 0.09;
  const x1 = W - c - m * 0.02;
  const col = x1 - x0;
  const num = numeral(ctx, x1, foot, m * 0.275, col * 0.62, 'end');
  // The words stand beside the numeral when they fit there at a readable size, and above it when not.
  const beside = col - num.width - m * 0.05;
  const besideWords = beside >= m * 0.3 ? wordsFit(ctx, x0, foot, beside, 3, 'start', 'up') : null;
  const wordsBeside = besideWords !== null && besideWords.size >= m * 0.045;
  return (
    rosette(ctx, W - m * 0.5625, H * 0.5, m * 0.34) +
    slot(ctx, note.front, 'silhouette', { oval: true, cx, cy: H * 0.5125, rx, ry: m * 0.2875 }, clip) +
    text(x0, c + m * 0.085, issuer, { size: m * 0.08, maxWidth: col }) +
    microprint(ctx, x0, c + m * 0.118, col) +
    signatures(ctx, x0, H * 0.29, col, m * 0.14) +
    num.svg +
    (wordsBeside ? besideWords.svg : words(ctx, x1, foot - num.size * 0.8 - m * 0.03, col, 2, 'end', 'up')) +
    text(c, foot, serial, { size: m * 0.05, mono: true, maxWidth: x0 - c - m * 0.04 })
  );
}

function back(ctx: Ctx): string {
  const { design, W, H, m, c } = ctx;
  const { currency, note } = design;
  const issuer = currency.issuer.toUpperCase();
  const clip = `${ctx.id}-slot`;
  const foot = H - c;
  const code = currency.code;
  const codeSize = m * 0.056;
  const codeWidth = code ? textWidth(code, { size: codeSize, mono: true }) : 0;

  if (note.layout === 'vertical') {
    const col = W - 2 * c;
    const num = numeral(ctx, W / 2, H * 0.72, m * 0.3, col * 0.92, 'middle');
    return (
      rosette(ctx, W / 2, H * 0.67, m * 0.37) +
      slot(ctx, note.back, 'building', { oval: false, x: c, y: c, w: col, h: H * 0.42 }, clip) +
      num.svg +
      words(ctx, W / 2, H * 0.77, col, 3, 'middle', 'down') +
      text(W / 2, foot - m * 0.09, issuer, { size: m * 0.05, anchor: 'middle', maxWidth: col }) +
      text(W / 2, foot, code, { size: codeSize, mono: true, anchor: 'middle' })
    );
  }

  if (note.layout === 'centred') {
    const side = m * 0.36;
    const panel = { x: c + side, y: c + m * 0.03, w: W - 2 * (c + side), h: H - 2 * c - m * 0.2 };
    const numSize = m * 0.17;
    const first = numeral(ctx, c + side / 2 - m * 0.02, H * 0.5 + numSize * 0.36, numSize, side * 0.9, 'middle');
    const second = numeral(ctx, W - c - side / 2 + m * 0.02, H * 0.5 + numSize * 0.36, numSize, side * 0.9, 'middle');
    return (
      rosette(ctx, c + side / 2 - m * 0.02, H * 0.5, side * 0.52) +
      rosette(ctx, W - c - side / 2 + m * 0.02, H * 0.5, side * 0.52) +
      slot(ctx, note.back, 'building', { oval: false, ...panel }, clip) +
      first.svg +
      second.svg +
      words(ctx, W / 2, foot, panel.w, 2, 'middle', 'up') +
      text(c, c + m * 0.055, issuer, { size: m * 0.04, maxWidth: side - m * 0.04 }) +
      text(W - c, foot, code, { size: codeSize, mono: true, anchor: 'end' })
    );
  }

  // Portrait left turns over to vignette right: the back mirrors the front.
  const panelW = Math.min(W * 0.54, W - 2 * c - m * 0.62);
  const panel = { x: W - c - panelW, y: c + m * 0.02, w: panelW, h: H - 2 * c - m * 0.17 };
  const leftW = panel.x - c - m * 0.06;
  const numSize = m * 0.26;
  const num = numeral(ctx, c + m * 0.01, H * 0.47 + numSize * 0.36, numSize, leftW, 'start');
  return (
    rosette(ctx, c + leftW / 2, H * 0.47, Math.min(m * 0.3, leftW * 0.56)) +
    slot(ctx, note.back, 'building', { oval: false, ...panel }, clip) +
    text(c, c + m * 0.06, issuer, { size: m * 0.05, maxWidth: leftW }) +
    num.svg +
    words(ctx, c, foot, W - 2 * c - codeWidth - m * 0.06, 2, 'start', 'up') +
    text(W - c, foot, code, { size: codeSize, mono: true, anchor: 'end' })
  );
}

/** One side of one note as parts: its size, its drawing and its words. */
export function noteParts(design: Design, index: number, side: Side, options: RenderOptions = {}): NoteParts {
  const { series, note } = design;
  const i = Math.min(Math.max(0, Math.round(index)), series.denominations.length - 1);
  const d = series.denominations[i] as Denomination;
  const size = noteSize(design, i);
  const W = Math.round(size.width * UNITS_PER_MM);
  const H = Math.round(size.height * UNITS_PER_MM);
  const m = Math.min(W, H);
  const id = (options.idPrefix ?? `bank-${d.value}-${side}`).replace(/[^A-Za-z0-9_-]/g, '');
  const ctx: Ctx = { design, d, index: i, W, H, m, c: m * 0.125, id, pictures: options.pictures ?? {}, tint: mix(d.paper, d.accent, 0.2) };

  const edge = Math.round(m * 0.0125);
  const sheet = `<rect x="${edge / 2}" y="${edge / 2}" width="${W - edge}" height="${H - edge}" rx="${Math.round(m * 0.0375)}"`;
  const filter = paperFilter(`${id}-paper`, note.texture, d.paper, note.seed + d.value);
  // The sheet first, textured or flat, then its edge on top, so the edge stays a clean line.
  const paper = `${filter}${sheet} fill="${d.paper}"${filter ? ` filter="url(#${id}-paper)"` : ''}/>${sheet} fill="none" stroke="${d.accent}" stroke-width="${edge}"/>`;
  const border =
    `<g fill="none" stroke="${d.accent}">` +
    borderLines(note.border, W, H, Math.round(m * 0.055), Math.round(m * 0.05))
      .map((line) => `<path d="${line.d}" stroke-width="${line.width}"${line.dash ? ` stroke-dasharray="${line.dash}"` : ''}/>`)
      .join('') +
    '</g>';
  const specimen = note.specimen
    ? `<text x="${r1(W / 2)}" y="${r1(H * 0.56)}" transform="rotate(-12 ${r1(W / 2)} ${r1(H * 0.52)})" font-family="system-ui, Arial, sans-serif" font-size="${r1(m * 0.1)}" font-weight="700" letter-spacing="${r1(m * 0.02)}" text-anchor="middle" fill="${SPECIMEN_COLOUR}" fill-opacity="0.82" textLength="${r1(m * 0.62)}" lengthAdjust="spacingAndGlyphs">${SPECIMEN_TEXT}</text>`
    : '';
  // The fine print sits in the margin, outside the border, where no layout can cover it.
  const fine = text(W / 2, H - m * 0.02, FINE_PRINT, { size: m * 0.021, anchor: 'middle' });

  const name = noteName(design, i);
  return {
    width: W,
    height: H,
    body: paper + border + (side === 'front' ? front(ctx) : back(ctx)) + specimen + fine,
    title: `${name.charAt(0).toUpperCase()}${name.slice(1)}, ${side}`,
    description: describeNote(design, i, side),
  };
}

/** One side of one note as a complete SVG picture, with its title and description inside. */
export function renderNote(design: Design, index: number, side: Side, options: RenderOptions = {}): string {
  const parts = noteParts(design, index, side, options);
  const id = (options.idPrefix ?? `bank-${design.series.denominations[Math.min(Math.max(0, Math.round(index)), design.series.denominations.length - 1)]?.value ?? 0}-${side}`).replace(/[^A-Za-z0-9_-]/g, '');
  const width = Math.round(options.pixelWidth ?? parts.width / 2);
  const height = Math.round((width * parts.height) / parts.width);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${parts.width} ${parts.height}" width="${width}" height="${height}" role="img" aria-labelledby="${id}-title ${id}-desc">` +
    `<title id="${id}-title">${esc(parts.title)}</title><desc id="${id}-desc">${esc(parts.description)}</desc>` +
    parts.body +
    '</svg>'
  );
}
