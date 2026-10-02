import type { BinaryOperation } from '../domain/keypad'

export interface KeypadHandlers {
  pressDigit: (digit: string) => void
  pressDecimal: () => void
  pressToggleSign: () => void
  pressBackspace: () => void
  pressClear: () => void
  pressOperator: (operation: BinaryOperation) => void
  pressEquals: () => void
  pressSqrt: () => void
}

interface KeyDefinition {
  label: string
  ariaLabel: string
  variant: 'digit' | 'operator' | 'function' | 'equals'
  className?: string
  operation?: BinaryOperation
  onPress: (handlers: KeypadHandlers) => void
}

const digit = (d: string): KeyDefinition => ({
  label: d,
  ariaLabel: d,
  variant: 'digit',
  onPress: (h) => h.pressDigit(d),
})

const operator = (operation: BinaryOperation, label: string, ariaLabel: string): KeyDefinition => ({
  label,
  ariaLabel,
  variant: 'operator',
  operation,
  onPress: (h) => h.pressOperator(operation),
})

// Listed row by row for a 4-column grid; "=" spans two rows, "0" two columns.
const KEYS: KeyDefinition[] = [
  { label: 'C', ariaLabel: 'Clear', variant: 'function', onPress: (h) => h.pressClear() },
  { label: '⌫', ariaLabel: 'Backspace', variant: 'function', onPress: (h) => h.pressBackspace() },
  { label: '±', ariaLabel: 'Toggle sign', variant: 'function', onPress: (h) => h.pressToggleSign() },
  operator('divide', '÷', 'Divide'),
  { label: '√', ariaLabel: 'Square root', variant: 'function', onPress: (h) => h.pressSqrt() },
  operator('power', 'xʸ', 'Power'),
  operator('percentage', '%', 'Percent of'),
  operator('multiply', '×', 'Multiply'),
  digit('7'),
  digit('8'),
  digit('9'),
  operator('subtract', '−', 'Subtract'),
  digit('4'),
  digit('5'),
  digit('6'),
  operator('add', '+', 'Add'),
  digit('1'),
  digit('2'),
  digit('3'),
  { label: '=', ariaLabel: 'Equals', variant: 'equals', className: 'key--tall', onPress: (h) => h.pressEquals() },
  { ...digit('0'), className: 'key--wide' },
  { label: '.', ariaLabel: 'Decimal point', variant: 'digit', onPress: (h) => h.pressDecimal() },
]

interface KeypadProps extends KeypadHandlers {
  /** Operator waiting for its second operand; highlighted on the keypad. */
  activeOperation: BinaryOperation | null
  disabled: boolean
}

export function Keypad({ activeOperation, disabled, ...handlers }: KeypadProps) {
  return (
    <div className="keypad" role="group" aria-label="Keypad">
      {KEYS.map((key) => {
        const isActive = key.operation !== undefined && key.operation === activeOperation
        const keepEnabled = key.ariaLabel === 'Clear' // Clear also cancels a slow request.
        return (
          <button
            key={key.ariaLabel}
            type="button"
            className={`key key--${key.variant} ${key.className ?? ''} ${isActive ? 'key--active' : ''}`}
            aria-label={key.ariaLabel}
            aria-pressed={key.operation ? isActive : undefined}
            disabled={disabled && !keepEnabled}
            onClick={() => key.onPress(handlers)}
          >
            {key.label}
          </button>
        )
      })}
    </div>
  )
}
