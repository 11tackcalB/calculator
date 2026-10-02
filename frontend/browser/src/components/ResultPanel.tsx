import { formatNumber } from '../domain/format'
import type { CalculationState } from '../hooks/useCalculation'

/** Shows the latest result or error. The live region announces updates. */
export function ResultPanel({ state }: { state: CalculationState }) {
  return (
    <section className={`result result--${state.status}`} aria-live="polite" aria-busy={state.status === 'loading'}>
      <h2 className="visually-hidden">Result</h2>
      {state.status === 'idle' && <p className="result__placeholder">Enter numbers and press Calculate.</p>}
      {state.status === 'loading' && (
        <>
          <p className="result__expression">{state.expression}</p>
          <p className="result__value result__value--muted">Calculating…</p>
        </>
      )}
      {state.status === 'success' && (
        <>
          <p className="result__expression">{state.expression} =</p>
          <output className="result__value" title={String(state.result)}>
            {formatNumber(state.result)}
          </output>
        </>
      )}
      {state.status === 'error' && (
        <>
          <p className="result__expression">{state.expression}</p>
          <p className="result__error" role="alert">
            {state.message}
          </p>
        </>
      )}
    </section>
  )
}
