import { describe, expect, it } from 'vitest'
import { formatNumber } from './format'

describe('formatNumber', () => {
  it.each([
    [42, '42'],
    [-2.5, '-2.5'],
    [0.1 + 0.2, '0.3'],
    [1 / 3, '0.333333333333333'],
    [1e21, '1e+21'],
    [1.5e-7, '1.5e-7'],
    [-0, '0'],
    [Number.POSITIVE_INFINITY, 'Infinity'],
  ])('formats %d as %s', (value, expected) => {
    expect(formatNumber(value)).toBe(expected)
  })
})
