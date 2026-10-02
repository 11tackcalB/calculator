package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func decode(t *testing.T, rec *httptest.ResponseRecorder) map[string]any {
	t.Helper()
	var body map[string]any
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("response is not JSON: %v\n%s", err, rec.Body.String())
	}
	return body
}

func TestWriteResult(t *testing.T) {
	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req = req.WithContext(WithRequestID(req.Context(), "req-1"))
	rec := httptest.NewRecorder()
	b := 4.0

	WriteResult(rec, req, "divide", Operands{A: 10, B: &b}, 2.5)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); ct != "application/json" {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}
	body := decode(t, rec)
	if body["result"] != 2.5 {
		t.Errorf("result = %v, want 2.5", body["result"])
	}
	if v, ok := body["error"]; !ok || v != nil {
		t.Errorf("error = %v (present: %v), want explicit null", v, ok)
	}
	if body["operation"] != "divide" {
		t.Errorf("operation = %v, want divide", body["operation"])
	}
	operands := body["operands"].(map[string]any)
	if operands["a"] != 10.0 || operands["b"] != 4.0 {
		t.Errorf("operands = %v, want a=10 b=4", operands)
	}
	meta := body["metadata"].(map[string]any)
	if meta["requestId"] != "req-1" {
		t.Errorf("requestId = %v, want req-1", meta["requestId"])
	}
	if meta["timestamp"] == "" || meta["timestamp"] == nil {
		t.Error("timestamp missing")
	}
}

func TestWriteResultUnaryOmitsB(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteResult(rec, httptest.NewRequest(http.MethodPost, "/", nil), "sqrt", Operands{A: 9}, 3)

	operands := decode(t, rec)["operands"].(map[string]any)
	if _, ok := operands["b"]; ok {
		t.Errorf("operands = %v, want no b for a unary operation", operands)
	}
}

func TestWriteError(t *testing.T) {
	rec := httptest.NewRecorder()
	WriteError(rec, httptest.NewRequest(http.MethodPost, "/", nil),
		http.StatusUnprocessableEntity, "divide", CodeDivisionByZero, "division by zero is undefined")

	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("status = %d, want 422", rec.Code)
	}
	body := decode(t, rec)
	if v, ok := body["result"]; !ok || v != nil {
		t.Errorf("result = %v (present: %v), want explicit null", v, ok)
	}
	apiErr := body["error"].(map[string]any)
	if apiErr["code"] != CodeDivisionByZero {
		t.Errorf("code = %v, want %s", apiErr["code"], CodeDivisionByZero)
	}
	if apiErr["message"] != "division by zero is undefined" {
		t.Errorf("message = %v", apiErr["message"])
	}
}

func TestRequestIDMissing(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)
	if id := RequestID(req.Context()); id != "" {
		t.Errorf("RequestID() = %q, want empty", id)
	}
}
