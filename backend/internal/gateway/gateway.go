// Package gateway implements the API gateway: the single entry point the
// frontend services talk to. It forwards /api/ traffic to the calculator
// service and translates upstream failures into the shared JSON envelope.
package gateway

import (
	"errors"
	"io"
	"log/slog"
	"net"
	"net/http"
	"net/http/httputil"
	"net/url"
	"time"

	"calculator/backend/internal/api"
	"calculator/backend/internal/middleware"
)

// maxBodyBytes rejects oversized bodies before they reach the upstream.
const maxBodyBytes = 64 << 10

// Config configures the gateway.
type Config struct {
	// CalculatorURL is the base URL of the calculator service.
	CalculatorURL *url.URL
	// UpstreamTimeout bounds how long to wait for the calculator's response
	// headers.
	UpstreamTimeout time.Duration
}

// New returns the gateway's router.
func New(cfg Config, logger *slog.Logger) http.Handler {
	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.ResponseHeaderTimeout = cfg.UpstreamTimeout

	proxy := &httputil.ReverseProxy{
		Rewrite: func(pr *httputil.ProxyRequest) {
			pr.SetURL(cfg.CalculatorURL)
			pr.SetXForwarded()
			// Propagate the ID so both services log the same request ID.
			pr.Out.Header.Set(middleware.RequestIDHeader, api.RequestID(pr.In.Context()))
		},
		// The gateway's RequestID middleware already set this header on the
		// response; drop the upstream copy so clients see it once.
		ModifyResponse: func(resp *http.Response) error {
			resp.Header.Del(middleware.RequestIDHeader)
			return nil
		},
		Transport:    transport,
		ErrorHandler: upstreamError(logger),
	}

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"status":"ok"}`)
	})
	mux.Handle("/api/", http.MaxBytesHandler(proxy, maxBodyBytes))
	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		api.WriteError(w, r, http.StatusNotFound, "", api.CodeNotFound,
			"no route for "+r.Method+" "+r.URL.Path)
	})
	return mux
}

// upstreamError reports a failed proxy attempt as 504 on timeout and 502
// otherwise, using the same envelope as the calculator service.
func upstreamError(logger *slog.Logger) func(http.ResponseWriter, *http.Request, error) {
	return func(w http.ResponseWriter, r *http.Request, err error) {
		logger.Error("upstream request failed",
			"error", err,
			"path", r.URL.Path,
			"request_id", api.RequestID(r.Context()),
		)
		var netErr net.Error
		if errors.As(err, &netErr) && netErr.Timeout() {
			api.WriteError(w, r, http.StatusGatewayTimeout, "", api.CodeUpstreamTimeout,
				"the calculator service did not respond in time")
			return
		}
		api.WriteError(w, r, http.StatusBadGateway, "", api.CodeUpstreamUnavailable,
			"the calculator service is unavailable")
	}
}
