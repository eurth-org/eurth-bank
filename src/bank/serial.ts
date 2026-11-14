/**
 * Serial numbers. Every real note has its own; a design has one per value, made from the design's
 * seed, so a note keeps its number however often it is drawn, and a new seed prints a new run.
 */
import type { Design } from './model';
import { rng } from './random';

/** The serial number of the note at `index` in the series: "TL 0447192". */
export function serialNumber(design: Design, index: number): string {
  const { serial, seed } = design.note;
  const value = design.series.denominations[index]?.value ?? 0;
  const r = rng('serial', seed, value);
  let digits = '';
  for (let i = 0; i < serial.digits; i++) digits += String(r.int(0, 9));
  return serial.prefix ? `${serial.prefix} ${digits}` : digits;
}
