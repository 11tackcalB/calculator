/**
 * Formats a result for display. Rounding to 15 significant digits (the
 * precision a float64 can represent reliably) hides binary floating-point
 * noise, so 0.1 + 0.2 shows as 0.3 instead of 0.30000000000000004.
 */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return String(value)
  const rounded = Number(value.toPrecision(15))
  // Avoid showing "-0".
  return String(rounded === 0 ? 0 : rounded)
}
