import { describe, expect, it } from 'vitest'
import { envelope, mockFetch, sentBody } from '../test/fetchMock'
import { calculate } from './calculatorClient'
import { userMessage } from './errorMessages'

describe('calculate', () => {
  it('POSTs the operands as JSON to the operation endpoint', async () => {
    const fetchMock = mockFetch()
    fetchMock.mockResolvedValue(envelope(200, { result: 5 }))

    await calculate('add', { a: 2, b: 3 })

    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe('/api/v1/add')
    expect(init?.method).toBe('POST')
    expect(new Headers(init?.headers).get('Content-Type')).toBe('application/json')
    expect(sentBody(fetchMock)).toEqual({ a: 2, b: 3 })
  })

  it('returns the result on success', async () => {
    mockFetch().mockResolvedValue(envelope(200, { result: 2.5 }))

    await expect(calculate('divide', { a: 5, b: 2 })).resolves.toEqual({
      ok: true,
      result: 2.5,
      requestId: 'test-id',
    })
  })

  it('treats a result of 0 as a success', async () => {
    mockFetch().mockResolvedValue(envelope(200, { result: 0 }))

    await expect(calculate('subtract', { a: 1, b: 1 })).resolves.toMatchObject({ ok: true, result: 0 })
  })

  it('returns the API error code and message', async () => {
    mockFetch().mockResolvedValue(
      envelope(422, { error: { code: 'DIVISION_BY_ZERO', message: 'division by zero is undefined' } }),
    )

    await expect(calculate('divide', { a: 1, b: 0 })).resolves.toEqual({
      ok: false,
      code: 'DIVISION_BY_ZERO',
      message: 'division by zero is undefined',
    })
  })

  it('reports a network failure without throwing', async () => {
    mockFetch().mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(calculate('add', { a: 1, b: 1 })).resolves.toMatchObject({ ok: false, code: 'NETWORK_ERROR' })
  })

  it('reports a non-JSON response (e.g. a proxy error page)', async () => {
    mockFetch().mockResolvedValue(new Response('<html>Bad Gateway</html>', { status: 502 }))

    await expect(calculate('add', { a: 1, b: 1 })).resolves.toEqual({
      ok: false,
      code: 'BAD_RESPONSE',
      message: 'Unexpected response from the server (HTTP 502).',
    })
  })

  it('reports JSON that is not an envelope', async () => {
    mockFetch().mockResolvedValue(new Response(JSON.stringify({ foo: 1 }), { status: 200 }))

    await expect(calculate('add', { a: 1, b: 1 })).resolves.toMatchObject({ ok: false, code: 'BAD_RESPONSE' })
  })

  it('re-throws when the request is cancelled', async () => {
    const controller = new AbortController()
    mockFetch().mockImplementation(() => {
      controller.abort()
      return Promise.reject(new DOMException('aborted', 'AbortError'))
    })

    await expect(calculate('add', { a: 1, b: 1 }, controller.signal)).rejects.toThrow('aborted')
  })
})

describe('userMessage', () => {
  it('maps known codes to friendly text', () => {
    expect(userMessage('DIVISION_BY_ZERO', 'division by zero is undefined')).toBe('Cannot divide by zero.')
  })

  it('falls back to the server message for unknown codes', () => {
    expect(userMessage('SOMETHING_NEW', 'server says no')).toBe('server says no')
  })
})
