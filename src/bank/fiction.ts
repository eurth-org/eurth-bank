/**
 * Fiction only. Bank makes money that doesn't exist, and these are the rules that keep it so:
 * a real ISO 4217 code is refused wherever it comes from, the presets stay clear of real names and
 * symbols, and every picture says what it is: a specimen of a fictional currency.
 */
import { ISO4217_CURRENT, ISO4217_HISTORIC } from './data/iso4217';

/** The overprint. It has a switch, and the switch starts on. */
export const SPECIMEN_TEXT = 'SPECIMEN';
/** The fine print. It has no switch: every export carries it. */
export const FINE_PRINT = 'fictional currency, bank.eurth.org';

/** A code as Bank holds it: up to three letters, A to Z, in capitals. Anything else is dropped. */
export function normaliseCode(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value
    .normalize('NFD')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 3);
}

export interface RealCode {
  code: string;
  /** The real currency's name, as ISO 4217 lists it. */
  name: string;
  status: 'in use' | 'withdrawn';
}

/** The real currency behind a code, or null when the code is free for fiction. */
export function realCode(value: unknown): RealCode | null {
  const code = normaliseCode(value);
  if (code.length !== 3) return null;
  if (Object.hasOwn(ISO4217_CURRENT, code)) return { code, name: ISO4217_CURRENT[code] as string, status: 'in use' };
  if (Object.hasOwn(ISO4217_HISTORIC, code)) return { code, name: ISO4217_HISTORIC[code] as string, status: 'withdrawn' };
  return null;
}

export const isRealCode = (value: unknown): boolean => realCode(value) !== null;

export type CodeCheck =
  | { ok: true; code: string }
  | {
      ok: false;
      code: string;
      reason: 'empty' | 'shape' | 'in use' | 'withdrawn';
      /** A full sentence for the person. */
      message: string;
      /** Free codes to offer instead, when the currency has a name to build them from. */
      suggestions: string[];
    };

/**
 * Checks a code the person typed. Three letters, and never one the real world uses or has used.
 * Pass the currency's name and issuer to get suggestions with a refusal.
 */
export function checkCode(value: unknown, hint: { name?: string; issuer?: string } = {}): CodeCheck {
  const typed = typeof value === 'string' ? value.trim() : '';
  const code = normaliseCode(typed);
  const suggestions = suggestCodes(hint.name ?? '', hint.issuer ?? '');
  if (typed === '') {
    return { ok: false, code: '', reason: 'empty', message: 'Give the currency a code of three letters, such as TLS.', suggestions };
  }
  if (code.length !== 3 || !/^[A-Za-z]{3}$/.test(typed)) {
    return { ok: false, code, reason: 'shape', message: 'A currency code is three letters, A to Z.', suggestions };
  }
  const real = realCode(code);
  if (real) {
    const verb = real.status === 'in use' ? 'is' : 'was';
    return {
      ok: false,
      code,
      reason: real.status,
      message: `${code} ${verb} a real currency code (${real.name}). Bank is for fictional money, so please pick another.`,
      suggestions: suggestions.filter((s) => s !== code),
    };
  }
  return { ok: true, code };
}

const letters = (text: string): string =>
  text
    .normalize('NFD')
    .toUpperCase()
    .replace(/[^A-Z ]/g, '');

const ISSUER_FILLER = new Set(['BANK', 'OF', 'THE', 'AND', 'ROYAL', 'NATIONAL', 'CENTRAL', 'RESERVE', 'STATE', 'IMPERIAL', 'FEDERAL', 'PEOPLES', 'TREASURY', 'MINT']);

/**
 * Free three-letter codes built from the currency's name and its issuer, the way real codes are:
 * two letters for the country and one for the unit, or the first letters of the name. Never a real one.
 */
export function suggestCodes(name: string, issuer = '', count = 5): string[] {
  const unit = letters(name).replace(/ /g, '');
  const place = letters(issuer)
    .split(' ')
    .filter((word) => word && !ISSUER_FILLER.has(word))
    .join('');
  if (!unit && !place) return [];
  const consonants = unit.slice(1).replace(/[AEIOU]/g, '');
  const candidates: string[] = [];
  const add = (code: string): void => {
    if (/^[A-Z]{3}$/.test(code) && !isRealCode(code) && !candidates.includes(code)) candidates.push(code);
  };
  if (place && unit) add(place.slice(0, 2) + unit[0]);
  if (unit) add(unit.slice(0, 3));
  if (unit) add((unit[0] ?? '') + consonants.slice(0, 2));
  if (place && unit) add((place[0] ?? '') + unit.slice(0, 2));
  if (place && unit) add((place[0] ?? '') + (unit[0] ?? '') + (consonants[0] ?? ''));
  const stem = (place.slice(0, 2) || unit.slice(0, 2)).padEnd(2, unit[0] ?? 'Q');
  if (/^[A-Z]{2}$/.test(stem)) {
    for (const last of unit + consonants + 'ABCDEFGHIJKLMNOPQRSTUVWXYZ') {
      if (candidates.length >= count) break;
      add(stem + last);
    }
  }
  return candidates.slice(0, count);
}

