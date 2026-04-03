import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// ─── Validation function (inlined from app.js for isolated testing) ───────────
function validateTransaction(name, amount, category) {
  const errors = [];

  if (!name || !name.trim()) {
    errors.push('Name is required.');
  }

  const parsed = parseFloat(amount);
  if (amount === '' || amount === null || amount === undefined || !isFinite(parsed) || parsed <= 0) {
    errors.push('Amount must be a positive number.');
  }

  if (!category || !category.trim()) {
    errors.push('Category is required.');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Arbitraries ──────────────────────────────────────────────────────────────

// Non-empty, non-whitespace strings
const nonEmptyStringArb = fc.string({ minLength: 1, maxLength: 50 })
  .filter(s => s.trim().length > 0);

// Positive numeric amount strings
const positiveAmountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(1_000_000), noNaN: true })
  .map(n => String(n));

// Whitespace-only strings (empty or spaces/tabs)
const whitespaceArb = fc.stringOf(fc.constantFrom(' ', '\t', '\n'), { minLength: 0, maxLength: 10 });

// Non-numeric amount strings (cannot parse to a finite number)
const nonNumericAmountArb = fc.string({ minLength: 1, maxLength: 20 })
  .filter(s => {
    const p = parseFloat(s);
    return !isFinite(p);
  });

// Zero or negative numeric amount strings
const nonPositiveAmountArb = fc.oneof(
  fc.constant('0'),
  fc.constant('-1'),
  fc.float({ min: Math.fround(-1_000_000), max: Math.fround(-0.001), noNaN: true }).map(n => String(n))
);

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('Validation', () => {

  // Feature: expense-budget-visualizer, Property 2: Empty-field submission is rejected
  describe('Property 2: Empty-field submission is rejected', () => {

    it('rejects when name is empty or whitespace-only', () => {
      // Feature: expense-budget-visualizer, Property 2: Empty-field submission is rejected
      fc.assert(
        fc.property(
          whitespaceArb,
          positiveAmountArb,
          nonEmptyStringArb,
          (name, amount, category) => {
            const result = validateTransaction(name, amount, category);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects when category is empty or whitespace-only', () => {
      // Feature: expense-budget-visualizer, Property 2: Empty-field submission is rejected
      fc.assert(
        fc.property(
          nonEmptyStringArb,
          positiveAmountArb,
          whitespaceArb,
          (name, amount, category) => {
            const result = validateTransaction(name, amount, category);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects when at least one field is empty (combined)', () => {
      // Feature: expense-budget-visualizer, Property 2: Empty-field submission is rejected
      // Generate submissions where at least one of name/amount/category is empty/whitespace
      fc.assert(
        fc.property(
          fc.record({
            name:     fc.oneof(whitespaceArb, nonEmptyStringArb),
            amount:   fc.oneof(whitespaceArb, positiveAmountArb),
            category: fc.oneof(whitespaceArb, nonEmptyStringArb),
          }).filter(({ name, amount, category }) =>
            // At least one field must be empty/whitespace
            name.trim() === '' || amount.trim() === '' || category.trim() === ''
          ),
          ({ name, amount, category }) => {
            const result = validateTransaction(name, amount, category);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Feature: expense-budget-visualizer, Property 3: Invalid amount is rejected
  describe('Property 3: Invalid amount is rejected', () => {

    it('rejects non-numeric amount strings', () => {
      // Feature: expense-budget-visualizer, Property 3: Invalid amount is rejected
      fc.assert(
        fc.property(
          nonEmptyStringArb,
          nonNumericAmountArb,
          nonEmptyStringArb,
          (name, amount, category) => {
            const result = validateTransaction(name, amount, category);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects zero or negative amounts', () => {
      // Feature: expense-budget-visualizer, Property 3: Invalid amount is rejected
      fc.assert(
        fc.property(
          nonEmptyStringArb,
          nonPositiveAmountArb,
          nonEmptyStringArb,
          (name, amount, category) => {
            const result = validateTransaction(name, amount, category);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('rejects empty amount string', () => {
      // Feature: expense-budget-visualizer, Property 3: Invalid amount is rejected
      fc.assert(
        fc.property(
          nonEmptyStringArb,
          nonEmptyStringArb,
          (name, category) => {
            const result = validateTransaction(name, '', category);
            expect(result.valid).toBe(false);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  // Sanity check: valid inputs pass
  describe('Valid inputs pass validation', () => {
    it('accepts valid name, positive amount, and non-empty category', () => {
      fc.assert(
        fc.property(
          nonEmptyStringArb,
          positiveAmountArb,
          nonEmptyStringArb,
          (name, amount, category) => {
            const result = validateTransaction(name, amount, category);
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
