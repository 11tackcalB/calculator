import type { OperationId, Operands } from '../api/calculatorClient'
import { formatNumber } from './format'

export interface Operation {
  id: OperationId
  label: string
  symbol: string
  arity: 1 | 2
  /** Field labels, tailored to the operation (e.g. "Dividend" / "Divisor"). */
  operandLabels: readonly [string, string]
}

export const OPERATIONS: readonly Operation[] = [
  { id: 'add', label: 'Add', symbol: '+', arity: 2, operandLabels: ['First number', 'Second number'] },
  { id: 'subtract', label: 'Subtract', symbol: '−', arity: 2, operandLabels: ['Minuend', 'Subtrahend'] },
  { id: 'multiply', label: 'Multiply', symbol: '×', arity: 2, operandLabels: ['First factor', 'Second factor'] },
  { id: 'divide', label: 'Divide', symbol: '÷', arity: 2, operandLabels: ['Dividend', 'Divisor'] },
  { id: 'power', label: 'Power', symbol: 'xʸ', arity: 2, operandLabels: ['Base', 'Exponent'] },
  { id: 'sqrt', label: 'Square root', symbol: '√', arity: 1, operandLabels: ['Number', ''] },
  { id: 'percentage', label: 'Percentage', symbol: '%', arity: 2, operandLabels: ['Percent', 'Of value'] },
]

export function getOperation(id: OperationId): Operation {
  const operation = OPERATIONS.find((op) => op.id === id)
  if (!operation) throw new Error(`Unknown operation: ${id}`)
  return operation
}

/** Renders a human-readable expression such as "12 ÷ (−4)" or "20% of 50". */
export function describeExpression(id: OperationId, { a, b = 0 }: Operands): string {
  const left = formatOperand(a)
  const right = formatOperand(b)
  switch (id) {
    case 'add':
      return `${left} + ${right}`
    case 'subtract':
      return `${left} − ${right}`
    case 'multiply':
      return `${left} × ${right}`
    case 'divide':
      return `${left} ÷ ${right}`
    case 'power':
      return `${left} ^ ${right}`
    case 'sqrt':
      return `√${left}`
    case 'percentage':
      return `${formatNumber(a)}% of ${right}`
  }
}

/** Wraps negative numbers in parentheses so "5 − (−3)" stays unambiguous. */
function formatOperand(value: number): string {
  const text = formatNumber(value)
  return value < 0 ? `(${text.replace('-', '−')})` : text
}
