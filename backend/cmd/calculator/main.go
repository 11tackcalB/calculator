// Command calculator runs the calculator service, which performs the
// arithmetic. In the deployment it is reachable only through the gateway.
//
// Environment:
//
//	PORT  listen port (default 8091)
package main

import (
	"context"
	"log/slog"
	"os"

	"calculator/backend/internal/calculatorapi"
	"calculator/backend/internal/middleware"
	"calculator/backend/internal/server"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil)).With("service", "calculator")

	handler := middleware.Chain(calculatorapi.NewHandler(),
		middleware.RequestID,
		middleware.AccessLog(logger),
		middleware.Recover(logger),
	)
	srv := server.New(":"+server.Env("PORT", "8091"), handler)

	if err := server.Run(context.Background(), srv, logger); err != nil {
		logger.Error("server stopped", "error", err)
		os.Exit(1)
	}
}