/**
 * The unit words of real currencies, past and present, in plain letters. Our own presets and
 * templates never use one; a person is free to (many a fictional nation has a dollar or a crown).
 */
export const REAL_CURRENCY_WORDS: readonly string[] = [
  'afghani', 'ariary', 'austral', 'baht', 'balboa', 'birr', 'bitcoin', 'bolivar', 'boliviano', 'cedi', 'cent', 'centavo',
  'centime', 'colon', 'cordoba', 'crown', 'cruzado', 'cruzeiro', 'dalasi', 'denar', 'dinar', 'dirham', 'dobra', 'dollar',
  'dong', 'drachma', 'dram', 'ducat', 'ekwele', 'escudo', 'euro', 'farthing', 'florin', 'forint', 'franc', 'gourde',
  'groat', 'guarani', 'guilder', 'guinea', 'gulden', 'hryvnia', 'inti', 'karbovanets', 'kina', 'kip', 'kopek', 'koruna',
  'krona', 'krone', 'kroon', 'kuna', 'kwacha', 'kwanza', 'kyat', 'lari', 'lats', 'lek', 'lempira', 'leone', 'leu', 'lev',
  'lilangeni', 'lira', 'litas', 'loti', 'manat', 'mark', 'markka', 'metical', 'naira', 'nakfa', 'ngultrum', 'obol',
  'ouguiya', 'paanga', 'pataca', 'penny', 'pence', 'peseta', 'peso', 'pfennig', 'piastre', 'pound', 'pula', 'punt',
  'quetzal', 'rand', 'real', 'reichsmark', 'renminbi', 'rial', 'riel', 'ringgit', 'riyal', 'rouble', 'ruble', 'rufiyaa',
  'rupee', 'rupiah', 'schilling', 'shekel', 'sheqel', 'shilling', 'sol', 'som', 'somoni', 'sterling', 'sucre', 'sum',
  'syli', 'taka', 'tala', 'talonas', 'tenge', 'thaler', 'tolar', 'tugrik', 'vatu', 'won', 'yen', 'yuan', 'zaire', 'zloty',
];

/** Signs and abbreviations that stand for real money. Our presets never use one. */
export const REAL_CURRENCY_SYMBOLS: readonly string[] = [
  '$', '¢', '£', '¤', '¥', '֏', '؋', '৲', '৳', '૱', '௹', '฿', '៛', '₠', '₡', '₢', '₣', '₤', '₥', '₦', '₧', '₨', '₩', '₪',
  '₫', '€', '₭', '₮', '₯', '₰', '₱', '₲', '₳', '₴', '₵', '₶', '₷', '₸', '₹', '₺', '₻', '₼', '₽', '₾', '₿', '﷼', 'ƒ',
  'zł', 'Kč', 'kr', 'Fr', 'CHF', 'Ft', 'лв', 'Rp', 'RM', 'Rs', 'R$', 'S/', 'Bs', 'Lei', 'DM',
];

const plain = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[\u0300-\u036f’']/g, '')
    .toLowerCase();

const REAL_WORDS = new Set(REAL_CURRENCY_WORDS);
const REAL_NAMES = new Set([...Object.values(ISO4217_CURRENT), ...Object.values(ISO4217_HISTORIC)].map((name) => plain(name)));

/** The real unit word or real currency name found in a text ("Teland dollars" gives "dollar"), or null. */
export function realCurrencyWordIn(text: string): string | null {
  const whole = plain(text).trim();
  if (whole && REAL_NAMES.has(whole)) return whole;
  for (const word of whole.split(/[^a-z]+/).filter(Boolean)) {
    for (const form of [word, word.replace(/s$/, ''), word.replace(/es$/, ''), word.replace(/i$/, '')]) {
      if (REAL_WORDS.has(form)) return form;
    }
  }
  return null;
}

/** The real money sign found in a symbol, or null. Letters are compared exactly: "kr" is real, "K" is not. */
export function realCurrencySymbolIn(symbol: string): string | null {
  const text = symbol.trim();
  for (const real of REAL_CURRENCY_SYMBOLS) {
    const lettersOnly = /^[\p{L}/$]+$/u.test(real) && real.length > 1;
    if (lettersOnly ? text === real : text.includes(real)) return real;
  }
  return null;
}
