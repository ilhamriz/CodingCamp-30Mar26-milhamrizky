# Tasks

## Task List

- [x] 1. Add `formatCurrency` and `parseCurrencyAmount` helpers to `app.js`
  - [x] 1.1 Implement `formatCurrency(amount)` using `Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 })`
  - [x] 1.2 Implement `parseCurrencyAmount(str)` that strips non-digit characters and returns `parseInt`

- [x] 2. Update `Validation.validateTransaction` in `app.js`
  - [x] 2.1 Replace `parseFloat` with `parseInt` and add `Number.isInteger` check
  - [x] 2.2 Change the amount error message to `"Amount must be a whole number (minimum 1 Rp)."`

- [x] 3. Update UI render methods in `app.js` to use `formatCurrency`
  - [x] 3.1 Replace `total.toFixed(2)` in `renderBalance()` with `formatCurrency(total)`
  - [x] 3.2 Replace `t.amount.toFixed(2)` in `renderTransactionList()` with `formatCurrency(t.amount)`
  - [x] 3.3 Replace `amt.toFixed(2)` in `renderMonthlySummary()` with `formatCurrency(amt)`

- [x] 4. Update transaction creation in `UI.bindEvents` to store integer amounts
  - [x] 4.1 Replace `parseFloat(amount)` with `parseInt(amount, 10)` when building the transaction object

- [x] 5. Update `index.html` for IDR input field
  - [x] 5.1 Change the amount label from `Amount ($)` to `Amount (Rp)`
  - [x] 5.2 Change the amount input `placeholder` from `0.00` to `0`
  - [x] 5.3 Change the amount input `step` from `0.01` to `1`
  - [x] 5.4 Change the amount input `min` from `0.01` to `1`
  - [x] 5.5 Change the initial `#balance` text from `$0.00` to `Rp 0`

- [x] 6. Update amount arbitraries in all test files to generate positive integers
  - [x] 6.1 In `tests/logic.test.js` replace `positiveAmountArb` with `fc.integer({ min: 1, max: 10_000_000 })`
  - [x] 6.2 In `tests/storage.test.js` replace `positiveAmountArb` / transaction amount with `fc.integer({ min: 1, max: 10_000_000 })`
  - [x] 6.3 In `tests/ui.test.js` replace `positiveAmountArb` with `fc.integer({ min: 1, max: 10_000_000 })`
  - [x] 6.4 In `tests/validation.test.js` replace `positiveAmountArb` with `fc.integer({ min: 1, max: 10_000_000 })`

- [x] 7. Update validation tests to assert the new IDR error message
  - [x] 7.1 In `tests/validation.test.js` update all assertions that check the amount error message to expect `"Amount must be a whole number (minimum 1 Rp)."`
  - [x] 7.2 In `tests/ui.test.js` update any inline `validateTransaction` copy and related assertions to match the new message and integer logic

- [x] 8. Add `formatCurrency` output format property test (Property 1)
  - [x] 8.1 In `tests/logic.test.js` (or a new `tests/currency.test.js`) add a property test: for any positive integer, `formatCurrency(n)` matches `/^Rp[\u00a0\s][\d.]+$/`

- [x] 9. Add `formatCurrency` / `parseCurrencyAmount` round-trip property test (Property 2)
  - [x] 9.1 Add a property test: for any positive integer `n`, `parseCurrencyAmount(formatCurrency(n)) === n`

- [x] 10. Add balance display property test (Property 3)
  - [x] 10.1 In `tests/ui.test.js` add a property test: for any transaction list, `#balance` text equals `formatCurrency(sum of amounts)`; verify empty list shows `formatCurrency(0)`

- [x] 11. Add transaction list amount rendering property test (Property 4)
  - [x] 11.1 In `tests/ui.test.js` add a property test: for any transaction list, each rendered list item's amount text equals `formatCurrency(t.amount)`

- [x] 12. Add monthly summary amount rendering property test (Property 5)
  - [x] 12.1 In `tests/ui.test.js` add a property test: for any transaction list, each monthly summary category total cell equals `formatCurrency(aggregated total)`

- [x] 13. Add validation rejection property test (Property 6)
  - [x] 13.1 In `tests/validation.test.js` add a property test: for any non-positive-integer amount (decimals, zero, negative, empty, non-numeric), validation returns `valid: false` with error `"Amount must be a whole number (minimum 1 Rp)."`

- [x] 14. Add valid integer acceptance and storage round-trip property test (Property 7)
  - [x] 14.1 In `tests/validation.test.js` add a property test: for any positive integer amount string, validation returns `valid: true`
  - [x] 14.2 In `tests/storage.test.js` add a property test: for any positive integer amount, after save/load the amount is still an integer equal to the original
