import { useCallback, useEffect, useRef, useState } from 'react'
import { calculate, type OperationId, type Operands } from '../api/calculatorClient'
import { userMessage } from '../api/errorMessages'
import { describeExpression } from '../domain/operations'

export type CalculationState =
  | { status: 'idle' }
  | { status: 'loading'; expression: string }
  | { status: 'success'; expression: string; result: number }
  | { status: 'error'; expression: string; message: string }

/**
 * Runs calculations against the API and tracks their state. Starting a new
 * calculation (or unmounting) cancels the one in flight, so a slow response
 * can never overwrite a newer one.
 */
export function useCalculation() {
  const [state, setState] = useState<CalculationState>({ status: 'idle' })
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

  const run = useCallback(async (operation: OperationId, operands: Operands) => {
    controllerRef.current?.abort()
    const controller = new AbortController()
    controllerRef.current = controller

    const expression = describeExpression(operation, operands)
    setState({ status: 'loading', expression })
    try {
      const outcome = await calculate(operation, operands, controller.signal)
      setState(
        outcome.ok
          ? { status: 'success', expression, result: outcome.result }
          : { status: 'error', expression, message: userMessage(outcome.code, outcome.message) },
      )
    } catch {
      if (!controller.signal.aborted) {
        setState({ status: 'error', expression, message: 'Something went wrong. Please try again.' })
      }
    }
  }, [])

  const reset = useCallback(() => {
    controllerRef.current?.abort()
    setState({ status: 'idle' })
  }, [])

  return { state, run, reset }
}
