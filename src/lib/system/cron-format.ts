/** Compact duration for run tables: `350 ms`, `1.2 s`, `2 min 5 s`. `—` when unknown. */
export function formatCronDuration(
  ms: number | null | undefined,
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string = (v) => String(v),
): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 1000) return `${formatNumber(ms)} ms`;
  if (ms < 60_000) {
    return `${formatNumber(ms / 1000, { maximumFractionDigits: 1, minimumFractionDigits: 1 })} s`;
  }
  const minutes = Math.floor(ms / 60_000);
  const seconds = Math.floor((ms % 60_000) / 1000);
  return `${formatNumber(minutes)} min ${formatNumber(seconds)} s`;
}

/** Failures out of runs in 7 days, as a whole percentage; null when there is no data. */
export function failureRatePercent(rate: number | null | undefined): number | null {
  if (rate === null || rate === undefined || Number.isNaN(rate)) return null;
  return Math.round(rate * 100);
}
