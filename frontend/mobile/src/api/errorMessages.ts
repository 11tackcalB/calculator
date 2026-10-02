/**
 * Maps API error codes to messages written for end users. The backend's own
 * messages are aimed at developers, so they are only used as a fallback.
 */
const MESSAGES: Record<string, string> = {
  DIVISION_BY_ZERO: 'Cannot divide by zero.',
  NEGATIVE_SQUARE_ROOT: 'Cannot take the square root of a negative number.',
  UNDEFINED_RESULT: 'The result is not a real number.',
  RESULT_OUT_OF_RANGE: 'The result is too large to calculate.',
  NETWORK_ERROR: 'Could not reach the calculator service. Check your connection and try again.',
  UPSTREAM_UNAVAILABLE: 'The calculator service is unavailable. Please try again shortly.',
  UPSTREAM_TIMEOUT: 'The calculator service took too long to respond. Please try again.',
  BAD_RESPONSE: 'The server sent an unexpected response. Please try again.',
}

export function userMessage(code: string, fallback: string): string {
  return MESSAGES[code] ?? fallback
}
