import { useCallback, useEffect, useReducer, useRef } from 'react'
import { calculate, type OperationId, type Operands } from '../api/calculatorClient'
import { userMessage } from '../api/errorMessages'
import {
  currentValue,
  describeBinary,
  describeSqrt,
  initialState,
  keypadReducer,
  pendingCalculation,
  type BinaryOperation,
} from '../domain/keypad'

/**
 * Connects the keypad state machine to the calculator API. Every arithmetic
 * result comes from the backend; the frontend only manages input.
 */
export function useKeypadCalculator() {
  const [state, dispatch] = useReducer(keypadReducer, initialState)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const request = useCallback(
    async (operation: OperationId, operands: Operands, expression: string, nextOperation?: BinaryOperation) => {
      controllerRef.current?.abort()
      const controller = new AbortController()
      controllerRef.current = controller

      dispatch({ type: 'requestStarted' })
      try {
        const outcome = await calculate(operation, operands, controller.signal)
        if (!outcome.ok) {
          dispatch({ type: 'requestFailed', message: userMessage(outcome.code, outcome.message), expression })
        } else if (operation === 'sqrt') {
          dispatch({ type: 'unaryResolved', result: outcome.result, expression })
        } else {
          dispatch({ type: 'binaryResolved', result: outcome.result, expression, nextOperation })
        }
      } catch {
        if (!controller.signal.aborted) {
          dispatch({ type: 'requestFailed', message: 'Something went wrong. Please try again.', expression })
        }
      }
    },
    [],
  )

  function evaluate(nextOperation?: BinaryOperation): boolean {
    const calc = pendingCalculation(state)
    if (!calc) return false
    void request(calc.operation, { a: calc.a, b: calc.b }, describeBinary(calc.operation, calc.a, calc.b), nextOperation)
    return true
  }

  return {
    state,
    pressDigit: (digit: string) => dispatch({ type: 'digit', digit }),
    pressDecimal: () => dispatch({ type: 'decimal' }),
    pressToggleSign: () => dispatch({ type: 'toggleSign' }),
    pressBackspace: () => dispatch({ type: 'backspace' }),
    pressClear: () => {
      controllerRef.current?.abort()
      dispatch({ type: 'clear' })
    },
    pressOperator: (operation: BinaryOperation) => {
      // With a complete "a op b" on screen, evaluate it first, then chain.
      if (!evaluate(operation)) dispatch({ type: 'operator', operation })
    },
    pressEquals: () => {
      evaluate()
    },
    pressSqrt: () => {
      if (state.pending || state.error) return
      const a = currentValue(state)
      void request('sqrt', { a }, describeSqrt(a))
    },
  }
}
