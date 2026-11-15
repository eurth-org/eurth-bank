/**
 * The pictures the pages show, made at build time by the same engine as the designer: one note
 * for each template, and the two figures of the guide. They are written out as files under
 * /notes/, so a page of twelve templates stays light. Build time only.
 */
import tokens from '@eurth/style/tokens.json';
import { resolveColors } from '@eurth/style';
import { noteParts, renderNote } from '../bank/render';
import { templates } from '../bank/templates';
import type { Design } from '../bank/model';
import { anatomySvg } from './anatomy';

const night = resolveColors(tokens as Parameters<typeof resolveColors>[0], 'dark');
const markers = { fill: night.night ?? '#002b36', text: night.parchment ?? '#fcf6e1' };

/** The note of a series that shows it best on a card: the third value, or the last of a short one. */
export const showIndex = (design: Design): number => Math.min(2, design.series.denominations.length - 1);

export interface Picture {
  name: string;
  svg: string;
  width: number;
  height: number;
  alt: string;
}

export function pictures(): Picture[] {
  const cards = templates.map((t) => {
    const i = showIndex(t.design);
    const parts = noteParts(t.design, i, 'front');
    return { name: t.id, svg: renderNote(t.design, i, 'front', { idPrefix: `template-${t.id}` }), width: parts.width / 2, height: parts.height / 2, alt: parts.description };
  });
  const figures = (['front', 'back'] as const).map((side) => ({ name: `anatomy-${side}`, ...anatomySvg(side, markers) }));
  return [...cards, ...figures];
}

export function picture(name: string): Picture {
  const found = pictures().find((p) => p.name === name);
  if (!found) throw new Error(`No picture called ${name}`);
  return found;
}
