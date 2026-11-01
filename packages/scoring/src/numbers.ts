/** Rounding and input checks shared by the pure scoring functions. */

/**
 * Round to 2 decimals using the exact decimal value of the double.
 *
 * `toFixed` is specified to pick the nearest decimal to the true binary value, so every engine
 * agrees. Arithmetic tricks such as `Math.round(x * 100) / 100` can differ in the last bit.
 */
export function round2(value: number): number {
  return Number(value.toFixed(2));
}

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function describe(value: unknown): string {
  return typeof value === "number" ? String(value) : typeof value;
}

/** A count from GitHub: stars, forks, contributors, commits and issue totals. */
export function assertCount(name: string, value: unknown): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new RangeError(`${name} must be a finite number, 0 or more (got ${describe(value)}).`);
  }
}

/**
 * A number of days. Negative values come from clock skew between GitHub and the machine that runs
 * ingestion, so they count as 0. Missing, NaN and infinite values are bugs and throw.
 */
export function days(name: string, value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number of days (got ${describe(value)}).`);
  }
  return Math.max(0, value);
}

export function assertScore(name: string, value: unknown): asserts value is number {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError(`${name} must be a number from 0 to 100 (got ${describe(value)}).`);
  }
}
