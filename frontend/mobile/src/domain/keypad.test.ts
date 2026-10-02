import { describe, expect, it } from 'vitest'
import {
  MAX_DIGITS,
  describeBinary,
  describeSqrt,
  initialState,
  keypadReducer,
  pendingCalculation,
  type KeypadAction,
  type KeypadState,
} from './keypad'

/** Applies a sequence of actions; strings are shorthand for digit keys. */
function press(...actions: (KeypadAction | string)[]): KeypadState {
  return pressFrom(initialState, ...actions)
}

function pressFrom(state: KeypadState, ...actions: (KeypadAction | string)[]): KeypadState {
  return actions.reduce<KeypadState>((s, action) => {
    if (typeof action !== 'string') return keypadReducer(s, action)
    return [...action].reduce((acc, ch) => keypadReducer(acc, ch === '.' ? { type: 'decimal' } : { type: 'digit', digit: ch }), s)
  }, state)
}

const plus: KeypadAction = { type: 'operator', operation: 'add' }
const times: KeypadAction = { type: 'operator', operation: 'multiply' }

describe('number entry', () => {
  it('starts at 0', () => {
    expect(initialState.display).toBe('0')
  })

  it('replaces the leading zero', () => {
    expect(press('7').display).toBe('7')
    expect(press('007').display).toBe('7')
  })

  it('appends digits', () => {
    expect(press('123').display).toBe('123')
  })

  it('accepts a single decimal point', () => {
    expect(press('1.5.2').display).toBe('1.52')
    expect(press('.').display).toBe('0.')
  })

  it(`limits input to ${MAX_DIGITS} digits`, () => {
    expect(press('1'.repeat(MAX_DIGITS + 3)).display).toBe('1'.repeat(MAX_DIGITS))
  })

  it('ignores non-digit keys', () => {
    expect(press({ type: 'digit', digit: 'x' }).display).toBe('0')
  })

  it('toggles the sign', () => {
    expect(press('12', { type: 'toggleSign' }).display).toBe('-12')
    expect(press('12', { type: 'toggleSign' }, { type: 'toggleSign' }).display).toBe('12')
    expect(press({ type: 'toggleSign' }, '5').display).toBe('-5')
  })

  it('deletes the last character', () => {
    expect(press('123', { type: 'backspace' }).display).toBe('12')
    expect(press('5', { type: 'backspace' }).display).toBe('0')
    expect(press('5', { type: 'toggleSign' }, { type: 'backspace' }).display).toBe('0')
  })

  it('clears everything', () => {
    expect(press('12', plus, '3', { type: 'clear' })).toEqual(initialState)
  })
})

describe('operators', () => {
  it('stores the first operand and waits for the second', () => {
    const state = press('12', plus)
    expect(state).toMatchObject({ accumulator: 12, operation: 'add', awaitingOperand: true, expression: '12 +' })
    expect(pendingCalculation(state)).toBeNull()
  })

  it('starts a new number after an operator', () => {
    expect(press('12', plus, '3').display).toBe('3')
  })

  it('replaces the operator when pressed twice', () => {
    const state = press('12', plus, times)
    expect(state).toMatchObject({ operation: 'multiply', expression: '12 ×' })
  })

  it('normalises the first operand', () => {
    expect(press('12.', plus).display).toBe('12')
  })

  it('starts a negative second operand with ±', () => {
    expect(press('12', plus, { type: 'toggleSign' }, '3').display).toBe('-3')
  })

  it('does not edit the first operand with backspace once an operator is chosen', () => {
    expect(press('12', plus, { type: 'backspace' }).display).toBe('12')
  })

  it('exposes the complete calculation for "="', () => {
    expect(pendingCalculation(press('12', plus, '3'))).toEqual({ operation: 'add', a: 12, b: 3 })
  })
})

describe('request lifecycle', () => {
  it('locks input while a request is pending', () => {
    const pending = press('12', plus, '3', { type: 'requestStarted' })
    expect(pending.pending).toBe(true)
    expect(pressFrom(pending, '9', { type: 'backspace' }, { type: 'toggleSign' }, plus)).toEqual(pending)
    expect(pendingCalculation(pending)).toBeNull()
  })

  it('shows the result of "="', () => {
    const state = press('12', plus, '3', { type: 'requestStarted' }, { type: 'binaryResolved', result: 15, expression: '12 + 3' })
    expect(state).toMatchObject({
      display: '15',
      expression: '12 + 3 =',
      accumulator: null,
      operation: null,
      pending: false,
    })
  })

  it('starts a new number when typing after a result', () => {
    const result = press('12', plus, '3', { type: 'binaryResolved', result: 15, expression: '12 + 3' })
    expect(pressFrom(result, '7').display).toBe('7')
  })

  it('uses the result as the next first operand', () => {
    const result = press('12', plus, '3', { type: 'binaryResolved', result: 15, expression: '12 + 3' })
    expect(pressFrom(result, times)).toMatchObject({ accumulator: 15, operation: 'multiply', expression: '15 ×' })
  })

  it('chains into the next operation', () => {
    const state = press('2', plus, '3', {
      type: 'binaryResolved',
      result: 5,
      expression: '2 + 3',
      nextOperation: 'multiply',
    })
    expect(state).toMatchObject({ display: '5', accumulator: 5, operation: 'multiply', awaitingOperand: true, expression: '5 ×' })
  })

  it('shows a square root on its own', () => {
    const state = press('16', { type: 'unaryResolved', result: 4, expression: '√16' })
    expect(state).toMatchObject({ display: '4', expression: '√16 =', overwrite: true })
  })

  it('uses a square root as the second operand of a pending operation', () => {
    const state = press('9', plus, '16', { type: 'unaryResolved', result: 4, expression: '√16' })
    expect(state).toMatchObject({ display: '4', expression: '9 + √16' })
    expect(pendingCalculation(state)).toEqual({ operation: 'add', a: 9, b: 4 })
  })

  it('shows errors and recovers on the next key', () => {
    const failed = press('1', { type: 'operator', operation: 'divide' }, '0', {
      type: 'requestFailed',
      message: 'Cannot divide by zero.',
      expression: '1 ÷ 0',
    })
    expect(failed).toMatchObject({ error: 'Cannot divide by zero.', expression: '1 ÷ 0', pending: false })
    expect(pendingCalculation(failed)).toBeNull()
    expect(pressFrom(failed, plus)).toEqual(failed) // operators are ignored on error
    expect(pressFrom(failed, '5')).toMatchObject({ display: '5', error: null })
    expect(pressFrom(failed, { type: 'backspace' })).toEqual(initialState)
  })
})

describe('expression helpers', () => {
  it('describes binary operations', () => {
    expect(describeBinary('subtract', 5, -3)).toBe('5 − (-3)')
    expect(describeBinary('percentage', 20, 50)).toBe('20 % of 50')
  })

  it('describes square roots', () => {
    expect(describeSqrt(16)).toBe('√16')
    expect(describeSqrt(-4)).toBe('√(-4)')
  })
})
