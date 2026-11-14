/**
 * Line art of our own, for the portrait slot and the vignette: silhouettes of nobody in particular,
 * buildings that stand nowhere, and landscapes from no real place. Every path here was drawn for
 * Bank, so a note never borrows a real person's face or a real banknote's engraving.
 *
 * Each drawing is a few paths in a small box. Three ways of inking them:
 *  - `fill`: flat ink, for silhouettes;
 *  - `line`: a stroke in ink, for engraving-style line work;
 *  - `wash`: a pale tint of the ink, for sky, water and shade.
 */

export const artKinds = ['silhouette', 'building', 'landscape'] as const;
export type ArtKind = (typeof artKinds)[number];

export interface ArtShape {
  d: string;
  mode: 'fill' | 'line' | 'wash';
}

export interface Art {
  id: string;
  kind: ArtKind;
  /** What the pickers call it. */
  name: string;
  /** What the written description says: "a silhouette wearing a crown". */
  about: string;
  width: number;
  height: number;
  shapes: readonly ArtShape[];
}

/** The bust every silhouette shares: head, neck and shoulders, facing us, in a box of 100 by 120. */
const HEAD = 'M50 26C60 26 66 34 66 46C66 58 59 66 50 66C41 66 34 58 34 46C34 34 40 26 50 26Z';
const SHOULDERS = 'M43 62H57V76C72 78 86 88 88 120H12C14 88 28 78 43 76Z';

const silhouette = (id: string, name: string, about: string, ...extra: ArtShape[]): Art => ({
  id,
  kind: 'silhouette',
  name,
  about,
  width: 100,
  height: 120,
  shapes: [{ d: SHOULDERS, mode: 'fill' }, { d: HEAD, mode: 'fill' }, ...extra],
});

/** A conifer as three stacked tiers and a trunk. */
const fir = (x: number, top: number, half: number): string => {
  const tier = (64 - top) / 3;
  const w = (i: number): number => Math.round(((half * i) / 3) * 10) / 10;
  const y = (i: number): number => Math.round((top + tier * i) * 10) / 10;
  const right = [1, 2, 3].map((i) => `L${x + w(i)} ${y(i)}${i < 3 ? `L${x + w(i) * 0.4} ${y(i)}` : ''}`).join('');
  const left = [3, 2, 1].map((i) => `L${x - w(i)} ${y(i)}${i > 1 ? `L${x - w(i - 1) * 0.4} ${y(i - 1)}` : ''}`).join('');
  return `M${x} ${top}${right}${left.replace(/L[\d.]+ [\d.]+$/, '')}L${x - w(1)} ${y(1)}ZM${x} 64V70`;
};

const waves = (x: number, y: number, count: number, size = 5): string => `M${x} ${y}q${size} ${-size * 0.8} ${size * 2} 0${`t${size * 2} 0`.repeat(count - 1)}`;

