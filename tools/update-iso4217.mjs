/**
 * Refreshes src/bank/data/iso4217.ts from the lists that SIX, the maintenance agency for ISO 4217,
 * publishes: list one (codes in use, with the fund and metal codes) and list three (codes withdrawn).
 * Bank refuses every one of them, so that no fictional currency borrows a real code.
 *
 *   npm run iso4217                 fetches both lists
 *   npm run iso4217 -- one.xml three.xml   reads them from files instead
 *
 * Run it by hand now and then, read the diff, and commit. Nothing fetches at build time or in the browser.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const BASE = 'https://www.six-group.com/dam/download/financial-information/data-center/iso-currrency/lists/';
const OUT = fileURLToPath(new URL('../src/bank/data/iso4217.ts', import.meta.url));

async function load(name, file) {
  if (file) return readFile(file, 'utf8');
  const response = await fetch(`${BASE}${name}.xml`);
  if (!response.ok) throw new Error(`${name}.xml: ${response.status}`);
  return response.text();
}

const unescape = (text) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();

/** Every entry of a list as code → name, the first name winning when a code is listed for many countries. */
function entries(xml, tag) {
  const found = new Map();
  for (const [, body] of xml.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))) {
    const code = /<Ccy>([A-Z]{3})<\/Ccy>/.exec(body)?.[1];
    const name = /<CcyNm[^>]*>([\s\S]*?)<\/CcyNm>/.exec(body)?.[1];
    if (code && name && !found.has(code)) found.set(code, unescape(name));
  }
  return new Map([...found].sort(([a], [b]) => a.localeCompare(b)));
}

const published = (xml) => /Pblshd="(\d{4}-\d{2}-\d{2})"/.exec(xml)?.[1] ?? '';

const [, , fileOne, fileThree] = process.argv;
const one = await load('list-one', fileOne);
const three = await load('list-three', fileThree);

const current = entries(one, 'CcyNtry');
const historic = entries(three, 'HstrcCcyNtry');
for (const code of current.keys()) historic.delete(code);
if (current.size < 150 || historic.size < 80) throw new Error('The lists look incomplete; nothing written.');

const table = (map) =>
  [...map].map(([code, name]) => `  ${code}: ${JSON.stringify(name).replace(/^"|"$/g, "'").replace(/\\"/g, '"')},`).join('\n');
const safe = (map) => new Map([...map].map(([code, name]) => [code, name.replace(/'/g, '’')]));

const text = `/**
 * ISO 4217, the real world's currency codes: a snapshot, written by tools/update-iso4217.mjs.
 * Do not edit by hand; run \`npm run iso4217\` and commit the result.
 *
 * Source: SIX Financial Information, the maintenance agency for ISO 4217,
 * https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html
 * List one (in use) as published on ${published(one)}; list three (withdrawn) as published on ${published(three)}.
 */

export const ISO4217_SOURCE =
  'https://www.six-group.com/en/products-services/financial-information/market-reference-data/data-standards.html';

/** When SIX published each list. */
export const ISO4217_PUBLISHED = { current: '${published(one)}', historic: '${published(three)}' } as const;

/** Codes in use, with the fund codes, the precious metals and the testing and "no currency" codes. */
export const ISO4217_CURRENT: Readonly<Record<string, string>> = {
${table(safe(current))}
};

/** Codes that were once in use and have been withdrawn. */
export const ISO4217_HISTORIC: Readonly<Record<string, string>> = {
${table(safe(historic))}
};
`;

await writeFile(OUT, text);
console.log(`${current.size} codes in use, ${historic.size} withdrawn → ${OUT}`);
