# Design Document: Rupiah Currency Update

## Overview

This feature migrates the Expense & Budget Visualizer from USD (US Dollar) to IDR (Indonesian Rupiah) as its sole currency. The change is purely presentational and validation-level — the underlying data model, storage mechanism, and rendering pipeline remain intact. The key differences are:

- A new `formatCurrency(amount)` function replaces all `toFixed(2)` calls, producing IDR-formatted strings (e.g., `Rp 1.500.000`).
- A companion `parseCurrencyAmount(str)` function enables round-trip testing.
- Validation logic is tightened to require whole-number positive integers (no decimals, no floats).
- HTML attributes (`label`, `placeholder`, `step`, `min`) on the amount input are updated.
- All test arbitraries are updated to generate positive integers in `[1, 10_000_000]`.

No new dependencies are required. The existing `Intl.NumberFormat` API (available in all modern browsers and jsdom) handles locale-aware formatting.

---

## Architecture

The app is a single-page vanilla JS application with no build step. All logic lives in `app.js` and is structured into named objects (`Storage`, `Validation`, `Logic`, `UI`). Tests inline the relevant functions for isolation.

The currency update touches four layers:

```
index.html        ← label text, placeholder, step, min attributes
app.js            ← formatCurrency(), parseCurrencyAmount(), Validation, UI render methods
tests/validation  ← updated arbitraries + new error message assertions
tests/logic       ← updated amount arbitraries (integers)
tests/storage     ← updated amount arbitraries (integers)
tests/ui          ← updated amount arbitraries + formatter assertions
```

No new files are introduced. No architectural changes are needed.

---

## Components and Interfaces

### `formatCurrency(amount: number): string`

New top-level helper in `app.js`. Converts a numeric amount to an IDR-formatted string.

```js
function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}
```

`Intl.NumberFormat` with `id-ID` / `IDR` produces output like `Rp 1.500.000`. The `minimumFractionDigits: 0` suppresses the decimal portion for whole-number IDR values.

### `parseCurrencyAmount(str: string): number`

Companion parser used in round-trip tests. Strips the `Rp` prefix and dot separators, then parses as integer.

```js
function parseCurrencyAmount(str) {
  // Remove currency symbol, non-breaking spaces, regular spaces, and dot separators
  const digits = str.replace(/[^\d]/g, "");
  return parseInt(digits, 10);
}
```

### `Validation.validateTransaction(name, amount, category)`

Updated to enforce IDR integer constraints:

- `parseInt(amount)` instead of `parseFloat`
- Rejects if `!Number.isInteger(parsed)` or `parsed < 1`
- Error message: `"Amount must be a whole number (minimum 1 Rp)."`

### `UI` render methods

Three methods are updated to call `formatCurrency` instead of `toFixed(2)`:

| Method                    | Change                                                |
| ------------------------- | ----------------------------------------------------- |
| `renderBalance()`         | `formatCurrency(total)` instead of `total.toFixed(2)` |
| `renderTransactionList()` | `formatCurrency(t.amount)` per transaction row        |
| `renderMonthlySummary()`  | `formatCurrency(amt)` per category total cell         |

### Transaction creation in `UI.bindEvents`

Amount is stored as `parseInt(amount)` instead of `parseFloat(amount)`.

---

## Data Models

No schema changes. The `Transaction` object shape is unchanged:

```js
{
  id: string,       // UUID or timestamp-based
  name: string,     // trimmed user input
  amount: number,   // NOW: always a positive integer (IDR whole rupiah)
  category: string,
  date: string,     // ISO YYYY-MM-DD
}
```

The only semantic change is that `amount` is now always an integer. Existing localStorage data with float amounts will be displayed correctly because `formatCurrency` rounds to 0 decimal places, but new transactions will always be stored as integers via `parseInt`.

---

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: formatCurrency output format

_For any_ positive integer amount, `formatCurrency(amount)` must produce a string that starts with `Rp` and contains only digits and dot separators after the currency symbol (matching the pattern `/^Rp[\u00a0\s][\d.]+$/`).

**Validates: Requirements 1.1, 1.2, 6.3**

### Property 2: formatCurrency / parseCurrencyAmount round-trip

_For any_ positive integer amount, `parseCurrencyAmount(formatCurrency(amount)) === amount`.

**Validates: Requirements 6.4**

### Property 3: Balance display uses formatCurrency

_For any_ list of transactions (including the empty list), the text content of the `#balance` element after rendering equals `formatCurrency(sum of all amounts)`. When the list is empty, this equals `formatCurrency(0)` which must equal `Rp 0`.

