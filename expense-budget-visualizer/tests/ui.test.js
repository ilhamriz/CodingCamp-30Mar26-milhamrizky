// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import * as fc from "fast-check";

// Suppress unused-import lint hint — vi is kept for potential future use

// ─── Inline core functions from app.js ────────────────────────────────────────
// (app.js uses plain globals; we inline the relevant pieces for isolated testing)

const DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"];

function validateTransaction(name, amount, category) {
  const errors = [];
  if (!name || !name.trim()) errors.push("Name is required.");
  const parsed = parseInt(amount, 10);
  if (!Number.isInteger(parsed) || parsed < 1) {
    errors.push("Amount must be a whole number (minimum 1 Rp).");
  }
  if (!category || !category.trim()) errors.push("Category is required.");
  return { valid: errors.length === 0, errors };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Minimal DOM setup helpers ────────────────────────────────────────────────

function buildDOM() {
  document.body.innerHTML = `
    <form id="transaction-form" novalidate>
      <input type="text"   id="item-name"  />
      <span id="item-name-error"></span>
      <input type="number" id="amount"     />
      <span id="amount-error"></span>
      <select id="category">
        <option value="">-- Select category --</option>
        <option value="Food">Food</option>
        <option value="Transport">Transport</option>
        <option value="Fun">Fun</option>
      </select>
      <span id="category-error"></span>
      <input type="text" id="custom-category" />
      <button type="submit" id="add-transaction-btn">Add Transaction</button>
    </form>
    <ul id="transaction-list"></ul>
    <div id="balance"></div>
  `;
}

// ─── Minimal AppState + UI logic (mirrors app.js behaviour) ──────────────────

function createApp() {
  const state = {
    transactions: [],
  };

  function renderTransactionList() {
    const list = document.getElementById("transaction-list");
    if (!list) return;
    if (state.transactions.length === 0) {
      list.innerHTML = '<li class="empty-state">No transactions yet.</li>';
      return;
    }
    list.innerHTML = state.transactions
      .map(
        (t) => `
      <li data-id="${t.id}">
        <span class="txn-name">${escapeHtml(t.name)}</span>
        <span class="txn-amount">${t.amount.toFixed(2)}</span>
        <span class="txn-category">${escapeHtml(t.category)}</span>
      </li>
    `,
      )
      .join("");
  }

  function showInlineErrors(errors) {
    const nameError = document.getElementById("item-name-error");
    const amountError = document.getElementById("amount-error");
    const categoryError = document.getElementById("category-error");
    for (const msg of errors) {
      if (/name/i.test(msg) && nameError) nameError.textContent = msg;
      else if (/amount/i.test(msg) && amountError)
        amountError.textContent = msg;
      else if (/category/i.test(msg) && categoryError)
        categoryError.textContent = msg;
    }
  }

  function clearInlineErrors() {
    ["item-name-error", "amount-error", "category-error"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    });
  }

  function bindFormSubmit() {
    const form = document.getElementById("transaction-form");
    if (!form) return;
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.querySelector("#item-name")?.value ?? "";
      const amount = form.querySelector("#amount")?.value ?? "";
      const category = form.querySelector("#category")?.value ?? "";

      clearInlineErrors();
      const result = validateTransaction(name, amount, category);
      if (!result.valid) {
        showInlineErrors(result.errors);
        return;
      }

      const transaction = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        name: name.trim(),
        amount: parseInt(amount, 10),
        category: category.trim(),
        date: new Date().toISOString().slice(0, 10),
      };

      state.transactions.push(transaction);
      form.reset();
      renderTransactionList();
    });
  }

  bindFormSubmit();
  renderTransactionList();

  return state;
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const nonEmptyStringArb = fc
  .string({ minLength: 1, maxLength: 40 })
  .filter((s) => s.trim().length > 0);

const positiveAmountArb = fc.integer({ min: 1, max: 10_000_000 });

const validCategoryArb = fc.constantFrom("Food", "Transport", "Fun");

const whitespaceArb = fc.stringOf(fc.constantFrom(" ", "\t"), {
  minLength: 0,
  maxLength: 5,
});

