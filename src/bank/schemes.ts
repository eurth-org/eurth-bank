/**
 * Colour schemes: a paper, an ink and an accent for each value of a series, in order from the
 * smallest note up.
 *
 * Real series give every value its own colour so that notes are told apart at a glance. Hue alone
 * fails for colour-blind people, so in every scheme the inks of neighbouring values also differ
 * clearly in lightness, alternating lighter and darker. (The numeral is always there too: colour is
 * never the only sign.) Ink is for large things, the numerals, the line art and the rosettes, and
 * stands at 4:1 or more against its paper; the small text on a note is always charcoal, at 7:1 or
 * more. The tests hold every scheme to all of it.
 */

export interface NoteColours {
  /** The colour of the paper. */
  paper: string;
  /** The main ink: numerals, rosettes, the portrait. */
  ink: string;
  /** The second ink: the edge and the border pattern. */
  accent: string;
}

export interface ColourScheme {
  id: string;
  name: string;
  about: string;
  colours: readonly NoteColours[];
}

export const colourSchemes: readonly ColourScheme[] = [
  {
    id: 'heritage',
    name: 'Heritage',
    about: 'Parchment and pale papers with ochre borders, as on the first mock-up.',
    colours: [
      { paper: '#e3ecd5', ink: '#276d43', accent: '#7a5c1e' },
      { paper: '#f4dcd0', ink: '#5a1f2e', accent: '#96502b' },
      { paper: '#e9d2e6', ink: '#7b4a9e', accent: '#7a5c1e' },
      { paper: '#c9dff0', ink: '#1f3a5f', accent: '#8a5a1c' },
      { paper: '#f3e6c4', ink: '#1b6fa0', accent: '#ab7527' },
      { paper: '#e6e2d6', ink: '#263238', accent: '#8a5a1c' },
      { paper: '#f6e3b8', ink: '#a14a22', accent: '#6b5417' },
      { paper: '#d8e8e4', ink: '#12423d', accent: '#8a5a1c' },
    ],
  },
  {
    id: 'garden',
    name: 'Garden',
    about: 'Soft papers and botanical inks, with grey-green borders.',
    colours: [
      { paper: '#f2ead0', ink: '#86691a', accent: '#4f5d3a' },
      { paper: '#dcebd3', ink: '#1f4d3a', accent: '#5b6b2f' },
      { paper: '#f6dbe0', ink: '#a8325a', accent: '#4f5d3a' },
      { paper: '#e2dcf0', ink: '#3d2a5c', accent: '#5b5470' },
      { paper: '#d5ebe8', ink: '#16757a', accent: '#4f5d3a' },
      { paper: '#f0dfcc', ink: '#4a3520', accent: '#6f5a2a' },
      { paper: '#dfe9c8', ink: '#456f17', accent: '#4f5d3a' },
      { paper: '#f3d9cf', ink: '#6e1f1a', accent: '#6f5a2a' },
    ],
  },
  {
    id: 'harbour',
    name: 'Harbour',
    about: 'Cool white paper for every value, and strong inks that do the telling apart.',
    colours: [
      { paper: '#f4f2ea', ink: '#1b6fa0', accent: '#5a6a72' },
      { paper: '#f4f2ea', ink: '#5a1f2e', accent: '#5a6a72' },
      { paper: '#f4f2ea', ink: '#2c7748', accent: '#5a6a72' },
      { paper: '#f4f2ea', ink: '#3d2a5c', accent: '#5a6a72' },
      { paper: '#f4f2ea', ink: '#a14a22', accent: '#5a6a72' },
      { paper: '#f4f2ea', ink: '#12423d', accent: '#5a6a72' },
      { paper: '#f4f2ea', ink: '#7b4a9e', accent: '#5a6a72' },
      { paper: '#f4f2ea', ink: '#263238', accent: '#5a6a72' },
    ],
  },
];

export const defaultScheme = colourSchemes[0] as ColourScheme;

export function colourScheme(id: string): ColourScheme {
  return colourSchemes.find((scheme) => scheme.id === id) ?? defaultScheme;
}

/**
 * The colours for a series of `count` values, smallest first. Longer series go round the scheme
 * again; since every scheme has an even number of colours, light and dark inks keep alternating.
 */
export function schemeColours(id: string, count: number): NoteColours[] {
  const { colours } = colourScheme(id);
  return Array.from({ length: Math.max(0, count) }, (_, i) => ({ ...(colours[i % colours.length] as NoteColours) }));
}
