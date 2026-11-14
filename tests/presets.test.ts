import { describe, expect, it } from 'vitest';
import { artOf, type ArtKind } from '../src/bank/art';
import { describeSeries } from '../src/bank/describe';
import { checkCode, realCurrencySymbolIn, realCurrencyWordIn } from '../src/bank/fiction';
import { toastFor, toastForChange } from '../src/bank/fun';
import { decodeDesign, encodeDesign } from '../src/bank/link';
import { cleanDesign, defaultDesign, sides } from '../src/bank/model';
import { rosettePresets, seriesPresets, withoutValue, withScheme, withSeries, withValue } from '../src/bank/presets';
import { bankSection, designFromSection } from '../src/bank/profile';
import { renderNote } from '../src/bank/render';
import { colourSchemes, schemeColours } from '../src/bank/schemes';
import { template, templates } from '../src/bank/templates';

describe('templates: twelve invented currencies', () => {
  it('there are twelve, each with its own id, name, code and sign', () => {
    expect(templates.length).toBe(12);
    for (const key of ['id', 'name', 'about'] as const) expect(new Set(templates.map((t) => t[key])).size).toBe(12);
    expect(new Set(templates.map((t) => t.design.currency.code)).size).toBe(12);
    expect(new Set(templates.map((t) => t.design.currency.name)).size).toBe(12);
    expect(new Set(templates.map((t) => t.design.currency.issuer)).size).toBe(12);
    for (const t of templates) {
      expect(t.id).toMatch(/^[a-z]+$/);
      expect(t.id).toBe(t.design.currency.name);
      expect(t.about.length).toBeGreaterThan(20);
      expect(t.about.length).toBeLessThan(120);
    }
    expect(template('selun')?.design).toEqual(defaultDesign());
    expect(template('dollar')).toBeUndefined();
  });

  it('none uses a real currency code', () => {
    for (const t of templates) {
      const { code, name, issuer } = t.design.currency;
      expect(checkCode(code, { name, issuer }), `${t.id}: ${code}`).toEqual({ ok: true, code });
    }
  });

  it('none uses a real currency name, in the unit, the plural, the issuer or the blurb', () => {
    for (const t of templates) {
      const { name, plural, issuer } = t.design.currency;
      for (const text of [name, plural, issuer, t.name, t.about]) expect(realCurrencyWordIn(text), `${t.id}: "${text}"`).toBe(null);
    }
  });

  it('none uses a real currency symbol', () => {
    for (const t of templates) {
      const { symbol } = t.design.currency;
      expect(symbol.length, t.id).toBeGreaterThan(0);
      expect(realCurrencySymbolIn(symbol), `${t.id}: ${symbol}`).toBe(null);
    }
  });

  it('every one has the specimen mark on', () => {
    for (const t of templates) expect(t.design.note.specimen, t.id).toBe(true);
  });

  it('every one is a clean design that survives its link and its profile section', () => {
    for (const t of templates) {
      expect(cleanDesign(t.design), t.id).toEqual(t.design);
      expect(decodeDesign(encodeDesign(t.design)), t.id).toEqual(t.design);
      expect(designFromSection(JSON.parse(JSON.stringify(bankSection(t.design)))), t.id).toEqual(t.design);
    }
  });

  it('every one names drawings that exist, and signatories who sign', () => {
    for (const t of templates) {
      for (const slot of [t.design.note.front, t.design.note.back]) {
        expect(['silhouette', 'building', 'landscape'], t.id).toContain(slot.kind);
        expect(artOf(slot.kind as ArtKind, slot.art).id, `${t.id}: ${slot.art}`).toBe(slot.art);
      }
      expect(t.design.note.signatories.length, t.id).toBeGreaterThanOrEqual(1);
      for (const person of t.design.note.signatories) {
        expect(person.name).toMatch(/^\p{Lu}\p{L}+ \p{Lu}\p{L}+$/u);
        expect(person.title.length).toBeGreaterThan(3);
      }
    }
    const people = templates.flatMap((t) => t.design.note.signatories.map((p) => p.name));
    expect(new Set(people).size).toBe(people.length);
  });

  it('every one draws, front and back, for every value', () => {
    for (const t of templates) {
      for (const side of sides) {
        for (let i = 0; i < t.design.series.denominations.length; i++) {
          const svg = renderNote(t.design, i, side);
          expect(svg, t.id).not.toMatch(/NaN|undefined/);
          expect(svg, t.id).toContain('fictional currency, bank.eurth.org');
          expect(svg, t.id).toContain('SPECIMEN');
        }
      }
      expect(describeSeries(t.design)).toContain(t.design.currency.issuer);
    }
  });

  it('between them show every layout, border, texture and kind of drawing', () => {
    const seen = (pick: (t: (typeof templates)[number]) => string): number => new Set(templates.map(pick)).size;
    expect(seen((t) => t.design.note.layout)).toBe(3);
    expect(seen((t) => t.design.note.border)).toBe(6);
    expect(seen((t) => t.design.note.texture)).toBe(4);
    expect(new Set(templates.flatMap((t) => [t.design.note.front.kind, t.design.note.back.kind]))).toEqual(new Set(['silhouette', 'building', 'landscape']));
    expect(seen((t) => t.design.note.front.art)).toBeGreaterThanOrEqual(7);
    expect(seen((t) => t.design.note.back.art)).toBeGreaterThanOrEqual(9);
  });
});

