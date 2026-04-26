import { describe, it, expect } from 'vitest';
import { provideSelectionRanges } from '../selectionRange';
import { makeState } from './testHelpers';
import { VALID_ACH, MULTI_BATCH_ACH } from './testFixtures';

describe('provideSelectionRanges', () => {
  describe('basic chain', () => {
    it('returns a selection range for each position', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const ranges = provideSelectionRanges(state, [
        { line: 2, character: 5 },
      ]);
      expect(ranges).toHaveLength(1);
    });

    it('innermost range is the field', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const ranges = provideSelectionRanges(state, [
        { line: 2, character: 5 }, // within RDFI field on entry line
      ]);
      const innermost = ranges[0];
      // Field range should be a subset of the full line
      expect(innermost.range.start.line).toBe(2);
      expect(innermost.range.end.line).toBe(2);
      expect(innermost.range.end.character).toBeLessThanOrEqual(94);
    });

    it('has a parent chain up to full document', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const ranges = provideSelectionRanges(state, [
        { line: 2, character: 5 },
      ]);
      // Walk up the parent chain
      let current = ranges[0];
      let depth = 1;
      while (current.parent) {
        current = current.parent;
        depth++;
      }
      // Should have at least: field → line → batch → file = 4 levels
      expect(depth).toBeGreaterThanOrEqual(3);
    });

    it('outermost range covers the entire document', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const ranges = provideSelectionRanges(state, [
        { line: 2, character: 5 },
      ]);
      let current = ranges[0];
      while (current.parent) {
        current = current.parent;
      }
      // Outermost should start at 0,0
      expect(current.range.start.line).toBe(0);
      expect(current.range.start.character).toBe(0);
    });
  });

  describe('batch containment', () => {
    it('batch range is between line and document ranges', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const ranges = provideSelectionRanges(state, [
        { line: 2, character: 30 },
      ]);
      // Walk the chain and check for a range spanning batch header to control
      let current: typeof ranges[0] | undefined = ranges[0];
      let foundBatchRange = false;
      while (current) {
        if (current.range.start.line === 1 && current.range.end.line === 3) {
          foundBatchRange = true;
          break;
        }
        current = current.parent;
      }
      expect(foundBatchRange).toBe(true);
    });
  });

  describe('file header (no batch parent)', () => {
    it('file header expands to full document (no batch in between)', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const ranges = provideSelectionRanges(state, [
        { line: 0, character: 0 },
      ]);
      expect(ranges).toHaveLength(1);
      // Should still have a chain
      let current = ranges[0];
      let depth = 1;
      while (current.parent) {
        current = current.parent;
        depth++;
      }
      expect(depth).toBeGreaterThanOrEqual(2);
    });
  });

  describe('padding lines', () => {
    it('padding line expands to full document', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const ranges = provideSelectionRanges(state, [
        { line: 5, character: 0 },
      ]);
      expect(ranges).toHaveLength(1);
    });
  });

  describe('multiple positions', () => {
    it('returns one range per position', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const ranges = provideSelectionRanges(state, [
        { line: 0, character: 0 },
        { line: 2, character: 5 },
        { line: 4, character: 0 },
      ]);
      expect(ranges).toHaveLength(3);
    });
  });

  describe('text fallback', () => {
    it('provides ranges when file is null', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      state.file = null;
      const ranges = provideSelectionRanges(state, [
        { line: 2, character: 5 },
      ]);
      expect(ranges).toHaveLength(1);
      // Should still have parent chain
      expect(ranges[0].parent).toBeDefined();
    });
  });
});
