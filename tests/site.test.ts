// What the site adds to the engine: Bank's section checked by the real profile checker, the
// profile's pictures on a note, the guide's renderer, and the pictures the pages show.
import { readFileSync } from 'node:fs';
import { createProfile, getSection, parseProfile, serialiseProfile, setSection, svgDataUrl, validateProfile, type EurthProfile } from '@eurth/profile';
import { describe, expect, it } from 'vitest';
import { inventDesign } from '../src/bank/invent';
import { SITE, readLink } from '../src/bank/link';
import { cleanDesign, defaultDesign } from '../src/bank/model';
import { bankSection, designFromSection } from '../src/bank/profile';
import { renderNote } from '../src/bank/render';
import { templates } from '../src/bank/templates';
import { callouts } from '../src/site/anatomy';
import { renderMarkdown, slug } from '../src/site/markdown';
import { pictures } from '../src/site/pictures';
import { site } from '../eurth.config.mjs';

const example = (name: string): EurthProfile => {
  const read = parseProfile(readFileSync(new URL(`../node_modules/@eurth/profile/examples/${name}.eurth.json`, import.meta.url), 'utf8'));
  if (!read.ok) throw new Error(`${name} is not a profile`);
  return read.profile;
};

type Section = Parameters<typeof setSection<'bank'>>[2];

describe("Bank's section in a real profile", () => {
  const designs = [defaultDesign(), ...templates.map((t) => t.design), ...[1, 2, 3, 4, 5].map((seed) => inventDesign(seed))];

  it('passes @eurth/profile’s own checker, for every template', () => {
    for (const design of designs) {
      const profile = setSection(createProfile('Teland'), 'bank', bankSection(design) as Section);
      const result = validateProfile(profile);
      expect(result.ok, JSON.stringify(result.ok ? '' : result.errors)).toBe(true);
    }
  });

  it('comes back from the file as the same design', () => {
    for (const design of designs) {
      const profile = setSection(createProfile('Teland'), 'bank', bankSection(design) as Section);
      const read = parseProfile(serialiseProfile(profile));
      expect(read.ok).toBe(true);
      if (read.ok) expect(designFromSection(getSection(read.profile, 'bank'))).toEqual(design);
    }
  });

  it('leaves every other section of a full profile exactly as it was', () => {
    const before = example('calderwyn');
    const after = setSection(before, 'bank', bankSection(defaultDesign(), getSection(before, 'bank')) as Section);
    for (const key of Object.keys(before)) {
      if (key !== 'bank' && key !== 'meta') expect((after as Record<string, unknown>)[key], key).toEqual((before as Record<string, unknown>)[key]);
    }
    expect(after.meta.nation).toBe('Calderwyn');
    expect(validateProfile(after).ok).toBe(true);
    expect(getSection(after, 'bank')?.currency).toBe('selun');
  });

  it('reads the currency of the profile’s own example, which no Bank has written yet', () => {
    const design = designFromSection(getSection(example('calderwyn'), 'bank'))!;
    expect(design.currency.name).toBe('Calder mark');
    expect(design.currency.code).toBe('CWM');
    expect(design.series.denominations.map((d) => d.value)).toEqual([5, 10, 20, 50, 100, 200]);
    expect(designFromSection(getSection(example('hesperwick'), 'bank'))).toBe(null);
  });

  it('puts the link to the live site in the section, wherever the page is being served', () => {
    const link = bankSection(inventDesign(9)).link!;
    expect(link.startsWith(`${site.url}/?d=1.`)).toBe(true);
    expect(SITE).toBe(`${site.url}/`);
    expect(readLink(link)?.design).toEqual(inventDesign(9));
  });
});

describe("the profile's arms and flag on a note", () => {
  it('are shown as images, from the data addresses @eurth/profile makes', () => {
    const profile = example('calderwyn');
    const picturesFrom = { arms: svgDataUrl(getSection(profile, 'arms')?.svg), flag: svgDataUrl(getSection(profile, 'flag')?.svg) };
    expect(picturesFrom.arms.startsWith('data:image/svg+xml')).toBe(true);
    const design = cleanDesign({ note: { front: { kind: 'arms' }, back: { kind: 'flag' } } });
    const front = renderNote(design, 0, 'front', { pictures: picturesFrom });
    const back = renderNote(design, 0, 'back', { pictures: picturesFrom });
    expect(front).toContain(`<image href="${picturesFrom.arms.replace(/&/g, '&amp;').replace(/'/g, '&#39;')}"`);
    expect(back.split('<image ').length - 1).toBe(1);
    // No markup from the profile ever lands in the note itself.
    expect(front).not.toMatch(/<svg[^>]*>.*<svg/s);
  });

  it('fall back to our line art for a profile without them', () => {
    const profile = example('hesperwick');
    const design = cleanDesign({ note: { front: { kind: 'arms' } } });
    expect(renderNote(design, 0, 'front', { pictures: { arms: svgDataUrl(getSection(profile, 'arms')?.svg) } })).not.toContain('<image');
  });
});

