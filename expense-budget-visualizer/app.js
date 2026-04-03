"use strict";

// ─── localStorage Keys ───────────────────────────────────────────────────────
const KEYS = {
  TRANSACTIONS: "ebv_transactions",
  CATEGORIES: "ebv_categories",
  THEME: "ebv_theme",
};

const DEFAULT_CATEGORIES = ["Food", "Transport", "Fun"];

// ─── AppState ─────────────────────────────────────────────────────────────────
const AppState = {
  transactions: [],
  categories: [],
  theme: "light",
  sortField: null,
  sortDir: "asc",
};

// ─── Storage ──────────────────────────────────────────────────────────────────
const Storage = {
  loadTransactions() {
    let raw;
    try {
      raw = localStorage.getItem(KEYS.TRANSACTIONS);
    } catch (e) {
      if (e.name === "SecurityError") {
        UI.showStorageBanner(
          "localStorage is unavailable. Data will not be saved this session.",
        );
      }
      return [];
    }

    if (raw === null) return [];

    try {
      return JSON.parse(raw);
    } catch (e) {
      console.warn("Corrupt transaction data in localStorage; resetting.", e);
      try {
        localStorage.removeItem(KEYS.TRANSACTIONS);
      } catch (_) {
        /* ignore */
      }
      return [];
    }
  },

  saveTransactions(transactions) {
    try {
      localStorage.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    } catch (e) {
      if (e.name === "QuotaExceededError") {
        UI.showToast("Storage quota exceeded. Transaction not saved.");
      } else if (e.name === "SecurityError") {
        UI.showStorageBanner(
          "localStorage is unavailable. Data will not be saved this session.",
        );
      }
    }
  },

  loadCategories() {
    let raw;
    try {
      raw = localStorage.getItem(KEYS.CATEGORIES);
    } catch (e) {
      if (e.name === "SecurityError") {
        return [...DEFAULT_CATEGORIES];
      }
      return [...DEFAULT_CATEGORIES];
    }

    if (raw === null) return [...DEFAULT_CATEGORIES];

    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.warn("Corrupt category data in localStorage; resetting.", e);
      try {
        localStorage.removeItem(KEYS.CATEGORIES);
      } catch (_) {
        /* ignore */
      }
      return [...DEFAULT_CATEGORIES];
    }

    // Merge: ensure all default categories are always present
    const merged = [...DEFAULT_CATEGORIES];
    for (const cat of parsed) {
      if (!merged.includes(cat)) merged.push(cat);
    }
    return merged;
  },

  saveCategories(categories) {
    try {
      localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
    } catch (e) {
      if (e.name === "QuotaExceededError") {
        UI.showToast("Storage quota exceeded. Categories not saved.");
      } else if (e.name === "SecurityError") {
        // continue silently — in-memory only
      }
    }
  },

  loadTheme() {
    try {
      const val = localStorage.getItem(KEYS.THEME);
      return val === "dark" || val === "light" ? val : "light";
    } catch (e) {
      return "light";
    }
  },

  saveTheme(theme) {
    try {
      localStorage.setItem(KEYS.THEME, theme);
    } catch (e) {
      // silently ignore
    }
  },
};

// ─── Validation ───────────────────────────────────────────────────────────────
const Validation = {
  validateTransaction(name, amount, category) {
    const errors = [];

    if (!name || !name.trim()) {
      errors.push("Name is required.");
    }

    const parsed = parseFloat(amount);
    if (
      amount === "" ||
      amount === null ||
      amount === undefined ||
      !isFinite(parsed) ||
      parsed <= 0
    ) {
      errors.push("Amount must be a positive number.");
    }

    if (!category || !category.trim()) {
      errors.push("Category is required.");
    }

    return { valid: errors.length === 0, errors };
  },
};

// ─── Logic ────────────────────────────────────────────────────────────────────
const Logic = {
  calculateBalance(transactions) {
    return transactions.reduce((sum, t) => sum + t.amount, 0);
  },

  aggregateByCategory(transactions) {
    return transactions.reduce((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + t.amount;
      return acc;
    }, {});
  },

  aggregateByMonth(transactions) {
    const map = {};
    for (const t of transactions) {
      const month = t.date ? t.date.slice(0, 7) : "unknown";
      if (!map[month]) map[month] = { month, totals: {} };
      map[month].totals[t.category] =
        (map[month].totals[t.category] || 0) + t.amount;
    }
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
  },

  sortTransactions(transactions, field, dir) {
    const copy = [...transactions];
    copy.sort((a, b) => {
      let cmp = 0;
      if (field === "amount") {
        cmp = a.amount - b.amount;
      } else if (field === "category") {
        cmp = a.category.localeCompare(b.category);
      }
      return dir === "desc" ? -cmp : cmp;
    });
    return copy;
  },
};

