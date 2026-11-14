import { describe, expect, it } from 'vitest';
import { ISO4217_CURRENT } from '../src/bank/data/iso4217';
import { LINK_VERSION, MAX_PACKED, SITE, decodeDesign, designLink, designQuery, encodeDesign, readLink, readQuery } from '../src/bank/link';
import { borders, cleanDesign, defaultDesign, layouts, textures, type Design } from '../src/bank/model';
import { bankSection, bankSummary, designFromSection } from '../src/bank/profile';
import { renderNote } from '../src/bank/render';

/** The largest design there can be: twelve values, every text at its limit. */
function fullest(): Design {
  return cleanDesign({
    currency: { name: 'ñ'.repeat(40), plural: 'ü'.repeat(40), symbol: 'ŦŦŦŦ', code: 'QQQ', issuer: 'Ø'.repeat(60) },
    series: { denominations: Array.from({ length: 12 }, (_, i) => ({ value: 1_000_000_000_000 - i, paper: '#fefefe', ink: '#010101', accent: '#777777' })), width: 200, height: 100, stepWidth: 9.9, stepHeight: 4.9 },
    note: {
      layout: 'vertical',
      border: 'guilloche',
      texture: 'aged',
      rosette: { lobes: 24, rings: 12, depth: 0.59, ripple: 0.39, turn: 0.99, twist: 6 },
      front: { kind: 'landscape', art: 'a'.repeat(24) },
      back: { kind: 'silhouette', art: 'b'.repeat(24) },
      signatories: [{ name: 'É'.repeat(40), title: 'Ç'.repeat(40) }, { name: 'Å'.repeat(40), title: 'Þ'.repeat(40) }],
      serial: { prefix: 'ZZ99', digits: 10 },
      seed: 4294967295,
      specimen: false,
    },
  });
}

const variants = (): Design[] => [
  defaultDesign(),
  fullest(),
  ...layouts.map((layout) => cleanDesign({ note: { layout } })),
  ...borders.map((border) => cleanDesign({ note: { border } })),
  ...textures.map((texture) => cleanDesign({ note: { texture } })),
  cleanDesign({ currency: { name: '', plural: '', symbol: '', code: '', issuer: '' }, note: { signatories: [], front: { kind: 'none' }, back: { kind: 'arms' } }, series: { denominations: [{ value: 0 }] } }),
  cleanDesign({ currency: { name: '東京円', plural: 'تجربة', symbol: '☼', code: 'ZZZ', issuer: 'Банк "Теланд" & Co' } }),
];

describe('a design in its link', () => {
  it('comes back exactly as it went in', () => {
    for (const design of variants()) {
      const packed = encodeDesign(design);
      expect(decodeDesign(packed)).toEqual(design);
      // And the picture is the same picture.
      expect(renderNote(decodeDesign(packed)!, 0, 'front')).toBe(renderNote(design, 0, 'front'));
    }
  });

  it('is versioned, and safe to put in an address as it is', () => {
    for (const design of variants()) {
      const packed = encodeDesign(design);
      expect(packed).toMatch(new RegExp(`^${LINK_VERSION}-[A-Za-z0-9_-]+$`));
      expect(encodeURIComponent(packed)).toBe(packed);
    }
  });

  it('always fits: the fullest design is well within a link', () => {
    expect(encodeDesign(defaultDesign()).length).toBeLessThan(900);
    const link = designLink(fullest(), { value: 1_000_000_000_000, side: 'back' });
    expect(link.length).toBeLessThan(3000);
    expect(link.length).toBeLessThan(4000); // the profile's limit for a link
    expect(encodeDesign(fullest()).length).toBeLessThan(MAX_PACKED);
  });

  it('goes in the query string, where a Worker could read it', () => {
    const link = designLink(defaultDesign());
    expect(link.startsWith('https://bank.eurth.org/?d=1-')).toBe(true);
    expect(link).not.toContain('#');
    expect(new URL(link).searchParams.get('d')).toBe(encodeDesign(defaultDesign()));
  });

  it('remembers the note in view', () => {
    const design = defaultDesign();
    expect(designQuery(design)).toBe(`d=${encodeDesign(design)}`);
    expect(designQuery(design, { value: 100, side: 'back' })).toBe(`d=${encodeDesign(design)}&n=100&s=back`);
    expect(designQuery(design, { value: 100, side: 'front' })).toBe(`d=${encodeDesign(design)}&n=100`);
    expect(designQuery(design, { value: 7, side: 'back' })).toBe(`d=${encodeDesign(design)}`);
    expect(readQuery(`?${designQuery(design, { value: 100, side: 'back' })}`)).toEqual({ design, view: { value: 100, side: 'back' } });
    expect(readQuery(designQuery(design))?.view).toEqual({ value: 5, side: 'front' });
    expect(readQuery(`d=${encodeDesign(design)}&n=7&s=sideways`)?.view).toEqual({ value: 5, side: 'front' });
    expect(readQuery(`d=${encodeDesign(design)}&n=1e2`)?.view.value).toBe(5);
  });

  it('is read only from Bank itself', () => {
    const design = defaultDesign();
    const query = designQuery(design);
    expect(readLink(`${SITE}?${query}`)?.design).toEqual(design);
    expect(readLink(`https://bank.eurth.org/templates/?${query}#top`)?.design).toEqual(design);
    for (const link of [`https://evil.example/?${query}`, `http://bank.eurth.org/?${query}`, `https://bank.eurth.org.evil.example/?${query}`, `javascript:alert(1)//?${query}`, 'not a link', '', null, 42, `https://bank.eurth.org/#example-calderwyn`]) {
      expect(readLink(link), String(link).slice(0, 40)).toBe(null);
    }
  });
});

