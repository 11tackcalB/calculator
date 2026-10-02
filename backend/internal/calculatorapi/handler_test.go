package calculatorapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"calculator/backend/internal/api"
)

func do(t *testing.T, method, path, contentType, body string) (*httptest.ResponseRecorder, api.Response) {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	rec := httptest.NewRecorder()
	NewHandler().ServeHTTP(rec, req)

	var resp api.Response
	if strings.HasPrefix(path, "/api/") || rec.Code == http.StatusNotFound {
		if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
			t.Fatalf("response is not a JSON envelope: %v\n%s", err, rec.Body.String())
		}
	}
	return rec, resp
}

func TestCalculateSuccess(t *testing.T) {
	tests := []struct {
		path string
		body string
		want float64
	}{
		{"/api/v1/add", `{"a": 2, "b": 3}`, 5},
		{"/api/v1/subtract", `{"a": 2, "b": 3}`, -1},
		{"/api/v1/multiply", `{"a": -4, "b": 2.5}`, -10},
		{"/api/v1/divide", `{"a": 10, "b": 4}`, 2.5},
		{"/api/v1/power", `{"a": 2, "b": 8}`, 256},
		{"/api/v1/sqrt", `{"a": 81}`, 9},
		{"/api/v1/percentage", `{"a": 25, "b": 200}`, 50},
		{"/api/v1/add", `{"a": 0, "b": 0}`, 0},      // explicit zeros are not "missing"
		{"/api/v1/add", `{"a": 1e3, "b": -1}`, 999}, // exponent notation
	}
	for _, tt := range tests {
		t.Run(tt.path+" "+tt.body, func(t *testing.T) {
			rec, resp := do(t, http.MethodPost, tt.path, "application/json", tt.body)
			if rec.Code != http.StatusOK {
				t.Fatalf("status = %d, want 200; body %s", rec.Code, rec.Body.String())
			}
			if resp.Error != nil {
				t.Fatalf("error = %+v, want nil", resp.Error)
			}
			if resp.Result == nil || *resp.Result != tt.want {
				t.Errorf("result = %v, want %v", resp.Result, tt.want)
			}
			if want := strings.TrimPrefix(tt.path, "/api/v1/"); resp.Operation != want {
				t.Errorf("operation = %q, want %q", resp.Operation, want)
			}
		})
	}
}

func TestCalculateAcceptsMissingContentTypeAndCharset(t *testing.T) {
	for _, ct := range []string{"", "application/json; charset=utf-8"} {
		rec, _ := do(t, http.MethodPost, "/api/v1/add", ct, `{"a": 1, "b": 1}`)
		if rec.Code != http.StatusOK {
			t.Errorf("Content-Type %q: status = %d, want 200", ct, rec.Code)
		}
	}
}

func TestCalculateErrors(t *testing.T) {
	tests := []struct {
		name        string
		method      string
		path        string
		contentType string
		body        string
		wantStatus  int
		wantCode    string
	}{
		{"division by zero", "POST", "/api/v1/divide", "application/json", `{"a": 1, "b": 0}`, 422, api.CodeDivisionByZero},
		{"negative sqrt", "POST", "/api/v1/sqrt", "application/json", `{"a": -9}`, 422, api.CodeNegativeSqrt},
		{"undefined power", "POST", "/api/v1/power", "application/json", `{"a": -8, "b": 0.5}`, 422, api.CodeUndefinedResult},
		{"overflow", "POST", "/api/v1/multiply", "application/json", `{"a": 1e308, "b": 10}`, 422, api.CodeResultOutOfRange},
		{"unknown operation", "POST", "/api/v1/modulo", "application/json", `{"a": 1, "b": 2}`, 404, api.CodeUnknownOperation},
		{"wrong method", "GET", "/api/v1/add", "", "", 405, api.CodeMethodNotAllowed},
		{"unknown route", "GET", "/nope", "", "", 404, api.CodeNotFound},
		{"form content type", "POST", "/api/v1/add", "application/x-www-form-urlencoded", `a=1&b=2`, 415, api.CodeUnsupportedMediaType},
		{"empty body", "POST", "/api/v1/add", "application/json", ``, 400, api.CodeInvalidJSON},
		{"malformed json", "POST", "/api/v1/add", "application/json", `{"a": 1, "b":`, 400, api.CodeInvalidJSON},
		{"not an object", "POST", "/api/v1/add", "application/json", `[1, 2]`, 400, api.CodeInvalidJSON},
		{"trailing data", "POST", "/api/v1/add", "application/json", `{"a": 1, "b": 2} {}`, 400, api.CodeInvalidJSON},
		{"unknown field", "POST", "/api/v1/add", "application/json", `{"a": 1, "b": 2, "c": 3}`, 400, api.CodeInvalidJSON},
		{"string operand", "POST", "/api/v1/add", "application/json", `{"a": "1", "b": 2}`, 400, api.CodeInvalidOperand},
		{"boolean operand", "POST", "/api/v1/add", "application/json", `{"a": 1, "b": true}`, 400, api.CodeInvalidOperand},
		{"number too large for float64", "POST", "/api/v1/add", "application/json", `{"a": 1e400, "b": 1}`, 400, api.CodeInvalidOperand},
		{"missing a", "POST", "/api/v1/add", "application/json", `{"b": 2}`, 400, api.CodeMissingOperand},
		{"missing b", "POST", "/api/v1/divide", "application/json", `{"a": 2}`, 400, api.CodeMissingOperand},
		{"null operand", "POST", "/api/v1/add", "application/json", `{"a": null, "b": 2}`, 400, api.CodeMissingOperand},
		{"b given to sqrt", "POST", "/api/v1/sqrt", "application/json", `{"a": 4, "b": 2}`, 400, api.CodeUnexpectedOperand},
		{"oversized body", "POST", "/api/v1/add", "application/json", `{"a": 1, "b": 2` + strings.Repeat(" ", maxBodyBytes) + `}`, 413, api.CodePayloadTooLarge},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			rec, resp := do(t, tt.method, tt.path, tt.contentType, tt.body)
			if rec.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d; body %s", rec.Code, tt.wantStatus, rec.Body.String())
			}
			if resp.Error == nil {
				t.Fatalf("error = nil, want code %s", tt.wantCode)
			}
			if resp.Error.Code != tt.wantCode {
				t.Errorf("code = %s, want %s (message: %s)", resp.Error.Code, tt.wantCode, resp.Error.Message)
			}
			if resp.Error.Message == "" {
				t.Error("error message is empty")
			}
			if resp.Result != nil {
				t.Errorf("result = %v, want nil on error", *resp.Result)
			}
		})
	}
}

func TestMethodNotAllowedSetsAllowHeader(t *testing.T) {
	rec, _ := do(t, http.MethodGet, "/api/v1/add", "", "")
	if got := rec.Header().Get("Allow"); got != http.MethodPost {
		t.Errorf("Allow = %q, want POST", got)
	}
}

func TestUnknownOperationListsSupported(t *testing.T) {
	_, resp := do(t, http.MethodPost, "/api/v1/modulo", "application/json", `{"a": 1, "b": 2}`)
	if !strings.Contains(resp.Error.Message, "add, divide, multiply") {
		t.Errorf("message = %q, want list of supported operations", resp.Error.Message)
	}
}

func TestHealth(t *testing.T) {
	rec, _ := do(t, http.MethodGet, "/healthz", "", "")
	if rec.Code != http.StatusOK || !strings.Contains(rec.Body.String(), `"ok"`) {
		t.Errorf("GET /healthz = %d %s", rec.Code, rec.Body.String())
	}
}
