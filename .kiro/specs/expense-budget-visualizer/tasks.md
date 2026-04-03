# Tasks

## Task List

- [x] 1. Project scaffold
  - [x] 1.1 Create `index.html` with semantic layout shell (form, list, balance, chart canvas, monthly summary section, theme toggle)
  - [x] 1.2 Create `styles.css` with CSS custom properties for dark/light themes and responsive layout (320px–1440px)
  - [x] 1.3 Create `app.js` with module namespaces: Storage, Validation, Logic, UI

- [x] 2. Storage module
  - [x] 2.1 Implement `loadTransactions` / `saveTransactions` with JSON serialization and error handling (QuotaExceededError, corrupt data)
  - [x] 2.2 Implement `loadCategories` / `saveCategories`
  - [x] 2.3 Implement `loadTheme` / `saveTheme`
  - [x] 2.4 Write property tests for storage round-trips (Properties 9, 10, 14)

- [x] 3. Validation module
  - [x] 3.1 Implement `validateTransaction(name, amount, category)` returning `{ valid, errors }`
  - [x] 3.2 Write property tests for validation (Properties 2, 3)

- [x] 4. Logic module
  - [x] 4.1 Implement `calculateBalance(transactions)`
  - [x] 4.2 Implement `aggregateByCategory(transactions)`
  - [x] 4.3 Implement `aggregateByMonth(transactions)`
  - [x] 4.4 Implement `sortTransactions(transactions, field, dir)`
  - [x] 4.5 Write property tests for logic functions (Properties 7, 8, 11, 12)

- [x] 5. Transaction input form
  - [x] 5.1 Bind form submit event; call validation, add transaction on success, show inline errors on failure
  - [x] 5.2 Reset form fields after successful submission
  - [x] 5.3 Write property tests for form add/reject behavior (Properties 1, 2, 3, 4)

- [x] 6. Transaction list UI
  - [x] 6.1 Implement `renderTransactionList(transactions)` — renders name, amount, category per item with a delete button
  - [x] 6.2 Bind delete button events; remove transaction, update storage, re-render all
  - [x] 6.3 Implement empty-state message when list is empty
  - [x] 6.4 Implement sort controls (amount asc/desc, category asc); sort is display-only, does not mutate storage
  - [x] 6.5 Write property tests for list rendering and sort (Properties 5, 6, 12, 13)

- [x] 7. Balance display
  - [x] 7.1 Implement `renderBalance(transactions)` using `calculateBalance`
  - [x] 7.2 Ensure balance updates on every add and delete
  - [x] 7.3 Write property test for balance correctness (Property 7)

- [x] 8. Spending chart
  - [x] 8.1 Add Chart.js via CDN in `index.html`
  - [x] 8.2 Implement `renderChart(transactions)` using `aggregateByCategory`; handle empty state with placeholder
  - [x] 8.3 Ensure chart updates on every add and delete
  - [x] 8.4 Write property test for category aggregation (Property 8)

- [x] 9. Category management
  - [x] 9.1 Populate category `<select>` with default categories (Food, Transport, Fun) on load
  - [x] 9.2 Implement custom category input: add to selector, persist to localStorage, restore on load
  - [x] 9.3 Write property test for custom category persistence (Property 10)

- [x] 10. Monthly summary view
  - [x] 10.1 Implement `renderMonthlySummary(transactions)` using `aggregateByMonth`
  - [x] 10.2 Show/hide monthly summary section on navigation
  - [x] 10.3 Write property test for monthly grouping and totals (Property 11)

- [x] 11. Dark/light mode
  - [x] 11.1 Implement theme toggle button; apply theme class to `<html>` element immediately
  - [x] 11.2 Persist theme to localStorage; restore on load
  - [x] 11.3 Write property test for theme persistence (Property 14)

- [x] 12. App initialization
  - [x] 12.1 On `DOMContentLoaded`: load all data from localStorage, render transaction list, balance, chart, categories, and theme

- [x] 13. Unit tests
  - [x] 13.1 Write unit tests for specific examples: default categories in selector, empty-state message, balance element exists in DOM
  - [x] 13.2 Write unit tests for edge cases: empty list balance = 0, aggregateByCategory on empty list, aggregateByMonth on empty list
  - [x] 13.3 Write integration test: full add-then-delete cycle updates balance and chart data

- [x] 14. Polish and compatibility
  - [x] 14.1 Ensure all interactive controls are at least 44×44 CSS pixels
  - [x] 14.2 Verify no framework or build-step dependencies; app runs by opening `index.html` directly
  - [x] 14.3 Verify app works on Chrome, Firefox, Edge, and Safari (manual smoke test checklist)
