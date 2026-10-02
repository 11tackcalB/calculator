package gateway

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"

	"calculator/backend/internal/api"
	"calculator/backend/internal/calculatorapi"
	"calculator/backend/internal/middleware"
)

var discardLogger = slog.New(slog.NewTextHandler(io.Discard, nil))

// newGateway returns a gateway wired like cmd/gateway, pointing at upstream.
func newGateway(t *testing.T, upstream string, timeout time.Duration) http.Handler {
	t.Helper()
	u, err := url.Parse(upstream)
	if err != nil {
		t.Fatal(err)
	}
	return middleware.Chain(New(Config{CalculatorURL: u, UpstreamTimeout: timeout}, discardLogger),
		middleware.RequestID)
}

func decodeEnvelope(t *testing.T, rec *httptest.ResponseRecorder) api.Response {
	t.Helper()
	var resp api.Response
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("response is not a JSON envelope: %v\n%s", err, rec.Body.String())
	}
	return resp
}

func TestProxiesToCalculator(t *testing.T) {
	upstream := httptest.NewServer(middleware.Chain(calculatorapi.NewHandler(), middleware.RequestID))
	defer upstream.Close()
	gw := newGateway(t, upstream.URL, time.Second)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/divide", strings.NewReader(`{"a": 9, "b": 3}`))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set(middleware.RequestIDHeader, "trace-42")
	rec := httptest.NewRecorder()
	gw.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200; body %s", rec.Code, rec.Body.String())
	}
	resp := decodeEnvelope(t, rec)
	if resp.Result == nil || *resp.Result != 3 {
		t.Errorf("result = %v, want 3", resp.Result)
	}
	if resp.Metadata.RequestID != "trace-42" {
		t.Errorf("upstream saw request ID %q, want trace-42 propagated", resp.Metadata.RequestID)
	}
	if got := rec.Header().Values(middleware.RequestIDHeader); len(got) != 1 || got[0] != "trace-42" {
		t.Errorf("response %s = %v, want exactly [trace-42]", middleware.RequestIDHeader, got)
	}
}

func TestPassesThroughUpstreamErrors(t *testing.T) {
	upstream := httptest.NewServer(calculatorapi.NewHandler())
	defer upstream.Close()
	gw := newGateway(t, upstream.URL, time.Second)

	req := httptest.NewRequest(http.MethodPost, "/api/v1/divide", strings.NewReader(`{"a": 1, "b": 0}`))
	rec := httptest.NewRecorder()
	gw.ServeHTTP(rec, req)

	if rec.Code != http.StatusUnprocessableEntity {
		t.Errorf("status = %d, want 422", rec.Code)
	}
	if resp := decodeEnvelope(t, rec); resp.Error == nil || resp.Error.Code != api.CodeDivisionByZero {
		t.Errorf("error = %+v, want %s", resp.Error, api.CodeDivisionByZero)
	}
}

func TestUpstreamUnavailable(t *testing.T) {
	upstream := httptest.NewServer(http.NotFoundHandler())
	addr := upstream.URL
	upstream.Close() // nothing listens on addr any more

	rec := httptest.NewRecorder()
	newGateway(t, addr, time.Second).ServeHTTP(rec,
		httptest.NewRequest(http.MethodPost, "/api/v1/add", strings.NewReader(`{"a": 1, "b": 2}`)))

	if rec.Code != http.StatusBadGateway {
		t.Errorf("status = %d, want 502", rec.Code)
	}
	if resp := decodeEnvelope(t, rec); resp.Error == nil || resp.Error.Code != api.CodeUpstreamUnavailable {
		t.Errorf("error = %+v, want %s", resp.Error, api.CodeUpstreamUnavailable)
	}
}

func TestUpstreamTimeout(t *testing.T) {
	release := make(chan struct{})
	upstream := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) {
		<-release
	}))
	defer upstream.Close()
	defer close(release)

	rec := httptest.NewRecorder()
	newGateway(t, upstream.URL, 50*time.Millisecond).ServeHTTP(rec,
		httptest.NewRequest(http.MethodPost, "/api/v1/add", strings.NewReader(`{"a": 1, "b": 2}`)))

	if rec.Code != http.StatusGatewayTimeout {
		t.Errorf("status = %d, want 504", rec.Code)
	}
	if resp := decodeEnvelope(t, rec); resp.Error == nil || resp.Error.Code != api.CodeUpstreamTimeout {
		t.Errorf("error = %+v, want %s", resp.Error, api.CodeUpstreamTimeout)
	}
}

func TestUnknownRouteIsNotProxied(t *testing.T) {
	called := false
	upstream := httptest.NewServer(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { called = true }))
	defer upstream.Close()

	rec := httptest.NewRecorder()
	newGateway(t, upstream.URL, time.Second).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/admin", nil))

	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
	if called {
		t.Error("request outside /api/ reached the upstream")
	}
}

func TestHealth(t *testing.T) {
	rec := httptest.NewRecorder()
	newGateway(t, "http://127.0.0.1:1", time.Second).ServeHTTP(rec, httptest.NewRequest(http.MethodGet, "/healthz", nil))
	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}
}
