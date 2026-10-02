// Command gateway runs the API gateway, the single entry point for the
// browser and mobile frontend services.
//
// Environment:
//
//	PORT              listen port (default 8090)
//	CALCULATOR_URL    base URL of the calculator service (default http://localhost:8091)
//	UPSTREAM_TIMEOUT  max wait for the calculator, as a Go duration (default 5s)
//	ALLOWED_ORIGINS   comma-separated origins allowed to call the gateway directly
//	                  from a browser (default none; the frontends use a same-origin proxy)
package main

import (
	"context"
	"log/slog"
	"net/url"
	"os"
	"strings"
	"time"

	"calculator/backend/internal/gateway"
	"calculator/backend/internal/middleware"
	"calculator/backend/internal/server"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil)).With("service", "gateway")

	calculatorURL, err := url.Parse(server.Env("CALCULATOR_URL", "http://localhost:8091"))
	if err != nil || calculatorURL.Scheme == "" || calculatorURL.Host == "" {
		logger.Error("invalid CALCULATOR_URL", "value", os.Getenv("CALCULATOR_URL"))
		os.Exit(1)
	}
	timeout, err := time.ParseDuration(server.Env("UPSTREAM_TIMEOUT", "5s"))
	if err != nil || timeout <= 0 {
		logger.Error("invalid UPSTREAM_TIMEOUT", "value", os.Getenv("UPSTREAM_TIMEOUT"))
		os.Exit(1)
	}

	handler := middleware.Chain(
		gateway.New(gateway.Config{CalculatorURL: calculatorURL, UpstreamTimeout: timeout}, logger),
		middleware.RequestID,
		middleware.AccessLog(logger),
		middleware.Recover(logger),
		middleware.CORS(splitList(os.Getenv("ALLOWED_ORIGINS"))),
	)
	srv := server.New(":"+server.Env("PORT", "8090"), handler)

	logger.Info("proxying", "calculator_url", calculatorURL.String(), "upstream_timeout", timeout.String())
	if err := server.Run(context.Background(), srv, logger); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}

func splitList(s string) []string {
	var out []string
	for _, part := range strings.Split(s, ",") {
		if part = strings.TrimSpace(part); part != "" {
			out = append(out, part)
		}
	}
	return out
}
