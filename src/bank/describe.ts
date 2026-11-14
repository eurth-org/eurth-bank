/**
 * A note in plain words. Every picture Bank makes has a written description: it is the alternative
 * text inside the SVG, what "Copy description" copies, and what a screen reader reads out.
 */
import { artOf, type ArtKind } from './art';
import { colourName } from './colors';
import { FINE_PRINT, SPECIMEN_TEXT } from './fiction';
import { isPlain } from './guilloche';
import { noteSize, type Border, type Design, type Side, type Slot } from './model';
import { serialNumber } from './serial';
import { formatNumeral, listInWords, unitFor, valueInWords, valueWithUnit } from './words';

const BORDERS: Record<Border, string> = {
  rules: 'Two plain rules run round the edge.',
  stitch: 'A stitched line runs round the edge.',
  wave: 'A wavy line between two rules runs round the edge.',
  scallop: 'A scalloped rule runs round the edge.',
  key: 'A key pattern between two rules runs round the edge.',
  guilloche: 'A braided guilloche band runs round the edge.',
};

const capital = (text: string): string => text.charAt(0).toUpperCase() + text.slice(1);
const mm = (value: number): string => String(Math.round(value * 10) / 10);

/** "the 100 selun note of the Bank of Teland" */
export function noteName(design: Design, index: number): string {
  const { currency, series } = design;
  const value = series.denominations[index]?.value ?? 0;
  const issuer = currency.issuer ? ` of ${/^the /i.test(currency.issuer) ? '' : 'the '}${currency.issuer}` : '';
  return `the ${currency.name ? valueWithUnit(value, currency) : formatNumeral(value)} note${issuer}`;
}

/** What a slot holds, in words, or an empty text for an empty slot. */
function slotWords(slot: Slot): string {
  switch (slot.kind) {
    case 'none':
      return '';
    case 'arms':
      return "the nation's coat of arms";
    case 'flag':
      return "the nation's flag";
    default:
      return artOf(slot.kind as ArtKind, slot.art).about;
  }
}

function rosetteWords(design: Design): string {
  const r = design.note.rosette;
  const rings = `${r.rings} ${r.rings === 1 ? 'ring' : 'rings'}`;
  return isPlain(r) ? `a rosette of ${r.rings === 1 ? 'one plain ring' : `${r.rings} plain rings`}` : `a guilloche rosette of ${rings} and ${r.lobes} petals`;
}

const PLACES: Record<Design['note']['layout'], { slot: string; rosette: string }> = {
  'portrait-left': { slot: 'On the left', rosette: 'to the right' },
  centred: { slot: 'In the centre', rosette: 'on either side' },
  vertical: { slot: 'At the top of this upright note', rosette: 'below' },
};

/** One side of one note, described for someone who can't see it. */
export function describeNote(design: Design, index: number, side: Side): string {
  const { currency, series, note } = design;
  const i = Math.min(Math.max(0, index), series.denominations.length - 1);
  const d = series.denominations[i];
  if (!d) return '';
  const size = noteSize(design, i);
  const place = PLACES[note.layout];
  const words = currency.name ? valueInWords(d.value, currency) : '';
  const parts: string[] = [
    `${capital(side === 'front' ? 'the front' : 'the back')} of ${noteName(design, i)}: ${colourName(d.ink)} ink on ${colourName(d.paper)} paper, ${mm(size.width)} by ${mm(size.height)} mm.`,
  ];

  if (side === 'front') {
    const slot = slotWords(note.front);
    if (slot) parts.push(`${place.slot}, ${note.front.kind === 'silhouette' ? 'an oval frame holds' : 'a frame holds'} ${slot}.`);
    parts.push(`${capital(rosetteWords(design))} lies ${place.rosette}.`);
    parts.push(`The value stands in numerals, "${formatNumeral(d.value)}"${words ? `, and in words, "${words}"` : ''}.`);
    const signed = note.signatories
      .map((p) => (p.name && p.title ? `${p.name} (${p.title})` : p.name || (p.title ? `the ${p.title}` : '')))
      .filter(Boolean);
    if (signed.length) parts.push(`Signed by ${listInWords(signed)}.`);
    parts.push(`Serial number ${serialNumber(design, i)}.`);
  } else {
    const slot = slotWords(note.back);
    if (slot) parts.push(`A framed vignette shows ${slot}.`);
    parts.push(`The value, "${formatNumeral(d.value)}", stands over ${rosetteWords(design)}${words ? `, with "${words}" in words` : ''}.`);
    if (currency.code) parts.push(`The currency code is ${currency.code}.`);
  }

  parts.push(BORDERS[note.border]);
  if (note.specimen) parts.push(`Overprinted "${SPECIMEN_TEXT}".`);
  parts.push(`Fine print: ${FINE_PRINT}.`);
  return parts.join(' ');
}

/** The currency and its whole series, in a paragraph. */
export function describeSeries(design: Design): string {
  const { currency, series } = design;
  const values = series.denominations.map((d) => d.value);
  const unit = currency.name || 'currency';
  const tags = [currency.code, currency.symbol].filter(Boolean).join(', ');
  const issuer = currency.issuer ? ` is issued by ${/^the /i.test(currency.issuer) ? '' : 'the '}${currency.issuer}` : ' is a fictional currency';
  const plural = unitFor(2, currency);
  const first = `The ${unit}${tags ? ` (${tags})` : ''}${issuer}.`;
  const count =
    values.length === 1
      ? `It has one note, of ${currency.name ? valueWithUnit(values[0] as number, currency) : formatNumeral(values[0] as number)}.`
      : `Its notes come in ${values.length} values: ${listInWords(values.map((v) => formatNumeral(v)))}${plural ? ` ${plural}` : ''}.`;
  const each = series.denominations.map((d, i) => {
    const size = noteSize(design, i);
    return `the ${formatNumeral(d.value)} is ${colourName(d.ink)} on ${colourName(d.paper)}, ${mm(size.width)} by ${mm(size.height)} mm`;
  });
  const grows = series.stepWidth > 0 || series.stepHeight > 0;
  const lead = values.length === 1 ? 'Its note' : grows ? 'Each value has its own colours and is a little larger than the last' : 'Each value has its own colours';
  const colours = values.length === 1 ? `${capital(each[0] as string)}.` : `${lead}: ${each.join('; ')}.`;
  return `${first} ${count} ${colours} ${capital(FINE_PRINT)}.`;
}

/** What "Copy description" copies: the series, then the note in view, front and back. */
export function describeDesign(design: Design, index: number): string {
  return [describeSeries(design), describeNote(design, index, 'front'), describeNote(design, index, 'back')].join('\n\n');
}
