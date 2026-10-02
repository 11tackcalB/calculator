import { describe, expect, it } from 'vitest'
import { parseOperand } from './validation'

describe('parseOperand', () => {
  it.each([
    ['42', 42],
    ['-3.5', -3.5],
    ['+7', 7],
    ['0', 0],
    ['.5', 0.5],
    ['5.', 5],
    ['1e6', 1e6],
    ['2.5E-3', 0.0025],
    ['  12  ', 12],
  ])('accepts %j as %d', (raw, expected) => {
    expect(parseOperand(raw)).toEqual({ ok: true, value: expected })
  })

  it.each(['', '   '])('rejects empty input %j as required', (raw) => {
    expect(parseOperand(raw)).toEqual({ ok: false, error: 'This field is required.' })
  })

  it.each(['abc', '1.2.3', '--1', '1e', 'e5', '0x10', 'Infinity', 'NaN', '1 000', '.', '-'])(
    'rejects %j as not a number',
    (raw) => {
      const result = parseOperand(raw)
      expect(result.ok).toBe(false)
      if (!result.ok) expect(result.error).toMatch(/valid number/)
    },
  )

  it('explains that the decimal separator is a dot', () => {
    expect(parseOperand('3,5')).toEqual({
      ok: false,
      error: 'Use a dot (.) as the decimal separator, e.g. 3.5.',
    })
  })

  it('rejects numbers beyond the float64 range', () => {
    expect(parseOperand('1e400')).toEqual({ ok: false, error: 'This number is too large.' })
  })
})