export const artworks: readonly Art[] = [
  silhouette('founder', 'The founder', 'a plain silhouette, head and shoulders', {
    d: 'M43 76L50 90L57 76',
    mode: 'line',
  }),
  silhouette('monarch', 'The monarch', 'a silhouette wearing a crown', {
    d: 'M36 32V15L43 23L50 11L57 23L64 15V32C59 28 41 28 36 32Z',
    mode: 'fill',
  }),
  silhouette(
    'marshal',
    'The marshal',
    'a silhouette in a peaked cap, with epaulettes',
    { d: 'M30 34C30 16 70 16 70 34L75 39C62 35 38 35 25 39Z', mode: 'fill' },
    { d: 'M14 92C18 88 26 86 32 87M86 92C82 88 74 86 68 87M16 97C20 93 27 91 32 92M84 97C80 93 73 91 68 92', mode: 'line' },
  ),
  silhouette('scholar', 'The scholar', 'a silhouette with long hair and a high collar', {
    d: 'M31 48C27 16 73 16 69 48C72 62 71 74 64 82H36C29 74 28 62 31 48Z',
    mode: 'fill',
  }, { d: 'M40 80L50 94L60 80', mode: 'line' }),
  silhouette('navigator', 'The navigator', 'a silhouette in a broad-brimmed hat', {
    d: 'M36 31C36 10 64 10 64 31C76 31 84 33 84 36C84 39 68 41 50 41C32 41 16 39 16 36C16 33 24 31 36 31Z',
    mode: 'fill',
  }),
  silhouette(
    'elder',
    'The elder',
    'a silhouette with a long beard',
    { d: 'M34 46C28 68 38 98 50 104C62 98 72 68 66 46C62 58 38 58 34 46Z', mode: 'fill' },
    { d: 'M35 54C33 74 41 96 50 102C59 96 67 74 65 54M44 66C44 78 46 88 50 94M56 66C56 78 54 88 50 94M50 64V84', mode: 'line' },
  ),

  {
    id: 'lighthouse',
    kind: 'building',
    name: 'Lighthouse',
    about: 'a lighthouse on a rock, its lamp lit',
    width: 120,
    height: 100,
    shapes: [
      { d: 'M49 86L54 36H66L71 86Z', mode: 'wash' },
      {
        d: 'M49 86L54 36H66L71 86M50.6 70H69.4M52.2 54H67.8M50 36H70M52 36V29H68V36M55 29V19H65V29M52 19L60 8L68 19ZM57 86V77a3 3 0 0 1 6 0V86',
        mode: 'line',
      },
      { d: 'M50 22L26 15M50 25L26 31M70 22L94 15M70 25L94 31', mode: 'line' },
      { d: 'M18 92C30 84 42 88 49 86H71C80 85 92 88 104 92', mode: 'line' },
      { d: `${waves(8, 97, 5)}${waves(64, 97, 5)}`, mode: 'line' },
    ],
  },
  {
    id: 'parliament',
    kind: 'building',
    name: 'Parliament',
    about: 'a columned hall with a pediment and a flag',
    width: 120,
    height: 100,
    shapes: [
      { d: 'M16 42L60 18L104 42Z', mode: 'wash' },
      { d: 'M8 92H112M13 86H107M18 80H102M20 80V48M100 80V48M17 48H103V42H17ZM16 42L60 18L104 42M60 18V5h10v7h-10', mode: 'line' },
      { d: 'M27 48V80M33 48V80M40 48V80M46 48V80M57 48V80M63 48V80M74 48V80M80 48V80M87 48V80M93 48V80', mode: 'line' },
      { d: 'M60 27a5 5 0 1 0 .01 0Z', mode: 'line' },
    ],
  },
  {
    id: 'bridge',
    kind: 'building',
    name: 'Bridge',
    about: 'a stone bridge of three arches over water',
    width: 120,
    height: 100,
    shapes: [
      { d: 'M4 46H116V54H4Z', mode: 'wash' },
      { d: 'M4 46H116M4 54H116M34 86C34 58 86 58 86 86M4 86C4 66 26 62 26 86M94 86C94 62 116 66 116 86M26 54V86M34 54V86M86 54V86M94 54V86', mode: 'line' },
      { d: 'M4 38H116M12 38V46M24 38V46M36 38V46M48 38V46M60 38V46M72 38V46M84 38V46M96 38V46M108 38V46', mode: 'line' },
      { d: 'M27 38V26H33V38M26 26L30 20L34 26ZM87 38V26H93V38M86 26L90 20L94 26Z', mode: 'line' },
      { d: `${waves(6, 93, 5, 5.4)}${waves(64, 93, 5, 5.4)}${waves(20, 98, 7, 5.4)}`, mode: 'line' },
    ],
  },
  {
    id: 'tower',
    kind: 'building',
    name: 'Clock tower',
    about: 'a clock tower with a pointed roof',
    width: 120,
    height: 100,
    shapes: [
      { d: 'M44 32L60 8L76 32Z', mode: 'wash' },
      { d: 'M47 92V32H73V92M28 92H92M44 32L60 8L76 32ZM60 8V2M45 54H75M55 92V80a5 5 0 0 1 10 0V92', mode: 'line' },
      { d: 'M60 36a7 7 0 1 0 .01 0ZM60 43V38.5M60 43H63.5', mode: 'line' },
      { d: 'M53 60V72M57 60V72M53 60H57M53 72H57M63 60V72M67 60V72M63 60H67M63 72H67', mode: 'line' },
    ],
  },
  {
    id: 'observatory',
    kind: 'building',
    name: 'Observatory',
    about: 'a domed observatory under three stars',
    width: 120,
    height: 100,
    shapes: [
      { d: 'M34 62A26 26 0 0 1 86 62Z', mode: 'wash' },
      { d: 'M34 62A26 26 0 0 1 86 62ZM34 62V84M86 62V84M28 84H92M22 91H98M55 37L57 62M65 37L63 62M56 84V73H64V84', mode: 'line' },
      { d: 'M60 48L80 24M56.5 45L76.5 21M76.5 21L80 24', mode: 'line' },
      { d: 'M20 18V26M16 22H24M98 12V20M94 16H102M104 42V48M101 45H107', mode: 'line' },
    ],
  },
  {
    id: 'windmill',
    kind: 'building',
    name: 'Windmill',
    about: 'a windmill with four sails',
    width: 120,
    height: 100,
    shapes: [
      { d: 'M46 90L52 46H68L74 90Z', mode: 'wash' },
      { d: 'M46 90L52 46H68L74 90M50 46Q60 32 70 46M24 90H96M56 90V80H64V90M57 60H63V66H57Z', mode: 'line' },
      { d: 'M60 42L88 14M66 36L70 40L92 18L88 14M60 42L88 70M66 48L62 52L84 74L88 70M60 42L32 70M54 48L50 44L28 66L32 70M60 42L32 14M54 36L58 32L36 10L32 14', mode: 'line' },
      { d: 'M60 40a2 2 0 1 0 .01 0Z', mode: 'fill' },
    ],
  },

  {
    id: 'mountains',
    kind: 'landscape',
    name: 'Mountains',
    about: 'a range of snow-capped mountains under the sun',
    width: 120,
    height: 80,
    shapes: [
      { d: 'M0 70L26 32L40 48L62 14L86 52L98 40L120 66V70Z', mode: 'wash' },
      { d: 'M0 70L26 32L40 48L62 14L86 52L98 40L120 66', mode: 'line' },
      { d: 'M51 31L56 37L61 30L66 38L72 31M19 42L24 46L29 40L33 44M92 46L96 50L101 45', mode: 'line' },
      { d: 'M96 10a8 8 0 1 0 .01 0Z', mode: 'line' },
      { d: 'M0 70C24 62 44 68 66 64S104 68 120 62M0 76H120', mode: 'line' },
    ],
  },
  {
    id: 'coast',
    kind: 'landscape',
    name: 'Coast',
    about: 'a cliff over the sea, with gulls and a low sun',
    width: 120,
    height: 80,
    shapes: [
      { d: 'M0 26H32C40 26 44 32 45 40L52 72H0Z', mode: 'wash' },
      { d: 'M0 26H32C40 26 44 32 45 40L52 72M45 40H120M82 40A13 13 0 0 1 108 40', mode: 'line' },
      { d: `${waves(56, 50, 3)}${waves(82, 57, 3)}${waves(60, 65, 5)}${waves(54, 74, 6)}`, mode: 'line' },
      { d: 'M60 20q4-4 8 0q4-4 8 0M88 12q3-3 6 0q3-3 6 0M10 34L16 40M22 32L26 44M8 50L18 54', mode: 'line' },
    ],
  },
  {
    id: 'river',
    kind: 'landscape',
    name: 'River plain',
    about: 'a river winding across a plain towards far hills',
    width: 120,
    height: 80,
    shapes: [
      { d: 'M57 30C42 40 80 46 62 58C46 68 34 72 26 80H70C66 72 62 68 80 58C98 46 52 40 63 30Z', mode: 'wash' },
      { d: 'M0 30H120M0 30C18 20 38 22 56 30M64 30C80 18 104 18 120 30', mode: 'line' },
      { d: 'M57 30C42 40 80 46 62 58C46 68 34 72 26 80M63 30C52 40 98 46 80 58C62 68 66 72 70 80', mode: 'line' },
      { d: 'M0 42L40 38M0 56L44 50M0 72L26 62M120 44L84 40M120 60L92 54M120 76L84 66', mode: 'line' },
      { d: 'M22 10a7 7 0 1 0 .01 0Z', mode: 'line' },
    ],
  },
  {
    id: 'forest',
    kind: 'landscape',
    name: 'Forest',
    about: 'a stand of fir trees under a crescent moon',
    width: 120,
    height: 80,
    shapes: [
      { d: `${fir(30, 22, 11)}${fir(62, 16, 12)}${fir(94, 24, 11)}`, mode: 'wash' },
      { d: `${fir(14, 36, 9)}${fir(30, 22, 11)}${fir(46, 38, 9)}${fir(62, 16, 12)}${fir(78, 32, 10)}${fir(94, 24, 11)}${fir(109, 40, 8)}`, mode: 'line' },
      { d: 'M0 70H120M6 76H50M70 76H116', mode: 'line' },
      { d: 'M104 6A8 8 0 1 0 112 16A6.5 6.5 0 0 1 104 6Z', mode: 'line' },
    ],
  },
];

