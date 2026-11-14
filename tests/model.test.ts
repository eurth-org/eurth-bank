import { describe, expect, it } from 'vitest';
import { cleanColor, colourName, contrast, lightness, mix } from '../src/bank/colors';
import { LIMITS, cleanDesign, cleanText, cleanValue, defaultDesign, indexOfValue, noteSize } from '../src/bank/model';
import { rng, hashText } from '../src/bank/random';
import { colourSchemes, schemeColours } from '../src/bank/schemes';

describe('the default design', () => {
  it('is the mock-up: 100 selun, Bank of Teland', () => {
    const design = defaultDesign();
    expect(design.currency).toEqual({ name: 'selun', plural: 'selun', symbol: 'Ŝ', code: 'TLS', issuer: 'Bank of Teland' });
    expect(design.series.denominations.map((d) => d.value)).toEqual([5, 10, 20, 50, 100, 200]);
    const hundred = design.series.denominations[indexOfValue(design, 100)];
    expect(hundred).toMatchObject({ paper: '#f3e6c4', ink: '#1b6fa0', accent: '#ab7527' });
  });

  it('survives its own cleaning unchanged', () => {
    expect(cleanDesign(defaultDesign())).toEqual(defaultDesign());
    expect(cleanDesign(JSON.parse(JSON.stringify(defaultDesign())))).toEqual(defaultDesign());
  });
});

