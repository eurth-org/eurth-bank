/**
 * The whole series on one sheet: every value from one design, each a step larger than the last,
 * each in its own colours. Fronts, backs, or both side by side.
 */
import { describeSeries } from './describe';
import type { Design, Side } from './model';
import { noteParts, type NoteParts, type Pictures } from './render';
import { esc } from './text';
import { formatNumeral, listInWords, unitFor } from './words';

export interface SheetOptions {
  /** Which sides to show. "both" puts each note's back beside its front. */
  sides?: Side | 'both';
  pictures?: Pictures;
  /** A colour behind the notes. Without one the sheet is transparent. */
  background?: string;
  /** How many notes across, for one side. Chosen to suit the series when left out. */
  columns?: number;
  /** The width of the picture in pixels. The height follows. */
  pixelWidth?: number;
}

export interface Sheet {
  width: number;
  height: number;
  body: string;
  title: string;
  description: string;
  /** Where each note sits, in units, in drawing order. */
  cells: { index: number; side: Side; x: number; y: number; width: number; height: number }[];
}

/** The series as parts: every note placed on a grid, centred in its cell. */
export function sheetParts(design: Design, options: SheetOptions = {}): Sheet {
  const sides: Side[] = options.sides === 'both' ? ['front', 'back'] : [options.sides ?? 'front'];
  const count = design.series.denominations.length;
  const notes: { index: number; side: Side; parts: NoteParts }[] = [];
  for (let index = 0; index < count; index++) {
    for (const side of sides) {
      notes.push({ index, side, parts: noteParts(design, index, side, { pictures: options.pictures, idPrefix: `bank-sheet-${index}-${side}` }) });
    }
  }
  const auto = sides.length === 2 ? 2 : count <= 4 ? 1 : count <= 8 ? 2 : 3;
  const columns = Math.max(1, Math.min(notes.length, Math.round(options.columns ?? auto)));
  const rows = Math.ceil(notes.length / columns);
  const cellW = Math.max(...notes.map((n) => n.parts.width));
  const cellH = Math.max(...notes.map((n) => n.parts.height));
  const gap = Math.round(Math.min(cellW, cellH) * 0.1);
  const width = columns * cellW + (columns + 1) * gap;
  const height = rows * cellH + (rows + 1) * gap;

  const cells: Sheet['cells'] = [];
  let body = options.background && /^#[0-9a-f]{6}$/i.test(options.background) ? `<rect width="${width}" height="${height}" fill="${options.background}"/>` : '';
  notes.forEach((note, n) => {
    const x = gap + (n % columns) * (cellW + gap) + Math.round((cellW - note.parts.width) / 2);
    const y = gap + Math.floor(n / columns) * (cellH + gap) + Math.round((cellH - note.parts.height) / 2);
    cells.push({ index: note.index, side: note.side, x, y, width: note.parts.width, height: note.parts.height });
    body += `<g transform="translate(${x} ${y})">${note.parts.body}</g>`;
  });

  const { currency, series } = design;
  const values = listInWords(series.denominations.map((d) => formatNumeral(d.value)));
  const unit = unitFor(2, currency);
  const which = sides.length === 2 ? 'fronts and backs' : `${sides[0]}s`;
  return {
    width,
    height,
    body,
    title: `The ${currency.name || 'banknote'} series, ${which}: ${values}${unit ? ` ${unit}` : ''}`,
    description: describeSeries(design),
    cells,
  };
}

/** The series as a complete SVG picture, with its title and description inside. */
export function renderSeries(design: Design, options: SheetOptions = {}): string {
  const sheet = sheetParts(design, options);
  const width = Math.round(options.pixelWidth ?? sheet.width / 2);
  const height = Math.round((width * sheet.height) / sheet.width);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${sheet.width} ${sheet.height}" width="${width}" height="${height}" role="img" aria-labelledby="bank-sheet-title bank-sheet-desc">` +
    `<title id="bank-sheet-title">${esc(sheet.title)}</title><desc id="bank-sheet-desc">${esc(sheet.description)}</desc>` +
    sheet.body +
    '</svg>'
  );
}
