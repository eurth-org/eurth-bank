/**
 * The profile's "bank" section. The Eurth nation profile (@eurth/profile) is one small JSON file
 * that carries a nation from tool to tool; each tool writes its own section and leaves the rest
 * exactly as it found it. Bank owns `bank`.
 *
 * The section holds what other tools want, in the fields the profile defines: `currency`, `code`,
 * `issuer` and `denominations` (largest first), with the shared `link` and `summary`. Bank adds
 * three of its own, which the schema allows: `plural`, `symbol` (Wiki and Card show it) and
 * `design`, the series design in a readable form, so that a design comes back from the file even
 * if the link is lost.
 *
 * These functions take and give plain objects; the site hands them to @eurth/profile's
 * `getSection` and `setSection`, which stamp `updated`.
 */
import { designLink, readLink, SITE } from './link';
import { cleanDesign, type Design } from './model';
import { formatNumeral, listInWords, unitFor } from './words';

/** The version of the `design` object inside the section. */
export const SECTION_DESIGN_VERSION = 1;

/** The section as Bank writes it. Unknown keys from a newer Bank are carried along. */
export interface BankSection {
  link?: string;
  summary?: string;
  updated?: string;
  currency?: string;
  code?: string;
  issuer?: string;
  denominations?: number[];
  plural?: string;
  symbol?: string;
  design?: Record<string, unknown>;
  [key: string]: unknown;
}

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

/** One plain paragraph for tools that only want a line: at most 600 characters, as the profile asks. */
export function bankSummary(design: Design): string {
  const { currency, series } = design;
  const values = series.denominations.map((d) => formatNumeral(d.value));
  const tags = [currency.code, currency.symbol].filter(Boolean).join(', ');
  const unit = unitFor(2, currency);
  const issuer = currency.issuer ? `, issued by ${/^the /i.test(currency.issuer) ? '' : 'the '}${currency.issuer}` : '';
  const notes = values.length === 1 ? `one note of ${values[0]}` : `${values.length} notes: ${listInWords(values)}`;
  const text = `The ${currency.name || 'currency'}${tags ? ` (${tags})` : ''}${issuer}, in ${notes}${unit ? ` ${unit}` : ''}. A fictional currency, designed at bank.eurth.org.`;
  return text.length <= 600 ? text : `${text.slice(0, 599).trimEnd()}…`;
}

/**
 * The section for a design. Pass the section that was there before, and every key Bank doesn't
 * write is kept. A field the design leaves empty is removed, so no stale value lingers.
 */
export function bankSection(design: Design, existing?: unknown, site = SITE): BankSection {
  const d = cleanDesign(design);
  const { currency, series, note } = d;
  const section: BankSection = { ...record(existing) };
  const set = (key: string, value: string): void => {
    if (value) section[key] = value;
    else delete section[key];
  };
  section.link = designLink(d, undefined, site);
  section.summary = bankSummary(d);
  set('currency', currency.name);
  set('code', currency.code);
  set('issuer', currency.issuer);
  section.denominations = series.denominations.map((x) => x.value).sort((a, b) => b - a);
  set('plural', currency.plural);
  set('symbol', currency.symbol);
  section.design = {
    v: SECTION_DESIGN_VERSION,
    layout: note.layout,
    border: note.border,
    texture: note.texture,
    rosette: { ...note.rosette },
    front: { ...note.front },
    back: { ...note.back },
    size: { width: series.width, height: series.height, stepWidth: series.stepWidth, stepHeight: series.stepHeight },
    colours: series.denominations.map((x) => ({ value: x.value, paper: x.paper, ink: x.ink, accent: x.accent })),
    signatories: note.signatories.map((p) => ({ ...p })),
    serial: { ...note.serial },
    seed: note.seed,
    specimen: note.specimen,
  };
  return section;
}

/**
 * The design in a section, checked and clamped like anything else that arrives from outside.
 * It is read from `design` when that is there, else from the section's own link to Bank, else
 * built from the plain fields with Bank's default look. Null when the section has nothing to go on.
 */
export function designFromSection(value: unknown, site = SITE): Design | null {
  const section = record(value);
  // Only what the file really says: a field that is absent must not blank one that a link supplies.
  const typed: Record<string, string> = {};
  for (const [key, field] of [['name', 'currency'], ['plural', 'plural'], ['symbol', 'symbol'], ['code', 'code'], ['issuer', 'issuer']] as const) {
    if (typeof section[field] === 'string') typed[key] = section[field] as string;
  }
  const values = Array.isArray(section.denominations) ? section.denominations.map((v) => ({ value: v })) : null;
  const stored = record(section.design);
  const blank = { name: '', symbol: '', code: '', issuer: '' };

  if (Object.keys(stored).length > 0) {
    const size = record(stored.size);
    return cleanDesign({
      currency: { ...blank, ...typed },
      series: { ...size, denominations: Array.isArray(stored.colours) ? stored.colours : (values ?? undefined) },
      note: { ...stored, specimen: stored.specimen === false ? false : true },
    });
  }

  const linked = readLink(section.link, site);
  if (linked) return cleanDesign({ ...linked.design, currency: { ...linked.design.currency, ...typed } });

  if (!('name' in typed) && !values) return null;
  return cleanDesign({ currency: { ...blank, ...typed }, ...(values ? { series: { denominations: values } } : {}) });
}
