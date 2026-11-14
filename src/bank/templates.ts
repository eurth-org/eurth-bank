/**
 * Templates: twelve complete currencies to start from, for the Templates page. Every one is
 * invented: its nation, its bank, its unit, its code, its sign and the people who sign it. None
 * borrows a real currency's name, symbol or code, and the tests hold every one to that.
 */
import { cleanDesign, type Border, type Design, type Layout, type Rosette, type Signatory, type Slot, type Texture } from './model';
import { rosettePresets, seriesPresets, withSeries } from './presets';

export interface Template {
  id: string;
  /** "The selun of Teland" */
  name: string;
  /** One line for the Templates page. */
  about: string;
  design: Design;
}

interface Spec {
  id: string;
  name: string;
  about: string;
  currency: Design['currency'];
  values: readonly number[];
  scheme: string;
  layout: Layout;
  border: Border;
  texture: Texture;
  rosette: string;
  front: Slot;
  back: Slot;
  signatories: Signatory[];
  prefix: string;
  seed: number;
  size?: [number, number, number, number];
}

const series = (id: string): readonly number[] => seriesPresets.find((preset) => preset.id === id)?.values ?? [];
const rosette = (id: string): Rosette => (rosettePresets.find((preset) => preset.id === id) ?? rosettePresets[0]!).rosette;

function make(spec: Spec): Template {
  const [width, height, stepWidth, stepHeight] = spec.size ?? [130, 68, 6, 2];
  const base = cleanDesign({
    currency: spec.currency,
    series: { width, height, stepWidth, stepHeight },
    note: {
      layout: spec.layout,
      border: spec.border,
      texture: spec.texture,
      rosette: rosette(spec.rosette),
      front: spec.front,
      back: spec.back,
      signatories: spec.signatories,
      serial: { prefix: spec.prefix, digits: 7 },
      seed: spec.seed,
    },
  });
  return { id: spec.id, name: spec.name, about: spec.about, design: withSeries(base, spec.values, spec.scheme) };
}

