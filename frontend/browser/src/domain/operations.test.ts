import { describe, expect, it } from 'vitest'
import { OPERATIONS, describeExpression, getOperation } from './operations'

describe('operations', () => {
  it('offers the required and optional operations', () => {
    expect(OPERATIONS.map((op) => op.id)).toEqual([
      'add',
      'subtract',
      'multiply',
      'divide',
      'power',
      'sqrt',
      'percentage',
    ])
  })

  it('marks only square root as unary', () => {
    const unary = OPERATIONS.filter((op) => op.arity === 1).map((op) => op.id)
    expect(unary).toEqual(['sqrt'])
  })

  it('looks operations up by id', () => {
    expect(getOperation('divide').operandLabels).toEqual(['Dividend', 'Divisor'])
  })
})

describe('describeExpression', () => {
  it.each([
    ['add', { a: 2, b: 3 }, '2 + 3'],
    ['subtract', { a: 5, b: -3 }, '5 − (−3)'],
    ['multiply', { a: -2, b: 4 }, '(−2) × 4'],
    ['divide', { a: 1, b: 3 }, '1 ÷ 3'],
    ['power', { a: 2, b: 10 }, '2 ^ 10'],
    ['sqrt', { a: 16 }, '√16'],
    ['sqrt', { a: -4 }, '√(−4)'],
    ['percentage', { a: 20, b: 50 }, '20% of 50'],
  ] as const)('%s %j reads as %s', (id, operands, expected) => {
    expect(describeExpression(id, operands)).toBe(expected)
  })
})
