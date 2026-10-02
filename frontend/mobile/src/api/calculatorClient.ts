/**
 * Thin client for the calculator REST API (reached through the gateway).
 *
 * It never throws for HTTP or network problems: every outcome is returned as
 * a discriminated union so callers handle failures explicitly. The only
 * exception is cancellation, which is re-thrown so callers can ignore it.
 */

export type OperationId =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'power'
  | 'sqrt'
  | 'percentage'

export interface Operands {
  a: number
  b?: number
}

export type CalculationOutcome =
  | { ok: true; result: number; requestId?: string }
  | { ok: false; code: string; message: string }

/** The response envelope shared by every backend endpoint. */
interface Envelope {
  result: number | null
  error: { code: string; message: string } | null
  metadata?: { requestId?: string }
}

const API_BASE = `${import.meta.env.VITE_API_BASE_URL ?? ''}/api/v1`

export async function calculate(
  operation: OperationId,
  operands: Operands,
  signal?: AbortSignal,
): Promise<CalculationOutcome> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}/${operation}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(operands),
      signal,
    })
  } catch (error) {
    if (signal?.aborted) throw error
    return { ok: false, code: 'NETWORK_ERROR', message: 'Network request failed.' }
  }

  const envelope = await readEnvelope(response)
  if (envelope?.error) {
    return { ok: false, code: envelope.error.code, message: envelope.error.message }
  }
  if (response.ok && typeof envelope?.result === 'number') {
    return { ok: true, result: envelope.result, requestId: envelope.metadata?.requestId }
  }
  return {
    ok: false,
    code: 'BAD_RESPONSE',
    message: `Unexpected response from the server (HTTP ${response.status}).`,
  }
}

async function readEnvelope(response: Response): Promise<Envelope | null> {
  try {
    const body: unknown = await response.json()
    return isEnvelope(body) ? body : null
  } catch {
    // Not JSON, e.g. an HTML error page from a proxy.
    return null
  }
}

function isEnvelope(value: unknown): value is Envelope {
  return typeof value === 'object' && value !== null && 'result' in value && 'error' in value
}