describe('series presets', () => {
  it('are rising runs of whole values within the limits', () => {
    expect(new Set(seriesPresets.map((p) => p.id)).size).toBe(seriesPresets.length);
    for (const preset of seriesPresets) {
      expect(preset.values.length).toBeGreaterThanOrEqual(5);
      expect(preset.values.length).toBeLessThanOrEqual(12);
      for (const [i, value] of preset.values.entries()) {
        expect(Number.isInteger(value) && value >= 0 && value <= 1_000_000_000_000, preset.id).toBe(true);
        if (i > 0) expect(value).toBeGreaterThan(preset.values[i - 1]!);
      }
      expect(realCurrencyWordIn(`${preset.name} ${preset.about}`), preset.id).toBe(null);
    }
  });

  it('make the whole series from one design, a colour for each value', () => {
    const base = defaultDesign();
    for (const preset of seriesPresets) {
      for (const scheme of colourSchemes) {
        const design = withSeries(base, preset.values, scheme.id);
        expect(design.series.denominations.map((d) => d.value)).toEqual([...preset.values]);
        expect(design.series.denominations.map(({ paper, ink, accent }) => ({ paper, ink, accent }))).toEqual(schemeColours(scheme.id, preset.values.length));
        expect(design.note).toEqual(base.note);
        expect(design.currency).toEqual(base.currency);
      }
    }
  });

  it('sort and tidy whatever values they are given', () => {
    expect(withSeries(defaultDesign(), [50, 5, 5, 20]).series.denominations.map((d) => d.value)).toEqual([5, 20, 50]);
    expect(withSeries(defaultDesign(), []).series.denominations.length).toBe(6);
  });

  it('change the colours and keep the values, or add and remove a value', () => {
    const base = defaultDesign();
    const harbour = withScheme(base, 'harbour');
    expect(harbour.series.denominations.map((d) => d.value)).toEqual([5, 10, 20, 50, 100, 200]);
    expect(harbour.series.denominations[0]!.paper).toBe('#f4f2ea');
    const more = withValue(base, 500);
    expect(more.series.denominations.map((d) => d.value)).toEqual([5, 10, 20, 50, 100, 200, 500]);
    expect(more.series.denominations[4]).toEqual(base.series.denominations[4]); // the others keep their colours
    expect(withValue(base, 100)).toBe(base);
    expect(withoutValue(more, 500)).toEqual(base);
    const one = withSeries(base, [7]);
    expect(withoutValue(one, 7)).toBe(one);
  });
});

describe('rosette presets', () => {
  it('are within the limits and each their own', () => {
    expect(new Set(rosettePresets.map((p) => JSON.stringify(p.rosette))).size).toBe(rosettePresets.length);
    for (const preset of rosettePresets) expect(cleanDesign({ note: { rosette: preset.rosette } }).note.rosette, preset.id).toEqual(preset.rosette);
  });
});

describe('notes worth a toast', () => {
  it('a 69 note gets the suite\'s "Nice."', () => {
    expect(toastFor(69)).toEqual({ kind: 'nice', message: 'Nice.' });
  });

  it('a note worth 0 gets "Priceless."', () => {
    expect(toastFor(0)).toEqual({ kind: 'priceless', message: 'Priceless.' });
  });

  it('every other value is just money', () => {
    for (const value of [1, 6, 9, 68, 70, 690, 6900, 96, 100, 420, 1000]) expect(toastFor(value), String(value)).toBe(null);
  });

  it('is told once, when the note arrives', () => {
    const base = defaultDesign();
    const nice = withValue(base, 69);
    expect(toastForChange(base, nice)).toEqual({ kind: 'nice', message: 'Nice.' });
    expect(toastForChange(nice, nice)).toBe(null);
    expect(toastForChange(nice, withValue(nice, 500))).toBe(null);
    expect(toastForChange(nice, withoutValue(nice, 69))).toBe(null);
    expect(toastForChange(base, withValue(base, 0))?.message).toBe('Priceless.');
    expect(toastForChange(base, withSeries(base, [0, 69]))?.kind).toBe('priceless');
  });
});
