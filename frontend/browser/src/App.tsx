import { Calculator } from './components/Calculator'

export default function App() {
  return (
    <main className="page">
      <div className="card">
        <header className="card__header">
          <h1>Calculator</h1>
          <p>Pick an operation, enter your numbers and press Calculate.</p>
        </header>
        <Calculator />
      </div>
    </main>
  )
}
