// Package api defines the JSON envelope shared by every HTTP response of the
// calculator and gateway services, plus the request-ID context helpers.
//
// Every response has the same shape; exactly one of result/error is non-null:
//
//	{
//	  "operation": "divide",
//	  "operands":  {"a": 10, "b": 4},
//	  "result":    2.5,
//	  "error":     null,
//	  "metadata":  {"requestId": "…", "timestamp": "…"}
//	}
package api

import (
	"context"
	"encoding/json"
	"net/http"
	"time"
)

// Error codes. They are part of the public contract: clients branch on the
// code, while the message is meant for humans.
const (
	CodeInvalidJSON          = "INVALID_JSON"
	CodeInvalidOperand       = "INVALID_OPERAND"
	CodeMissingOperand       = "MISSING_OPERAND"
	CodeUnexpectedOperand    = "UNEXPECTED_OPERAND"
	CodeUnsupportedMediaType = "UNSUPPORTED_MEDIA_TYPE"
	CodePayloadTooLarge      = "PAYLOAD_TOO_LARGE"
	CodeUnknownOperation     = "UNKNOWN_OPERATION"
	CodeNotFound             = "NOT_FOUND"
	CodeMethodNotAllowed     = "METHOD_NOT_ALLOWED"
	CodeDivisionByZero       = "DIVISION_BY_ZERO"
	CodeNegativeSqrt         = "NEGATIVE_SQUARE_ROOT"
	CodeUndefinedResult      = "UNDEFINED_RESULT"
	CodeResultOutOfRange     = "RESULT_OUT_OF_RANGE"
	CodeUpstreamUnavailable  = "UPSTREAM_UNAVAILABLE"
	CodeUpstreamTimeout      = "UPSTREAM_TIMEOUT"
	CodeInternal             = "INTERNAL_ERROR"
)

// Response is the envelope written for every request.
type Response struct {
	Operation string    `json:"operation,omitempty"`
	Operands  *Operands `json:"operands,omitempty"`
	Result    *float64  `json:"result"`
	Error     *Error    `json:"error"`
	Metadata  Metadata  `json:"metadata"`
}

// Operands echoes the validated input of a calculation.
type Operands struct {
	A float64  `json:"a"`
	B *float64 `json:"b,omitempty"`
}

// Error describes why a request failed.
type Error struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// Metadata carries tracing information for the request.
type Metadata struct {
	RequestID string    `json:"requestId,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// WriteResult writes a 200 response carrying a successful result.
func WriteResult(w http.ResponseWriter, r *http.Request, operation string, operands Operands, result float64) {
	write(w, r, http.StatusOK, Response{
		Operation: operation,
		Operands:  &operands,
		Result:    &result,
	})
}

// WriteError writes an error response with the given status and code.
// operation may be empty when the request did not name a valid operation.
func WriteError(w http.ResponseWriter, r *http.Request, status int, operation, code, message string) {
	write(w, r, status, Response{
		Operation: operation,
		Error:     &Error{Code: code, Message: message},
	})
}

func write(w http.ResponseWriter, r *http.Request, status int, resp Response) {
	resp.Metadata = Metadata{
		RequestID: RequestID(r.Context()),
		Timestamp: time.Now().UTC(),
	}
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("X-Content-Type-Options", "nosniff")
	w.WriteHeader(status)
	// The envelope only contains finite floats and strings, so encoding
	// cannot fail; a write error means the client went away.
	_ = json.NewEncoder(w).Encode(resp)
}

type requestIDKey struct{}

// WithRequestID returns a copy of ctx carrying the request ID.
func WithRequestID(ctx context.Context, id string) context.Context {
	return context.WithValue(ctx, requestIDKey{}, id)
}

// RequestID returns the request ID stored in ctx, or "" if there is none.
func RequestID(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey{}).(string)
	return id
}
