/**
 * Text on a note. An SVG is drawn with whatever fonts the device has, and Bank downloads none, so
 * the same words can come out wider or narrower from one device to the next. To keep a layout from
 * breaking, every piece of text is given an estimated width and told to fill exactly that
 * (`textLength`): the letters stretch or squeeze by a few per cent, and nothing ever overlaps.
 */

/** The fonts of the suite: the device's own, nothing downloaded. */
export const SANS = 'system-ui, Arial, sans-serif';
export const MONO = 'ui-monospace, Menlo, monospace';

/** Text made safe to put inside SVG markup or an attribute. */
export function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const THIN_SPACE = String.fromCharCode(0x2009);

/** How wide one character is likely to be, in ems, in a typical sans-serif. */
function charWidth(ch: string): number {
  if (ch === ' ') return 0.28;
  if (ch === THIN_SPACE) return 0.18;
  if (ch >= '0' && ch <= '9') return 0.56;
  if ('ijl'.includes(ch)) return 0.24;
  if ('ftrI'.includes(ch)) return 0.33;
  if ('mw'.includes(ch)) return 0.8;
  if ('MW'.includes(ch)) return 0.86;
  if (".,:;'!|·".includes(ch)) return 0.26;
  if ('-()[]/"'.includes(ch)) return 0.36;
  if ((ch.codePointAt(0) ?? 0) >= 0x2e80) return 1;
  if (ch !== ch.toLowerCase()) return 0.67;
  if (ch !== ch.toUpperCase()) return 0.53;
  return 0.58;
}

export interface TextStyle {
  size: number;
  /** Extra space between letters, in units. */
  tracking?: number;
  mono?: boolean;
  bold?: boolean;
}

/** The estimated width of a line of text, in the units of `size`. */
export function textWidth(text: string, style: TextStyle): number {
  const chars = [...text];
  if (chars.length === 0) return 0;
  const ems = style.mono ? chars.length * 0.6 : chars.reduce((sum, ch) => sum + charWidth(ch), 0);
  return ems * style.size * (style.bold && !style.mono ? 1.06 : 1) + (style.tracking ?? 0) * (chars.length - 1);
}

/** The largest size, up to `size`, at which the text fits in `maxWidth`. */
export function fitSize(text: string, style: TextStyle, maxWidth: number): number {
  const width = textWidth(text, style);
  if (width <= maxWidth || width === 0) return style.size;
  // Tracking scales with the size too, so the whole line shrinks in proportion.
  return (style.size * maxWidth) / width;
}

/** Breaks text into lines that fit `maxWidth`, never in the middle of a word. */
export function wrapWords(text: string, style: TextStyle, maxWidth: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ').filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && textWidth(next, style) > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/**
 * Fits text into a box of `maxWidth` and at most `maxLines` lines: wraps it, and if that isn't
 * enough makes it smaller, a little at a time, until it is.
 */
export function fitLines(text: string, style: TextStyle, maxWidth: number, maxLines: number): { lines: string[]; size: number } {
  let size = style.size;
  for (let i = 0; i < 40; i++) {
    const scaled = { ...style, size, tracking: ((style.tracking ?? 0) * size) / style.size };
    const lines = wrapWords(text, scaled, maxWidth);
    if (lines.length <= maxLines && lines.every((line) => textWidth(line, scaled) <= maxWidth)) return { lines, size };
    size *= 0.93;
  }
  const scaled = { ...style, size };
  return { lines: wrapWords(text, scaled, maxWidth).slice(0, maxLines), size };
}

export interface TextOptions extends TextStyle {
  fill: string;
  anchor?: 'start' | 'middle' | 'end';
  opacity?: number;
  /** Shrink the text to fit this width. */
  maxWidth?: number;
  /** Fill exactly this width, whatever the estimate says. */
  exactWidth?: number;
}

const round = (value: number): number => Math.round(value * 10) / 10;

/** One line of text as an SVG element, pinned to its estimated width. */
export function textElement(x: number, y: number, text: string, options: TextOptions): string {
  if (!text) return '';
  const size = options.maxWidth ? fitSize(text, options, options.maxWidth) : options.size;
  const tracking = ((options.tracking ?? 0) * size) / options.size;
  const length = options.exactWidth ?? textWidth(text, { ...options, size, tracking });
  return (
    `<text x="${round(x)}" y="${round(y)}" font-family="${options.mono ? MONO : SANS}" font-size="${round(size)}"` +
    (options.bold ? ' font-weight="700"' : '') +
    (tracking ? ` letter-spacing="${round(tracking)}"` : '') +
    (options.anchor && options.anchor !== 'start' ? ` text-anchor="${options.anchor}"` : '') +
    ` fill="${options.fill}"` +
    (options.opacity !== undefined && options.opacity < 1 ? ` fill-opacity="${options.opacity}"` : '') +
    ` textLength="${round(length)}" lengthAdjust="spacingAndGlyphs">${esc(text)}</text>`
  );
}