// ─── UI ───────────────────────────────────────────────────────────────────────
const UI = {
  chartInstance: null,

  renderAll() {
    UI.renderTransactionList();
    UI.renderBalance();
    UI.renderChart();
    UI.renderMonthlySummary();
  },

  renderTransactionList() {
    const list = document.getElementById("transaction-list");
    if (!list) return;

    let txns = AppState.transactions;
    if (AppState.sortField) {
      txns = Logic.sortTransactions(txns, AppState.sortField, AppState.sortDir);
    }

    if (txns.length === 0) {
      list.innerHTML = '<li class="empty-state">No transactions yet.</li>';
      return;
    }

    list.innerHTML = txns
      .map(
        (t) => `
      <li data-id="${t.id}">
        <span class="txn-name">${escapeHtml(t.name)}</span>
        <span class="txn-amount">$${t.amount.toFixed(2)}</span>
        <span class="txn-category">${escapeHtml(t.category)}</span>
        <span class="txn-date">${t.date}</span>
        <button class="delete-btn" data-id="${t.id}" aria-label="Delete transaction">Delete</button>
      </li>
    `,
      )
      .join("");
  },

  renderBalance() {
    const el = document.getElementById("balance");
    if (!el) return;
    const total = Logic.calculateBalance(AppState.transactions);
    el.textContent = `$${total.toFixed(2)}`;
  },

  renderChart() {
    const canvas = document.getElementById("spending-chart");
    const emptyMsg = document.getElementById("chart-empty");
    if (!canvas) return;

    const hasTransactions = AppState.transactions.length > 0;

    // Show/hide canvas and empty-state placeholder
    canvas.style.display = hasTransactions ? "" : "none";
    if (emptyMsg) emptyMsg.hidden = hasTransactions;

    if (!hasTransactions) return;

    const data = Logic.aggregateByCategory(AppState.transactions);
    const labels = Object.keys(data);
    const values = Object.values(data);

    try {
      if (UI.chartInstance) {
        UI.chartInstance.data.labels = labels;
        UI.chartInstance.data.datasets[0].data = values;
        UI.chartInstance.update();
      } else {
        UI.chartInstance = new Chart(canvas, {
          type: "pie",
          data: {
            labels,
            datasets: [{ data: values }],
          },
        });
      }
    } catch (e) {
      console.error("Chart.js failed to render:", e);
      const section = canvas.closest("section");
      if (section) {
        section.innerHTML = "<p>Chart unavailable.</p>";
      }
    }
  },

  renderMonthlySummary() {
    const content = document.getElementById("monthly-summary-content");
    if (!content) return;

    const months = Logic.aggregateByMonth(AppState.transactions);
    if (months.length === 0) {
      content.innerHTML =
        '<p class="empty-state">No monthly data available.</p>';
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
  },

  renderCategoryOptions() {
    const select = document.getElementById("category");
    if (!select) return;
    select.innerHTML = AppState.categories
      .map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`)
      .join("");
  },

  showInlineErrors(errors) {
    // Map error messages to their corresponding field error elements
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
  },

  clearInlineErrors() {
    const ids = ["item-name-error", "amount-error", "category-error"];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) el.textContent = "";
    }
  },

  // Legacy aliases kept for backward compatibility
  showErrors(errors) {
    UI.showInlineErrors(errors);
  },

  clearErrors() {
    UI.clearInlineErrors();
  },

  showStorageBanner(message) {
    let banner = document.getElementById("storage-banner");
    if (!banner) {
      banner = document.createElement("div");
      banner.id = "storage-banner";
      banner.setAttribute("role", "alert");
      document.body.prepend(banner);
    }
    banner.textContent = message;
    banner.hidden = false;
  },

  showToast(message) {
    let toast = document.getElementById("toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "toast";
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 3000);
  },

  applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    const btn = document.getElementById("theme-toggle");
    // if (btn) btn.textContent = theme === "dark" ? "Light Mode" : "Dark Mode";
    if (btn) {
      const isDark = theme === "dark";
      btn.innerHTML = `
        <img 
          src="./assets/${isDark ? "sun.svg" : "moon.svg"}" 
          alt="Toggle theme"
        />
      `;
    }
  },

  bindEvents() {
    // Transaction form
    const form = document.getElementById("transaction-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        const name = form.querySelector("#item-name")?.value ?? "";
        const amount = form.querySelector("#amount")?.value ?? "";
        const category = form.querySelector("#category")?.value ?? "";

        UI.clearInlineErrors();
        const result = Validation.validateTransaction(name, amount, category);
        if (!result.valid) {
          UI.showInlineErrors(result.errors);
          return;
        }

        const transaction = {
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : Date.now().toString(),
          name: name.trim(),
          amount: parseFloat(amount),
          category: category.trim(),
          date: new Date().toISOString().slice(0, 10),
        };

        AppState.transactions.push(transaction);
        Storage.saveTransactions(AppState.transactions);
        form.reset();
        UI.renderAll();
      });

      // Clear per-field error when user modifies that field
      const nameInput = form.querySelector("#item-name");
      const amountInput = form.querySelector("#amount");
      const categoryInput = form.querySelector("#category");

      if (nameInput) {
        nameInput.addEventListener("input", () => {
          const el = document.getElementById("item-name-error");
          if (el) el.textContent = "";
        });
      }
      if (amountInput) {
        amountInput.addEventListener("input", () => {
          const el = document.getElementById("amount-error");
          if (el) el.textContent = "";
        });
      }
      if (categoryInput) {
        categoryInput.addEventListener("change", () => {
          const el = document.getElementById("category-error");
          if (el) el.textContent = "";
        });
      }
    }

    // Delete buttons (delegated)
    const list = document.getElementById("transaction-list");
    if (list) {
      list.addEventListener("click", (e) => {
        if (e.target.classList.contains("delete-btn")) {
          const id = e.target.dataset.id;
          AppState.transactions = AppState.transactions.filter(
            (t) => t.id !== id,
          );
          Storage.saveTransactions(AppState.transactions);
          UI.renderAll();
        }
      });
    }

    // Sort controls
    document.querySelectorAll("[data-sort]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const field = btn.dataset.sort;
        if (AppState.sortField === field) {
          AppState.sortDir = AppState.sortDir === "asc" ? "desc" : "asc";
        } else {
          AppState.sortField = field;
          AppState.sortDir = "asc";
        }
        UI.renderTransactionList();
      });
    });

    // Theme toggle
    const themeBtn = document.getElementById("theme-toggle");
    if (themeBtn) {
      themeBtn.addEventListener("click", () => {
        AppState.theme = AppState.theme === "dark" ? "light" : "dark";
        Storage.saveTheme(AppState.theme);
        UI.applyTheme(AppState.theme);
      });
    }

    // Toggle monthly summary
    const toggleBtn = document.getElementById("toggle-monthly-summary");
    const summarySection = document.getElementById("monthly-summary");
    if (toggleBtn && summarySection) {
      toggleBtn.addEventListener("click", () => {
        const isHidden = summarySection.hasAttribute("hidden");
        if (isHidden) {
          summarySection.removeAttribute("hidden");
          toggleBtn.setAttribute("aria-expanded", "true");
          toggleBtn.textContent = "Hide Monthly Summary";
        } else {
          summarySection.setAttribute("hidden", "");
          toggleBtn.setAttribute("aria-expanded", "false");
          toggleBtn.textContent = "Show Monthly Summary";
        }
      });
    }

    // Custom category
    const addCatBtn = document.getElementById("add-category-btn");
    const catInput = document.getElementById("custom-category");
    if (addCatBtn && catInput) {
      addCatBtn.addEventListener("click", () => {
        const val = catInput.value.trim();
        if (val && !AppState.categories.includes(val)) {
          AppState.categories.push(val);
          Storage.saveCategories(AppState.categories);
          UI.renderCategoryOptions();
          catInput.value = "";
        }
      });
    }
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function init() {
  AppState.transactions = Storage.loadTransactions();
  AppState.categories = Storage.loadCategories();
  AppState.theme = Storage.loadTheme();

  UI.applyTheme(AppState.theme);
  UI.renderCategoryOptions();
  UI.renderAll();
  UI.bindEvents();
}

document.addEventListener("DOMContentLoaded", init);
