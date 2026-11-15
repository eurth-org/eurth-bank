import { describe, expect, it } from 'vitest';
import { checkCode, realCurrencySymbolIn, realCurrencyWordIn } from '../src/bank/fiction';
import { inventDesign } from '../src/bank/invent';
import { decodeDesign, encodeDesign } from '../src/bank/link';
import { cleanDesign } from '../src/bank/model';
import { renderNote } from '../src/bank/render';

describe('Random: invented currencies', () => {
  const many = Array.from({ length: 400 }, (_, seed) => inventDesign(seed));

  it('the same seed invents the same currency', () => {
    expect(inventDesign(7)).toEqual(inventDesign(7));
    expect(inventDesign(7)).not.toEqual(inventDesign(8));
  });

  it('never lands on a real code, name or sign', () => {
    for (const [seed, design] of many.entries()) {
      const { name, plural, symbol, code, issuer } = design.currency;
      expect(checkCode(code), `${seed}: ${code}`).toEqual({ ok: true, code });
      for (const text of [name, plural, issuer]) expect(realCurrencyWordIn(text), `${seed}: ${text}`).toBe(null);
      expect(realCurrencySymbolIn(symbol), `${seed}: ${symbol}`).toBe(null);
      expect(symbol.length).toBeGreaterThan(0);
    }
  });

  it('always has the specimen mark on', () => {
    for (const design of many) expect(design.note.specimen).toBe(true);
  });

  it('gives clean designs that fit in a link', () => {
    for (const design of many) {
      expect(cleanDesign(design)).toEqual(design);
      expect(decodeDesign(encodeDesign(design))).toEqual(design);
      expect(design.series.denominations.length).toBeGreaterThanOrEqual(5);
      expect(design.note.signatories.length).toBeGreaterThanOrEqual(1);
      expect(design.currency.name).toMatch(/^[a-z]{4,10}$/);
      expect(design.currency.issuer).toMatch(/[A-Z][a-z]+/);
    }
  });

  it('is varied', () => {
    expect(new Set(many.map((d) => d.currency.name)).size).toBeGreaterThan(150);
    expect(new Set(many.map((d) => d.note.layout)).size).toBe(3);
    expect(new Set(many.map((d) => d.note.border)).size).toBe(6);
    expect(new Set(many.map((d) => d.note.texture)).size).toBe(4);
    expect(new Set(many.map((d) => d.series.denominations.map((x) => x.value).join())).size).toBeGreaterThanOrEqual(6);
  });

  it('draws', () => {
    for (const design of many.slice(0, 40)) {
      const svg = renderNote(design, 0, 'front');
      expect(svg).not.toMatch(/NaN|undefined/);
      expect(svg).toContain('fictional currency, bank.eurth.org');
    }
  });
});
