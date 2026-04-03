# Requirements Document

## Introduction

The Expense & Budget Visualizer is a mobile-friendly, client-side web application that helps users track daily spending. It provides a transaction input form, a scrollable transaction history, an auto-updating total balance, and a pie chart showing spending distribution by category. All data is persisted in the browser's Local Storage. The app is built with plain HTML, CSS, and Vanilla JavaScript — no frameworks, no backend.

## Glossary

- **App**: The Expense & Budget Visualizer web application
- **Transaction**: A single spending record consisting of a name, amount, and category
- **Category**: A label grouping transactions (e.g., Food, Transport, Fun, or a user-defined custom category)
- **Balance**: The running total of all transaction amounts
- **Chart**: The pie chart visualizing spending distribution by category
- **Transaction_List**: The scrollable UI component displaying all recorded transactions
- **Input_Form**: The UI form used to submit new transactions
- **Local_Storage**: The browser's built-in client-side key-value storage API
- **Monthly_Summary**: An aggregated view of transactions grouped by calendar month

---

## Requirements

### Requirement 1: Transaction Input

**User Story:** As a user, I want to enter a transaction with a name, amount, and category, so that I can record my spending.

#### Acceptance Criteria

1. THE Input_Form SHALL include fields for Item Name, Amount, and Category.
2. WHEN the user submits the Input_Form with all fields filled, THE App SHALL add the transaction to the Transaction_List.
3. IF the user submits the Input_Form with one or more empty fields, THEN THE Input_Form SHALL display a validation error message and SHALL NOT add the transaction.
4. IF the user enters a non-positive or non-numeric value in the Amount field, THEN THE Input_Form SHALL display a validation error and SHALL NOT add the transaction.
5. WHEN a transaction is successfully added, THE Input_Form SHALL reset all fields to their default empty state.

---

### Requirement 2: Transaction List

**User Story:** As a user, I want to see all my recorded transactions in a scrollable list, so that I can review my spending history.

#### Acceptance Criteria

1. THE Transaction_List SHALL display each transaction's Item Name, Amount, and Category.
2. THE Transaction_List SHALL be scrollable when the number of transactions exceeds the visible area.
3. WHEN the user deletes a transaction, THE App SHALL remove that transaction from the Transaction_List.
4. WHEN the Transaction_List contains no transactions, THE App SHALL display an empty-state message indicating no transactions have been recorded.

---

### Requirement 3: Total Balance

**User Story:** As a user, I want to see my total spending balance at the top of the page, so that I always know how much I have spent.

#### Acceptance Criteria

1. THE App SHALL display the total Balance at the top of the page.
2. WHEN a transaction is added, THE App SHALL update the Balance to reflect the new total.
3. WHEN a transaction is deleted, THE App SHALL update the Balance to reflect the new total.
4. THE App SHALL calculate the Balance as the sum of all transaction amounts.

---

### Requirement 4: Visual Spending Chart

**User Story:** As a user, I want to see a pie chart of my spending by category, so that I can understand where my money is going.

#### Acceptance Criteria

1. THE Chart SHALL display spending distribution as a pie chart grouped by Category.
2. WHEN a transaction is added, THE Chart SHALL update automatically to reflect the new distribution.
3. WHEN a transaction is deleted, THE Chart SHALL update automatically to reflect the new distribution.
4. THE App SHALL render the Chart using Chart.js.
5. WHEN the Transaction_List contains no transactions, THE Chart SHALL display an empty or placeholder state.

---

### Requirement 5: Data Persistence

**User Story:** As a user, I want my transactions to be saved between sessions, so that I don't lose my data when I close the browser.

#### Acceptance Criteria

1. WHEN a transaction is added, THE App SHALL persist the transaction to Local_Storage.
2. WHEN a transaction is deleted, THE App SHALL remove the transaction from Local_Storage.
3. WHEN the App loads, THE App SHALL read all transactions from Local_Storage and populate the Transaction_List, Balance, and Chart.

---

### Requirement 6: Category Management

**User Story:** As a user, I want to use default categories and optionally add custom ones, so that I can organize my spending in a way that fits my life.

#### Acceptance Criteria

1. THE Input_Form SHALL provide the default categories: Food, Transport, and Fun.
2. WHERE the user adds a custom category, THE App SHALL include that category as a selectable option in the Input_Form.
3. WHERE the user adds a custom category, THE App SHALL persist the custom category to Local_Storage.
4. WHEN the App loads, THE App SHALL restore any previously saved custom categories.

---

### Requirement 7: Monthly Summary View

**User Story:** As a user, I want to view a summary of my spending grouped by month, so that I can track trends over time.

#### Acceptance Criteria

1. THE App SHALL provide a Monthly_Summary view that groups transactions by calendar month.
2. THE Monthly_Summary SHALL display the total amount spent per category for each month.
3. WHEN the user navigates to the Monthly_Summary view, THE App SHALL display data for all months that contain at least one transaction.

---

### Requirement 8: Transaction Sorting

**User Story:** As a user, I want to sort my transactions by amount or category, so that I can find and analyze my spending more easily.

#### Acceptance Criteria

1. THE Transaction_List SHALL provide a sort control allowing the user to sort transactions by Amount in ascending or descending order.
2. THE Transaction_List SHALL provide a sort control allowing the user to sort transactions by Category in alphabetical order.
3. WHEN the user selects a sort option, THE Transaction_List SHALL reorder the displayed transactions accordingly without modifying the stored data.

---

### Requirement 9: Dark/Light Mode

**User Story:** As a user, I want to toggle between dark and light mode, so that I can use the app comfortably in different lighting conditions.

#### Acceptance Criteria

1. THE App SHALL provide a toggle control to switch between dark mode and light mode.
2. WHEN the user toggles the mode, THE App SHALL apply the selected theme to all UI components immediately.
3. THE App SHALL persist the user's theme preference to Local_Storage.
4. WHEN the App loads, THE App SHALL restore the previously saved theme preference.

---

### Requirement 10: Mobile-Friendly Layout

**User Story:** As a user, I want the app to work well on my phone, so that I can track spending on the go.

#### Acceptance Criteria

1. THE App SHALL use a responsive layout that adapts to screen widths from 320px to 1440px.
2. THE App SHALL render all interactive controls at a touch-friendly size of at least 44x44 CSS pixels.
3. THE App SHALL be usable as a standalone web page without requiring installation or a backend server.

---

### Requirement 11: Performance

**User Story:** As a user, I want the app to feel fast and responsive, so that adding or deleting transactions doesn't feel sluggish.

#### Acceptance Criteria

1. WHEN the user submits a transaction, THE App SHALL update the Transaction_List, Balance, and Chart within 100ms.
2. WHEN the App loads with up to 500 stored transactions, THE App SHALL complete the initial render within 2 seconds on a modern browser.

---

### Requirement 12: Browser Compatibility

**User Story:** As a developer, I want the app to work across modern browsers, so that users aren't locked into a specific browser.

#### Acceptance Criteria

1. THE App SHALL function correctly in the latest stable versions of Chrome, Firefox, Edge, and Safari.
2. THE App SHALL use only standard HTML, CSS, and Vanilla JavaScript with no build step or framework dependency.
3. THE App SHALL consist of a single deployable folder compatible with GitHub Pages static hosting.
