import { Display } from './components/Display'
import { Keypad } from './components/Keypad'
import { useKeypadCalculator } from './hooks/useKeypadCalculator'

export default function App() {
  const { state, ...handlers } = useKeypadCalculator()

  return (
    <main className="app">
      <h1 className="visually-hidden">Calculator</h1>
      <Display expression={state.expression} value={state.display} error={state.error} pending={state.pending} />
      <Keypad
        {...handlers}
        activeOperation={state.awaitingOperand ? state.operation : null}
        disabled={state.pending}
      />
    </main>
  )
}
