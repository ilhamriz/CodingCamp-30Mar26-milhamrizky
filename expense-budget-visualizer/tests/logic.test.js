import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── calculateBalance (inlined from app.js for isolated testing) ──────────────
function calculateBalance(transactions) {
  return transactions.reduce((sum, t) => sum + t.amount, 0);
}

// ─── aggregateByCategory (inlined from app.js for isolated testing) ───────────
function aggregateByCategory(transactions) {
  return transactions.reduce((acc, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
}

// ─── sortTransactions (inlined from app.js for isolated testing) ──────────────
function sortTransactions(transactions, field, dir) {
  const copy = [...transactions];
  copy.sort((a, b) => {
    let cmp = 0;
    if (field === 'amount') {
      cmp = a.amount - b.amount;
    } else if (field === 'category') {
      cmp = a.category.localeCompare(b.category);
    }
    return dir === 'desc' ? -cmp : cmp;
  });
  return copy;
}

// ─── aggregateByMonth (inlined from app.js for isolated testing) ──────────────
function aggregateByMonth(transactions) {
  const map = {};
  for (const t of transactions) {
    const month = t.date ? t.date.slice(0, 7) : 'unknown';
    if (!map[month]) map[month] = { month, totals: {} };
    map[month].totals[t.category] = (map[month].totals[t.category] || 0) + t.amount;
  }
  return Object.values(map).sort((a, b) => a.month.localeCompare(b.month));
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

const categoryArb = fc.constantFrom('Food', 'Transport', 'Fun', 'Other');

const positiveAmountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(10_000), noNaN: true });

// ISO date string YYYY-MM-DD
const isoDateArb = fc.record({
  year:  fc.integer({ min: 2020, max: 2025 }),
  month: fc.integer({ min: 1, max: 12 }),
  day:   fc.integer({ min: 1, max: 28 }),
}).map(({ year, month, day }) =>
  `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
);

const transactionArb = fc.record({
  id:       fc.string({ minLength: 1, maxLength: 10 }),
  name:     fc.string({ minLength: 1, maxLength: 20 }),
  amount:   positiveAmountArb,
  category: categoryArb,
  date:     isoDateArb,
});

// ─── Unit Tests ───────────────────────────────────────────────────────────────
describe('aggregateByMonth', () => {

  it('returns [] for empty transaction list', () => {
    expect(aggregateByMonth([])).toEqual([]);
  });

  it('returns one entry for a single transaction', () => {
    const txns = [{ id: '1', name: 'Lunch', amount: 12.5, category: 'Food', date: '2024-06-15' }];
    const result = aggregateByMonth(txns);
    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2024-06');
    expect(result[0].totals['Food']).toBeCloseTo(12.5);
  });

  it('groups transactions in the same month together', () => {
    const txns = [
      { id: '1', name: 'Lunch',  amount: 10, category: 'Food',      date: '2024-06-01' },
      { id: '2', name: 'Bus',    amount: 5,  category: 'Transport',  date: '2024-06-15' },
      { id: '3', name: 'Dinner', amount: 20, category: 'Food',       date: '2024-06-30' },
    ];
    const result = aggregateByMonth(txns);
    expect(result).toHaveLength(1);
    expect(result[0].month).toBe('2024-06');
    expect(result[0].totals['Food']).toBeCloseTo(30);
    expect(result[0].totals['Transport']).toBeCloseTo(5);
  });

  it('produces separate entries for different months', () => {
    const txns = [
      { id: '1', name: 'Lunch', amount: 10, category: 'Food', date: '2024-05-10' },
      { id: '2', name: 'Lunch', amount: 20, category: 'Food', date: '2024-06-10' },
    ];
    const result = aggregateByMonth(txns);
    expect(result).toHaveLength(2);
    expect(result[0].month).toBe('2024-05');
    expect(result[1].month).toBe('2024-06');
  });

  it('returns entries sorted by month ascending', () => {
    const txns = [
      { id: '1', name: 'A', amount: 1, category: 'Food', date: '2024-08-01' },
      { id: '2', name: 'B', amount: 2, category: 'Food', date: '2024-03-01' },
      { id: '3', name: 'C', amount: 3, category: 'Food', date: '2024-06-01' },
    ];
    const result = aggregateByMonth(txns);
    expect(result.map(r => r.month)).toEqual(['2024-03', '2024-06', '2024-08']);
  });

  // Feature: expense-budget-visualizer, Property 11: Monthly summary grouping and totals
  describe('Property 11: Monthly summary grouping and totals', () => {

    it('returns exactly one entry per distinct calendar month', () => {
      // Feature: expense-budget-visualizer, Property 11: Monthly summary grouping and totals
      fc.assert(
        fc.property(
          fc.array(transactionArb, { minLength: 0, maxLength: 30 }),
          (transactions) => {
            const result = aggregateByMonth(transactions);
            const distinctMonths = new Set(transactions.map(t => t.date.slice(0, 7)));
            expect(result).toHaveLength(distinctMonths.size);
            const resultMonths = new Set(result.map(r => r.month));
            expect(resultMonths).toEqual(distinctMonths);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('per-category totals equal sum of amounts for that month and category', () => {
      // Feature: expense-budget-visualizer, Property 11: Monthly summary grouping and totals
      fc.assert(
        fc.property(
          fc.array(transactionArb, { minLength: 1, maxLength: 30 }),
          (transactions) => {
            const result = aggregateByMonth(transactions);
            for (const entry of result) {
              for (const [cat, total] of Object.entries(entry.totals)) {
                const expected = transactions
                  .filter(t => t.date.slice(0, 7) === entry.month && t.category === cat)
                  .reduce((sum, t) => sum + t.amount, 0);
                expect(total).toBeCloseTo(expected, 5);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('result is sorted by month ascending', () => {
      // Feature: expense-budget-visualizer, Property 11: Monthly summary grouping and totals
      fc.assert(
        fc.property(
          fc.array(transactionArb, { minLength: 0, maxLength: 30 }),
          (transactions) => {
            const result = aggregateByMonth(transactions);
            for (let i = 1; i < result.length; i++) {
              expect(result[i - 1].month.localeCompare(result[i].month)).toBeLessThanOrEqual(0);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

// ─── sortTransactions ─────────────────────────────────────────────────────────
describe('sortTransactions', () => {

  const txns = [
    { id: '1', name: 'A', amount: 30, category: 'Transport', date: '2024-01-01' },
    { id: '2', name: 'B', amount: 10, category: 'Food',      date: '2024-01-02' },
    { id: '3', name: 'C', amount: 20, category: 'Fun',       date: '2024-01-03' },
  ];

  it('sorts by amount ascending', () => {
    const result = sortTransactions(txns, 'amount', 'asc');
    expect(result.map(t => t.amount)).toEqual([10, 20, 30]);
  });

  it('sorts by amount descending', () => {
    const result = sortTransactions(txns, 'amount', 'desc');
    expect(result.map(t => t.amount)).toEqual([30, 20, 10]);
  });

  it('sorts by category ascending (lexicographic)', () => {
    const result = sortTransactions(txns, 'category', 'asc');
    expect(result.map(t => t.category)).toEqual(['Food', 'Fun', 'Transport']);
  });

  it('sorts by category descending (lexicographic)', () => {
    const result = sortTransactions(txns, 'category', 'desc');
    expect(result.map(t => t.category)).toEqual(['Transport', 'Fun', 'Food']);
  });

  it('does not mutate the original array', () => {
    const original = [...txns];
    sortTransactions(txns, 'amount', 'asc');
    expect(txns).toEqual(original);
  });

  it('returns a new array reference', () => {
    const result = sortTransactions(txns, 'amount', 'asc');
    expect(result).not.toBe(txns);
  });

  it('handles empty array', () => {
    expect(sortTransactions([], 'amount', 'asc')).toEqual([]);
  });

  it('handles single-element array', () => {
    const single = [txns[0]];
    const result = sortTransactions(single, 'amount', 'desc');
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(txns[0]);
  });
});

// ─── Property 7: Balance equals sum of all transaction amounts ────────────────
describe('Property 7: Balance equals sum of all transaction amounts', () => {
  it('calculateBalance equals amounts.reduce for any transaction list', () => {
    // Feature: expense-budget-visualizer, Property 7: Balance equals sum of all transaction amounts
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 0, maxLength: 50 }),
        (transactions) => {
          const balance = calculateBalance(transactions);
          const expected = transactions.reduce((s, t) => s + t.amount, 0);
          expect(balance).toBeCloseTo(expected, 5);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns 0 for empty transaction list', () => {
    expect(calculateBalance([])).toBe(0);
  });
});

// ─── Property 8: Category aggregation is correct ─────────────────────────────
describe('Property 8: Category aggregation is correct', () => {
  it('aggregateByCategory keys equal distinct categories and values equal sums', () => {
    // Feature: expense-budget-visualizer, Property 8: Category aggregation is correct
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 0, maxLength: 50 }),
        (transactions) => {
          const result = aggregateByCategory(transactions);

          // Keys must be exactly the set of distinct categories
          const distinctCategories = new Set(transactions.map(t => t.category));
          expect(new Set(Object.keys(result))).toEqual(distinctCategories);

          // Each value must equal the sum of amounts for that category
          for (const [cat, total] of Object.entries(result)) {
            const expected = transactions
              .filter(t => t.category === cat)
              .reduce((s, t) => s + t.amount, 0);
            expect(total).toBeCloseTo(expected, 5);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('returns {} for empty transaction list', () => {
    expect(aggregateByCategory([])).toEqual({});
  });
});

// ─── Property 12: Sort ordering correctness ───────────────────────────────────
describe('Property 12: Sort ordering correctness', () => {
  it('amount ascending: each amount <= next', () => {
    // Feature: expense-budget-visualizer, Property 12: Sort ordering correctness
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 0, maxLength: 50 }),
        (transactions) => {
          const sorted = sortTransactions(transactions, 'amount', 'asc');
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1].amount).toBeLessThanOrEqual(sorted[i].amount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('amount descending: each amount >= next', () => {
    // Feature: expense-budget-visualizer, Property 12: Sort ordering correctness
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 0, maxLength: 50 }),
        (transactions) => {
          const sorted = sortTransactions(transactions, 'amount', 'desc');
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1].amount).toBeGreaterThanOrEqual(sorted[i].amount);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('category ascending: each category <= next lexicographically', () => {
    // Feature: expense-budget-visualizer, Property 12: Sort ordering correctness
    fc.assert(
      fc.property(
        fc.array(transactionArb, { minLength: 0, maxLength: 50 }),
        (transactions) => {
          const sorted = sortTransactions(transactions, 'category', 'asc');
          for (let i = 1; i < sorted.length; i++) {
            expect(sorted[i - 1].category.localeCompare(sorted[i].category)).toBeLessThanOrEqual(0);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
