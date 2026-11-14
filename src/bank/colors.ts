/**
 * Colour helpers: cleaning what arrives, measuring contrast and lightness, and naming a colour in
 * plain words for the written description.
 */

/** A colour as #rrggbb in lower case, or the fallback when the value isn't one. */
export function cleanColor(value: unknown, fallback = '#000000'): string {
  if (typeof value !== 'string') return fallback;
  const text = value.trim().toLowerCase().replace(/^#/, '');
  if (/^[0-9a-f]{6}$/.test(text)) return `#${text}`;
  if (/^[0-9a-f]{3}$/.test(text)) return `#${[...text].map((c) => c + c).join('')}`;
  return fallback;
}

export function rgb(color: string): [number, number, number] {
  const hex = cleanColor(color).slice(1);
  return [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];
}

/** Relative luminance, 0 (black) to 1 (white), as WCAG defines it. */
export function luminance(color: string): number {
  const [r, g, b] = rgb(color).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Perceived lightness (CIE L*), 0 to 100. Colours that must be told apart differ in this, not in hue alone. */
export function lightness(color: string): number {
  const y = luminance(color);
  return y <= 216 / 24389 ? (y * 24389) / 27 : 116 * Math.cbrt(y) - 16;
}

/** Hue (0 to 360), saturation and lightness (0 to 1). */
export function hsl(color: string): [number, number, number] {
  const [r, g, b] = rgb(color).map((v) => v / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? ((g - b) / d + 6) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [h * 60, s, l];
}

/** Mixes two colours; amount 0 gives the first, 1 the second. */
export function mix(a: string, b: string, amount: number): string {
  const [x, y] = [rgb(a), rgb(b)];
  const t = Math.min(1, Math.max(0, amount));
  return `#${x.map((v, i) => Math.round(v + ((y[i] ?? 0) - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

const HUES: [number, string][] = [
  [15, 'red'],
  [40, 'orange'],
  [65, 'yellow'],
  [165, 'green'],
  [195, 'teal'],
  [255, 'blue'],
  [290, 'purple'],
  [340, 'pink'],
  [360, 'red'],
];

/** A colour in plain words: "pale blue", "dark green", "parchment", "grey". Never the only way a colour is told. */
export function colourName(color: string): string {
  const [h, s, l] = hsl(color);
  if (l > 0.96) return 'white';
  if (l < 0.08) return 'black';
  if (s < 0.12) return l > 0.75 ? 'pale grey' : l < 0.3 ? 'dark grey' : 'grey';
  if (h >= 25 && h < 65 && l > 0.78) return s < 0.75 ? 'parchment' : 'cream';
  if (h >= 15 && h < 50 && l < 0.45 && s < 0.7) return l < 0.25 ? 'dark brown' : 'brown';
  if (h >= 35 && h < 60 && l < 0.5) return 'ochre';
  const hue = HUES.find(([limit]) => h < limit)?.[1] ?? 'red';
  if (l > 0.72) return `pale ${hue}`;
  if (l < 0.32) return `dark ${hue}`;
  return hue;
}