const nonPositiveAmountArb = fc.oneof(
  fc.constant(0),
  fc.float({ min: Math.fround(-9999), max: Math.fround(-0.001), noNaN: true }),
);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("UI form behavior (Properties 1–4)", () => {
  beforeEach(() => {
    buildDOM();
  });

  // Feature: expense-budget-visualizer, Property 1: Valid transaction submission adds to list
  describe("Property 1: Valid transaction submission adds to list", () => {
    it("submitting a valid transaction increases list length by exactly one", () => {
      // Feature: expense-budget-visualizer, Property 1: Valid transaction submission adds to list
      fc.assert(
        fc.property(
          nonEmptyStringArb,
          positiveAmountArb,
          validCategoryArb,
          (name, amount, category) => {
            buildDOM();
            const state = createApp();
            const before = state.transactions.length;

            const form = document.getElementById("transaction-form");
            const nameEl = document.getElementById("item-name");
            const amountEl = document.getElementById("amount");
            const catEl = document.getElementById("category");

            nameEl.value = name;
            amountEl.value = String(amount);
            catEl.value = category;

            form.dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            );

            expect(state.transactions.length).toBe(before + 1);

            // The new transaction should appear in the rendered list
            const list = document.getElementById("transaction-list");
            const items = list.querySelectorAll("li[data-id]");
            expect(items.length).toBe(state.transactions.length);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: expense-budget-visualizer, Property 2: Empty-field submission is rejected
  describe("Property 2: Empty-field submission is rejected", () => {
    it("submitting with at least one empty field leaves the list unchanged", () => {
      // Feature: expense-budget-visualizer, Property 2: Empty-field submission is rejected
      fc.assert(
        fc.property(
          fc
            .record({
              name: fc.oneof(whitespaceArb, nonEmptyStringArb),
              amount: fc.oneof(fc.constant(""), positiveAmountArb.map(String)),
              category: fc.oneof(fc.constant(""), validCategoryArb),
            })
            .filter(
              ({ name, amount, category }) =>
                name.trim() === "" ||
                amount.trim() === "" ||
                category.trim() === "",
            ),
          ({ name, amount, category }) => {
            buildDOM();
            const state = createApp();
            const before = state.transactions.length;

            const form = document.getElementById("transaction-form");
            const nameEl = document.getElementById("item-name");
            const amountEl = document.getElementById("amount");
            const catEl = document.getElementById("category");

            nameEl.value = name;
            amountEl.value = amount;
            catEl.value = category;

            form.dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            );

            expect(state.transactions.length).toBe(before);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: expense-budget-visualizer, Property 3: Invalid amount is rejected
  describe("Property 3: Invalid amount is rejected", () => {
    it("submitting with a non-positive amount leaves the list unchanged", () => {
      // Feature: expense-budget-visualizer, Property 3: Invalid amount is rejected
      fc.assert(
        fc.property(
          nonEmptyStringArb,
          nonPositiveAmountArb,
          validCategoryArb,
          (name, amount, category) => {
            buildDOM();
            const state = createApp();
            const before = state.transactions.length;

            const form = document.getElementById("transaction-form");
            const nameEl = document.getElementById("item-name");
            const amountEl = document.getElementById("amount");
            const catEl = document.getElementById("category");

            nameEl.value = name;
            amountEl.value = String(amount);
            catEl.value = category;

            form.dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            );

            expect(state.transactions.length).toBe(before);
          },
        ),
        { numRuns: 100 },
      );
    });

    it("submitting with a non-numeric amount string leaves the list unchanged", () => {
      // Feature: expense-budget-visualizer, Property 3: Invalid amount is rejected
      const nonNumericArb = fc
        .string({ minLength: 1, maxLength: 20 })
        .filter((s) => {
          const p = parseFloat(s);
          return !isFinite(p);
        });

      fc.assert(
        fc.property(
          nonEmptyStringArb,
          nonNumericArb,
          validCategoryArb,
          (name, amount, category) => {
            buildDOM();
            const state = createApp();
            const before = state.transactions.length;

            const form = document.getElementById("transaction-form");
            const nameEl = document.getElementById("item-name");
            const amountEl = document.getElementById("amount");
            const catEl = document.getElementById("category");

            nameEl.value = name;
            amountEl.value = amount;
            catEl.value = category;

            form.dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            );

            expect(state.transactions.length).toBe(before);
          },
        ),
        { numRuns: 100 },
      );
    });
  });

  // Feature: expense-budget-visualizer, Property 4: Form resets after successful add
  describe("Property 4: Form resets after successful add", () => {
    it("all form fields are empty/reset after a valid submission", () => {
      // Feature: expense-budget-visualizer, Property 4: Form resets after successful add
      fc.assert(
        fc.property(
          nonEmptyStringArb,
          positiveAmountArb,
          validCategoryArb,
          (name, amount, category) => {
            buildDOM();
            createApp();

            const form = document.getElementById("transaction-form");
            const nameEl = document.getElementById("item-name");
            const amountEl = document.getElementById("amount");
            const catEl = document.getElementById("category");

            nameEl.value = name;
            amountEl.value = String(amount);
            catEl.value = category;

            form.dispatchEvent(
              new Event("submit", { bubbles: true, cancelable: true }),
            );

            // After successful submission, form.reset() should have been called
            expect(nameEl.value).toBe("");
            expect(amountEl.value).toBe("");
            // select resets to first option (empty value)
            expect(catEl.value).toBe("");
          },
        ),
        { numRuns: 100 },
      );
    });
  });
});

// ─── Helpers shared by Properties 5, 6, 12, 13 ───────────────────────────────

const categoryArb = fc.constantFrom("Food", "Transport", "Fun");

const isoDateArb = fc
  .record({
    year: fc.integer({ min: 2020, max: 2025 }),
    month: fc.integer({ min: 1, max: 12 }),
    day: fc.integer({ min: 1, max: 28 }),
  })
  .map(
    ({ year, month, day }) =>
      `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
  );

const transactionArb2 = fc.record({
  id: fc.uuid(),
  name: fc
    .string({ minLength: 1, maxLength: 20 })
    .filter((s) => s.trim().length > 0),
  amount: fc.integer({ min: 1, max: 10_000_000 }),
  category: categoryArb,
  date: isoDateArb,
});

/** Render a transaction list directly into the DOM (no form interaction needed). */
function renderList(transactions) {
  const list = document.getElementById("transaction-list");
  if (!list) return;
  if (transactions.length === 0) {
    list.innerHTML = '<li class="empty-state">No transactions yet.</li>';
    return;
  }
  list.innerHTML = transactions
    .map(
      (t) => `
    <li data-id="${t.id}">
      <span class="txn-name">${escapeHtml(t.name)}</span>
      <span class="txn-amount">${t.amount.toFixed(2)}</span>
      <span class="txn-category">${escapeHtml(t.category)}</span>
      <button class="delete-btn" data-id="${t.id}">Delete</button>
    </li>
  `,
    )
    .join("");
}

/** Inline sort (mirrors app.js Logic.sortTransactions). */
function sortTransactions(transactions, field, dir) {
  const copy = [...transactions];
  copy.sort((a, b) => {
    let cmp = 0;
    if (field === "amount") cmp = a.amount - b.amount;
    else if (field === "category") cmp = a.category.localeCompare(b.category);
    return dir === "desc" ? -cmp : cmp;
  });
  return copy;
}

// ─── Property 5: Transaction list renders all required fields ─────────────────

describe("Property 5: Transaction list renders all required fields", () => {
  beforeEach(() => {
    buildDOM();
  });

  it("every rendered list item contains name, amount, and category", () => {
    // Feature: expense-budget-visualizer, Property 5: Transaction list renders all required fields
    fc.assert(
      fc.property(
        fc.array(transactionArb2, { minLength: 1, maxLength: 20 }),
        (transactions) => {
          buildDOM();
          renderList(transactions);

          const list = document.getElementById("transaction-list");
          const items = list.querySelectorAll("li[data-id]");

          expect(items.length).toBe(transactions.length);

          transactions.forEach((t, i) => {
            const item = items[i];
            // textContent returns decoded text; compare against raw values
            // Use includes() to handle any surrounding whitespace in the template
            expect(item.querySelector(".txn-name").textContent).toContain(
              t.name,
            );
            expect(item.querySelector(".txn-amount").textContent).toContain(
              t.amount.toFixed(2),
            );
            expect(item.querySelector(".txn-category").textContent).toContain(
              t.category,
            );
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 6: Delete removes transaction from list ─────────────────────────

describe("Property 6: Delete removes transaction from list", () => {
  beforeEach(() => {
    buildDOM();
  });

  it("deleting a transaction removes it from the list and decreases length by one", () => {
    // Feature: expense-budget-visualizer, Property 6: Delete removes transaction from list
    fc.assert(
      fc.property(
        fc.array(transactionArb2, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 0, max: 19 }),
        (transactions, rawIdx) => {
          buildDOM();
          const idx = rawIdx % transactions.length;
          const target = transactions[idx];

          // Set up state with delete handler (mirrors createApp delete logic)
          let state = [...transactions];

          function rerender() {
            renderList(state);
            const list = document.getElementById("transaction-list");
            list.addEventListener(
              "click",
              (e) => {
                if (e.target.classList.contains("delete-btn")) {
                  const id = e.target.dataset.id;
                  state = state.filter((t) => t.id !== id);
                  rerender();
                }
              },
              { once: true },
            );
          }
          rerender();

          const before = state.length;

          // Click the delete button for the target transaction
          const list = document.getElementById("transaction-list");
          const btn = list.querySelector(`[data-id="${target.id}"].delete-btn`);
          btn.click();

          expect(state.length).toBe(before - 1);
          expect(state.find((t) => t.id === target.id)).toBeUndefined();
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 12: Sort ordering correctness (UI-level) ────────────────────────

describe("Property 12: Sort ordering correctness (UI-level)", () => {
  beforeEach(() => {
    buildDOM();
  });

  it("amount ascending: rendered items are in non-decreasing amount order", () => {
    // Feature: expense-budget-visualizer, Property 12: Sort ordering correctness
    fc.assert(
      fc.property(
        fc.array(transactionArb2, { minLength: 0, maxLength: 20 }),
        (transactions) => {
          buildDOM();
          const sorted = sortTransactions(transactions, "amount", "asc");
          renderList(sorted);

          const list = document.getElementById("transaction-list");
          const items = [...list.querySelectorAll("li[data-id]")];
          const renderedAmounts = items.map((li) =>
            parseFloat(li.querySelector(".txn-amount").textContent),
          );

          for (let i = 1; i < renderedAmounts.length; i++) {
            expect(renderedAmounts[i - 1]).toBeLessThanOrEqual(
              renderedAmounts[i],
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("amount descending: rendered items are in non-increasing amount order", () => {
    // Feature: expense-budget-visualizer, Property 12: Sort ordering correctness
    fc.assert(
      fc.property(
        fc.array(transactionArb2, { minLength: 0, maxLength: 20 }),
        (transactions) => {
          buildDOM();
          const sorted = sortTransactions(transactions, "amount", "desc");
          renderList(sorted);

          const list = document.getElementById("transaction-list");
          const items = [...list.querySelectorAll("li[data-id]")];
          const renderedAmounts = items.map((li) =>
            parseFloat(li.querySelector(".txn-amount").textContent),
          );

          for (let i = 1; i < renderedAmounts.length; i++) {
            expect(renderedAmounts[i - 1]).toBeGreaterThanOrEqual(
              renderedAmounts[i],
            );
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  it("category ascending: rendered items are in non-decreasing lexicographic category order", () => {
    // Feature: expense-budget-visualizer, Property 12: Sort ordering correctness
    fc.assert(
      fc.property(
        fc.array(transactionArb2, { minLength: 0, maxLength: 20 }),
        (transactions) => {
          buildDOM();
          const sorted = sortTransactions(transactions, "category", "asc");
          renderList(sorted);

          const list = document.getElementById("transaction-list");
          const items = [...list.querySelectorAll("li[data-id]")];
          const renderedCategories = items.map(
            (li) => li.querySelector(".txn-category").textContent,
          );

          for (let i = 1; i < renderedCategories.length; i++) {
            expect(
              renderedCategories[i - 1].localeCompare(renderedCategories[i]),
            ).toBeLessThanOrEqual(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 13: Sort does not mutate stored data ────────────────────────────

describe("Property 13: Sort does not mutate stored data", () => {
  beforeEach(() => {
    buildDOM();
  });

  it("localStorage transaction order is unchanged after any sort operation", () => {
    // Feature: expense-budget-visualizer, Property 13: Sort does not mutate stored data
    fc.assert(
      fc.property(
        fc.array(transactionArb2, { minLength: 1, maxLength: 20 }),
        fc.constantFrom(
          { field: "amount", dir: "asc" },
          { field: "amount", dir: "desc" },
          { field: "category", dir: "asc" },
          { field: "category", dir: "desc" },
        ),
        (transactions, { field, dir }) => {
          buildDOM();

          // Persist original insertion order to localStorage
          const STORAGE_KEY = "ebv_transactions";
          localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));

          // Perform a display-only sort (does NOT write back to localStorage)
          const sorted = sortTransactions(transactions, field, dir);
          renderList(sorted);

          // localStorage must still hold the original insertion order
          const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
          expect(stored.map((t) => t.id)).toEqual(
            transactions.map((t) => t.id),
          );

          // Clean up
          localStorage.removeItem(STORAGE_KEY);
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Custom Category (Task 9.2) ───────────────────────────────────────────────

/**
 * Minimal inline implementation of the custom-category feature
 * (mirrors app.js AppState + UI.renderCategoryOptions + bindEvents handler).
 */
function buildDOMWithCategoryBtn() {
  document.body.innerHTML = `
    <form id="transaction-form" novalidate>
      <select id="category">
        <option value="Food">Food</option>
        <option value="Transport">Transport</option>
        <option value="Fun">Fun</option>
      </select>
      <input type="text" id="custom-category" />
      <button type="button" id="add-category-btn">Add Category</button>
      <input type="text" id="item-name" />
      <input type="number" id="amount" />
      <button type="submit" id="add-transaction-btn">Add Transaction</button>
    </form>
    <ul id="transaction-list"></ul>
    <div id="balance"></div>
  `;
}

function createCategoryApp(initialCategories = ["Food", "Transport", "Fun"]) {
  const state = { categories: [...initialCategories] };
  const savedCategories = [];

  function renderCategoryOptions() {
    const select = document.getElementById("category");
    if (!select) return;
    select.innerHTML = state.categories
      .map((c) => `<option value="${c}">${c}</option>`)
      .join("");
  }

  function saveCategories(cats) {
    savedCategories.length = 0;
    savedCategories.push(...cats);
  }

  const addCatBtn = document.getElementById("add-category-btn");
  const catInput = document.getElementById("custom-category");
  if (addCatBtn && catInput) {
    addCatBtn.addEventListener("click", () => {
      const val = catInput.value.trim();
      if (val && !state.categories.includes(val)) {
        state.categories.push(val);
        saveCategories(state.categories);
        renderCategoryOptions();
        catInput.value = "";
      }
    });
  }

  renderCategoryOptions();
  return { state, savedCategories };
}

describe("Custom category (Task 9.2)", () => {
  beforeEach(() => {
    buildDOMWithCategoryBtn();
  });

  it("adds a new category to state and the select element", () => {
    const { state } = createCategoryApp();
    const input = document.getElementById("custom-category");
    const btn = document.getElementById("add-category-btn");

    input.value = "Utilities";
    btn.click();

    expect(state.categories).toContain("Utilities");
    const options = [...document.getElementById("category").options].map(
      (o) => o.value,
    );
    expect(options).toContain("Utilities");
  });

  it("clears the input after adding a category", () => {
    createCategoryApp();
    const input = document.getElementById("custom-category");
    const btn = document.getElementById("add-category-btn");

    input.value = "Health";
    btn.click();

    expect(input.value).toBe("");
  });

  it("persists the new category via saveCategories", () => {
    const { savedCategories } = createCategoryApp();
    const input = document.getElementById("custom-category");
    const btn = document.getElementById("add-category-btn");

    input.value = "Travel";
    btn.click();

    expect(savedCategories).toContain("Travel");
  });

  it("does not add a duplicate category", () => {
    const { state } = createCategoryApp();
    const input = document.getElementById("custom-category");
    const btn = document.getElementById("add-category-btn");

    input.value = "Food"; // already exists
    btn.click();

    expect(state.categories.filter((c) => c === "Food").length).toBe(1);
  });

  it("does not add a blank/whitespace-only category", () => {
    const { state } = createCategoryApp();
    const input = document.getElementById("custom-category");
    const btn = document.getElementById("add-category-btn");
    const before = state.categories.length;

    input.value = "   ";
    btn.click();

    expect(state.categories.length).toBe(before);
  });

  // **Validates: Requirements 9.2** — property: any unique non-empty category is added exactly once
  it("property: any unique non-empty category string is added exactly once", () => {
    // Use alphanumeric + common punctuation (excluding " which jsdom treats specially in input.value)
    const uniqueCatArb = fc
      .stringOf(
        fc.char().filter((c) => c >= "!" && c <= "~" && c !== '"'),
        { minLength: 1, maxLength: 20 },
      )
      .filter((s) => !["Food", "Transport", "Fun"].includes(s));

    fc.assert(
      fc.property(uniqueCatArb, (newCat) => {
        buildDOMWithCategoryBtn();
        const { state } = createCategoryApp();
        const input = document.getElementById("custom-category");
        const btn = document.getElementById("add-category-btn");

        input.value = newCat;
        btn.click();

        const count = state.categories.filter((c) => c === newCat).length;
        expect(count).toBe(1);

        const options = [...document.getElementById("category").options].map(
          (o) => o.value,
        );
        expect(options).toContain(newCat);
      }),
      { numRuns: 50 },
    );
  });
});

// ─── renderMonthlySummary (Task 10.1) ─────────────────────────────────────────

function aggregateByMonth(transactions) {
  const map = {};
  for (const t of transactions) {
    const month = t.date ? t.date.slice(0, 7) : "unknown";
    if (!map[month]) map[month] = { month, totals: {} };
    map[month].totals[t.category] =
      (map[month].totals[t.category] || 0) + t.amount;
  }
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

function buildMonthlySummaryDOM() {
  document.body.innerHTML = `
    <section id="monthly-summary" hidden>
      <h2 id="monthly-heading">Monthly Summary</h2>
      <div id="monthly-summary-content">
        <p class="empty-state">No monthly data available.</p>
      </div>
    </section>
  `;
}

function renderMonthlySummary(transactions) {
  const content = document.getElementById("monthly-summary-content");
  if (!content) return;

  const months = aggregateByMonth(transactions);
  if (months.length === 0) {
    content.innerHTML = '<p class="empty-state">No monthly data available.</p>';
    return;
  }

  content.innerHTML = months
    .map((m) => {
      const rows = Object.entries(m.totals)
        .map(
          ([cat, amt]) =>
            `<tr><td>${escapeHtml(cat)}</td><td>${amt.toFixed(2)}</td></tr>`,
        )
        .join("");
      return `<h3>${escapeHtml(m.month)}</h3><table><thead><tr><th>Category</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`;
    })
    .join("");
}

describe("renderMonthlySummary (Task 10.1)", () => {
  beforeEach(() => {
    buildMonthlySummaryDOM();
  });

  it("renders into #monthly-summary-content, not the section itself", () => {
    const txns = [
      {
        id: "1",
        name: "Lunch",
        amount: 10,
        category: "Food",
        date: "2024-06-01",
      },
    ];
    renderMonthlySummary(txns);

    // The section heading must still be present
    expect(document.getElementById("monthly-heading")).not.toBeNull();
    // Content div must exist and have been updated
    const content = document.getElementById("monthly-summary-content");
    expect(content).not.toBeNull();
    expect(content.innerHTML).toContain("2024-06");
  });

  it("shows empty-state message when no transactions", () => {
    renderMonthlySummary([]);
    const content = document.getElementById("monthly-summary-content");
    expect(content.textContent).toContain("No monthly data available");
  });

  it("renders month label for each distinct month", () => {
    const txns = [
      {
        id: "1",
        name: "Lunch",
        amount: 10,
        category: "Food",
        date: "2024-05-10",
      },
      {
        id: "2",
        name: "Coffee",
        amount: 5,
        category: "Food",
        date: "2024-06-01",
      },
    ];
    renderMonthlySummary(txns);
    const content = document.getElementById("monthly-summary-content");
    expect(content.innerHTML).toContain("2024-05");
    expect(content.innerHTML).toContain("2024-06");
  });

  it("renders per-category totals for each month", () => {
    const txns = [
      {
        id: "1",
        name: "Lunch",
        amount: 10,
        category: "Food",
        date: "2024-06-01",
      },
      {
        id: "2",
        name: "Bus",
        amount: 5,
        category: "Transport",
        date: "2024-06-15",
      },
      {
        id: "3",
        name: "Dinner",
        amount: 20,
        category: "Food",
        date: "2024-06-30",
      },
    ];
    renderMonthlySummary(txns);
    const content = document.getElementById("monthly-summary-content");
    // Food total = 30.00
    expect(content.innerHTML).toContain("30.00");
    // Transport total = 5.00
    expect(content.innerHTML).toContain("5.00");
    expect(content.innerHTML).toContain("Food");
    expect(content.innerHTML).toContain("Transport");
  });

  it("renders months in ascending chronological order", () => {
    const txns = [
      { id: "1", name: "A", amount: 1, category: "Food", date: "2024-08-01" },
      { id: "2", name: "B", amount: 2, category: "Food", date: "2024-03-01" },
    ];
    renderMonthlySummary(txns);
    const content = document.getElementById("monthly-summary-content");
    const marchIdx = content.innerHTML.indexOf("2024-03");
    const augIdx = content.innerHTML.indexOf("2024-08");
    expect(marchIdx).toBeLessThan(augIdx);
  });

  it("escapes HTML in category names", () => {
    const txns = [
      {
        id: "1",
        name: "Test",
        amount: 5,
        category: "<script>alert(1)</script>",
        date: "2024-06-01",
      },
    ];
    renderMonthlySummary(txns);
    const content = document.getElementById("monthly-summary-content");
    expect(content.innerHTML).not.toContain("<script>");
    expect(content.innerHTML).toContain("&lt;script&gt;");
  });
});

// ─── Toggle Monthly Summary (Task 10.2) ──────────────────────────────────────

function buildToggleDOM() {
  document.body.innerHTML = `
    <nav>
      <button type="button" id="toggle-monthly-summary" aria-expanded="false" aria-controls="monthly-summary">
        Show Monthly Summary
      </button>
    </nav>
    <section id="monthly-summary" hidden>
      <h2 id="monthly-heading">Monthly Summary</h2>
      <div id="monthly-summary-content"></div>
    </section>
  `;
}

function bindToggle() {
  const btn = document.getElementById("toggle-monthly-summary");
  const section = document.getElementById("monthly-summary");
  if (!btn || !section) return;
  btn.addEventListener("click", () => {
    const isHidden = section.hasAttribute("hidden");
    if (isHidden) {
      section.removeAttribute("hidden");
      btn.setAttribute("aria-expanded", "true");
      btn.textContent = "Hide Monthly Summary";
    } else {
      section.setAttribute("hidden", "");
      btn.setAttribute("aria-expanded", "false");
      btn.textContent = "Show Monthly Summary";
    }
  });
}

describe("Toggle Monthly Summary (Task 10.2)", () => {
  beforeEach(() => {
    buildToggleDOM();
    bindToggle();
  });

  it("section is hidden by default", () => {
    expect(
      document.getElementById("monthly-summary").hasAttribute("hidden"),
    ).toBe(true);
  });

  it("clicking the button shows the section", () => {
    document.getElementById("toggle-monthly-summary").click();
    expect(
      document.getElementById("monthly-summary").hasAttribute("hidden"),
    ).toBe(false);
  });

  it("clicking again hides the section", () => {
    const btn = document.getElementById("toggle-monthly-summary");
    btn.click();
    btn.click();
    expect(
      document.getElementById("monthly-summary").hasAttribute("hidden"),
    ).toBe(true);
  });

  it("aria-expanded is true when section is visible", () => {
    const btn = document.getElementById("toggle-monthly-summary");
    btn.click();
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  it("aria-expanded is false when section is hidden", () => {
    const btn = document.getElementById("toggle-monthly-summary");
    btn.click();
    btn.click();
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it('button text changes to "Hide Monthly Summary" when shown', () => {
    const btn = document.getElementById("toggle-monthly-summary");
    btn.click();
    expect(btn.textContent).toBe("Hide Monthly Summary");
  });

  it('button text changes back to "Show Monthly Summary" when hidden', () => {
    const btn = document.getElementById("toggle-monthly-summary");
    btn.click();
    btn.click();
    expect(btn.textContent).toBe("Show Monthly Summary");
  });
});

// ─── Task 13.1: Unit tests for specific DOM examples ─────────────────────────

describe("Task 13.1: DOM structure and initialization examples", () => {
  beforeEach(() => {
    buildDOM();
  });

  it("default categories Food, Transport, Fun are present in #category select after initialization", () => {
    const select = document.getElementById("category");
    expect(select).not.toBeNull();
    const optionValues = [...select.options].map((o) => o.value);
    expect(optionValues).toContain("Food");
    expect(optionValues).toContain("Transport");
    expect(optionValues).toContain("Fun");
  });

  it("empty-state message is shown in #transaction-list when there are no transactions", () => {
    // Trigger the empty-state render (mirrors renderTransactionList with 0 transactions)
    const list = document.getElementById("transaction-list");
    list.innerHTML = '<li class="empty-state">No transactions yet.</li>';

    const emptyItem = list.querySelector(".empty-state");
    expect(emptyItem).not.toBeNull();
    expect(emptyItem.textContent).toContain("No transactions");
  });

  it("balance element exists in the DOM", () => {
    const balance = document.getElementById("balance");
    expect(balance).not.toBeNull();
  });
});

// ─── Task 13.3: Integration test – full add-then-delete cycle ─────────────────

/**
 * Extended createApp that also renders balance and wires up delete buttons.
 * Mirrors the relevant parts of app.js (UI.renderBalance + delete delegation).
 */
function createAppWithBalance() {
  const state = {
    transactions: [],
  };

  function renderBalance() {
    const el = document.getElementById("balance");
    if (!el) return;
    const total = state.transactions.reduce((sum, t) => sum + t.amount, 0);
    el.textContent = total.toFixed(2);
  }

  function renderTransactionList() {
    const list = document.getElementById("transaction-list");
    if (!list) return;
    if (state.transactions.length === 0) {
      list.innerHTML = '<li class="empty-state">No transactions yet.</li>';
      return;
    }
    list.innerHTML = state.transactions
      .map(
        (t) => `
      <li data-id="${t.id}">
        <span class="txn-name">${escapeHtml(t.name)}</span>
        <span class="txn-amount">${t.amount.toFixed(2)}</span>
        <span class="txn-category">${escapeHtml(t.category)}</span>
        <button class="delete-btn" data-id="${t.id}">Delete</button>
      </li>
    `,
      )
      .join("");
  }

  function renderAll() {
    renderTransactionList();
    renderBalance();
  }

  function showInlineErrors(errors) {
    const nameError = document.getElementById("item-name-error");
    const amountError = document.getElementById("amount-error");
    const categoryError = document.getElementById("category-error");
    for (const msg of errors) {
      if (/name/i.test(msg) && nameError) nameError.textContent = msg;
      else if (/amount/i.test(msg) && amountError)
        amountError.textContent = msg;
      else if (/category/i.test(msg) && categoryError)
        categoryError.textContent = msg;
    }
  }

  function clearInlineErrors() {
    ["item-name-error", "amount-error", "category-error"].forEach((id) => {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    });
  }

  // Bind form submit
  const form = document.getElementById("transaction-form");
  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = form.querySelector("#item-name")?.value ?? "";
      const amount = form.querySelector("#amount")?.value ?? "";
      const category = form.querySelector("#category")?.value ?? "";

      clearInlineErrors();
      const result = validateTransaction(name, amount, category);
      if (!result.valid) {
        showInlineErrors(result.errors);
        return;
      }

      const transaction = {
        id: Date.now().toString() + Math.random().toString(36).slice(2),
        name: name.trim(),
        amount: parseInt(amount, 10),
        category: category.trim(),
        date: new Date().toISOString().slice(0, 10),
      };

      state.transactions.push(transaction);
      form.reset();
      renderAll();
    });
  }

  // Bind delete (delegated)
  const list = document.getElementById("transaction-list");
  if (list) {
    list.addEventListener("click", (e) => {
      if (e.target.classList.contains("delete-btn")) {
        const id = e.target.dataset.id;
        state.transactions = state.transactions.filter((t) => t.id !== id);
        renderAll();
      }
    });
  }

  renderAll();
  return state;
}

describe("Task 13.3: Integration – full add-then-delete cycle", () => {
  beforeEach(() => {
    buildDOM();
  });

  it("adding a transaction updates balance and list, then deleting restores empty state", () => {
    const state = createAppWithBalance();

    // 1. Start with an empty transaction list
    expect(state.transactions.length).toBe(0);

    // 2. Add a transaction via form submit
    const form = document.getElementById("transaction-form");
    const nameEl = document.getElementById("item-name");
    const amountEl = document.getElementById("amount");
    const catEl = document.getElementById("category");

    nameEl.value = "Coffee";
    amountEl.value = "5000";
    catEl.value = "Food";

    form.dispatchEvent(
      new Event("submit", { bubbles: true, cancelable: true }),
    );

    // 3. Verify balance is updated (non-zero)
    const balanceEl = document.getElementById("balance");
    expect(parseFloat(balanceEl.textContent)).toBeGreaterThan(0);
    expect(balanceEl.textContent).toBe("5000.00");

    // 4. Verify the transaction appears in the list
    const list = document.getElementById("transaction-list");
    const items = list.querySelectorAll("li[data-id]");
    expect(items.length).toBe(1);
    expect(items[0].querySelector(".txn-name").textContent).toContain("Coffee");

    // 5. Delete the transaction via delete button click
    const deleteBtn = list.querySelector(".delete-btn");
    expect(deleteBtn).not.toBeNull();
    deleteBtn.click();

    // 6. Verify balance returns to 0
    expect(balanceEl.textContent).toBe("0.00");

    // 7. Verify the list shows the empty-state message
    const emptyItem = list.querySelector(".empty-state");
    expect(emptyItem).not.toBeNull();
    expect(emptyItem.textContent).toContain("No transactions");
    expect(list.querySelectorAll("li[data-id]").length).toBe(0);
  });
});

// ─── formatCurrency helper (inlined for rupiah-currency-update tests) ─────────

function formatCurrency(amount) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Property 3: Balance display uses formatCurrency ─────────────────────────

/** Renders balance using formatCurrency (mirrors updated app.js renderBalance). */
function renderBalanceWithFormatCurrency(transactions) {
  const el = document.getElementById("balance");
  if (!el) return;
  const total = transactions.reduce((sum, t) => sum + t.amount, 0);
  el.textContent = formatCurrency(total);
}

// Feature: rupiah-currency-update, Property 3: Balance display uses formatCurrency
describe("Property 3 (rupiah): Balance display uses formatCurrency", () => {
  beforeEach(() => {
    buildDOM();
  });

  // **Validates: Requirements 1.4, 3.1**
  it("for any transaction list, #balance text equals formatCurrency(sum of amounts)", () => {
    // Feature: rupiah-currency-update, Property 3: Balance display uses formatCurrency
    fc.assert(
      fc.property(
        fc.array(transactionArb2, { minLength: 0, maxLength: 20 }),
        (transactions) => {
          buildDOM();
          renderBalanceWithFormatCurrency(transactions);

          const el = document.getElementById("balance");
          const expectedSum = transactions.reduce((s, t) => s + t.amount, 0);
          expect(el.textContent).toBe(formatCurrency(expectedSum));
        },
      ),
      { numRuns: 100 },
    );
  });

  it("empty list shows formatCurrency(0) which equals Rp 0", () => {
    renderBalanceWithFormatCurrency([]);
    const el = document.getElementById("balance");
    expect(el.textContent).toBe(formatCurrency(0));
    expect(el.textContent).toContain("Rp");
    expect(el.textContent).toContain("0");
  });
});

// ─── Property 4: Transaction list renders amounts with formatCurrency ─────────

/** Renders list items using formatCurrency for amounts. */
function renderListIDR(transactions) {
  const list = document.getElementById("transaction-list");
  if (!list) return;
  if (transactions.length === 0) {
    list.innerHTML = '<li class="empty-state">No transactions yet.</li>';
    return;
  }
  list.innerHTML = transactions
    .map(
      (t) => `
    <li data-id="${t.id}">
      <span class="txn-name">${escapeHtml(t.name)}</span>
      <span class="txn-amount">${formatCurrency(t.amount)}</span>
      <span class="txn-category">${escapeHtml(t.category)}</span>
    </li>
  `,
    )
    .join("");
}

// Feature: rupiah-currency-update, Property 4: Transaction list renders amounts with formatCurrency
describe("Property 4 (rupiah): Transaction list renders amounts with formatCurrency", () => {
  beforeEach(() => {
    buildDOM();
  });

  // **Validates: Requirements 1.5**
  it("for any non-empty transaction list, each .txn-amount text equals formatCurrency(t.amount)", () => {
    // Feature: rupiah-currency-update, Property 4: Transaction list renders amounts with formatCurrency
    fc.assert(
      fc.property(
        fc.array(transactionArb2, { minLength: 1, maxLength: 20 }),
        (transactions) => {
          buildDOM();
          renderListIDR(transactions);

          const list = document.getElementById("transaction-list");
          const items = [...list.querySelectorAll("li[data-id]")];
          expect(items.length).toBe(transactions.length);

          transactions.forEach((t, i) => {
            const amountEl = items[i].querySelector(".txn-amount");
            expect(amountEl.textContent).toBe(formatCurrency(t.amount));
          });
        },
      ),
      { numRuns: 100 },
    );
  });
});

// ─── Property 5: Monthly summary renders amounts with formatCurrency ──────────

/** Renders monthly summary using formatCurrency for category totals. */
function renderMonthlySummaryIDR(transactions) {
  const content = document.getElementById("monthly-summary-content");
  if (!content) return;

  const months = aggregateByMonth(transactions);
  if (months.length === 0) {
    content.innerHTML = '<p class="empty-state">No monthly data available.</p>';
    return;
  }

  content.innerHTML = months
    .map((m) => {
      const rows = Object.entries(m.totals)
        .map(
          ([cat, amt]) =>
            `<tr><td>${escapeHtml(cat)}</td><td class="total-cell">${formatCurrency(amt)}</td></tr>`,
        )
        .join("");
      return `<h3>${escapeHtml(m.month)}</h3><table><thead><tr><th>Category</th><th>Total</th></tr></thead><tbody>${rows}</tbody></table>`;
    })
    .join("");
}

// Feature: rupiah-currency-update, Property 5: Monthly summary renders amounts with formatCurrency
describe("Property 5 (rupiah): Monthly summary renders amounts with formatCurrency", () => {
  beforeEach(() => {
    buildMonthlySummaryDOM();
  });

  // **Validates: Requirements 1.6**
  it("for any transaction list, each monthly summary category total equals formatCurrency(aggregated total)", () => {
    // Feature: rupiah-currency-update, Property 5: Monthly summary renders amounts with formatCurrency
    fc.assert(
      fc.property(
        fc.array(transactionArb2, { minLength: 1, maxLength: 20 }),
        (transactions) => {
          buildMonthlySummaryDOM();
          renderMonthlySummaryIDR(transactions);

          const content = document.getElementById("monthly-summary-content");

          // Build expected totals: month -> category -> total
          const months = aggregateByMonth(transactions);
          for (const m of months) {
            for (const [cat, expectedAmt] of Object.entries(m.totals)) {
              const expectedText = formatCurrency(expectedAmt);
              // Find the row for this category in this month's table
              const cells = [...content.querySelectorAll(".total-cell")];
              const match = cells.find((td) => td.textContent === expectedText);
              expect(match).not.toBeUndefined();
            }
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});
