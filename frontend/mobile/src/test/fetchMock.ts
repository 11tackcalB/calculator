import { vi } from 'vitest'

/** Builds a Response carrying the backend's JSON envelope. */
export function envelope(status: number, body: { result?: number | null; error?: { code: string; message: string } | null }) {
  return new Response(
    JSON.stringify({ result: body.result ?? null, error: body.error ?? null, metadata: { requestId: 'test-id' } }),
    { status, headers: { 'Content-Type': 'application/json' } },
  )
}

/** Replaces global fetch with a mock and returns it. */
export function mockFetch() {
  const fetchMock = vi.fn<typeof fetch>()
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

/** Parses the JSON body sent in the nth fetch call. */
export function sentBody(fetchMock: ReturnType<typeof mockFetch>, call = 0): unknown {
  const init = fetchMock.mock.calls[call]?.[1]
  return JSON.parse(String(init?.body))
}
