/**
 * State machine for the keypad calculator. Pure and synchronous: it never
 * calls the API itself. The useKeypadCalculator hook reads the selectors
 * below to decide when a request is needed, and reports the outcome back
 * with the request* actions.
 *
 * Operations chain left to right like a pocket calculator:
 * 2 + 3 × 4 = evaluates (2 + 3) first, then × 4, giving 20.
 */
import type { OperationId } from '../api/calculatorClient'
import { formatNumber } from './format'

export type BinaryOperation = Exclude<OperationId, 'sqrt'>

/** Longest number (in digits) the user can type, matching float64 precision. */
export const MAX_DIGITS = 15

export const OPERATION_SYMBOLS: Record<BinaryOperation, string> = {
  add: '+',
  subtract: '−',
  multiply: '×',
  divide: '÷',
  power: '^',
  percentage: '% of',
}

export interface KeypadState {
  /** Number shown on the display; also the operand being typed. */
  display: string
  /** First operand of the pending binary operation. */
  accumulator: number | null
  operation: BinaryOperation | null
  /** The next digit starts a new number instead of appending to the display. */
  overwrite: boolean
  /** An operator was just pressed: the display still shows the first operand. */
  awaitingOperand: boolean
  /** Secondary line above the display, e.g. "12 +" or "12 + 3 =". */
  expression: string
  /** A request to the API is in flight; input is locked. */
  pending: boolean
  error: string | null
}

export type KeypadAction =
  | { type: 'digit'; digit: string }
  | { type: 'decimal' }
  | { type: 'toggleSign' }
  | { type: 'backspace' }
  | { type: 'clear' }
  | { type: 'operator'; operation: BinaryOperation }
  | { type: 'requestStarted' }
  | { type: 'binaryResolved'; result: number; expression: string; nextOperation?: BinaryOperation }
  | { type: 'unaryResolved'; result: number; expression: string }
  | { type: 'requestFailed'; message: string; expression: string }

export const initialState: KeypadState = {
  display: '0',
  accumulator: null,
  operation: null,
  overwrite: false,
  awaitingOperand: false,
  expression: '',
  pending: false,
  error: null,
}

export function keypadReducer(state: KeypadState, action: KeypadAction): KeypadState {
  switch (action.type) {
    case 'digit':
      return inputDigit(state, action.digit)
    case 'decimal':
      return inputDecimal(state)
    case 'toggleSign':
      return toggleSign(state)
    case 'backspace':
      return backspace(state)
    case 'clear':
      return initialState
    case 'operator':
      return chooseOperator(state, action.operation)
    case 'requestStarted':
      return { ...state, pending: true, error: null }
    case 'binaryResolved':
      return resolveBinary(state, action.result, action.expression, action.nextOperation)
    case 'unaryResolved':
      return resolveUnary(state, action.result, action.expression)
    case 'requestFailed':
      return { ...initialState, overwrite: true, error: action.message, expression: action.expression }
  }
}

/** Starts editing: any key after an error begins a fresh calculation. */
function editable(state: KeypadState): KeypadState | null {
  if (state.pending) return null
  return state.error ? initialState : state
}

function inputDigit(state: KeypadState, digit: string): KeypadState {
  const base = editable(state)
  if (!base || !/^\d$/.test(digit)) return state
  if (base.overwrite) {
    return { ...base, display: digit, overwrite: false, awaitingOperand: false }
  }
  if (countDigits(base.display) >= MAX_DIGITS) return base
  if (base.display === '0') return { ...base, display: digit }
  if (base.display === '-0') return { ...base, display: `-${digit}` }
  return { ...base, display: base.display + digit }
}

function inputDecimal(state: KeypadState): KeypadState {
  const base = editable(state)
  if (!base) return state
  if (base.overwrite) {
    return { ...base, display: '0.', overwrite: false, awaitingOperand: false }
  }
  if (base.display.includes('.')) return base
  return { ...base, display: `${base.display}.` }
}

function toggleSign(state: KeypadState): KeypadState {
  if (state.pending || state.error) return state
  if (state.awaitingOperand) {
    // Start typing a negative second operand.
    return { ...state, display: '-0', overwrite: false, awaitingOperand: false }
  }
  const display = state.display.startsWith('-') ? state.display.slice(1) : `-${state.display}`
  return { ...state, display }
}

function backspace(state: KeypadState): KeypadState {
  if (state.pending) return state
  if (state.error) return initialState
  // Results and the first operand on display are not editable.
  if (state.overwrite) return state
  const trimmed = state.display.slice(0, -1)
  return { ...state, display: trimmed === '' || trimmed === '-' ? '0' : trimmed }
}

function chooseOperator(state: KeypadState, operation: BinaryOperation): KeypadState {
  if (state.pending || state.error) return state
  if (state.awaitingOperand && state.accumulator !== null) {
    // Pressing another operator before typing replaces the previous one.
    return { ...state, operation, expression: `${formatNumber(state.accumulator)} ${OPERATION_SYMBOLS[operation]}` }
  }
  const value = currentValue(state)
  return {
    ...state,
    accumulator: value,
    operation,
    display: formatNumber(value),
    overwrite: true,
    awaitingOperand: true,
    expression: `${formatNumber(value)} ${OPERATION_SYMBOLS[operation]}`,
  }
}

function resolveBinary(
  state: KeypadState,
  result: number,
  expression: string,
  nextOperation?: BinaryOperation,
): KeypadState {
  const shown = formatNumber(result)
  const base = { ...state, pending: false, display: shown, overwrite: true }
  if (nextOperation) {
    return {
      ...base,
      accumulator: result,
      operation: nextOperation,
      awaitingOperand: true,
      expression: `${shown} ${OPERATION_SYMBOLS[nextOperation]}`,
    }
  }
  return { ...base, accumulator: null, operation: null, awaitingOperand: false, expression: `${expression} =` }
}

function resolveUnary(state: KeypadState, result: number, expression: string): KeypadState {
  // A square root can be the second operand of a pending operation:
  // "9 + √16" keeps "9 +" pending with 4 on the display.
  const prefix =
    state.operation && state.accumulator !== null
      ? `${formatNumber(state.accumulator)} ${OPERATION_SYMBOLS[state.operation]} `
      : ''
  return {
    ...state,
    pending: false,
    display: formatNumber(result),
    overwrite: true,
    awaitingOperand: false,
    expression: prefix ? `${prefix}${expression}` : `${expression} =`,
  }
}

function countDigits(display: string): number {
  return display.replace(/\D/g, '').length
}

/** The number currently on the display. */
export function currentValue(state: KeypadState): number {
  return Number(state.display)
}

/** The binary calculation "=" would run now, or null if it is incomplete. */
export function pendingCalculation(
  state: KeypadState,
): { operation: BinaryOperation; a: number; b: number } | null {
  if (state.pending || state.error || state.accumulator === null || !state.operation || state.awaitingOperand) {
    return null
  }
  return { operation: state.operation, a: state.accumulator, b: currentValue(state) }
}

/** Renders "a op b" for the expression line, parenthesising a negative b. */
export function describeBinary(operation: BinaryOperation, a: number, b: number): string {
  const right = b < 0 ? `(${formatNumber(b)})` : formatNumber(b)
  return `${formatNumber(a)} ${OPERATION_SYMBOLS[operation]} ${right}`
}

export function describeSqrt(a: number): string {
  return a < 0 ? `√(${formatNumber(a)})` : `√${formatNumber(a)}`
}
