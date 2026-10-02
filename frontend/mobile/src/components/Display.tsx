interface DisplayProps {
  expression: string
  value: string
  error: string | null
  pending: boolean
}

/** Shrinks long numbers so they always fit on a phone screen. */
function sizeClass(text: string): string {
  if (text.length > 14) return 'display__value--xs'
  if (text.length > 10) return 'display__value--sm'
  return ''
}

export function Display({ expression, value, error, pending }: DisplayProps) {
  return (
    <section className="display" aria-label="Display" aria-live="polite" aria-busy={pending}>
      <p className="display__expression" data-testid="expression">
        {expression || ' '}
      </p>
      {error ? (
        <p className="display__error" role="alert">
          {error}
        </p>
      ) : (
        <output className={`display__value ${sizeClass(value)} ${pending ? 'display__value--pending' : ''}`} data-testid="value">
          {value}
        </output>
      )}
    </section>
  )
}
