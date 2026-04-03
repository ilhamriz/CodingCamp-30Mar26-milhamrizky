import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';

// ─── Mock localStorage ────────────────────────────────────────────────────────
// In-memory implementation that mirrors the localStorage API
function createMockLocalStorage() {
  const store = new Map();
  return {
    getItem(key) { return store.has(key) ? store.get(key) : null; },
    setItem(key, value) { store.set(key, String(value)); },
    removeItem(key) { store.delete(key); },
    clear() { store.clear(); },
  };
}

// ─── Storage functions (inlined from app.js for isolated testing) ─────────────
const KEYS = {
  TRANSACTIONS: 'ebv_transactions',
  CATEGORIES:   'ebv_categories',
  THEME:        'ebv_theme',
};

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Fun'];

function makeStorage(ls) {
  return {
    loadTransactions() {
      const raw = ls.getItem(KEYS.TRANSACTIONS);
      if (raw === null) return [];
      try { return JSON.parse(raw); } catch (_) { return []; }
    },

    saveTransactions(transactions) {
      ls.setItem(KEYS.TRANSACTIONS, JSON.stringify(transactions));
    },

    loadCategories() {
      const raw = ls.getItem(KEYS.CATEGORIES);
      if (raw === null) return [...DEFAULT_CATEGORIES];
      let parsed;
      try { parsed = JSON.parse(raw); } catch (_) { return [...DEFAULT_CATEGORIES]; }
      const merged = [...DEFAULT_CATEGORIES];
      for (const cat of parsed) {
        if (!merged.includes(cat)) merged.push(cat);
      }
      return merged;
    },

    saveCategories(categories) {
      ls.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
    },

    loadTheme() {
      const val = ls.getItem(KEYS.THEME);
      return (val === 'dark' || val === 'light') ? val : 'light';
    },

    saveTheme(theme) {
      ls.setItem(KEYS.THEME, theme);
    },
  };
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────
const transactionArb = fc.record({
  id:       fc.uuidV(4),
  name:     fc.string({ minLength: 1, maxLength: 50 }),
  amount:   fc.float({ min: Math.fround(0.01), max: Math.fround(1_000_000), noNaN: true }),
  category: fc.constantFrom('Food', 'Transport', 'Fun', 'Other'),
  date:     fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
              .map(d => d.toISOString().slice(0, 10)),
});

const transactionListArb = fc.array(transactionArb, { minLength: 0, maxLength: 50 });

const customCategoryArb = fc.string({ minLength: 1, maxLength: 40 })
  .filter(s => s.trim().length > 0 && !DEFAULT_CATEGORIES.includes(s.trim()));

const themeArb = fc.constantFrom('dark', 'light');

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('Storage round-trips', () => {
  let ls;
  let storage;

  beforeEach(() => {
    ls = createMockLocalStorage();
    storage = makeStorage(ls);
  });

  // Feature: expense-budget-visualizer, Property 9: Transaction persistence round-trip
  describe('Property 9: Transaction persistence round-trip', () => {
    it('saveTransactions then loadTransactions returns identical data', () => {
      fc.assert(
        fc.property(transactionListArb, (transactions) => {
          ls.clear();
          storage.saveTransactions(transactions);
          const loaded = storage.loadTransactions();

          expect(loaded).toHaveLength(transactions.length);
          expect(loaded).toEqual(transactions);
        }),
        { numRuns: 100 }
      );
    });

    it('round-trip preserves all transaction fields', () => {
      fc.assert(
        fc.property(transactionArb, (txn) => {
          ls.clear();
          storage.saveTransactions([txn]);
          const [loaded] = storage.loadTransactions();

          expect(loaded.id).toBe(txn.id);
          expect(loaded.name).toBe(txn.name);
          expect(loaded.amount).toBeCloseTo(txn.amount, 5);
          expect(loaded.category).toBe(txn.category);
          expect(loaded.date).toBe(txn.date);
        }),
        { numRuns: 100 }
      );
    });
  });

  // Feature: expense-budget-visualizer, Property 10: Custom category persistence round-trip
  describe('Property 10: Custom category persistence round-trip', () => {
    it('saveCategories then loadCategories includes the custom category', () => {
      fc.assert(
        fc.property(customCategoryArb, (customCat) => {
          ls.clear();
          const categories = [...DEFAULT_CATEGORIES, customCat.trim()];
          storage.saveCategories(categories);
          const loaded = storage.loadCategories();

          expect(loaded).toContain(customCat.trim());
        }),
        { numRuns: 100 }
      );
    });

    it('default categories are always present after load', () => {
      fc.assert(
        fc.property(fc.array(customCategoryArb, { minLength: 0, maxLength: 10 }), (customCats) => {
          ls.clear();
          const unique = [...new Set(customCats.map(c => c.trim()))];
          storage.saveCategories([...DEFAULT_CATEGORIES, ...unique]);
          const loaded = storage.loadCategories();

          for (const def of DEFAULT_CATEGORIES) {
            expect(loaded).toContain(def);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('all saved custom categories are present after load', () => {
      fc.assert(
        fc.property(
          fc.array(customCategoryArb, { minLength: 1, maxLength: 10 }),
          (customCats) => {
            ls.clear();
            const unique = [...new Set(customCats.map(c => c.trim()))];
            storage.saveCategories([...DEFAULT_CATEGORIES, ...unique]);
            const loaded = storage.loadCategories();

            for (const cat of unique) {
              expect(loaded).toContain(cat);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: expense-budget-visualizer, Property 14: Theme persistence round-trip
  describe('Property 14: Theme persistence round-trip', () => {
    it('saveTheme then loadTheme returns the same value', () => {
      fc.assert(
        fc.property(themeArb, (theme) => {
          ls.clear();
          storage.saveTheme(theme);
          const loaded = storage.loadTheme();

          expect(loaded).toBe(theme);
        }),
        { numRuns: 100 }
      );
    });

    it('loadTheme defaults to light when nothing is saved', () => {
      ls.clear();
      expect(storage.loadTheme()).toBe('light');
    });

    it('last saved theme wins', () => {
      fc.assert(
        fc.property(themeArb, themeArb, (first, second) => {
          ls.clear();
          storage.saveTheme(first);
          storage.saveTheme(second);
          expect(storage.loadTheme()).toBe(second);
        }),
        { numRuns: 100 }
      );
    });
  });
});
