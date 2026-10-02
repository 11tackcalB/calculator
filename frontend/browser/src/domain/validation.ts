export type ParseResult = { ok: true; value: number } | { ok: false; error: string }

// Plain decimal numbers with optional sign and exponent: 42, -3.5, .5, 1e6.
const NUMBER_PATTERN = /^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i
const COMMA_DECIMAL_PATTERN = /^[+-]?\d*,\d+$/

/** Validates the raw text of an operand field and converts it to a number. */
export function parseOperand(raw: string): ParseResult {
  const text = raw.trim()
  if (text === '') {
    return { ok: false, error: 'This field is required.' }
  }
  if (COMMA_DECIMAL_PATTERN.test(text)) {
    return { ok: false, error: 'Use a dot (.) as the decimal separator, e.g. 3.5.' }
  }
  if (!NUMBER_PATTERN.test(text)) {
    return { ok: false, error: 'Enter a valid number, e.g. 42, -3.5 or 1e6.' }
  }
  const value = Number(text)
  if (!Number.isFinite(value)) {
    return { ok: false, error: 'This number is too large.' }
  }
  return { ok: true, value }
}
