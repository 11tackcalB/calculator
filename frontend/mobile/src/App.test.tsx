import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App'
import { envelope, mockFetch, sentBody } from './test/fetchMock'

function setup() {
  const user = userEvent.setup()
  render(<App />)
  /** Taps keys by accessible name; digits and "." may be given as one string. */
  const tap = async (...keys: string[]) => {
    for (const key of keys) {
      const names = /^[\d.]+$/.test(key) ? [...key].map((c) => (c === '.' ? 'Decimal point' : c)) : [key]
      for (const name of names) await user.click(screen.getByRole('button', { name }))
    }
  }
  return { tap }
}

const value = () => screen.getByTestId('value')
const expression = () => screen.getByTestId('expression')

/** Waits until the main display shows exactly text. */
const displayShows = (text: string) =>
  waitFor(() => expect(value().textContent).toBe(text))

describe('mobile calculator', () => {
  it('evaluates a binary operation through the API', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValue(envelope(200, { result: 15 }))
    const { tap } = setup()

    await tap('12', 'Add', '3')
    expect(value().textContent).toBe('3')
    expect(expression()).toHaveTextContent('12 +')

    await tap('Equals')

    await displayShows('15')
    expect(expression()).toHaveTextContent('12 + 3 =')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/add', expect.anything())
    expect(sentBody(fetchMock)).toEqual({ a: 12, b: 3 })
  })

  it('chains operations left to right', async () => {
    const fetchMock = mockFetch()
    fetchMock
      .mockResolvedValueOnce(envelope(200, { result: 5 }))
      .mockResolvedValueOnce(envelope(200, { result: 20 }))
    const { tap } = setup()

    await tap('2', 'Add', '3', 'Multiply')
    expect(await screen.findByText('5 ×')).toBeInTheDocument()

    await tap('4', 'Equals')

    await displayShows('20')
    expect(sentBody(fetchMock, 0)).toEqual({ a: 2, b: 3 })
    expect(sentBody(fetchMock, 1)).toEqual({ a: 5, b: 4 })
    expect(fetchMock.mock.calls[1]?.[0]).toBe('/api/v1/multiply')
  })

  it('calculates a square root of the displayed number', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValue(envelope(200, { result: 9 }))
    const { tap } = setup()

    await tap('81', 'Square root')

    await displayShows('9')
    expect(expression()).toHaveTextContent('√81 =')
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/sqrt', expect.anything())
    expect(sentBody(fetchMock)).toEqual({ a: 81 })
  })

  it('shows API errors in the display', async () => {
    mockFetch().mockResolvedValue(
      envelope(422, { error: { code: 'DIVISION_BY_ZERO', message: 'division by zero is undefined' } }),
    )
    const { tap } = setup()

    await tap('7', 'Divide', '0', 'Equals')

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot divide by zero.')
    expect(expression()).toHaveTextContent('7 ÷ 0')

    await tap('4')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(value().textContent).toBe('4')
  })

  it('shows a message when the service is unreachable', async () => {
    mockFetch().mockRejectedValue(new TypeError('Failed to fetch'))
    const { tap } = setup()

    await tap('1', 'Add', '1', 'Equals')

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the calculator service/i)
  })

  it('does nothing on "=" without a second operand', async () => {
    const fetchMock = mockFetch()
    const { tap } = setup()

    await tap('5', 'Add', 'Equals')

    expect(fetchMock).not.toHaveBeenCalled()
    expect(value().textContent).toBe('5')
  })

  it('highlights the pending operator', async () => {
    mockFetch()
    const { tap } = setup()

    await tap('5', 'Power')

    expect(screen.getByRole('button', { name: 'Power' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Add' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('locks the keypad while waiting, but Clear cancels', async () => {
    mockFetch().mockReturnValue(new Promise(() => {}))
    const { tap } = setup()

    await tap('1', 'Add', '2', 'Equals')

    expect(screen.getByRole('button', { name: '7' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeEnabled()

    await tap('Clear')

    expect(screen.getByRole('button', { name: '7' })).toBeEnabled()
    expect(value().textContent).toBe('0')
  })

  it('edits input with backspace, decimal point and sign toggle', async () => {
    mockFetch()
    const { tap } = setup()

    await tap('12.5', 'Backspace', 'Toggle sign')

    expect(value().textContent).toBe('-12.')
  })
})
