# Requirements Document

## Introduction

This feature updates the Expense & Budget Visualizer app to use Indonesian Rupiah (IDR) as its currency instead of US Dollar (USD). The change covers all amount formatting, currency symbols, labels, input placeholders, validation logic, and any currency-specific display logic throughout the app (index.html, app.js, and the test suite).

## Glossary

- **App**: The Expense & Budget Visualizer single-page application.
- **Currency_Formatter**: The formatting logic responsible for converting numeric amounts into a human-readable IDR string.
- **Amount_Input**: The HTML `<input type="number">` field where users enter transaction amounts.
- **Balance_Display**: The element with id `balance` that shows the running total of all transactions.
- **Transaction_List**: The `<ul id="transaction-list">` element that renders individual transaction rows.
- **Monthly_Summary**: The section that groups and displays per-category totals by calendar month.
- **IDR**: Indonesian Rupiah, currency code `IDR`, symbol `Rp`.

---

## Requirements

### Requirement 1: Currency Symbol and Code

**User Story:** As a user, I want all monetary values to be displayed with the Indonesian Rupiah symbol and formatting, so that the app reflects the correct currency for my region.

#### Acceptance Criteria

1. THE Currency_Formatter SHALL prefix all formatted amounts with the symbol `Rp` followed by a non-breaking space.
2. THE Currency_Formatter SHALL format amounts as whole integers with thousand-separator dots (e.g., `Rp 1.500.000`), consistent with Indonesian locale conventions.
3. THE App SHALL use the locale `id-ID` and currency code `IDR` when invoking `Intl.NumberFormat` for amount formatting.
4. THE Balance_Display SHALL render the total spent amount using the Currency_Formatter output.
5. THE Transaction_List SHALL render each transaction's amount using the Currency_Formatter output.
6. THE Monthly_Summary SHALL render each category total using the Currency_Formatter output.

---

### Requirement 2: Amount Input Label and Placeholder

**User Story:** As a user, I want the amount input field to clearly indicate IDR currency, so that I know what currency I am entering.

#### Acceptance Criteria

1. THE App SHALL display the label for the Amount_Input as `Amount (Rp)` instead of `Amount ($)`.
2. THE Amount_Input SHALL use a placeholder value of `0` instead of `0.00`, reflecting that IDR amounts are whole numbers.
3. THE Amount_Input SHALL set the `step` attribute to `1` to accept whole-number IDR amounts.
4. THE Amount_Input SHALL set the `min` attribute to `1` to enforce a minimum of 1 Rupiah.

---

### Requirement 3: Initial Balance Display

**User Story:** As a user, I want the initial balance shown on page load to reflect IDR formatting, so that the display is consistent before any transactions are added.

#### Acceptance Criteria

1. THE Balance_Display SHALL show `Rp 0` as the initial value when no transactions exist, instead of `$0.00`.

---

### Requirement 4: Validation Rules for IDR Amounts

**User Story:** As a developer, I want the validation logic to enforce IDR-appropriate constraints, so that users cannot enter fractional or invalid Rupiah amounts.

#### Acceptance Criteria

1. WHEN a user submits a transaction, THE App SHALL reject any amount that is not a positive integer (i.e., amount must be a whole number greater than or equal to 1).
2. IF the submitted amount contains a decimal fraction (e.g., `1500.50`), THEN THE App SHALL reject the input and display the error message `Amount must be a whole number (minimum 1 Rp).`
3. IF the submitted amount is zero or negative, THEN THE App SHALL reject the input and display the error message `Amount must be a whole number (minimum 1 Rp).`
4. IF the submitted amount is empty or non-numeric, THEN THE App SHALL reject the input and display the error message `Amount must be a whole number (minimum 1 Rp).`
5. WHEN a valid whole-number positive amount is submitted, THE App SHALL accept the transaction and store the amount as an integer.

---

### Requirement 5: Stored Amount Representation

**User Story:** As a developer, I want transaction amounts stored in localStorage to be integers, so that IDR values are represented accurately without floating-point artifacts.

#### Acceptance Criteria

1. WHEN a transaction is saved, THE App SHALL store the `amount` field as an integer value (using `parseInt` or `Math.round`).
2. THE App SHALL preserve existing transactions loaded from localStorage by treating their `amount` values as integers when formatting for display.

---

### Requirement 6: Test Suite Currency Updates

**User Story:** As a developer, I want the test suite to reflect IDR currency constraints, so that tests accurately validate the updated formatting and validation logic.

#### Acceptance Criteria

1. THE test suite SHALL update all amount arbitraries to generate positive integers in the range `[1, 10_000_000]` instead of floats.
2. THE test suite SHALL update validation tests to assert that the error message for invalid amounts is `Amount must be a whole number (minimum 1 Rp).`
3. THE test suite SHALL include a test verifying that the Currency_Formatter produces output matching the pattern `Rp [digits with dot separators]` for any positive integer input.
4. THE test suite SHALL include a round-trip test: for any positive integer amount, `parseCurrencyAmount(formatCurrency(amount)) === amount`.