describe('a link is someone else\'s input', () => {
  const pack = (value: unknown): string => `1-${Buffer.from(JSON.stringify(value)).toString('base64url')}`;

  it('gives null for anything that is not a design', () => {
    const junk = ['', '1-', '1', 'abc', '2-abcd', '1-!!!!', '1-%3Cscript%3E', `1-${'A'.repeat(MAX_PACKED)}`, pack('text'), pack(42), pack(null), pack({}), pack([1, 2, 3]), '1-eyJhIjo', null, undefined, 7, {}];
    for (const text of junk) expect(decodeDesign(text), String(text).slice(0, 30)).toBe(null);
    expect(readQuery('d=nonsense')).toBe(null);
    expect(readQuery('')).toBe(null);
    expect(decodeDesign(`1-${Buffer.from([0xff, 0xfe, 0xfd]).toString('base64url')}`)).toBe(null);
  });

  it('never lets a real code through', () => {
    for (const code of ['USD', 'EUR', 'usd', 'DEM', ...Object.keys(ISO4217_CURRENT).slice(0, 40)]) {
      const packed = pack([['dollar', 'dollars', '$', code, 'Federal Reserve'], [], [], [], [], [], [], [], 1, 1]);
      const design = decodeDesign(packed);
      expect(design, code).not.toBe(null);
      expect(design!.currency.code, code).toBe('');
    }
  });

  it('clamps and cleans whatever it is handed', () => {
    const design = decodeDesign(
      pack([
        ['<script>x</script>', 5, null, 'T<S', 'x'.repeat(999)],
        [1e9, -1, 'wide', {}],
        [[1e99, 'red', 'zzzzzz', 12], ['7', 'FFF', '000', 'abc'], 'nope', [3]],
        ['upside-down', 7, 'marble'],
        [999, 999, 999, 999, 999, 999],
        ['photo', '../x', 'video', 'UPPER'],
        [['<b>', '<i>'], 'x', ['a', 'b'], ['c', 'd']],
        ['<>', 'many'],
        'seed',
        'off',
      ]),
    )!;
    expect(design).toEqual(cleanDesign(design));
    expect(JSON.stringify(design)).not.toMatch(/[<>]/);
    expect(design.series.width).toBe(200);
    expect(design.series.denominations.map((d) => d.value)).toEqual([3, 7]);
    expect(design.series.denominations[1]).toMatchObject({ paper: '#ffffff', ink: '#000000', accent: '#aabbcc' });
    expect(design.note.layout).toBe('portrait-left');
    expect(design.note.rosette.lobes).toBe(24);
    expect(design.note.signatories.length).toBe(2);
    expect(design.note.specimen).toBe(true);
  });

  it('keeps the overprint on unless the link says plainly that it is off', () => {
    const base = JSON.parse(Buffer.from(encodeDesign(defaultDesign()).slice(2), 'base64url').toString()) as unknown[];
    for (const value of [1, true, 'no', null, '0', -1, [], 2]) {
      const packed = [...base.slice(0, 9), value];
      expect(decodeDesign(pack(packed))!.note.specimen, String(value)).toBe(true);
    }
    expect(decodeDesign(pack([...base.slice(0, 9), 0]))!.note.specimen).toBe(false);
    expect(decodeDesign(pack(base.slice(0, 9)))).toBe(null);
  });

  it('ignores what a newer Bank may add at the end', () => {
    const base = JSON.parse(Buffer.from(encodeDesign(defaultDesign()).slice(2), 'base64url').toString()) as unknown[];
    expect(decodeDesign(pack([...base, 'something new', { more: true }]))).toEqual(defaultDesign());
  });
});