export const templates: readonly Template[] = [
  make({
    id: 'selun',
    name: 'The selun of Teland',
    about: 'Where Bank starts: parchment, blue ink and a lighthouse on the back.',
    currency: { name: 'selun', plural: 'selun', symbol: 'Ŝ', code: 'TLS', issuer: 'Bank of Teland' },
    values: [5, 10, 20, 50, 100, 200],
    scheme: 'heritage',
    layout: 'portrait-left',
    border: 'stitch',
    texture: 'grain',
    rosette: 'classic',
    front: { kind: 'silhouette', art: 'founder' },
    back: { kind: 'building', art: 'lighthouse' },
    signatories: [{ name: 'Mara Venn', title: 'Governor' }, { name: 'Ilse Tarrow', title: 'Chief Cashier' }],
    prefix: 'TL',
    seed: 447192,
  }),
  make({
    id: 'tessel',
    name: 'The tessel of Marrowmere',
    about: 'A sober republic: white paper, a scholar in the middle and the parliament on the back.',
    currency: { name: 'tessel', plural: 'tessels', symbol: 'Ŧ', code: 'MRT', issuer: 'Reserve Bank of Marrowmere' },
    values: series('one-two-five'),
    scheme: 'harbour',
    layout: 'centred',
    border: 'guilloche',
    texture: 'grain',
    rosette: 'lace',
    front: { kind: 'silhouette', art: 'scholar' },
    back: { kind: 'building', art: 'parliament' },
    signatories: [{ name: 'Odile Farrant', title: 'President of the Bank' }, { name: 'Tomas Wreck', title: 'Secretary' }],
    prefix: 'MR',
    seed: 190431,
  }),
  make({
    id: 'orrin',
    name: 'The orrin of Quillhaven',
    about: 'A kingdom with its monarch on every note, a scalloped edge and a windmill behind.',
    currency: { name: 'orrin', plural: 'orrins', symbol: 'Ø', code: 'QHO', issuer: 'Royal Mint of Quillhaven' },
    values: series('with-a-twenty'),
    scheme: 'garden',
    layout: 'portrait-left',
    border: 'scallop',
    texture: 'laid',
    rosette: 'petals',
    front: { kind: 'silhouette', art: 'monarch' },
    back: { kind: 'building', art: 'windmill' },
    signatories: [{ name: 'Hesper Dunmore', title: 'Master of the Mint' }, { name: 'Coll Aveling', title: 'Comptroller' }],
    prefix: 'QH',
    seed: 771204,
  }),
  make({
    id: 'vael',
    name: 'The vael of Sundrift',
    about: 'Upright notes for a seafaring league, with a navigator above and the coast below.',
    currency: { name: 'vael', plural: 'vaels', symbol: 'Vl', code: 'SDV', issuer: 'Harbour Bank of Sundrift' },
    values: [1, 2, 5, 10, 20, 50],
    scheme: 'harbour',
    layout: 'vertical',
    border: 'wave',
    texture: 'grain',
    rosette: 'shell',
    front: { kind: 'silhouette', art: 'navigator' },
    back: { kind: 'landscape', art: 'coast' },
    signatories: [{ name: 'Brenna Skerry', title: 'Harbour Master' }, { name: 'Jory Tallow', title: 'Purser' }],
    prefix: 'SD',
    seed: 305518,
  }),
  make({
    id: 'drave',
    name: 'The drave of Korvath',
    about: 'A marshal, a clock tower and a key border, in threes and twenty-fives.',
    currency: { name: 'drave', plural: 'draves', symbol: 'Ð', code: 'KVD', issuer: 'State Bank of Korvath' },
    values: series('threes'),
    scheme: 'heritage',
    layout: 'centred',
    border: 'key',
    texture: 'plain',
    rosette: 'sunburst',
    front: { kind: 'silhouette', art: 'marshal' },
    back: { kind: 'building', art: 'tower' },
    signatories: [{ name: 'Vasko Drenn', title: 'Chairman' }, { name: 'Irsa Molen', title: 'Chief Accountant' }],
    prefix: 'KV',
    seed: 620077,
  }),
  make({
    id: 'mirel',
    name: 'The mirel of the Estavar Lakes',
    about: 'Old money: aged paper, a bearded elder and a river winding to the hills.',
    currency: { name: 'mirel', plural: 'mirels', symbol: 'Ṁ', code: 'ELM', issuer: 'Bank of the Estavar Lakes' },
    values: series('one-five'),
    scheme: 'garden',
    layout: 'portrait-left',
    border: 'guilloche',
    texture: 'aged',
    rosette: 'classic',
    front: { kind: 'silhouette', art: 'elder' },
    back: { kind: 'landscape', art: 'river' },
    signatories: [{ name: 'Anselm Corrow', title: 'Governor' }, { name: 'Linnet Marsh', title: 'Deputy Governor' }],
    prefix: 'EL',
    seed: 118860,
  }),
  make({
    id: 'brann',
    name: 'The brann of Nethmoor',
    about: 'A currency in trouble: the noughts keep coming, and the bridge is still standing.',
    currency: { name: 'brann', plural: 'branns', symbol: 'Bn', code: 'NMB', issuer: 'Emergency Treasury of Nethmoor' },
    values: series('inflation'),
    scheme: 'harbour',
    layout: 'portrait-left',
    border: 'rules',
    texture: 'aged',
    rosette: 'rings',
    front: { kind: 'silhouette', art: 'founder' },
    back: { kind: 'building', art: 'bridge' },
    signatories: [{ name: 'Petra Hollin', title: 'Acting Treasurer' }],
    prefix: 'NM',
    seed: 999001,
    size: [140, 70, 0, 0],
  }),
  make({
    id: 'kessa',
    name: 'The kessa of the Kestrel Isles',
    about: 'Islanders who count in twelves: a dozen, three dozen and a gross.',
    currency: { name: 'kessa', plural: 'kessas', symbol: 'Ķ', code: 'KIK', issuer: 'Bank of the Kestrel Isles' },
    values: series('dozens'),
    scheme: 'garden',
    layout: 'vertical',
    border: 'scallop',
    texture: 'laid',
    rosette: 'petals',
    front: { kind: 'building', art: 'lighthouse' },
    back: { kind: 'landscape', art: 'coast' },
    signatories: [{ name: 'Mereth Gallow', title: 'Keeper of the Tally' }, { name: 'Sorley Finch', title: 'Cashier' }],
    prefix: 'KI',
    seed: 144144,
  }),
  make({
    id: 'quorin',
    name: 'The quorin of Halcyra',
    about: 'Every value double the last, an observatory on the back and plain rings for a rosette.',
    currency: { name: 'quorin', plural: 'quorins', symbol: 'Ǫ', code: 'HCQ', issuer: 'Bank of Halcyra' },
    values: series('doubles'),
    scheme: 'harbour',
    layout: 'centred',
    border: 'wave',
    texture: 'plain',
    rosette: 'rings',
    front: { kind: 'silhouette', art: 'scholar' },
    back: { kind: 'building', art: 'observatory' },
    signatories: [{ name: 'Ysolde Kepp', title: 'First Reckoner' }, { name: 'Dain Orrery', title: 'Second Reckoner' }],
    prefix: 'HC',
    seed: 248163,
  }),
  make({
    id: 'zevar',
    name: 'The zevar of Zhevany',
    about: 'An empire in the mountains: a crowned head, a braided border and large values.',
    currency: { name: 'zevar', plural: 'zevars', symbol: 'Ž', code: 'ZVZ', issuer: 'Grand Bank of Zhevany' },
    values: [10, 20, 50, 100, 200, 500, 1000],
    scheme: 'heritage',
    layout: 'portrait-left',
    border: 'guilloche',
    texture: 'laid',
    rosette: 'sunburst',
    front: { kind: 'silhouette', art: 'monarch' },
    back: { kind: 'landscape', art: 'mountains' },
    signatories: [{ name: 'Radomir Vask', title: 'Grand Treasurer' }, { name: 'Elska Ninow', title: 'Keeper of the Seal' }],
    prefix: 'ZV',
    seed: 500250,
    size: [136, 72, 5, 2],
  }),
  make({
    id: 'halden',
    name: 'The halden of Aldersea',
    about: 'Five quiet notes, a stitched edge and a forest under the moon.',
    currency: { name: 'halden', plural: 'haldens', symbol: 'Ħ', code: 'ASH', issuer: 'Aldersea Savings Bank' },
    values: [5, 10, 20, 50, 100],
    scheme: 'garden',
    layout: 'centred',
    border: 'stitch',
    texture: 'grain',
    rosette: 'lace',
    front: { kind: 'silhouette', art: 'elder' },
    back: { kind: 'landscape', art: 'forest' },
    signatories: [{ name: 'Wynne Alderby', title: 'Director' }, { name: 'Osric Penhale', title: 'Cashier' }],
    prefix: 'AS',
    seed: 73310,
  }),
  make({
    id: 'tarn',
    name: 'The tarn of Orrowick',
    about: 'A free city prints its own: upright, key-bordered, with the clock tower everyone meets under.',
    currency: { name: 'tarn', plural: 'tarns', symbol: 'Ţ', code: 'OWT', issuer: 'Orrowick Chamber of Coin' },
    values: [1, 2, 5, 10, 20, 50],
    scheme: 'heritage',
    layout: 'vertical',
    border: 'key',
    texture: 'laid',
    rosette: 'shell',
    front: { kind: 'building', art: 'tower' },
    back: { kind: 'building', art: 'bridge' },
    signatories: [{ name: 'Gisel Throck', title: 'Warden of the Chamber' }],
    prefix: 'OW',
    seed: 860412,
  }),
];

/** A template by its id, or undefined. */
export function template(id: string): Template | undefined {
  return templates.find((t) => t.id === id);
}