describe('cleaning what arrives', () => {
  it('gives the default for anything that is not a design', () => {
    for (const input of [undefined, null, 42, 'text', [], true, { currency: 7, series: 'x', note: [] }]) {
      expect(cleanDesign(input)).toEqual(defaultDesign());
    }
  });

  it('strips markup and control characters from every text, and caps the length', () => {
    const design = cleanDesign({
      currency: {
        name: '<script>alert(1)</script>selun',
        plural: 'se\u0000lun\n\n  two',
        symbol: '<b>§§§§§§',
        code: 'TLS',
        issuer: 'x'.repeat(500),
      },
      note: { signatories: [{ name: '<img src=x onerror=1>', title: 'Gov\u2028ernor' }] },
    });
    const texts = [design.currency.name, design.currency.plural, design.currency.symbol, design.currency.issuer, design.note.signatories[0]?.name, design.note.signatories[0]?.title];
    for (const text of texts) expect(text).not.toMatch(/[<>\u0000-\u001f\u2028]/);
    expect(design.currency.plural).toBe('se lun two');
    expect([...design.currency.symbol].length).toBeLessThanOrEqual(LIMITS.symbol);
    expect(design.currency.issuer.length).toBe(LIMITS.issuer);
    expect(design.currency.name.length).toBeLessThanOrEqual(LIMITS.name);
  });

  it('uses the singular when no plural is given', () => {
    expect(cleanDesign({ currency: { name: 'tessel' } }).currency.plural).toBe('tessel');
    expect(cleanDesign({ currency: { name: 'tessel', plural: '' } }).currency.plural).toBe('tessel');
    expect(cleanDesign({ currency: { name: 'tessel', plural: 'tessels' } }).currency.plural).toBe('tessels');
  });

  it('sorts the series, drops repeats and nonsense, and stops at twelve', () => {
    const values = [100, 5, '20', 5, -1, 1.4, 'abc', null, 1e13, Infinity, 50];
    const design = cleanDesign({ series: { denominations: values.map((value) => ({ value })) } });
    expect(design.series.denominations.map((d) => d.value)).toEqual([1, 5, 20, 50, 100]);
    const many = cleanDesign({ series: { denominations: Array.from({ length: 80 }, (_, i) => ({ value: i })) } });
    expect(many.series.denominations.length).toBe(LIMITS.denominations);
    expect(cleanDesign({ series: { denominations: [] } }).series.denominations.length).toBe(6);
  });

  it('keeps 0 and a million million, the ends of the range', () => {
    const design = cleanDesign({ series: { denominations: [{ value: 0 }, { value: LIMITS.value }] } });
    expect(design.series.denominations.map((d) => d.value)).toEqual([0, LIMITS.value]);
    expect(cleanValue(LIMITS.value + 1)).toBe(null);
    expect(cleanValue('69')).toBe(69);
    expect(cleanValue('1e3')).toBe(null);
  });

  it('gives every value three clean colours', () => {
    const design = cleanDesign({ series: { denominations: [{ value: 1, paper: 'red', ink: '#ABC', accent: 'javascript:1' }, { value: 2, paper: '#FFEEDD' }] } });
    for (const d of design.series.denominations) for (const colour of [d.paper, d.ink, d.accent]) expect(colour).toMatch(/^#[0-9a-f]{6}$/);
    expect(design.series.denominations[0]?.ink).toBe('#aabbcc');
    expect(design.series.denominations[1]?.paper).toBe('#ffeedd');
  });

  it('clamps every number and replaces every unknown choice', () => {
    const design = cleanDesign({
      series: { width: 9999, height: -5, stepWidth: 99, stepHeight: 'NaN' },
      note: {
        layout: 'sideways',
        border: '<svg>',
        rosette: { lobes: 1e9, rings: -3, depth: 7, ripple: 'x', turn: -1, twist: 100 },
        front: { kind: 'photo', art: '../../etc/passwd' },
        back: { kind: 'landscape', art: 'UPPER' },
        serial: { prefix: 'ab<c>d-efg', digits: 400 },
        seed: -12,
        signatories: [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }],
      },
    });
    expect(design.series).toMatchObject({ width: 200, height: 50, stepWidth: 10, stepHeight: 2 });
    expect(design.note.layout).toBe('portrait-left');
    expect(design.note.border).toBe('stitch');
    expect(design.note.rosette).toEqual({ lobes: 24, rings: 1, depth: 0.6, ripple: 0.1, turn: 0, twist: 6 });
    expect(design.note.front).toEqual({ kind: 'silhouette', art: 'founder' });
    expect(design.note.back).toEqual({ kind: 'landscape', art: '' });
    expect(design.note.serial).toEqual({ prefix: 'ABCD', digits: 10 });
    expect(design.note.seed).toBe(0);
    expect(design.note.signatories.map((p) => p.name)).toEqual(['A', 'B']);
  });

  it('takes no for an answer on signatures', () => {
    expect(cleanDesign({ note: { signatories: [] } }).note.signatories).toEqual([]);
    expect(cleanDesign({ note: { signatories: [{ name: '', title: '' }] } }).note.signatories).toEqual([]);
  });

  it('ignores keys it does not know, and prototype tricks', () => {
    const design = cleanDesign(JSON.parse('{"__proto__":{"polluted":true},"currency":{"name":"vael","constructor":{"x":1}},"extra":[1,2,3]}'));
    expect(design.currency.name).toBe('vael');
    expect(Object.keys(design)).toEqual(['currency', 'series', 'note']);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('cleanText counts characters, not code units', () => {
    expect(cleanText('😀😀😀', 2)).toBe('😀😀');
    expect(cleanText('  a   b  ', 10)).toBe('a b');
    expect(cleanText(12, 10)).toBe('');
  });
});

describe('note sizes', () => {
  it('grow by a step for each value', () => {
    const design = defaultDesign();
    expect(noteSize(design, 0)).toEqual({ width: 130, height: 68 });
    expect(noteSize(design, 1)).toEqual({ width: 136, height: 70 });
    expect(noteSize(design, 5)).toEqual({ width: 160, height: 78 });
    expect(noteSize(design, 99)).toEqual({ width: 160, height: 78 });
    expect(noteSize(design, -4)).toEqual({ width: 130, height: 68 });
  });

  it('stand on end for the vertical layout', () => {
    const design = defaultDesign();
    design.note.layout = 'vertical';
    expect(noteSize(design, 0)).toEqual({ width: 68, height: 130 });
  });
});

describe('colours', () => {
  it('cleans hex codes', () => {
    expect(cleanColor('#FFF')).toBe('#ffffff');
    expect(cleanColor('1B6FA0')).toBe('#1b6fa0');
    expect(cleanColor('blue', '#123456')).toBe('#123456');
    expect(cleanColor(null, '#123456')).toBe('#123456');
  });

  it('measures contrast and lightness', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBe(1);
    expect(lightness('#ffffff')).toBeCloseTo(100, 3);
    expect(lightness('#000000')).toBe(0);
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080');
  });

  it('names colours in plain words', () => {
    expect(colourName('#f3e6c4')).toBe('parchment');
    expect(colourName('#c9dff0')).toBe('pale blue');
    expect(colourName('#1b6fa0')).toBe('blue');
    expect(colourName('#1f3a5f')).toBe('dark blue');
    expect(colourName('#ffffff')).toBe('white');
    expect(colourName('#808080')).toBe('grey');
  });
});

describe('colour schemes', () => {
  it('have an even number of colours, so light and dark keep alternating round the loop', () => {
    for (const scheme of colourSchemes) {
      expect(scheme.colours.length).toBeGreaterThanOrEqual(8);
      expect(scheme.colours.length % 2, scheme.id).toBe(0);
    }
  });

  it('every ink reads on its paper', () => {
    for (const scheme of colourSchemes) {
      for (const [i, c] of scheme.colours.entries()) {
        expect(contrast(c.ink, c.paper), `${scheme.id} ${i} ink`).toBeGreaterThanOrEqual(4);
        expect(contrast(c.accent, c.paper), `${scheme.id} ${i} accent`).toBeGreaterThanOrEqual(3);
        expect(contrast('#222222', c.paper), `${scheme.id} ${i} text`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it('neighbouring values differ in lightness, not in hue alone', () => {
    for (const scheme of colourSchemes) {
      const n = scheme.colours.length;
      for (let i = 0; i < n; i++) {
        const a = scheme.colours[i]!;
        const b = scheme.colours[(i + 1) % n]!;
        expect(Math.abs(lightness(a.ink) - lightness(b.ink)), `${scheme.id} ${i}`).toBeGreaterThanOrEqual(10);
      }
    }
  });

  it('go round again for a long series', () => {
    const colours = schemeColours('heritage', 12);
    expect(colours.length).toBe(12);
    expect(colours[8]).toEqual(colours[0]);
    expect(schemeColours('no-such-scheme', 2)).toEqual(schemeColours('heritage', 2));
  });
});

describe('seeded randomness', () => {
  it('gives the same numbers for the same seed, and others for another', () => {
    const a = rng(1, 'x');
    const b = rng(1, 'x');
    const c = rng(2, 'x');
    const first = [a.next(), a.next(), a.next()];
    expect([b.next(), b.next(), b.next()]).toEqual(first);
    expect([c.next(), c.next(), c.next()]).not.toEqual(first);
  });

  it('stays in range', () => {
    const r = rng('range');
    for (let i = 0; i < 500; i++) {
      const n = r.int(3, 7);
      expect(n).toBeGreaterThanOrEqual(3);
      expect(n).toBeLessThanOrEqual(7);
      const x = r.next();
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
    expect(hashText('Mara Venn')).toBe(hashText('Mara Venn'));
    expect(hashText('Mara Venn')).not.toBe(hashText('Mara Vern'));
  });
});
