import type { Ref } from 'react'

interface OperandFieldProps {
  id: string
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
  ref?: Ref<HTMLInputElement>
}

/** A labelled numeric text input with an inline, screen-reader-linked error. */
export function OperandField({ id, label, value, error, onChange, ref }: OperandFieldProps) {
  const errorId = `${id}-error`
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input
        ref={ref}
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        spellCheck={false}
        placeholder="0"
        value={value}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => onChange(event.target.value)}
      />
      {error && (
        <p id={errorId} className="field__error">
          {error}
        </p>
      )}
    </div>
  )
}
