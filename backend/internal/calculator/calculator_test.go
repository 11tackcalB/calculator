package calculator

import (
	"errors"
	"math"
	"slices"
	"testing"
)

func TestApply(t *testing.T) {
	tests := []struct {
		name    string
		op      string
		a, b    float64
		want    float64
		wantErr error
	}{
		{name: "add integers", op: "add", a: 2, b: 3, want: 5},
		{name: "add negatives", op: "add", a: -2.5, b: -0.5, want: -3},
		{name: "subtract", op: "subtract", a: 10, b: 4, want: 6},
		{name: "subtract to negative", op: "subtract", a: 4, b: 10, want: -6},
		{name: "multiply", op: "multiply", a: 6, b: 7, want: 42},
		{name: "multiply by zero", op: "multiply", a: 123.45, b: 0, want: 0},
		{name: "divide", op: "divide", a: 9, b: 3, want: 3},
		{name: "divide fraction", op: "divide", a: 1, b: 4, want: 0.25},
		{name: "divide by zero", op: "divide", a: 1, b: 0, wantErr: ErrDivisionByZero},
		{name: "divide by negative zero", op: "divide", a: 1, b: math.Copysign(0, -1), wantErr: ErrDivisionByZero},
		{name: "zero divided by zero", op: "divide", a: 0, b: 0, wantErr: ErrDivisionByZero},
		{name: "power", op: "power", a: 2, b: 10, want: 1024},
		{name: "power negative exponent", op: "power", a: 2, b: -2, want: 0.25},
		{name: "power zero exponent", op: "power", a: 0, b: 0, want: 1},
		{name: "power fractional exponent", op: "power", a: 9, b: 0.5, want: 3},
		{name: "power zero to negative", op: "power", a: 0, b: -1, wantErr: ErrDivisionByZero},
		{name: "power negative base fractional exponent", op: "power", a: -8, b: 0.5, wantErr: ErrUndefinedResult},
		{name: "power overflow", op: "power", a: 10, b: 400, wantErr: ErrOutOfRange},
		{name: "sqrt", op: "sqrt", a: 16, want: 4},
		{name: "sqrt zero", op: "sqrt", a: 0, want: 0},
		{name: "sqrt ignores b", op: "sqrt", a: 2.25, b: 99, want: 1.5},
		{name: "sqrt negative", op: "sqrt", a: -4, wantErr: ErrNegativeSqrt},
		{name: "percentage", op: "percentage", a: 20, b: 50, want: 10},
		{name: "percentage stays exact", op: "percentage", a: 15, b: 80, want: 12},
		{name: "percentage over 100", op: "percentage", a: 150, b: 40, want: 60},
		{name: "multiply overflow", op: "multiply", a: math.MaxFloat64, b: 2, wantErr: ErrOutOfRange},
		{name: "add overflow", op: "add", a: math.MaxFloat64, b: math.MaxFloat64, wantErr: ErrOutOfRange},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			op, ok := Lookup(tt.op)
			if !ok {
				t.Fatalf("Lookup(%q) not found", tt.op)
			}
			got, err := op.Apply(tt.a, tt.b)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("Apply(%v, %v) error = %v, want %v", tt.a, tt.b, err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("Apply(%v, %v) unexpected error: %v", tt.a, tt.b, err)
			}
			if got != tt.want {
				t.Errorf("Apply(%v, %v) = %v, want %v", tt.a, tt.b, got, tt.want)
			}
		})
	}
}

func TestApplyNormalisesNegativeZero(t *testing.T) {
	op, _ := Lookup("multiply")
	got, err := op.Apply(-5, 0)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if math.Signbit(got) {
		t.Errorf("Apply(-5, 0) = -0, want +0")
	}
}

func TestLookupUnknown(t *testing.T) {
	if _, ok := Lookup("modulo"); ok {
		t.Error(`Lookup("modulo") found an operation, want none`)
	}
}

func TestArity(t *testing.T) {
	for _, name := range Names() {
		op, _ := Lookup(name)
		want := 2
		if name == "sqrt" {
			want = 1
		}
		if op.Arity != want {
			t.Errorf("%s arity = %d, want %d", name, op.Arity, want)
		}
	}
}

func TestNames(t *testing.T) {
	want := []string{"add", "divide", "multiply", "percentage", "power", "sqrt", "subtract"}
	if got := Names(); !slices.Equal(got, want) {
		t.Errorf("Names() = %v, want %v", got, want)
	}
}
