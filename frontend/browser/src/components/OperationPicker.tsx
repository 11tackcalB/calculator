import type { OperationId } from '../api/calculatorClient'
import { OPERATIONS } from '../domain/operations'

interface OperationPickerProps {
  value: OperationId
  onChange: (id: OperationId) => void
}

/** A radio group styled as buttons: keyboard accessible out of the box. */
export function OperationPicker({ value, onChange }: OperationPickerProps) {
  return (
    <fieldset className="operation-picker">
      <legend>Operation</legend>
      <div className="operation-picker__options">
        {OPERATIONS.map((op) => (
          <label key={op.id} className="operation-option">
            <input
              type="radio"
              name="operation"
              value={op.id}
              checked={value === op.id}
              onChange={() => onChange(op.id)}
            />
            <span className="operation-option__symbol" aria-hidden="true">
              {op.symbol}
            </span>
            <span className="operation-option__label">{op.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
