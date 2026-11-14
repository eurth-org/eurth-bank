/**
 * Notes worth a toast. Two values get a word from Bank when a note of them is made:
 * 69 gets the suite's own "Nice." and a note worth nothing at all gets "Priceless."
 * The site shows them as toasts, in under half a second, and not at all for reduced motion.
 */
import type { Design } from './model';

export interface Toast {
  /** "nice" is the suite's own, from @eurth/style; "priceless" is Bank's. */
  kind: 'nice' | 'priceless';
  message: string;
}

/** The toast for a value, or null for the many values that are just money. */
export function toastFor(value: number): Toast | null {
  if (value === 69) return { kind: 'nice', message: 'Nice.' };
  if (value === 0) return { kind: 'priceless', message: 'Priceless.' };
  return null;
}

/**
 * The toast for a change to a series: only for a value that has just arrived, so the joke is told
 * once, when the note is made, and not every time something else changes.
 */
export function toastForChange(before: Design, after: Design): Toast | null {
  const had = new Set(before.series.denominations.map((d) => d.value));
  for (const d of after.series.denominations) {
    if (!had.has(d.value)) {
      const toast = toastFor(d.value);
      if (toast) return toast;
    }
  }
  return null;
}