describe("the guide's renderer", () => {
  const source = readFileSync(new URL('../src/content/guide.md', import.meta.url), 'utf8');
  const guide = renderMarkdown(source, (href) => (href.startsWith('https://') ? `${href}${href.includes('?') ? '&' : '?'}ref=test` : href));

  it('reads the title, description and date', () => {
    expect(guide.front.title).toBe('How a banknote is designed');
    expect(guide.front.description!.length).toBeGreaterThan(60);
    expect(guide.front.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('leaves no Markdown behind and lets no markup through', () => {
    expect(guide.html).not.toMatch(/\*\*|\]\(|^#|\n- |<script|<img|javascript:/m);
    expect(renderMarkdown('A <b>bold</b> claim & a "quote".').html).toBe('<p>A &lt;b&gt;bold&lt;/b&gt; claim &amp; a &quot;quote&quot;.</p>');
    expect(renderMarkdown('## Hello <script>').html).toBe('<h2 id="hello-script">Hello &lt;script&gt;</h2>');
  });

  it('gives every heading an id of its own, in order', () => {
    expect(guide.headings.length).toBeGreaterThan(20);
    expect(new Set(guide.headings.map((h) => h.id)).size).toBe(guide.headings.length);
    expect(guide.headings[0]).toEqual({ level: 2, id: 'the-anatomy-of-a-banknote', text: 'The anatomy of a banknote' });
    let last = 2;
    for (const h of guide.headings) {
      expect(h.level - last).toBeLessThanOrEqual(1);
      last = h.level;
    }
    expect(slug('The value, twice')).toBe('the-value-twice');
  });

  it('passes every outbound link through, so each can carry its ref', () => {
    const links = [...guide.html.matchAll(/<a href="([^"]+)">/g)].map((m) => m[1]!);
    expect(links.length).toBeGreaterThanOrEqual(18);
    for (const href of links) expect(href, href).toMatch(/^https:\/\/.+[?&]ref=test$/);
    expect(guide.html).toContain('href="https://en.wikipedia.org/wiki/Intaglio_(printmaking)?ref=test"');
  });

  it('renders lists and bold', () => {
    expect(renderMarkdown('- **One.** First\n- Two').html).toBe('<ul><li><strong>One.</strong> First</li><li>Two</li></ul>');
    expect(renderMarkdown('1. One\n2. Two').html).toBe('<ol><li>One</li><li>Two</li></ol>');
  });

  it('has a heading for every marker on the figures', () => {
    const ids = new Set(guide.headings.map((h) => h.id));
    for (const side of ['front', 'back'] as const) {
      for (const callout of callouts[side]) {
        expect(ids, `${side}: ${callout.label}`).toContain(callout.about);
        expect(callout.at[0]).toBeGreaterThan(0);
        expect(callout.at[0]).toBeLessThan(1);
        expect(callout.at[1]).toBeGreaterThan(0);
        expect(callout.at[1]).toBeLessThan(1);
      }
    }
  });
});

describe('the pictures the pages show', () => {
  it('are one note for each template and the two figures, each described in words', () => {
    const made = pictures();
    expect(made.map((p) => p.name)).toEqual([...templates.map((t) => t.id), 'anatomy-front', 'anatomy-back']);
    for (const picture of made) {
      expect(picture.svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg"')).toBe(true);
      expect(picture.svg).toContain('fictional currency, bank.eurth.org');
      expect(picture.svg).toContain('SPECIMEN');
      expect(picture.alt.length).toBeGreaterThan(80);
      expect(picture.width).toBeGreaterThan(100);
      expect(picture.svg.length).toBeLessThan(80_000);
    }
  });

  it('number the markers on the figures from 1', () => {
    const front = pictures().find((p) => p.name === 'anatomy-front')!;
    expect(front.svg.split('<circle ').length - 1).toBe(callouts.front.length);
    expect(front.alt).toContain('Numbered markers point out: 1, the portrait;');
  });
});
