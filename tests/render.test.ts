import { describe, expect, it } from 'vitest';
import { describeDesign, describeNote, describeSeries, noteName } from '../src/bank/describe';
import { FINE_PRINT, SPECIMEN_TEXT } from '../src/bank/fiction';
import { borders, cleanDesign, defaultDesign, layouts, noteSize, sides, textures, type Design } from '../src/bank/model';
import { noteParts, paperFilter, renderNote, safePicture } from '../src/bank/render';
import { renderSeries, sheetParts } from '../src/bank/series';

const ALLOWED = new Set(['svg', 'title', 'desc', 'rect', 'g', 'path', 'ellipse', 'clipPath', 'text', 'image', 'filter', 'feTurbulence', 'feDiffuseLighting', 'feDistantLight', 'feComposite', 'feColorMatrix', 'feMerge', 'feMergeNode']);

/** Checks an SVG is well formed and holds nothing but the handful of elements Bank draws with. */
function wellFormed(svg: string): void {
  const stack: string[] = [];
  const tag = /<(\/?)([A-Za-z][\w:-]*)((?:\s+[\w:-]+="[^"<>]*")*)\s*(\/?)>/g;
  let last = 0;
  for (let m = tag.exec(svg); m; m = tag.exec(svg)) {
    const between = svg.slice(last, m.index);
    if (/[<>]/.test(between)) throw new Error(`stray markup: ${between.slice(0, 80)}`);
    last = tag.lastIndex;
    const [, close, name, , selfClose] = m;
    if (!ALLOWED.has(name!)) throw new Error(`unexpected element <${name}>`);
    if (close) {
      if (stack.pop() !== name) throw new Error(`</${name}> closes nothing`);
    } else if (!selfClose) stack.push(name!);
  }
  if (/[<>]/.test(svg.slice(last))) throw new Error('stray markup at the end');
  if (stack.length) throw new Error(`unclosed: ${stack.join(', ')}`);
}

/** Every <text>, with the stretch of the note it covers from left to right. */
function texts(svg: string): { text: string; left: number; right: number; y: number; size: number }[] {
  return [...svg.matchAll(/<text ([^>]*)>([^<]*)<\/text>/g)].map(([, attrs, text]) => {
    const get = (name: string): string | undefined => new RegExp(`(?:^| )${name}="([^"]*)"`).exec(attrs!)?.[1];
    const x = Number(get('x'));
    const length = Number(get('textLength'));
    const anchor = get('text-anchor') ?? 'start';
    const left = anchor === 'end' ? x - length : anchor === 'middle' ? x - length / 2 : x;
    return { text: text!, left, right: left + length, y: Number(get('y')), size: Number(get('font-size')) };
  });
}

const count = (haystack: string, needle: string): number => haystack.split(needle).length - 1;

/** A design made to break layouts: long names, awkward values, every extreme. */
function awkward(): Design {
  const design = defaultDesign();
  design.currency = { name: 'tessel', plural: 'tessels', symbol: 'Ŧ', code: 'TSL', issuer: 'The Most Serene Republic of Upper Vantmoor Reserve Bank and Treasury' };
  design.series.denominations = [0, 1, 69, 777, 5000, 250000, 999999999999, 1000000000000].map((value, i) => ({ ...design.series.denominations[i % 6]!, value }));
  design.note.signatories = [
    { name: 'Bartholomew Quillfeather-Ashdown', title: 'Lord High Treasurer of the Realm' },
    { name: 'Wilhelmina van der Zandtvoort', title: 'Comptroller-General of the Mint' },
  ];
  design.note.serial = { prefix: 'ZZ99', digits: 10 };
  return cleanDesign(design);
}

const every = (design: Design, check: (svg: string, where: string, index: number) => void): void => {
  for (const layout of layouts) {
    const laid = { ...design, note: { ...design.note, layout } };
    for (const side of sides) {
      for (let i = 0; i < laid.series.denominations.length; i++) check(renderNote(laid, i, side), `${layout} ${side} ${laid.series.denominations[i]!.value}`, i);
    }
  }
};

describe('fiction only, on every picture', () => {
  it('every note carries the fine print, on both sides, in every layout', () => {
    for (const design of [defaultDesign(), awkward()]) {
      every(design, (svg, where) => {
        const fine = texts(svg).filter((t) => t.text === FINE_PRINT);
        expect(fine.length, where).toBe(1);
        expect(fine[0]!.size, where).toBeGreaterThanOrEqual(12);
      });
    }
  });

  it('there is no way to switch the fine print off', () => {
    const design = cleanDesign({ note: { specimen: false, finePrint: false, fine: false }, finePrint: false });
    every(design, (svg, where) => expect(svg, where).toContain(`>${FINE_PRINT}</text>`));
    expect(Object.keys(design.note)).not.toContain('finePrint');
  });

  it('the fine print stands clear of everything else, in the margin', () => {
    every(awkward(), (svg, where, i) => {
      const all = texts(svg);
      const fine = all.find((t) => t.text === FINE_PRINT)!;
      for (const other of all.filter((t) => t !== fine && t.text !== SPECIMEN_TEXT)) {
        expect(other.y, `${where}: ${other.text}`).toBeLessThan(fine.y - fine.size);
      }
      expect(i).toBeGreaterThanOrEqual(0);
    });
  });

  it('the SPECIMEN overprint is there by default', () => {
    every(defaultDesign(), (svg, where) => expect(count(svg, `>${SPECIMEN_TEXT}</text>`), where).toBe(1));
    every(cleanDesign({}), (svg, where) => expect(count(svg, `>${SPECIMEN_TEXT}</text>`), where).toBe(1));
    every(cleanDesign({ note: { specimen: 'off' } }), (svg, where) => expect(count(svg, `>${SPECIMEN_TEXT}</text>`), where).toBe(1));
  });

  it('and gone only when the person switches it off, with the fine print staying', () => {
    const design = cleanDesign({ note: { specimen: false } });
    every(design, (svg, where) => {
      expect(svg, where).not.toContain(SPECIMEN_TEXT);
      expect(svg, where).toContain(FINE_PRINT);
    });
  });

  it('holds for every note on a series sheet', () => {
    for (const which of ['front', 'back', 'both'] as const) {
      const svg = renderSeries(defaultDesign(), { sides: which });
      const notes = which === 'both' ? 12 : 6;
      expect(count(svg, `>${FINE_PRINT}</text>`), which).toBe(notes);
      expect(count(svg, `>${SPECIMEN_TEXT}</text>`), which).toBe(notes);
    }
    const plain = renderSeries(cleanDesign({ note: { specimen: false } }), { sides: 'both' });
    expect(count(plain, `>${FINE_PRINT}</text>`)).toBe(12);
    expect(plain).not.toContain(SPECIMEN_TEXT);
  });

  it('says so in the description too', () => {
    const design = defaultDesign();
    for (const side of sides) {
      expect(describeNote(design, 0, side)).toContain('Overprinted "SPECIMEN".');
      expect(describeNote(design, 0, side)).toContain(`Fine print: ${FINE_PRINT}.`);
    }
    expect(describeSeries(design)).toContain('Fictional currency, bank.eurth.org.');
    const off = cleanDesign({ note: { specimen: false } });
    expect(describeNote(off, 0, 'front')).not.toContain('SPECIMEN');
    expect(describeNote(off, 0, 'front')).toContain(FINE_PRINT);
  });
});

describe('a note as SVG', () => {
  it('is well formed and uses only plain drawing elements', () => {
    for (const design of [defaultDesign(), awkward()]) every(design, (svg) => wellFormed(svg));
    for (const border of borders) wellFormed(renderNote({ ...defaultDesign(), note: { ...defaultDesign().note, border } }, 0, 'front'));
  });

  it('has no scripts, styles, links or numbers gone wrong', () => {
    every(awkward(), (svg, where) => {
      expect(svg, where).not.toMatch(/<script|<style|<foreignObject|<a |<use|javascript:|https?:\/\/(?!www\.w3\.org\/2000\/svg")|\son\w+=/i);
      expect(svg, where).not.toMatch(/NaN|undefined|Infinity|null/);
    });
  });

  it('is the same every time', () => {
    for (const side of sides) expect(renderNote(defaultDesign(), 4, side)).toBe(renderNote(defaultDesign(), 4, side));
    expect(renderSeries(defaultDesign())).toBe(renderSeries(defaultDesign()));
  });

  it('has the size of its place in the series, in tenths of a millimetre', () => {
    const design = defaultDesign();
    for (let i = 0; i < 6; i++) {
      const size = noteSize(design, i);
      expect(renderNote(design, i, 'front')).toContain(`viewBox="0 0 ${size.width * 10} ${size.height * 10}"`);
    }
    const upright = { ...design, note: { ...design.note, layout: 'vertical' as const } };
    expect(renderNote(upright, 0, 'front')).toContain('viewBox="0 0 680 1300"');
    expect(renderNote(design, 0, 'front', { pixelWidth: 2600 })).toContain('width="2600" height="1360"');
  });

  it('names and describes itself for screen readers', () => {
    const svg = renderNote(defaultDesign(), 4, 'front');
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 1540 760" width="770" height="380" role="img" aria-labelledby="bank-100-front-title bank-100-front-desc">/);
    expect(svg).toContain('<title id="bank-100-front-title">The 100 selun note of the Bank of Teland, front</title>');
    expect(svg).toContain(`<desc id="bank-100-front-desc">${describeNote(defaultDesign(), 4, 'front').replace(/"/g, '&quot;')}</desc>`);
  });

  it('shows the mock-up: issuer, numeral, words and serial', () => {
    const svg = renderNote(defaultDesign(), 4, 'front');
    const shown = texts(svg).map((t) => t.text);
    expect(shown).toContain('BANK OF TELAND');
    expect(shown).toContain('100');
    expect(shown.join(' ')).toContain('ONE HUNDRED');
    expect(shown.join(' ')).toContain('SELUN');
    expect(shown.some((t) => /^TL \d{7}$/.test(t))).toBe(true);
    expect(shown).toContain('GOVERNOR');
    expect(svg).toContain('fill="#f3e6c4"');
    expect(svg).toContain('#1b6fa0');
    expect(svg).toContain('<ellipse');
    expect(svg).toContain('stroke-dasharray');
  });

  it('keeps every line of text on the note, however long the names and values', () => {
    for (const design of [defaultDesign(), awkward()]) {
      every(design, (svg, where) => {
        const width = Number(/viewBox="0 0 (\d+) (\d+)"/.exec(svg)![1]);
        const height = Number(/viewBox="0 0 (\d+) (\d+)"/.exec(svg)![2]);
        const m = Math.min(width, height);
        for (const t of texts(svg)) {
          if (t.text === SPECIMEN_TEXT) continue;
          expect(t.left, `${where}: "${t.text}" starts off the note`).toBeGreaterThanOrEqual(m * 0.1);
          expect(t.right, `${where}: "${t.text}" runs off the note`).toBeLessThanOrEqual(width - m * 0.1);
          expect(t.y, `${where}: "${t.text}"`).toBeGreaterThan(m * 0.1);
          expect(t.y, `${where}: "${t.text}"`).toBeLessThanOrEqual(height - m * 0.015);
          expect(t.size, `${where}: "${t.text}"`).toBeGreaterThan(0);
        }
      });
    }
  });

  it('pins every text to a width, so no font can break the layout', () => {
    every(awkward(), (svg, where) => {
      expect(count(svg, '<text '), where).toBe(count(svg, 'lengthAdjust="spacingAndGlyphs"'));
      for (const t of texts(svg)) expect(Number.isFinite(t.right) && t.right > t.left, `${where}: ${t.text}`).toBe(true);
    });
  });

  it('escapes whatever text it is given', () => {
    // Straight into the renderer, past the cleaning, as a worst case.
    const design = defaultDesign();
    design.currency.issuer = '"><script>alert(1)</script>';
    design.currency.name = '<b>&';
    design.currency.plural = "'x'";
    design.currency.code = '</text>';
    design.note.signatories = [{ name: '<i>', title: '<svg onload=1>' }];
    every(design, (svg) => {
      wellFormed(svg);
      expect(svg).not.toMatch(/<script|<b>|<i>|<svg onload/);
    });
  });

  it('draws 0 and 69 like any other value', () => {
    const design = awkward();
    expect(texts(renderNote(design, 0, 'front')).map((t) => t.text)).toContain('0');
    expect(texts(renderNote(design, 0, 'front')).map((t) => t.text).join(' ')).toContain('ZERO TESSELS');
    expect(texts(renderNote(design, 1, 'front')).map((t) => t.text).join(' ')).toContain('ONE TESSEL');
    expect(texts(renderNote(design, 2, 'back')).map((t) => t.text)).toContain('69');
  });

  it('copes with a design that has almost nothing in it', () => {
    const bare = cleanDesign({
      currency: { name: '', plural: '', symbol: '', code: '', issuer: '' },
      note: { signatories: [], front: { kind: 'none' }, back: { kind: 'none' }, serial: { prefix: '', digits: 4 } },
      series: { denominations: [{ value: 1 }] },
    });
    every(bare, (svg, where) => {
      wellFormed(svg);
      expect(svg, where).not.toMatch(/NaN|undefined/);
      expect(svg, where).not.toContain('<ellipse');
      expect(svg, where).toContain(FINE_PRINT);
    });
    expect(noteName(bare, 0)).toBe('the 1 note');
  });

  it('stays light', () => {
    every(awkward(), (svg, where) => expect(svg.length, where).toBeLessThan(70_000));
    const heavy = cleanDesign({ note: { border: 'guilloche', rosette: { lobes: 24, rings: 12, depth: 0.6, ripple: 0.4, turn: 1, twist: 6 } } });
    every(heavy, (svg, where) => expect(svg.length, where).toBeLessThan(260_000));
  });
});

describe('the paper', () => {
  const withTexture = (texture: (typeof textures)[number]): Design => ({ ...defaultDesign(), note: { ...defaultDesign().note, texture } });

  it('has a fine grain by default, generated, never a picture', () => {
    expect(defaultDesign().note.texture).toBe('grain');
    const svg = renderNote(defaultDesign(), 4, 'front');
    expect(svg).toContain('<filter id="bank-100-front-paper"');
    expect(svg).toContain('filter="url(#bank-100-front-paper)"');
    expect(svg).toContain('<feTurbulence type="fractalNoise"');
    expect(svg).toContain('lighting-color="#f3e6c4"');
    expect(svg).not.toMatch(/<image|<pattern|data:|href/);
  });

  it('comes plain, grained, laid or aged, each its own', () => {
    const drawn = textures.map((texture) => renderNote(withTexture(texture), 4, 'front'));
    expect(new Set(drawn).size).toBe(textures.length);
    for (const svg of drawn) wellFormed(svg);
    expect(drawn[textures.indexOf('plain')]).not.toContain('<filter');
    expect(drawn[textures.indexOf('aged')]).toContain('<feMerge');
    expect(paperFilter('x', 'plain', '#ffffff', 1)).toBe('');
  });

  it('is the same sheet every time, and another sheet for another value', () => {
    expect(paperFilter('x', 'grain', '#f3e6c4', 12345)).toBe(paperFilter('x', 'grain', '#f3e6c4', 12345));
    const seeds = [0, 1, 2, 3, 4, 5].map((i) => /seed="(\d+)"/.exec(renderNote(defaultDesign(), i, 'front'))![1]);
    expect(new Set(seeds).size).toBe(6);
    for (const seed of [-5, 1e12, 3.7, 0]) expect(paperFilter('x', 'aged', '#ffffff', seed)).toMatch(/seed="\d{1,3}"/);
  });

  it('keeps the edge of the note a clean line on top', () => {
    const svg = renderNote(defaultDesign(), 4, 'front');
    expect(svg).toMatch(/<rect [^>]*fill="#f3e6c4" filter="url\(#bank-100-front-paper\)"\/><rect [^>]*fill="none" stroke="#ab7527"/);
  });

  it('takes an unknown texture as the default', () => {
    expect(cleanDesign({ note: { texture: 'marble' } }).note.texture).toBe('grain');
    expect(cleanDesign({ note: { texture: 'plain' } }).note.texture).toBe('plain');
  });
});

describe('the slot', () => {
  const arms = 'data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2010%2012%22%3E%3Cpath%20d%3D%22M0%200h10v12z%22%2F%3E%3C%2Fsvg%3E';

  it('shows our own line art in the ink of the note', () => {
    const svg = renderNote(defaultDesign(), 4, 'back');
    expect(svg).toContain('clip-path="url(#bank-100-back-slot)"');
    expect(svg).toContain('<clipPath id="bank-100-back-slot">');
    expect(svg).not.toContain('<image');
  });

  it("shows the profile's arms or flag as an image, never as markup", () => {
    const design = cleanDesign({ note: { front: { kind: 'arms' }, back: { kind: 'flag' } } });
    const front = renderNote(design, 0, 'front', { pictures: { arms, flag: arms } });
    expect(count(front, '<image ')).toBe(1);
    expect(front).toContain(`<image href="${arms}"`);
    wellFormed(front);
    expect(count(renderNote(design, 0, 'back', { pictures: { arms, flag: arms } }), '<image ')).toBe(1);
  });

  it('falls back to our line art when there is no profile to take them from', () => {
    const design = cleanDesign({ note: { front: { kind: 'arms' }, back: { kind: 'flag' } } });
    for (const side of sides) {
      const svg = renderNote(design, 0, side);
      expect(svg).not.toContain('<image');
      expect(svg).toContain('clip-path=');
      wellFormed(svg);
    }
  });

  it('places nothing that is not an SVG data address', () => {
    const design = cleanDesign({ note: { front: { kind: 'arms' } } });
    const bad = [
      'https://example.org/arms.svg',
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'data:image/svg+xml,"/><script>alert(1)</script>',
      'data:image/svg+xml,<svg onload="x">',
      'data:image/png;base64,AAAA',
      ' data:image/svg+xml,x',
      `data:image/svg+xml,${'a'.repeat(900_000)}`,
      42,
      null,
    ];
    for (const value of bad) {
      expect(safePicture(value), String(value).slice(0, 40)).toBe('');
      const svg = renderNote(design, 0, 'front', { pictures: { arms: value as string } });
      expect(svg).not.toContain('<image');
      wellFormed(svg);
    }
    expect(safePicture(arms)).toBe(arms);
    expect(safePicture('data:image/svg+xml;base64,PHN2Zy8+')).toBe('data:image/svg+xml;base64,PHN2Zy8+');
  });

  it('leaves the frame out altogether for an empty slot', () => {
    const design = cleanDesign({ note: { front: { kind: 'none' } } });
    expect(renderNote(design, 0, 'front')).not.toContain('clipPath');
  });
});

describe('the series sheet', () => {
  it('holds every value once per side, in order, without overlap', () => {
    const sheet = sheetParts(defaultDesign(), { sides: 'both' });
    expect(sheet.cells.map((c) => `${c.index}${c.side[0]}`)).toEqual(['0f', '0b', '1f', '1b', '2f', '2b', '3f', '3b', '4f', '4b', '5f', '5b']);
    for (const [i, a] of sheet.cells.entries()) {
      expect(a.x).toBeGreaterThan(0);
      expect(a.y).toBeGreaterThan(0);
      expect(a.x + a.width).toBeLessThan(sheet.width);
      expect(a.y + a.height).toBeLessThan(sheet.height);
      for (const b of sheet.cells.slice(i + 1)) {
        const apart = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
        expect(apart, `${i} overlaps`).toBe(true);
      }
    }
  });

  it('shows each note a step larger than the last', () => {
    const cells = sheetParts(defaultDesign()).cells;
    for (let i = 1; i < cells.length; i++) {
      expect(cells[i]!.width).toBeGreaterThan(cells[i - 1]!.width);
      expect(cells[i]!.height).toBeGreaterThan(cells[i - 1]!.height);
    }
  });

  it('is well formed, with ids that never clash', () => {
    for (const design of [defaultDesign(), awkward()]) {
      for (const which of ['front', 'back', 'both'] as const) {
        const svg = renderSeries(design, { sides: which, background: '#0d353f' });
        wellFormed(svg);
        const ids = [...svg.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]);
        expect(new Set(ids).size, which).toBe(ids.length);
        for (const ref of svg.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref[1]);
      }
    }
  });

  it('names and describes itself', () => {
    const svg = renderSeries(defaultDesign(), { sides: 'both' });
    expect(svg).toContain('<title id="bank-sheet-title">The selun series, fronts and backs: 5, 10, 20, 50, 100 and 200 selun</title>');
    expect(svg).toContain('The selun (TLS, Ŝ) is issued by the Bank of Teland.');
  });

  it('arranges long series in columns and takes a background only if it is a colour', () => {
    const centres = (cells: { x: number; y: number; width: number; height: number }[], axis: 'x' | 'y'): number =>
      new Set(cells.map((c) => Math.round((axis === 'x' ? c.x + c.width / 2 : c.y + c.height / 2) / 10))).size;
    expect(centres(sheetParts(awkward()).cells, 'x')).toBe(2);
    expect(centres(sheetParts(awkward()).cells, 'y')).toBe(4);
    const twelve = cleanDesign({ series: { denominations: Array.from({ length: 12 }, (_, i) => ({ value: i + 1 })) } });
    const sheet = sheetParts(twelve);
    expect(centres(sheet.cells, 'x')).toBe(3);
    expect(centres(sheet.cells, 'y')).toBe(4);
    expect(renderSeries(defaultDesign(), { background: 'url(#x)"><script>' })).not.toContain('script');
    expect(renderSeries(twelve, { sides: 'both' }).length).toBeLessThan(1_200_000);
  });
});

describe('descriptions', () => {
  it('describe the front of the mock-up note', () => {
    expect(describeNote(defaultDesign(), 4, 'front')).toBe(
      'The front of the 100 selun note of the Bank of Teland: blue ink on parchment paper, 154 by 76 mm. ' +
        'On the left, an oval frame holds a plain silhouette, head and shoulders. ' +
        'A guilloche rosette of 8 rings and 12 petals lies to the right. ' +
        'The value stands in numerals, "100", and in words, "one hundred selun". ' +
        'Signed by Mara Venn (Governor) and Ilse Tarrow (Chief Cashier). ' +
        'Serial number TL 2014497. A stitched line runs round the edge. Overprinted "SPECIMEN". ' +
        'Fine print: fictional currency, bank.eurth.org.',
    );
  });

  it('describe the back', () => {
    expect(describeNote(defaultDesign(), 4, 'back')).toBe(
      'The back of the 100 selun note of the Bank of Teland: blue ink on parchment paper, 154 by 76 mm. ' +
        'A framed vignette shows a lighthouse on a rock, its lamp lit. ' +
        'The value, "100", stands over a guilloche rosette of 8 rings and 12 petals, with "one hundred selun" in words. ' +
        'The currency code is TLS. A stitched line runs round the edge. Overprinted "SPECIMEN". ' +
        'Fine print: fictional currency, bank.eurth.org.',
    );
  });

  it('describe the series, naming each colour in words', () => {
    expect(describeSeries(defaultDesign())).toBe(
      'The selun (TLS, Ŝ) is issued by the Bank of Teland. Its notes come in 6 values: 5, 10, 20, 50, 100 and 200 selun. ' +
        'Each value has its own colours and is a little larger than the last: ' +
        'the 5 is dark green on pale green, 130 by 68 mm; the 10 is dark red on pale pink, 136 by 70 mm; ' +
        'the 20 is purple on pale pink, 142 by 72 mm; the 50 is dark blue on pale blue, 148 by 74 mm; ' +
        'the 100 is blue on parchment, 154 by 76 mm; the 200 is dark grey on pale grey, 160 by 78 mm. ' +
        'Fictional currency, bank.eurth.org.',
    );
  });

  it('change with the design', () => {
    const design = cleanDesign({
      currency: { name: 'tessel', plural: 'tessels', symbol: '', code: '', issuer: 'The Vantmoor Treasury' },
      series: { denominations: [{ value: 1 }], stepWidth: 0, stepHeight: 0 },
      note: { layout: 'vertical', border: 'guilloche', rosette: { depth: 0, ripple: 0, rings: 1 }, front: { kind: 'arms' }, signatories: [{ name: '', title: 'Treasurer' }] },
    });
    const front = describeNote(design, 0, 'front');
    expect(front).toContain('the 1 tessel note of The Vantmoor Treasury');
    expect(front).toContain("At the top of this upright note, a frame holds the nation's coat of arms.");
    expect(front).toContain('A rosette of one plain ring lies below.');
    expect(front).toContain('"one tessel"');
    expect(front).toContain('Signed by the Treasurer.');
    expect(front).toContain('A braided guilloche band runs round the edge.');
    expect(describeNote(design, 0, 'back')).not.toContain('currency code');
    expect(describeSeries(design)).toContain('The tessel is issued by The Vantmoor Treasury. It has one note, of 1 tessel.');
  });

  it('give the series and both sides for Copy description', () => {
    const all = describeDesign(defaultDesign(), 4).split('\n\n');
    expect(all).toEqual([describeSeries(defaultDesign()), describeNote(defaultDesign(), 4, 'front'), describeNote(defaultDesign(), 4, 'back')]);
  });

  it('never leak markup or loose ends', () => {
    for (const design of [defaultDesign(), awkward()]) {
      for (const side of sides) {
        for (let i = 0; i < design.series.denominations.length; i++) {
          const text = describeNote(design, i, side);
          expect(text).not.toMatch(/undefined|NaN|[<>]|  |\.\.| \./);
          expect(text.endsWith('.')).toBe(true);
        }
      }
      expect(describeSeries(design)).not.toMatch(/undefined|NaN|[<>]|  |\.\.| \./);
    }
  });
});

describe('parts', () => {
  it('give the size, the drawing and the words separately, for the site to place', () => {
    const parts = noteParts(defaultDesign(), 4, 'front');
    expect(parts.width).toBe(1540);
    expect(parts.height).toBe(760);
    expect(parts.body.startsWith('<filter')).toBe(true);
    expect(parts.title).toBe('The 100 selun note of the Bank of Teland, front');
    expect(parts.description).toBe(describeNote(defaultDesign(), 4, 'front'));
  });

  it('clamp a place outside the series', () => {
    expect(noteParts(defaultDesign(), 99, 'front').title).toContain('200 selun');
    expect(noteParts(defaultDesign(), -3, 'back').title).toContain('5 selun');
  });
});