/** The drawings of one kind, in picker order. */
export function artList(kind: ArtKind): Art[] {
  return artworks.filter((art) => art.kind === kind);
}

/** A drawing by kind and id, or the first of its kind when the id is unknown. */
export function artOf(kind: ArtKind, id: string): Art {
  const list = artList(kind);
  return list.find((art) => art.id === id) ?? (list[0] as Art);
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const n = (value: number): string => String(Math.round(value * 100) / 100);

/**
 * A drawing as SVG markup, scaled to fit a box and inked in one colour. Silhouettes stand on the
 * bottom of the box, so the shoulders meet the frame; everything else is centred.
 */
export function drawArt(art: Art, box: Box, ink: string): string {
  const scale = Math.min(box.w / art.width, box.h / art.height);
  const x = box.x + (box.w - art.width * scale) / 2;
  const y = art.kind === 'silhouette' ? box.y + box.h - art.height * scale : box.y + (box.h - art.height * scale) / 2;
  const d = (mode: ArtShape['mode']): string =>
    art.shapes
      .filter((shape) => shape.mode === mode)
      .map((shape) => shape.d)
      .join('');
  const [wash, line] = [d('wash'), d('line')];
  // Solid shapes go in one group that is made translucent as a whole, so overlapping parts of a
  // silhouette (a hat on a head) stay one flat tone.
  const fills = art.shapes
    .filter((shape) => shape.mode === 'fill')
    .map((shape) => `<path d="${shape.d}"/>`)
    .join('');
  const person = art.kind === 'silhouette';
  return (
    `<g transform="translate(${n(x)} ${n(y)}) scale(${Math.round(scale * 10000) / 10000})">` +
    (wash ? `<path d="${wash}" fill="${ink}" fill-opacity="0.14"/>` : '') +
    (fills ? `<g fill="${ink}"${person ? ' opacity="0.6"' : ''}>${fills}</g>` : '') +
    (line ? `<path d="${line}" fill="none" stroke="${ink}" stroke-width="${person ? '1.6' : '1.2'}" stroke-linecap="round" stroke-linejoin="round"/>` : '') +
    '</g>'
  );
}
