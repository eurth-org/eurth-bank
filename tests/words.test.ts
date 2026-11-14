import { describe, expect, it } from 'vitest';
import { MAX_WORDS, formatNumeral, listInWords, noteNumeral, numberToWords, unitFor, valueInWords, valueWithUnit } from '../src/bank/words';

describe('numbers in words', () => {
  const cases: [number, string][] = [
    [0, 'zero'],
    [1, 'one'],
    [7, 'seven'],
    [10, 'ten'],
    [11, 'eleven'],
    [12, 'twelve'],
    [13, 'thirteen'],
    [15, 'fifteen'],
    [18, 'eighteen'],
    [19, 'nineteen'],
    [20, 'twenty'],
    [21, 'twenty-one'],
    [40, 'forty'],
    [69, 'sixty-nine'],
    [80, 'eighty'],
    [99, 'ninety-nine'],
    [100, 'one hundred'],
    [101, 'one hundred and one'],
    [105, 'one hundred and five'],
    [110, 'one hundred and ten'],
    [119, 'one hundred and nineteen'],
    [200, 'two hundred'],
    [250, 'two hundred and fifty'],
    [999, 'nine hundred and ninety-nine'],
    [1000, 'one thousand'],
    [1001, 'one thousand and one'],
    [1010, 'one thousand and ten'],
    [1099, 'one thousand and ninety-nine'],
    [1100, 'one thousand one hundred'],
    [1101, 'one thousand one hundred and one'],
    [2020, 'two thousand and twenty'],
    [5000, 'five thousand'],
    [10000, 'ten thousand'],
    [12345, 'twelve thousand three hundred and forty-five'],
    [20000, 'twenty thousand'],
    [100000, 'one hundred thousand'],
    [100001, 'one hundred thousand and one'],
    [250000, 'two hundred and fifty thousand'],
    [999999, 'nine hundred and ninety-nine thousand nine hundred and ninety-nine'],
    [1000000, 'one million'],
    [1000001, 'one million and one'],
    [1001000, 'one million one thousand'],
    [1500000, 'one million five hundred thousand'],
    [2000050, 'two million and fifty'],
    [10000000, 'ten million'],
    [100000000, 'one hundred million'],
    [1000000000, 'one billion'],
    [1000000001, 'one billion and one'],
    [50000000000, 'fifty billion'],
    [123456789012, 'one hundred and twenty-three billion four hundred and fifty-six million seven hundred and eighty-nine thousand and twelve'],
    [999999999999, 'nine hundred and ninety-nine billion nine hundred and ninety-nine million nine hundred and ninety-nine thousand nine hundred and ninety-nine'],
    [1000000000000, 'one trillion'],
  ];

  it.each(cases)('%i is "%s"', (value, words) => {
    expect(numberToWords(value)).toBe(words);
  });

  it('writes every number from 0 to 9999 without a slip', () => {
    const seen = new Set<string>();
    for (let n = 0; n <= 9999; n++) {
      const words = numberToWords(n);
      expect(words, String(n)).toMatch(/^[a-z]+([ -][a-z]+)*$/);
      expect(words).not.toMatch(/\band and\b|^and\b|\band$|  /);
      seen.add(words);
    }
    expect(seen.size).toBe(10000);
  });

  it('says nothing for what it cannot write', () => {
    for (const value of [-1, 1.5, NaN, Infinity, MAX_WORDS + 1]) expect(numberToWords(value)).toBe('');
  });
});

describe('numerals', () => {
  it('groups thousands', () => {
    expect(formatNumeral(0)).toBe('0');
    expect(formatNumeral(999)).toBe('999');
    expect(formatNumeral(1000)).toBe('1,000');
    expect(formatNumeral(1234567)).toBe('1,234,567');
    expect(formatNumeral(1000000000000)).toBe('1,000,000,000,000');
    expect(formatNumeral(1234567, ' ')).toBe('1 234 567');
  });

  it('on the note, stay plain up to 9999 and take thin spaces after', () => {
    expect(noteNumeral(100)).toBe('100');
    expect(noteNumeral(5000)).toBe('5000');
    expect(noteNumeral(10000)).toBe(`10${String.fromCharCode(0x2009)}000`);
    expect(noteNumeral(1000000).split(String.fromCharCode(0x2009))).toEqual(['1', '000', '000']);
  });
});

describe('values with their unit', () => {
  const selun = { name: 'selun', plural: 'selun' };
  const tessel = { name: 'tessel', plural: 'tessels' };

  it('takes the singular for one and the plural for the rest', () => {
    expect(unitFor(1, tessel)).toBe('tessel');
    expect(unitFor(0, tessel)).toBe('tessels');
    expect(unitFor(2, tessel)).toBe('tessels');
    expect(unitFor(5, { name: 'vael', plural: '' })).toBe('vael');
  });

  it('writes the value both ways', () => {
    expect(valueInWords(100, selun)).toBe('one hundred selun');
    expect(valueInWords(1, tessel)).toBe('one tessel');
    expect(valueInWords(0, tessel)).toBe('zero tessels');
    expect(valueInWords(69, tessel)).toBe('sixty-nine tessels');
    expect(valueWithUnit(20000, tessel)).toBe('20,000 tessels');
  });

  it('writes lists', () => {
    expect(listInWords([])).toBe('');
    expect(listInWords(['5'])).toBe('5');
    expect(listInWords(['5', '10'])).toBe('5 and 10');
    expect(listInWords(['5', '10', '20'])).toBe('5, 10 and 20');
  });
});
