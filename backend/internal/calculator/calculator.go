// Package calculator implements the arithmetic operations offered by the
// calculator service. It is pure domain logic: it knows nothing about HTTP
// or JSON, which keeps it trivial to unit test.
package calculator

import (
	"errors"
	"math"
	"sort"
)

// Domain errors. Each describes well-formed input that has no finite, real
// result. The HTTP layer maps them to error codes.
var (
	ErrDivisionByZero  = errors.New("division by zero is undefined")
	ErrNegativeSqrt    = errors.New("square root of a negative number is not a real number")
	ErrUndefinedResult = errors.New("result is undefined (not a real number)")
	ErrOutOfRange      = errors.New("result is too large to be represented")
)

// Operation is a single arithmetic operation.
type Operation struct {
	Name  string
	Arity int // number of operands: 1 (unary) or 2 (binary)
	fn    func(a, b float64) (float64, error)
}

// Apply runs the operation. Unary operations ignore b. The result is always
// a finite number; anything else is reported as an error.
func (op Operation) Apply(a, b float64) (float64, error) {
	result, err := op.fn(a, b)
	if err != nil {
		return 0, err
	}
	switch {
	case math.IsNaN(result):
		return 0, ErrUndefinedResult
	case math.IsInf(result, 0):
		return 0, ErrOutOfRange
	case result == 0:
		// Normalise negative zero so clients never see "-0".
		return 0, nil
	}
	return result, nil
}

var operations = map[string]Operation{
	"add":        {Name: "add", Arity: 2, fn: add},
	"subtract":   {Name: "subtract", Arity: 2, fn: subtract},
	"multiply":   {Name: "multiply", Arity: 2, fn: multiply},
	"divide":     {Name: "divide", Arity: 2, fn: divide},
	"power":      {Name: "power", Arity: 2, fn: power},
	"sqrt":       {Name: "sqrt", Arity: 1, fn: sqrt},
	"percentage": {Name: "percentage", Arity: 2, fn: percentage},
}

// Lookup returns the operation registered under name.
func Lookup(name string) (Operation, bool) {
	op, ok := operations[name]
	return op, ok
}

// Names returns the supported operation names in alphabetical order.
func Names() []string {
	names := make([]string, 0, len(operations))
	for name := range operations {
		names = append(names, name)
	}
	sort.Strings(names)
	return names
}

func add(a, b float64) (float64, error)      { return a + b, nil }
func subtract(a, b float64) (float64, error) { return a - b, nil }
func multiply(a, b float64) (float64, error) { return a * b, nil }

func divide(a, b float64) (float64, error) {
	if b == 0 {
		return 0, ErrDivisionByZero
	}
	return a / b, nil
}

// power raises a to the power b.
func power(a, b float64) (float64, error) {
	// 0 to a negative power is 1/0; report it as such instead of letting
	// math.Pow return +Inf and surface as "out of range".
	if a == 0 && b < 0 {
		return 0, ErrDivisionByZero
	}
	return math.Pow(a, b), nil
}

func sqrt(a, _ float64) (float64, error) {
	if a < 0 {
		return 0, ErrNegativeSqrt
	}
	return math.Sqrt(a), nil
}

// percentage returns a percent of b, e.g. percentage(20, 50) = 10.
// Multiplying before dividing keeps whole-number percentages exact.
func percentage(a, b float64) (float64, error) {
	return a * b / 100, nil
}
