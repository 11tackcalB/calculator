package server

import (
	"context"
	"io"
	"log/slog"
	"net"
	"net/http"
	"testing"
	"time"
)

func TestEnv(t *testing.T) {
	t.Setenv("CALC_TEST_SET", "value")
	t.Setenv("CALC_TEST_EMPTY", "")

	if got := Env("CALC_TEST_SET", "fallback"); got != "value" {
		t.Errorf("Env(set) = %q, want value", got)
	}
	if got := Env("CALC_TEST_EMPTY", "fallback"); got != "fallback" {
		t.Errorf("Env(empty) = %q, want fallback", got)
	}
	if got := Env("CALC_TEST_UNSET_XYZ", "fallback"); got != "fallback" {
		t.Errorf("Env(unset) = %q, want fallback", got)
	}
}

func TestRunServesAndShutsDown(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	addr := ln.Addr().String()
	ln.Close()

	srv := New(addr, http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		_, _ = io.WriteString(w, "ok")
	}))
	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan error, 1)
	go func() { done <- Run(ctx, srv, slog.New(slog.NewTextHandler(io.Discard, nil))) }()

	var resp *http.Response
	for i := 0; i < 50; i++ {
		if resp, err = http.Get("http://" + addr); err == nil {
			break
		}
		time.Sleep(20 * time.Millisecond)
	}
	if err != nil {
		t.Fatalf("server never became reachable: %v", err)
	}
	resp.Body.Close()

	cancel()
	select {
	case err := <-done:
		if err != nil {
			t.Errorf("Run() = %v, want nil after graceful shutdown", err)
		}
	case <-time.After(5 * time.Second):
		t.Fatal("Run did not return after cancellation")
	}
}

func TestRunReturnsListenError(t *testing.T) {
	ln, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	defer ln.Close()

	srv := New(ln.Addr().String(), http.NotFoundHandler()) // address already in use
	if err := Run(context.Background(), srv, slog.New(slog.NewTextHandler(io.Discard, nil))); err == nil {
		t.Error("Run() = nil, want listen error")
	}
}
