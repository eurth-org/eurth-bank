/**
 * A value in numerals and in words, as a note carries both: "100" and "ONE HUNDRED SELUN".
 * Words are British English: "one hundred and five", "two thousand and twenty", with a billion as
 * a thousand million and a trillion as a million million.
 */
import type { Currency } from './model';

const ONES = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen',
  'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen',
];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES = ['', 'thousand', 'million', 'billion', 'trillion'];

/** The largest value Bank writes out: a million million. */
export const MAX_WORDS = 1_000_000_000_000;

function belowHundred(n: number): string {
  if (n < 20) return ONES[n] as string;
  const tens = TENS[Math.floor(n / 10)] as string;
  return n % 10 === 0 ? tens : `${tens}-${ONES[n % 10]}`;
}

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  if (hundreds === 0) return belowHundred(rest);
  return rest === 0 ? `${ONES[hundreds]} hundred` : `${ONES[hundreds]} hundred and ${belowHundred(rest)}`;
}

/**
 * A whole number from 0 to a million million in words. Anything else gives an empty text.
 * "And" comes after the hundreds, and before a last part below a hundred: "one thousand and one".
 */
export function numberToWords(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > MAX_WORDS) return '';
  if (value === 0) return ONES[0] as string;
  const groups: number[] = [];
  for (let rest = value; rest > 0; rest = Math.floor(rest / 1000)) groups.push(rest % 1000);
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    const group = groups[i] as number;
    if (group === 0) continue;
    const words = belowThousand(group);
    if (i === 0) parts.push(parts.length > 0 && group < 100 ? `and ${words}` : words);
    else parts.push(`${words} ${SCALES[i]}`);
  }
  return parts.join(' ');
}

/** A number with its thousands grouped: "1,000,000". */
export function formatNumeral(value: number, separator = ','): string {
  if (!Number.isFinite(value)) return '';
  return String(Math.round(Math.abs(value))).replace(/\B(?=(\d{3})+(?!\d))/g, separator);
}

/**
 * The numeral as it stands on the note: plain digits up to 9999, then groups of three with a thin
 * space between, since a long row of noughts is hard to count.
 */
export function noteNumeral(value: number): string {
  return value < 10_000 ? formatNumeral(value, '') : formatNumeral(value, String.fromCharCode(0x2009));
}

/** The unit for a value: the singular for exactly one, the plural for everything else, 0 included. */
export function unitFor(value: number, currency: Pick<Currency, 'name' | 'plural'>): string {
  return value === 1 ? currency.name : currency.plural || currency.name;
}

/** "one hundred selun": the value in words with its unit. */
export function valueInWords(value: number, currency: Pick<Currency, 'name' | 'plural'>): string {
  return `${numberToWords(value)} ${unitFor(value, currency)}`.trim();
}

/** "100 selun": the value in numerals with its unit. */
export function valueWithUnit(value: number, currency: Pick<Currency, 'name' | 'plural'>): string {
  return `${formatNumeral(value)} ${unitFor(value, currency)}`.trim();
}

/** A list in words: "5, 10 and 20". */
export function listInWords(items: readonly string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}
