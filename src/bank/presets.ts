/**
 * Presets: ready-made choices for the parts of a design that are tedious to set by hand. A series
 * of values, a rosette, a colour scheme. Each is applied to a design and gives back a new one.
 */
import { cleanDesign, type Design, type Rosette } from './model';
import { colourScheme, schemeColours, type NoteColours } from './schemes';

export interface SeriesPreset {
  id: string;
  name: string;
  about: string;
  /** Smallest first. */
  values: readonly number[];
}

/** Series of values, after the patterns real series follow. */
export const seriesPresets: readonly SeriesPreset[] = [
  { id: 'one-two-five', name: '1, 2, 5', about: 'Each value about double the last: the pattern most series follow, since any amount takes few notes.', values: [5, 10, 20, 50, 100, 200, 500] },
  { id: 'one-five', name: '1, 5', about: 'Fewer notes with bigger steps between them.', values: [1, 5, 10, 50, 100, 500, 1000] },
  { id: 'with-a-twenty', name: 'With a twenty', about: 'Six everyday values, with a twenty between the ten and the fifty.', values: [1, 5, 10, 20, 50, 100] },
  { id: 'threes', name: 'Threes and twenty-fives', about: 'An older habit: a three and a twenty-five where others have a two and a twenty.', values: [1, 3, 5, 10, 25, 50, 100] },
  { id: 'doubles', name: 'Doubles', about: 'Every value twice the last, for a nation of mathematicians.', values: [1, 2, 4, 8, 16, 32, 64] },
  { id: 'dozens', name: 'Dozens', about: 'For a people who count in twelves: a dozen, three dozen, a gross.', values: [1, 3, 6, 12, 36, 72, 144] },
  { id: 'inflation', name: 'Inflation', about: 'A currency in trouble: every new note needs more noughts than the last.', values: [10_000, 100_000, 1_000_000, 10_000_000, 100_000_000, 1_000_000_000, 100_000_000_000, 1_000_000_000_000] },
];

export interface RosettePreset {
  id: string;
  name: string;
  rosette: Rosette;
}

/** Rosettes to start from; every number can then be changed. */
export const rosettePresets: readonly RosettePreset[] = [
  { id: 'classic', name: 'Classic', rosette: { lobes: 12, rings: 8, depth: 0.28, ripple: 0.1, turn: 0.5, twist: 3 } },
  { id: 'rings', name: 'Plain rings', rosette: { lobes: 12, rings: 10, depth: 0, ripple: 0, turn: 0, twist: 2 } },
  { id: 'petals', name: 'Petals', rosette: { lobes: 8, rings: 10, depth: 0.45, ripple: 0, turn: 0.15, twist: 2 } },
  { id: 'sunburst', name: 'Sunburst', rosette: { lobes: 18, rings: 6, depth: 0.15, ripple: 0.25, turn: 0.33, twist: 4 } },
  { id: 'shell', name: 'Shell', rosette: { lobes: 5, rings: 12, depth: 0.6, ripple: 0.05, turn: 0.08, twist: 2 } },
  { id: 'lace', name: 'Lace', rosette: { lobes: 16, rings: 9, depth: 0.2, ripple: 0.12, turn: 0.25, twist: 2 } },
];

/** A design with a new series of values, coloured from a scheme: the whole series from one design. */
export function withSeries(design: Design, values: readonly number[], schemeId = 'heritage'): Design {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const colours = schemeColours(schemeId, sorted.length);
  return cleanDesign({
    ...design,
    series: { ...design.series, denominations: sorted.map((value, i) => ({ value, ...(colours[i] as NoteColours) })) },
  });
}

/** A design with the same values in another scheme's colours. */
export function withScheme(design: Design, schemeId: string): Design {
  return withSeries(design, design.series.denominations.map((d) => d.value), colourScheme(schemeId).id);
}

/** A design with one more value, in the next colour of the scheme its neighbours suggest. */
export function withValue(design: Design, value: number, schemeId = 'heritage'): Design {
  if (design.series.denominations.some((d) => d.value === value)) return design;
  const count = design.series.denominations.length;
  const next = schemeColours(schemeId, count + 1)[count] as NoteColours;
  return cleanDesign({ ...design, series: { ...design.series, denominations: [...design.series.denominations, { value, ...next }] } });
}

/** A design without one of its values. The last note of a series stays. */
export function withoutValue(design: Design, value: number): Design {
  const rest = design.series.denominations.filter((d) => d.value !== value);
  return rest.length === 0 ? design : cleanDesign({ ...design, series: { ...design.series, denominations: rest } });
}
