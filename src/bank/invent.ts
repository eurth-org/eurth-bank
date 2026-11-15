/**
 * Random: a whole invented currency from one number. The unit, the nation, the bank, the code,
 * the sign and the people who sign are all made up from syllables and lists of our own, and
 * anything that happens to land on a real currency's name or code is thrown back and drawn again.
 * The same seed always invents the same currency.
 */
import { artList } from './art';
import { realCurrencySymbolIn, realCurrencyWordIn, suggestCodes } from './fiction';
import { borders, cleanDesign, layouts, textures, type Design } from './model';
import { rosettePresets, seriesPresets, withSeries } from './presets';
import { rng, type Rng } from './random';
import { colourSchemes } from './schemes';

const UNIT_STARTS = ['sel', 'tes', 'or', 'va', 'dra', 'mi', 'bran', 'kes', 'quo', 'ze', 'hal', 'tar', 'lu', 'ny', 'ar', 'ek', 'om', 'fen', 'gal', 'ist', 'jor', 'pel', 'ru', 'sha', 'thu', 'ul', 'wen', 'cor', 'bel', 'dru'];
const UNIT_ENDS = ['un', 'sel', 'rin', 'el', 've', 'rel', 'sa', 'var', 'den', 'mek', 'ral', 'dis', 'ko', 'th', 'gar', 'lim', 'nos', 'ret', 'vik', 'zan', 'lo', 'ta', 'mir', 'ren'];
const PLACE_STARTS = ['Te', 'Mar', 'Quill', 'Sun', 'Kor', 'Est', 'Neth', 'Kes', 'Hal', 'Zhev', 'Ald', 'Orr', 'Vel', 'Bry', 'Cas', 'Dun', 'Fal', 'Gry', 'Hes', 'Ith', 'Lor', 'Myr', 'Nar', 'Oss', 'Pell'];
const PLACE_ENDS = ['land', 'mere', 'haven', 'drift', 'vath', 'avar', 'moor', 'trel', 'cyra', 'any', 'sea', 'wick', 'ora', 'holm', 'gard', 'ia', 'eth', 'stead', 'ford', 'reach'];
const ISSUERS = ['Bank of %', 'Royal Mint of %', 'Reserve Bank of %', 'State Bank of %', '% Treasury', 'National Bank of %', '% Chamber of Coin', 'Harbour Bank of %'];
const FIRST = ['Mara', 'Ilse', 'Odile', 'Tomas', 'Hesper', 'Coll', 'Brenna', 'Jory', 'Vasko', 'Irsa', 'Anselm', 'Linnet', 'Petra', 'Mereth', 'Sorley', 'Ysolde', 'Dain', 'Radomir', 'Elska', 'Wynne', 'Osric', 'Gisel', 'Tavish', 'Nerys'];
const LAST = ['Venn', 'Tarrow', 'Farrant', 'Wreck', 'Dunmore', 'Aveling', 'Skerry', 'Tallow', 'Drenn', 'Molen', 'Corrow', 'Marsh', 'Hollin', 'Gallow', 'Finch', 'Kepp', 'Orrery', 'Vask', 'Ninow', 'Alderby', 'Penhale', 'Throck', 'Quillon', 'Ashby'];
const TITLES: [string, string][] = [
  ['Governor', 'Chief Cashier'],
  ['President of the Bank', 'Secretary'],
  ['Master of the Mint', 'Comptroller'],
  ['Chairman', 'Chief Accountant'],
  ['Grand Treasurer', 'Keeper of the Seal'],
  ['Director', 'Cashier'],
  ['First Reckoner', 'Second Reckoner'],
];
/** A sign for each initial: the letter with a mark no real money uses. */
const SIGNS: Record<string, string> = {
  A: 'Ā', B: 'Ḃ', C: 'Ç', D: 'Ð', E: 'Ē', F: 'Ḟ', G: 'Ĝ', H: 'Ħ', I: 'Ī', J: 'Ĵ', K: 'Ķ', L: 'Ļ', M: 'Ṁ', N: 'Ņ', O: 'Ø', P: 'Ṗ', Q: 'Ǫ', R: 'Ŗ', S: 'Ŝ',
  T: 'Ŧ', U: 'Ū', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ', Y: 'Ŷ', Z: 'Ž',
};

/** A word from two parts that is no real currency's name. */
function coin(r: Rng, starts: readonly string[], ends: readonly string[], fallback: string): string {
  for (let i = 0; i < 20; i++) {
    const word = r.pick(starts) + r.pick(ends);
    if (word.length >= 4 && word.length <= 10 && !realCurrencyWordIn(word) && !/(.)\1\1/.test(word)) return word;
  }
  return fallback;
}

/** A complete invented currency and the nation it belongs to, the same every time for the same seed. */
export function inventCurrency(seed: number): { design: Design; nation: string } {
  const r = rng('invent', seed);
  const name = coin(r, UNIT_STARTS, UNIT_ENDS, 'selun');
  const nation = coin(r, PLACE_STARTS, PLACE_ENDS, 'Teland');
  const issuer = r.pick(ISSUERS).replace('%', nation);
  const plural = /[sxz]$/.test(name) || r.next() < 0.25 ? name : `${name}s`;
  const initial = name.charAt(0).toUpperCase();
  const sign = SIGNS[initial] ?? initial;
  const code = suggestCodes(name, issuer)[0] ?? '';
  // The everyday series mostly; the odd ones now and then, and inflation rarely.
  const everyday = seriesPresets.filter((preset) => preset.id !== 'inflation');
  const series = r.next() < 0.06 ? (seriesPresets.find((preset) => preset.id === 'inflation') ?? everyday[0]!) : r.next() < 0.6 ? everyday[r.int(0, 2)]! : r.pick(everyday);
  const [first, second] = r.pick(TITLES);
  const people = [r.pick(FIRST), r.pick(FIRST)];
  const families = [r.pick(LAST), r.pick(LAST)];
  const frontKind = r.next() < 0.75 ? 'silhouette' : 'building';
  const backKind = r.next() < 0.5 ? 'building' : 'landscape';

  const design = cleanDesign({
    currency: { name, plural, symbol: realCurrencySymbolIn(sign) ? initial : sign, code, issuer },
    series: { width: r.int(124, 140), height: r.int(64, 72), stepWidth: r.pick([0, 4, 5, 6, 7]), stepHeight: r.pick([0, 0, 2, 2, 3]) },
    note: {
      layout: r.pick(layouts),
      border: r.pick(borders),
      texture: r.next() < 0.5 ? 'grain' : r.pick(textures),
      rosette: r.pick(rosettePresets).rosette,
      front: { kind: frontKind, art: r.pick(artList(frontKind)).id },
      back: { kind: backKind, art: r.pick(artList(backKind)).id },
      signatories: [
        { name: `${people[0]} ${families[0]}`, title: first },
        ...(r.next() < 0.8 ? [{ name: `${people[1]} ${families[1] === families[0] ? r.pick(LAST) : families[1]}`, title: second }] : []),
      ],
      serial: { prefix: (code || initial).slice(0, 2), digits: r.int(6, 8) },
      seed: r.int(1, 999_999),
    },
  });
  return { design: withSeries(design, series.values, r.pick(colourSchemes).id), nation };
}

/** A complete invented currency, the same one every time for the same seed. */
export function inventDesign(seed: number): Design {
  return inventCurrency(seed).design;
}
