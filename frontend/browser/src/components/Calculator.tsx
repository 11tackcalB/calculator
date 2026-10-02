import { useRef, useState, type FormEvent } from 'react'
import type { OperationId } from '../api/calculatorClient'
import { describeExpression, getOperation } from '../domain/operations'
import { parseOperand } from '../domain/validation'
import { useCalculation } from '../hooks/useCalculation'
import { OperandField } from './OperandField'
import { OperationPicker } from './OperationPicker'
import { ResultPanel } from './ResultPanel'

type Field = 'a' | 'b'
type FieldErrors = Partial<Record<Field, string>>

export function Calculator() {
  const [operationId, setOperationId] = useState<OperationId>('add')
  const [values, setValues] = useState<Record<Field, string>>({ a: '', b: '' })
  const [errors, setErrors] = useState<FieldErrors>({})
  const { state, run, reset } = useCalculation()
  const aRef = useRef<HTMLInputElement>(null)
  const bRef = useRef<HTMLInputElement>(null)

  const operation = getOperation(operationId)
  const isBinary = operation.arity === 2
  const isLoading = state.status === 'loading'

  function updateValue(field: Field, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }))
    // Clear a field's error as soon as the user edits it.
    setErrors((prev) => ({ ...prev, [field]: undefined }))
  }

  function changeOperation(id: OperationId) {
    setOperationId(id)
    if (getOperation(id).arity === 1) setErrors((prev) => ({ ...prev, b: undefined }))
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const a = parseOperand(values.a)
    const b = isBinary ? parseOperand(values.b) : null

    const nextErrors: FieldErrors = {
      a: a.ok ? undefined : a.error,
      b: b && !b.ok ? b.error : undefined,
    }
    setErrors(nextErrors)

    if (!a.ok || (b && !b.ok)) {
      (nextErrors.a ? aRef : bRef).current?.focus()
      return
    }
    void run(operationId, b ? { a: a.value, b: b.value } : { a: a.value })
  }

  function handleClear() {
    setValues({ a: '', b: '' })
    setErrors({})
    reset()
    aRef.current?.focus()
  }

  const preview = previewExpression(operationId, values)

  return (
    <form className="calculator" onSubmit={handleSubmit} noValidate>
      <OperationPicker value={operationId} onChange={changeOperation} />

      <div className={`operands ${isBinary ? '' : 'operands--single'}`}>
        <OperandField
          ref={aRef}
          id="operand-a"
          label={operation.operandLabels[0]}
          value={values.a}
          error={errors.a}
          onChange={(value) => updateValue('a', value)}
        />
        {isBinary && (
          <OperandField
            ref={bRef}
            id="operand-b"
            label={operation.operandLabels[1]}
            value={values.b}
            error={errors.b}
            onChange={(value) => updateValue('b', value)}
          />
        )}
      </div>

      <p className="preview" aria-hidden="true">
        {preview}
      </p>

      <div className="actions">
        <button type="submit" className="button button--primary" disabled={isLoading}>
          {isLoading ? 'Calculating…' : 'Calculate'}
        </button>
        <button type="button" className="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      <ResultPanel state={state} />
    </form>
  )
}

/** Live preview of the expression while typing, when the inputs are valid. */
function previewExpression(operationId: OperationId, values: Record<Field, string>): string {
  const a = parseOperand(values.a)
  const b = parseOperand(values.b)
  if (!a.ok) return ' '
  if (getOperation(operationId).arity === 1) return describeExpression(operationId, { a: a.value })
  return b.ok ? describeExpression(operationId, { a: a.value, b: b.value }) : ' '
}
