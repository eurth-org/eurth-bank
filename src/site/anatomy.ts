/**
 * The guide's figure: Bank's own specimen note, front and back, with numbered markers on the
 * parts the guide explains. Drawn by the engine at build time, never by hand, so the figure is
 * always a note the designer can really make. Build time only.
 */
import { noteParts } from '../bank/render';
import { template } from '../bank/templates';
import type { Side } from '../bank/model';

export interface Callout {
  /** Where the marker sits, as fractions of the note's width and height. */
  at: [number, number];
  label: string;
  /** The heading in the guide that explains it. */
  about: string;
}

export const callouts: Record<Side, Callout[]> = {
  front: [
    { at: [0.2, 0.26], label: 'The portrait', about: 'the-portrait' },
    { at: [0.415, 0.2], label: "The issuer's name", about: 'front-and-back' },
    { at: [0.95, 0.27], label: 'Microprint', about: 'microprint' },
    { at: [0.415, 0.37], label: 'Signatures', about: 'serial-numbers-and-signatures' },
    { at: [0.9, 0.44], label: 'A guilloche rosette', about: 'guilloche-and-rosettes' },
    { at: [0.945, 0.71], label: 'The value in numerals', about: 'the-value-twice' },
    { at: [0.415, 0.8], label: 'The value in words', about: 'the-value-twice' },
    { at: [0.048, 0.83], label: 'The serial number', about: 'serial-numbers-and-signatures' },
    { at: [0.5, 0.082], label: 'The border', about: 'guilloche-and-rosettes' },
    { at: [0.335, 0.69], label: 'The specimen overprint', about: 'why-bank-is-fiction-only' },
    { at: [0.37, 0.975], label: 'The fine print', about: 'why-bank-is-fiction-only' },
  ],
  back: [
    { at: [0.4, 0.15], label: 'The vignette', about: 'the-vignette' },
    { at: [0.215, 0.3], label: 'The value over a rosette', about: 'guilloche-and-rosettes' },
    { at: [0.3, 0.19], label: "The issuer's name", about: 'front-and-back' },
    { at: [0.048, 0.8], label: 'The value in words', about: 'the-value-twice' },
    { at: [0.94, 0.8], label: 'The currency code', about: 'why-bank-is-fiction-only' },
  ],
};

/** One side of the 100 selun note with its markers, as a complete SVG. */
export function anatomySvg(side: Side, colours: { fill: string; text: string }): { svg: string; width: number; height: number; alt: string } {
  const design = template('selun')!.design;
  const index = design.series.denominations.findIndex((d) => d.value === 100);
  const parts = noteParts(design, index, side, { idPrefix: `anatomy-${side}` });
  const r = Math.round(parts.height * 0.034);
  const markers = callouts[side]
    .map(({ at }, i) => {
      const [x, y] = [Math.round(at[0] * parts.width), Math.round(at[1] * parts.height)];
      return (
        `<circle cx="${x}" cy="${y}" r="${r}" fill="${colours.fill}" stroke="${colours.text}" stroke-width="3"/>` +
        `<text x="${x}" y="${y + Math.round(r * 0.36)}" text-anchor="middle" font-family="system-ui, Arial, sans-serif" font-size="${Math.round(r * 1.05)}" font-weight="700" fill="${colours.text}">${i + 1}</text>`
      );
    })
    .join('');
  const alt = `${parts.description} Numbered markers point out: ${callouts[side].map((c, i) => `${i + 1}, ${c.label.charAt(0).toLowerCase()}${c.label.slice(1)}`).join('; ')}.`;
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${parts.width} ${parts.height}" width="${parts.width / 2}" height="${parts.height / 2}">${parts.body}${markers}</svg>`,
    width: parts.width / 2,
    height: parts.height / 2,
    alt,
  };
}
