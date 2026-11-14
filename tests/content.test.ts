import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ISO4217_SOURCE } from '../src/bank/data/iso4217';
import { FINE_PRINT } from '../src/bank/fiction';
import { rosettePresets, seriesPresets } from '../src/bank/presets';
import { GLOSSARY_UPDATED, glossary, term } from '../src/content/glossary';

const guide = readFileSync(new URL('../src/content/guide.md', import.meta.url), 'utf8');
const body = guide.replace(/^---[\s\S]*?---\n/, '');
const links = [...body.matchAll(/\[([^\]]+)\]\((https?:[^)\s]+(?:\([^)]*\))?[^)\s]*)\)/g)].map((m) => ({ text: m[1]!, url: m[2]! }));

describe('the guide', () => {
  it('has a title, a description and a date', () => {
    const front = /^---\n([\s\S]*?)\n---\n/.exec(guide)?.[1] ?? '';
    expect(front).toMatch(/^title: .{10,70}$/m);
    expect(front).toMatch(/^description: .{60,170}$/m);
    expect(front).toMatch(/^updated: \d{4}-\d{2}-\d{2}$/m);
  });

  it('explains every part of a banknote the brief names', () => {
    for (const heading of ['### The portrait', '### The vignette', '### Guilloche and rosettes', '### Microprint', '### The watermark', '### The security thread']) {
      expect(body, heading).toContain(heading);
    }
    for (const word of ['intaglio', 'serial number', 'signature', 'see-through', 'polymer']) expect(body.toLowerCase(), word).toContain(word);
  });

  it('covers how a series is designed, and why Bank is fiction only', () => {
    for (const heading of ['## The anatomy of a banknote', '## How a series is designed', '## Why Bank is fiction only', '## Designing your own', '## Sources']) {
      expect(body, heading).toContain(heading);
    }
    expect(body).toContain('ISO 4217');
    expect(body).toContain('SPECIMEN');
    expect(body).toContain(FINE_PRINT);
  });

  it('is a proper read, in sentence-case headings and British spelling', () => {
    expect(body.split(/\s+/).length).toBeGreaterThan(2000);
    for (const [, heading] of body.matchAll(/^#{2,3} (.+)$/gm)) {
      expect(heading, heading).toMatch(/^[A-Z][^A-Z]*(?:\b(?:Bank|ISO)\b[^A-Z]*)*$/);
    }
    expect(body).not.toMatch(/\bcolor\b|\bcolors\b|\bcenter\b|\bgray\b|\bmeters?\b|TODO|lorem/i);
    expect(body).toMatch(/colour/);
  });

  it('says what Bank really does: the numbers match the engine', () => {
    expect(body).toContain('six numbers');
    expect(Object.keys(rosettePresets[0]!.rosette).length).toBe(6);
    expect(body).toContain('0 to a million million');
    expect(seriesPresets.some((preset) => preset.id === 'inflation')).toBe(true);
    expect(body).toContain('a fine grain by default, or laid, aged or plain');
  });

  it('gives its sources: links to central banks and standards bodies, each used once', () => {
    const sources = body.slice(body.indexOf('## Sources'));
    const listed = links.filter((link) => sources.includes(link.url));
    expect(listed.length).toBeGreaterThanOrEqual(18);
    expect(new Set(listed.map((link) => link.url)).size).toBe(listed.length);
    for (const link of links) expect(link.url, link.text).toMatch(/^https:\/\/[a-z0-9.-]+\//);
    const hosts = new Set(listed.map((link) => new URL(link.url).host));
    for (const host of ['www.ecb.europa.eu', 'www.snb.ch', 'www.norges-bank.no', 'www.bankofengland.co.uk', 'www.uscurrency.gov', 'www.six-group.com']) expect(hosts, host).toContain(host);
    expect(listed.map((link) => link.url)).toContain(ISO4217_SOURCE);
    expect(sources).toMatch(/Checked on \d{1,2} \w+ \d{4}\./);
  });

  it('reproduces nothing: no pictures, no markup, no embedded files', () => {
    expect(body).not.toMatch(/!\[|<img|<svg|<script|<iframe|data:/i);
  });
});

describe('the glossary', () => {
  it('has some forty terms, in alphabetical order, each with its own id', () => {
    expect(glossary.length).toBeGreaterThanOrEqual(40);
    const terms = glossary.map((entry) => entry.term);
    expect(terms).toEqual([...terms].sort((a, b) => a.localeCompare(b, 'en')));
    expect(new Set(glossary.map((entry) => entry.id)).size).toBe(glossary.length);
    expect(new Set(terms).size).toBe(glossary.length);
    expect(GLOSSARY_UPDATED).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('defines each term in a sentence or two of plain text', () => {
    for (const entry of glossary) {
      expect(entry.id, entry.term).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
      expect(entry.term.charAt(0), entry.term).toMatch(/[A-Z]/);
      expect(entry.definition.length, entry.term).toBeGreaterThan(40);
      expect(entry.definition.length, entry.term).toBeLessThan(240);
      expect(entry.definition, entry.term).toMatch(/^[A-Z].*\.$/);
      expect(entry.definition, entry.term).not.toMatch(/[<>]|\bcolor\b|  /);
    }
  });

  it('only points at terms that exist, and never at itself', () => {
    for (const entry of glossary) {
      for (const id of entry.see ?? []) {
        expect(term(id), `${entry.id} → ${id}`).toBeDefined();
        expect(id).not.toBe(entry.id);
      }
    }
    expect(term('no-such-term')).toBeUndefined();
  });

  it('has the words the brief and the guide lean on', () => {
    for (const id of ['portrait', 'vignette', 'guilloche', 'microprint', 'watermark', 'security-thread', 'specimen', 'denomination', 'series', 'iso-4217', 'serial-number', 'signature']) {
      expect(term(id), id).toBeDefined();
    }
  });

  it('marks what Bank draws, and nothing it deliberately leaves out', () => {
    for (const id of ['guilloche', 'rosette', 'microprint', 'serial-number', 'signature', 'specimen', 'fine-print', 'border']) expect(term(id)?.inBank, id).toBe(true);
    for (const id of ['watermark', 'security-thread', 'hologram', 'clear-window', 'colour-shifting-ink', 'see-through-register']) expect(term(id)?.inBank, id).toBeUndefined();
  });
});