**Validates: Requirements 1.4, 3.1**

### Property 4: Transaction list renders amounts with formatCurrency

_For any_ list of transactions, each rendered `<li>` in `#transaction-list` must contain the `formatCurrency` output for that transaction's amount.

**Validates: Requirements 1.5**

### Property 5: Monthly summary renders amounts with formatCurrency

_For any_ list of transactions, each category total cell in the monthly summary must contain the `formatCurrency` output for that category's total.

**Validates: Requirements 1.6**

### Property 6: Validation rejects non-positive-integer amounts with correct message

_For any_ amount that is not a positive integer (includes decimals like `1500.50`, zero, negative numbers, empty string, non-numeric strings), `validateTransaction` must return `valid: false` and the errors array must contain exactly `"Amount must be a whole number (minimum 1 Rp)."`.

**Validates: Requirements 4.1, 4.2, 4.3, 4.4**

### Property 7: Valid integer amount is accepted and stored as integer

_For any_ positive integer amount string, `validateTransaction` returns `valid: true`, and the transaction created from that input has `Number.isInteger(transaction.amount) === true`. After a save/load round-trip through localStorage, the amount remains an integer equal to the original value.

**Validates: Requirements 4.5, 5.1, 5.2**

---

## Error Handling

| Scenario                                      | Handling                                                                             |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| Decimal amount submitted (e.g. `1500.50`)     | Validation rejects; error: `"Amount must be a whole number (minimum 1 Rp)."`         |
| Zero or negative amount                       | Validation rejects; same error message                                               |
| Empty or non-numeric amount                   | Validation rejects; same error message                                               |
| `Intl.NumberFormat` unavailable               | Unlikely in target environments; if needed, a fallback manual formatter can be added |
| Existing localStorage data with float amounts | `formatCurrency` rounds to 0 decimals, so display is correct; no migration needed    |

---

## Testing Strategy

### Dual Testing Approach

Both unit tests and property-based tests are used. Unit tests cover specific examples and edge cases; property tests verify universal correctness across many generated inputs.

**Property-based testing library**: `fast-check` (already a dev dependency).

**Minimum iterations per property test**: 100 (`{ numRuns: 100 }`).

**Tag format**: `// Feature: rupiah-currency-update, Property N: <property text>`

### Unit Tests (examples and edge cases)

- `formatCurrency(0)` → `"Rp 0"` (edge case: zero balance)
- `formatCurrency(1500000)` → `"Rp 1.500.000"` (example: million-range IDR)
- `formatCurrency(1)` → `"Rp 1"` (edge case: minimum 1 Rp)
- Validation rejects `1500.50` with message `"Amount must be a whole number (minimum 1 Rp)."`
- Validation rejects `0` with the same message
- Validation rejects `""` with the same message
- HTML label reads `"Amount (Rp)"`, placeholder is `"0"`, step is `"1"`, min is `"1"`
- Initial balance display shows `"Rp 0"` when no transactions exist

### Property Tests

Each property below maps to one property-based test:

| Property | Test description                                                                     | Tag                                                                  |
| -------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------- |
| P1       | For any positive integer, `formatCurrency` output matches `/^Rp[\u00a0\s][\d.]+$/`   | `Property 1: formatCurrency output format`                           |
| P2       | For any positive integer, `parseCurrencyAmount(formatCurrency(n)) === n`             | `Property 2: formatCurrency / parseCurrencyAmount round-trip`        |
| P3       | For any transaction list, `#balance` text equals `formatCurrency(sum)`               | `Property 3: Balance display uses formatCurrency`                    |
| P4       | For any transaction list, each list item amount equals `formatCurrency(t.amount)`    | `Property 4: Transaction list renders amounts with formatCurrency`   |
| P5       | For any transaction list, each monthly summary cell equals `formatCurrency(total)`   | `Property 5: Monthly summary renders amounts with formatCurrency`    |
| P6       | For any non-positive-integer amount, validation returns invalid with correct message | `Property 6: Validation rejects non-positive-integer amounts`        |
| P7       | For any positive integer amount, validation passes and stored amount is integer      | `Property 7: Valid integer amount is accepted and stored as integer` |

### Amount Arbitraries (updated across all test files)

All existing `positiveAmountArb` definitions that use `fc.float(...)` must be replaced with:

```js
const positiveAmountArb = fc.integer({ min: 1, max: 10_000_000 });
```

This applies to `logic.test.js`, `storage.test.js`, `ui.test.js`, and `validation.test.js`.
