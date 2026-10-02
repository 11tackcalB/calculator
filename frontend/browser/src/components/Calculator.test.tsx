import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from '../App'
import { envelope, mockFetch, sentBody } from '../test/fetchMock'

function setup() {
  const user = userEvent.setup()
  render(<App />)
  return {
    user,
    calculate: () => user.click(screen.getByRole('button', { name: /calculate/i })),
  }
}

describe('Calculator', () => {
  it('adds two numbers through the API and shows the result', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValue(envelope(200, { result: 5 }))
    const { user, calculate } = setup()

    await user.type(screen.getByLabelText('First number'), '2')
    await user.type(screen.getByLabelText('Second number'), '3')
    await calculate()

    expect(await screen.findByText('5')).toBeInTheDocument()
    expect(screen.getByText('2 + 3 =')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/add', expect.anything())
    expect(sentBody(fetchMock)).toEqual({ a: 2, b: 3 })
  })

  it('validates inputs before calling the API', async () => {
    const fetchMock = mockFetch()
    const { user, calculate } = setup()

    await user.type(screen.getByLabelText('First number'), 'abc')
    await calculate()

    expect(screen.getByText(/enter a valid number/i)).toBeInTheDocument()
    expect(screen.getByText('This field is required.')).toBeInTheDocument()
    expect(screen.getByLabelText('First number')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('First number')).toHaveFocus()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('clears a field error as soon as the field is edited', async () => {
    mockFetch()
    const { user, calculate } = setup()

    await calculate()
    expect(screen.getAllByText('This field is required.')).toHaveLength(2)

    await user.type(screen.getByLabelText('First number'), '1')
    expect(screen.getAllByText('This field is required.')).toHaveLength(1)
  })

  it('uses a single operand for square root', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValue(envelope(200, { result: 9 }))
    const { user, calculate } = setup()

    await user.click(screen.getByRole('radio', { name: /square root/i }))
    expect(screen.queryByLabelText('Second number')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Number'), '81')
    await calculate()

    expect(await screen.findByText('9')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/sqrt', expect.anything())
    expect(sentBody(fetchMock)).toEqual({ a: 81 })
  })

  it('relabels the inputs for the selected operation', async () => {
    mockFetch()
    const { user } = setup()

    await user.click(screen.getByRole('radio', { name: /divide/i }))

    expect(screen.getByLabelText('Dividend')).toBeInTheDocument()
    expect(screen.getByLabelText('Divisor')).toBeInTheDocument()
  })

  it('shows a friendly message for division by zero', async () => {
    mockFetch().mockResolvedValue(
      envelope(422, { error: { code: 'DIVISION_BY_ZERO', message: 'division by zero is undefined' } }),
    )
    const { user, calculate } = setup()

    await user.click(screen.getByRole('radio', { name: /divide/i }))
    await user.type(screen.getByLabelText('Dividend'), '1')
    await user.type(screen.getByLabelText('Divisor'), '0')
    await calculate()

    expect(await screen.findByRole('alert')).toHaveTextContent('Cannot divide by zero.')
  })

  it('tells the user when the service is unreachable', async () => {
    mockFetch().mockRejectedValue(new TypeError('Failed to fetch'))
    const { user, calculate } = setup()

    await user.type(screen.getByLabelText('First number'), '1')
    await user.type(screen.getByLabelText('Second number'), '1')
    await calculate()

    expect(await screen.findByRole('alert')).toHaveTextContent(/could not reach the calculator service/i)
  })

  it('disables the button while a calculation is in flight', async () => {
    let respond!: (response: Response) => void
    mockFetch().mockReturnValue(new Promise((resolve) => (respond = resolve)))
    const { user, calculate } = setup()

    await user.type(screen.getByLabelText('First number'), '1')
    await user.type(screen.getByLabelText('Second number'), '2')
    await calculate()

    expect(screen.getByRole('button', { name: /calculating/i })).toBeDisabled()

    respond(envelope(200, { result: 3 }))
    expect(await screen.findByRole('button', { name: 'Calculate' })).toBeEnabled()
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('clears inputs and result', async () => {
    mockFetch().mockResolvedValue(envelope(200, { result: 3 }))
    const { user, calculate } = setup()

    await user.type(screen.getByLabelText('First number'), '1')
    await user.type(screen.getByLabelText('Second number'), '2')
    await calculate()
    await screen.findByText('3')

    await user.click(screen.getByRole('button', { name: 'Clear' }))

    expect(screen.getByLabelText('First number')).toHaveValue('')
    expect(screen.getByText(/enter numbers and press calculate/i)).toBeInTheDocument()
  })

  it('submits with the Enter key', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValue(envelope(200, { result: 10 }))
    const { user } = setup()

    await user.click(screen.getByRole('radio', { name: /percentage/i }))
    await user.type(screen.getByLabelText('Percent'), '20')
    await user.type(screen.getByLabelText('Of value'), '50{Enter}')

    expect(await screen.findByText('20% of 50 =')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/percentage', expect.anything())
  })
})
