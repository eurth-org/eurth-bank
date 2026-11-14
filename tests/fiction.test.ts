import { describe, expect, it } from 'vitest';
import { ISO4217_CURRENT, ISO4217_HISTORIC, ISO4217_PUBLISHED } from '../src/bank/data/iso4217';
import {
  FINE_PRINT,
  SPECIMEN_TEXT,
  checkCode,
  isRealCode,
  normaliseCode,
  realCode,
  realCurrencySymbolIn,
  realCurrencyWordIn,
  suggestCodes,
} from '../src/bank/fiction';
import { cleanCode, cleanDesign, defaultDesign } from '../src/bank/model';

const current = Object.keys(ISO4217_CURRENT);
const historic = Object.keys(ISO4217_HISTORIC);

describe('the ISO 4217 snapshot', () => {
  it('is complete enough to trust', () => {
    expect(current.length).toBeGreaterThanOrEqual(170);
    expect(historic.length).toBeGreaterThanOrEqual(100);
    expect(ISO4217_PUBLISHED.current).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(ISO4217_PUBLISHED.historic).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('holds only three capital letters as codes, each with a name, and no code in both lists', () => {
    for (const [code, name] of [...Object.entries(ISO4217_CURRENT), ...Object.entries(ISO4217_HISTORIC)]) {
      expect(code).toMatch(/^[A-Z]{3}$/);
      expect(name.length).toBeGreaterThan(0);
    }
    expect(current.filter((code) => historic.includes(code))).toEqual([]);
  });

  it('knows the codes everyone knows, and the odd ones', () => {
    for (const code of ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'CNY', 'INR', 'BRL', 'ZAR', 'AUD']) expect(current).toContain(code);
    // Funds, metals, testing and "no currency".
    for (const code of ['XAU', 'XAG', 'XDR', 'XTS', 'XXX', 'CHE', 'USN']) expect(current).toContain(code);
    for (const code of ['DEM', 'FRF', 'ITL', 'NLG', 'BEF', 'ESP', 'SUR', 'YUM', 'ZWD']) expect(historic).toContain(code);
  });
});

describe('real codes are refused', () => {
  it('refuses every code in use', () => {
    for (const code of current) {
      const check = checkCode(code);
      expect(check.ok, code).toBe(false);
      if (!check.ok) {
        expect(check.reason).toBe('in use');
        expect(check.message).toContain(code);
        expect(check.message).toContain(ISO4217_CURRENT[code]);
      }
    }
  });

  it('refuses every withdrawn code', () => {
    for (const code of historic) {
      const check = checkCode(code);
      expect(check.ok, code).toBe(false);
      if (!check.ok) expect(check.reason).toBe('withdrawn');
    }
  });

  it('refuses them however they are typed', () => {
    for (const typed of ['usd', 'Usd', ' USD ', 'eur', 'dem']) expect(checkCode(typed).ok, typed).toBe(false);
    expect(isRealCode('usd')).toBe(true);
    expect(realCode('eur')).toEqual({ code: 'EUR', name: 'Euro', status: 'in use' });
    expect(realCode('DEM')?.status).toBe('withdrawn');
  });

  it('says so kindly, without a joke, and offers free codes', () => {
    const check = checkCode('USD', { name: 'selun', issuer: 'Bank of Teland' });
    expect(check.ok).toBe(false);
    if (check.ok) return;
    expect(check.message).toBe('USD is a real currency code (US Dollar). Bank is for fictional money, so please pick another.');
    expect(check.suggestions.length).toBeGreaterThan(0);
    for (const code of check.suggestions) expect(checkCode(code).ok, code).toBe(true);
  });

  it('never lets one into a design, from a link or a file', () => {
    for (const code of [...current, ...historic]) expect(cleanCode(code), code).toBe('');
    expect(cleanCode('usd')).toBe('');
    const design = cleanDesign({ currency: { name: 'dollar', plural: 'dollars', symbol: '$', code: 'USD', issuer: 'Somewhere' } });
    expect(design.currency.code).toBe('');
    // The name and symbol are the person's to choose; only the code is refused.
    expect(design.currency.name).toBe('dollar');
    expect(design.currency.symbol).toBe('$');
  });
});

describe('invented codes are welcome', () => {
  it('accepts three letters that no real currency uses', () => {
    for (const code of ['TLS', 'CWM', 'QQQ', 'ORN', 'ZZZ', 'EUX', 'XEU'.replace('XEU', 'XQQ')]) {
      expect(checkCode(code), code).toEqual({ ok: true, code });
      expect(cleanCode(code)).toBe(code);
    }
    expect(checkCode('tls')).toEqual({ ok: true, code: 'TLS' });
  });

  it('asks for exactly three letters', () => {
    expect(checkCode('')).toMatchObject({ ok: false, reason: 'empty' });
    expect(checkCode(null)).toMatchObject({ ok: false, reason: 'empty' });
    for (const typed of ['T', 'TL', 'TLSS', 'T1S', 'T-S', '123', 'T S']) expect(checkCode(typed), typed).toMatchObject({ ok: false, reason: 'shape' });
    expect(cleanCode('TL')).toBe('');
  });

  it('normalises what it can', () => {
    expect(normaliseCode(' tłs ')).toBe('TS');
    expect(normaliseCode('téls')).toBe('TEL');
    expect(normaliseCode(42)).toBe('');
  });
});

describe('suggested codes', () => {
  it('are free, distinct and built from the names', () => {
    const codes = suggestCodes('selun', 'Bank of Teland');
    expect(codes.length).toBe(5);
    expect(new Set(codes).size).toBe(5);
    expect(codes[0]).toBe('TES');
    for (const code of codes) expect(isRealCode(code), code).toBe(false);
  });

  it('skip the real ones a name would land on', () => {
    // "United dollar" would give USD and UND-like codes; none offered may be real.
    for (const [name, issuer] of [
      ['dollar', 'United States'],
      ['euro', 'Europa'],
      ['mark', 'Deutsche Bank'],
      ['pound', 'Great Britain'],
      ['yen', 'Japan'],
    ] as const) {
      const codes = suggestCodes(name, issuer);
      expect(codes.length).toBeGreaterThan(0);
      for (const code of codes) expect(isRealCode(code), `${name}: ${code}`).toBe(false);
    }
  });

  it('cope with little or nothing to go on', () => {
    expect(suggestCodes('', '')).toEqual([]);
    expect(suggestCodes('ø', '').every((code) => /^[A-Z]{3}$/.test(code))).toBe(true);
    for (const code of suggestCodes('a', '')) expect(isRealCode(code)).toBe(false);
  });
});

describe('real names and symbols, for checking our own presets', () => {
  it('spots real unit words, whatever the case, accents or plural', () => {
    expect(realCurrencyWordIn('dollar')).toBe('dollar');
    expect(realCurrencyWordIn('Teland Dollars')).toBe('dollar');
    expect(realCurrencyWordIn('Bolívar')).toBe('bolivar');
    expect(realCurrencyWordIn('new pesos')).toBe('peso');
    expect(realCurrencyWordIn('Pound Sterling')).toBe('pound sterling');
    expect(realCurrencyWordIn('Złoty')).toBe(null); // ł is its own letter; the plain form is checked instead
    expect(realCurrencyWordIn('zloty')).toBe('zloty');
  });

  it('leaves invented words alone', () => {
    for (const word of ['selun', 'tessel', 'orrin', 'vael', 'drave', 'Calder', 'markets', 'eurth']) expect(realCurrencyWordIn(word), word).toBe(null);
  });

  it('spots real signs', () => {
    for (const sign of ['$', '€', '£', '¥', '₹', '₽', '₿', 'kr', 'zł', 'R$', 'S$']) expect(realCurrencySymbolIn(sign), sign).not.toBe(null);
    for (const sign of ['Ŝ', 'Ŧ', 'K', 'S', 'Ø', '']) expect(realCurrencySymbolIn(sign), sign).toBe(null);
  });
});

describe('the specimen mark and the fine print', () => {
  it('have their fixed wording', () => {
    expect(SPECIMEN_TEXT).toBe('SPECIMEN');
    expect(FINE_PRINT).toBe('fictional currency, bank.eurth.org');
  });

  it('the specimen mark is on by default', () => {
    expect(defaultDesign().note.specimen).toBe(true);
    expect(cleanDesign(undefined).note.specimen).toBe(true);
    expect(cleanDesign({}).note.specimen).toBe(true);
    expect(cleanDesign({ note: {} }).note.specimen).toBe(true);
  });

  it('only an explicit false switches it off', () => {
    for (const value of [undefined, null, 0, '', 'false', 'no', 1, {}, []]) {
      expect(cleanDesign({ note: { specimen: value } }).note.specimen, String(value)).toBe(true);
    }
    expect(cleanDesign({ note: { specimen: false } }).note.specimen).toBe(false);
  });
});