describe('the profile\'s bank section', () => {
  it('holds the fields the profile defines, largest value first', () => {
    const section = bankSection(defaultDesign());
    expect(section).toMatchObject({
      currency: 'selun',
      code: 'TLS',
      issuer: 'Bank of Teland',
      denominations: [200, 100, 50, 20, 10, 5],
      plural: 'selun',
      symbol: 'Ŝ',
      link: designLink(defaultDesign()),
    });
    expect(section.summary).toBe('The selun (TLS, Ŝ), issued by the Bank of Teland, in 6 notes: 5, 10, 20, 50, 100 and 200 selun. A fictional currency, designed at bank.eurth.org.');
    expect(section.updated).toBeUndefined(); // @eurth/profile's setSection stamps it
  });

  it('holds the series design in a readable form', () => {
    const design = bankSection(defaultDesign()).design!;
    expect(design).toMatchObject({ v: 1, layout: 'portrait-left', border: 'stitch', texture: 'grain', seed: 447192, specimen: true });
    expect(design.size).toEqual({ width: 130, height: 68, stepWidth: 6, stepHeight: 2 });
    expect((design.colours as unknown[])[4]).toEqual({ value: 100, paper: '#f3e6c4', ink: '#1b6fa0', accent: '#ab7527' });
  });

  it('stays within the limits of the profile schema', () => {
    for (const design of [defaultDesign(), fullest()]) {
      const section = bankSection(design);
      expect(section.link!.length).toBeLessThanOrEqual(4000);
      expect(section.link!.startsWith('https://')).toBe(true);
      expect(section.summary!.length).toBeLessThanOrEqual(600);
      expect((section.currency ?? '').length).toBeLessThanOrEqual(80);
      expect((section.code ?? '').length).toBeLessThanOrEqual(10);
      expect((section.issuer ?? '').length).toBeLessThanOrEqual(80);
      expect(section.denominations!.length).toBeLessThanOrEqual(50);
      for (const value of section.denominations!) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(1_000_000_000_000);
      }
      expect(JSON.stringify(section).length).toBeLessThan(8000);
      expect(JSON.parse(JSON.stringify(section))).toEqual(section);
    }
    expect(bankSummary(fullest()).length).toBeLessThanOrEqual(600);
  });

  it('brings the design back from the file', () => {
    for (const design of variants()) {
      const section = JSON.parse(JSON.stringify(bankSection(design)));
      expect(designFromSection(section)).toEqual(design);
      // Even if the link is lost on the way.
      delete section.link;
      expect(designFromSection(section)).toEqual(design);
    }
  });

  it('keeps every key it does not write, and removes what the design has emptied', () => {
    const before = { updated: '2026-11-11T08:30:00.000Z', futureField: { a: 1 }, code: 'OLD', symbol: '¤', notes: [1, 2] };
    const section = bankSection(cleanDesign({ currency: { name: 'vael', plural: 'vaels', symbol: '', code: '', issuer: '' } }), before);
    expect(section.futureField).toEqual({ a: 1 });
    expect(section.notes).toEqual([1, 2]);
    expect(section.updated).toBe('2026-11-11T08:30:00.000Z');
    expect('code' in section).toBe(false);
    expect('symbol' in section).toBe(false);
    expect('issuer' in section).toBe(false);
    expect(before.code).toBe('OLD'); // what was passed in is left alone
  });

  it('reads the profile\'s own example, which has no design yet', () => {
    const calderwyn = { link: 'https://bank.eurth.org/#example-calderwyn', updated: '2026-11-11T08:30:00.000Z', currency: 'Calder mark', code: 'CWM', issuer: 'Royal Bank of Calderwyn', denominations: [200, 100, 50, 20, 10, 5] };
    const design = designFromSection(calderwyn)!;
    expect(design.currency).toEqual({ name: 'Calder mark', plural: 'Calder mark', symbol: '', code: 'CWM', issuer: 'Royal Bank of Calderwyn' });
    expect(design.series.denominations.map((d) => d.value)).toEqual([5, 10, 20, 50, 100, 200]);
    expect(design.note).toEqual(defaultDesign().note);
  });

  it('reads a section that has only a link to Bank', () => {
    const design = fullest();
    expect(designFromSection({ link: designLink(design) })).toEqual(design);
    expect(designFromSection({ link: `https://evil.example/?${designQuery(design)}` })).toBe(null);
  });

  it('gives null when there is nothing to go on', () => {
    for (const value of [undefined, null, 'text', 7, [], {}, { summary: 'Money.' }, { link: 'https://bank.eurth.org/' }, { code: 'TLS' }]) {
      expect(designFromSection(value), JSON.stringify(value)).toBe(null);
    }
  });

  it('refuses a real code in a file, and cleans everything else', () => {
    const design = designFromSection({
      currency: '<b>dollar</b>',
      code: 'USD',
      issuer: 'x'.repeat(500),
      denominations: [1, 'two', -5, 1e99, 100, 100],
      design: { v: 1, layout: 'weird', colours: 'none', specimen: 'no', signatories: [{ name: '<script>' }], seed: 'abc', size: { width: 1e9 } },
    })!;
    expect(design.currency.code).toBe('');
    expect(design.currency.name).toBe('b dollar /b');
    expect(design.currency.issuer.length).toBe(60);
    expect(design.series.denominations.map((d) => d.value)).toEqual([1, 100]);
    expect(design.series.width).toBe(200);
    expect(design.note.layout).toBe('portrait-left');
    expect(design.note.specimen).toBe(true);
    expect(JSON.stringify(design)).not.toMatch(/[<>]/);
  });

  it('only an explicit false in the file switches the overprint off', () => {
    const section = bankSection(cleanDesign({ note: { specimen: false } }));
    expect(section.design!.specimen).toBe(false);
    expect(designFromSection(section)!.note.specimen).toBe(false);
    for (const value of [0, null, 'false', undefined]) {
      expect(designFromSection({ ...section, design: { ...section.design, specimen: value } })!.note.specimen).toBe(true);
    }
  });
});
