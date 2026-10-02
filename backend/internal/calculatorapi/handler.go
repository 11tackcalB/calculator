// Package calculatorapi exposes the calculator domain over HTTP.
//
// Routes:
//
//	POST /api/v1/{operation}   body {"a": <number>, "b": <number>}  ("b" omitted for sqrt)
//	GET  /healthz
package calculatorapi

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"mime"
	"net/http"
	"strings"

	"calculator/backend/internal/api"
	"calculator/backend/internal/calculator"
)

// maxBodyBytes bounds request bodies; a valid request is a few dozen bytes.
const maxBodyBytes = 4 << 10

// NewHandler returns the router of the calculator service.
func NewHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", health)
	mux.HandleFunc("/api/v1/{operation}", calculate)
	mux.HandleFunc("/", notFound)
	return mux
}

func health(w http.ResponseWriter, _ *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	_, _ = io.WriteString(w, `{"status":"ok"}`)
}

func notFound(w http.ResponseWriter, r *http.Request) {
	api.WriteError(w, r, http.StatusNotFound, "", api.CodeNotFound,
		fmt.Sprintf("no route for %s %s", r.Method, r.URL.Path))
}

// calculateRequest uses pointers so a missing operand can be told apart from
// an explicit 0.
type calculateRequest struct {
	A *float64 `json:"a"`
	B *float64 `json:"b"`
}

// requestError is a client error that maps directly to an HTTP response.
type requestError struct {
	status  int
	code    string
	message string
}

func calculate(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("operation")

	if r.Method != http.MethodPost {
		w.Header().Set("Allow", http.MethodPost)
		api.WriteError(w, r, http.StatusMethodNotAllowed, "", api.CodeMethodNotAllowed,
			fmt.Sprintf("method %s is not allowed; use POST", r.Method))
		return
	}

	op, ok := calculator.Lookup(name)
	if !ok {
		api.WriteError(w, r, http.StatusNotFound, "", api.CodeUnknownOperation,
			fmt.Sprintf("unknown operation %q; supported operations: %s",
				name, strings.Join(calculator.Names(), ", ")))
		return
	}

	operands, reqErr := parseOperands(w, r, op)
	if reqErr != nil {
		api.WriteError(w, r, reqErr.status, op.Name, reqErr.code, reqErr.message)
		return
	}

	var b float64
	if operands.B != nil {
		b = *operands.B
	}
	result, err := op.Apply(operands.A, b)
	if err != nil {
		code := domainErrorCode(err)
		api.WriteError(w, r, http.StatusUnprocessableEntity, op.Name, code, err.Error())
		return
	}

	api.WriteResult(w, r, op.Name, operands, result)
}

// parseOperands decodes and validates the request body for op.
func parseOperands(w http.ResponseWriter, r *http.Request, op calculator.Operation) (api.Operands, *requestError) {
	if ct := r.Header.Get("Content-Type"); ct != "" {
		mediaType, _, err := mime.ParseMediaType(ct)
		if err != nil || mediaType != "application/json" {
			return api.Operands{}, &requestError{http.StatusUnsupportedMediaType, api.CodeUnsupportedMediaType,
				"Content-Type must be application/json"}
		}
	}

	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()

	var req calculateRequest
	if err := dec.Decode(&req); err != nil {
		return api.Operands{}, decodeError(err)
	}
	if err := dec.Decode(&struct{}{}); err != io.EOF {
		return api.Operands{}, &requestError{http.StatusBadRequest, api.CodeInvalidJSON,
			"request body must contain a single JSON object"}
	}

	if req.A == nil {
		return api.Operands{}, missing("a", op)
	}
	switch {
	case op.Arity == 2 && req.B == nil:
		return api.Operands{}, missing("b", op)
	case op.Arity == 1 && req.B != nil:
		return api.Operands{}, &requestError{http.StatusBadRequest, api.CodeUnexpectedOperand,
			fmt.Sprintf("operation %q takes a single operand \"a\"; remove \"b\"", op.Name)}
	}
	return api.Operands{A: *req.A, B: req.B}, nil
}

func missing(field string, op calculator.Operation) *requestError {
	return &requestError{http.StatusBadRequest, api.CodeMissingOperand,
		fmt.Sprintf("operand %q is required for operation %q", field, op.Name)}
}

// decodeError translates encoding/json errors into messages a client can act on.
func decodeError(err error) *requestError {
	var (
		typeErr *json.UnmarshalTypeError
		maxErr  *http.MaxBytesError
	)
	switch {
	case errors.As(err, &maxErr):
		return &requestError{http.StatusRequestEntityTooLarge, api.CodePayloadTooLarge,
			fmt.Sprintf("request body must not exceed %d bytes", maxErr.Limit)}
	case errors.As(err, &typeErr) && typeErr.Field != "":
		return &requestError{http.StatusBadRequest, api.CodeInvalidOperand,
			fmt.Sprintf("operand %q must be a finite number, got %s", typeErr.Field, typeErr.Value)}
	case errors.As(err, &typeErr):
		return &requestError{http.StatusBadRequest, api.CodeInvalidJSON,
			"request body must be a JSON object"}
	case errors.Is(err, io.EOF):
		return &requestError{http.StatusBadRequest, api.CodeInvalidJSON,
			"request body is empty; expected a JSON object such as {\"a\": 1, \"b\": 2}"}
	case strings.HasPrefix(err.Error(), "json: unknown field"):
		field := strings.TrimPrefix(err.Error(), "json: unknown field ")
		return &requestError{http.StatusBadRequest, api.CodeInvalidJSON,
			fmt.Sprintf("unknown field %s; only \"a\" and \"b\" are accepted", field)}
	default:
		return &requestError{http.StatusBadRequest, api.CodeInvalidJSON,
			"request body is not valid JSON"}
	}
}

func domainErrorCode(err error) string {
	switch {
	case errors.Is(err, calculator.ErrDivisionByZero):
		return api.CodeDivisionByZero
	case errors.Is(err, calculator.ErrNegativeSqrt):
		return api.CodeNegativeSqrt
	case errors.Is(err, calculator.ErrOutOfRange):
		return api.CodeResultOutOfRange
	default:
		return api.CodeUndefinedResult
	}
}
