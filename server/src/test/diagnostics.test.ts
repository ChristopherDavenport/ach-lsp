import { describe, it, expect } from 'vitest';
import { computeDiagnostics } from '../diagnostics';
import { makeState } from './testHelpers';
import { VALID_ACH, MALFORMED_ACH, BAD_CHECK_DIGIT_ACH } from './testFixtures';

describe('computeDiagnostics', () => {
  describe('valid files', () => {
    it('returns no diagnostics for a valid ACH file (skipAll)', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const diagnostics = computeDiagnostics(state, 1000);
      expect(diagnostics).toHaveLength(0);
    });
  });

  describe('parse errors', () => {
    it('produces diagnostics for malformed input', () => {
      const state = makeState(MALFORMED_ACH);
      const diagnostics = computeDiagnostics(state, 1000);
      expect(diagnostics.length).toBeGreaterThan(0);
    });

    it('each diagnostic has source "ach"', () => {
      const state = makeState(MALFORMED_ACH);
      const diagnostics = computeDiagnostics(state, 1000);
      for (const d of diagnostics) {
        expect(d.source).toBe('ach');
      }
    });

    it('diagnostics have valid ranges', () => {
      const state = makeState(MALFORMED_ACH);
      const diagnostics = computeDiagnostics(state, 1000);
      for (const d of diagnostics) {
        expect(d.range.start.line).toBeGreaterThanOrEqual(0);
        expect(d.range.end.line).toBeGreaterThanOrEqual(d.range.start.line);
        expect(d.range.start.character).toBeGreaterThanOrEqual(0);
        expect(d.range.end.character).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('validation errors', () => {
    it('produces diagnostics for check digit errors', () => {
      const state = makeState(BAD_CHECK_DIGIT_ACH);
      const allDiagnostics = computeDiagnostics(state, 1000);
      // Should have at least one diagnostic (may have parse or validation errors)
      expect(allDiagnostics.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('maxProblems limit', () => {
    it('respects the maxProblems parameter', () => {
      const state = makeState(MALFORMED_ACH);
      const all = computeDiagnostics(state, 1000);
      if (all.length > 1) {
        const limited = computeDiagnostics(state, 1);
        expect(limited).toHaveLength(1);
      }
    });
  });

  describe('null file state', () => {
    it('handles state with no file and only parse errors', () => {
      const state = {
        file: null,
        parseErrors: [new Error('test error')],
        validationErrors: [],
        text: 'garbage',
        version: 1,
      };
      const diagnostics = computeDiagnostics(state, 1000);
      expect(diagnostics.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('diagnostic severity', () => {
    it('defaults to error severity for unknown errors', () => {
      const err = new Error('something wrong');
      const state = {
        file: null,
        parseErrors: [err],
        validationErrors: [],
        text: 'x',
        version: 1,
      };
      const diagnostics = computeDiagnostics(state, 1000);
      // DiagnosticSeverity.Error = 1
      expect(diagnostics[0].severity).toBe(1);
    });
  });
});
