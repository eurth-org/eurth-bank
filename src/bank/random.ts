/**
 * Seeded randomness. Everything Bank draws "at random" (a signature, a serial number) comes from a
 * seed, so the same design is the same picture on every device and in every export.
 */

/** A 32-bit hash of a text (FNV-1a), for turning names and seeds into numbers. */
export function hashText(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export interface Rng {
  /** A number from 0 up to, not including, 1. */
  next(): number;
  /** A number between min and max. */
  range(min: number, max: number): number;
  /** A whole number from min to max, both included. */
  int(min: number, max: number): number;
  /** One item of a list. */
  pick<T>(items: readonly T[]): T;
}

/** A small, fast generator (mulberry32) seeded from any mix of numbers and texts. */
export function rng(...seed: (number | string)[]): Rng {
  let state = hashText(seed.map(String).join('\u0001')) || 1;
  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const range = (min: number, max: number): number => min + (max - min) * next();
  const int = (min: number, max: number): number => Math.floor(range(min, max + 1));
  return { next, range, int, pick: <T>(items: readonly T[]): T => items[int(0, items.length - 1)] as T };
}
