import { describe, it, expect } from 'vitest';
import { provideFoldingRanges } from './folding';
import { makeState } from './testHelpers';
import { VALID_ACH, ACH_WITH_ADDENDA, MULTI_BATCH_ACH, MALFORMED_ACH } from './testFixtures';

describe('provideFoldingRanges', () => {
  describe('single batch file', () => {
    it('creates a fold range for the batch (header → control)', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const ranges = provideFoldingRanges(state);
      expect(ranges.length).toBeGreaterThanOrEqual(1);

      // The batch fold should span from batch header line to batch control line
      const batchFold = ranges.find(r => r.startLine === 1); // batch header is line 1
      expect(batchFold).toBeDefined();
      expect(batchFold!.endLine).toBe(3); // batch control is line 3
    });
  });

  describe('file with addenda', () => {
    it('creates a fold range for entry + addenda', () => {
      const state = makeState(ACH_WITH_ADDENDA, { skipAll: true });
      const ranges = provideFoldingRanges(state);

      // Should have batch fold + entry+addenda fold
      expect(ranges.length).toBeGreaterThanOrEqual(2);

      // Entry fold should span from entry line to last addenda
      const entryFold = ranges.find(r => r.startLine === 2); // entry is line 2
      expect(entryFold).toBeDefined();
      expect(entryFold!.endLine).toBe(3); // addenda is line 3
    });
  });

  describe('multi-batch file', () => {
    it('creates fold ranges for each batch', () => {
      const state = makeState(MULTI_BATCH_ACH, { skipAll: true });
      const ranges = provideFoldingRanges(state);

      // Should have at least 2 batch folds
      expect(ranges.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('fallback text parsing', () => {
    it('provides fold ranges from text when file is null', () => {
      const lines = [
        '5200ACME CORP                           1234567890PPDPAYROLL         260101   0000000000000001',
        '62207640125100123456789      0000050000               John Smith              0076401250000001',
        '705Payment for invoice 12345                                                      00010000001',
        '820000000200076401250000000000000000000500001234567890                         000000000000001',
      ].join('\n');

      const state = {
        file: null,
        parseErrors: [new Error('parse failure')],
        validationErrors: [],
        text: lines,
        version: 1,
      };

      const ranges = provideFoldingRanges(state);
      expect(ranges.length).toBeGreaterThanOrEqual(1);
    });

    it('text fallback creates batch fold for header-to-control span', () => {
      const state = {
        file: null,
        parseErrors: [],
        validationErrors: [],
        text: VALID_ACH,
        version: 1,
      };
      const ranges = provideFoldingRanges(state);
      // Should find at least the batch fold
      const batchFold = ranges.find(r => r.startLine === 1);
      expect(batchFold).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('returns empty array for empty text', () => {
      const state = {
        file: null,
        parseErrors: [],
        validationErrors: [],
        text: '',
        version: 1,
      };
      const ranges = provideFoldingRanges(state);
      expect(ranges).toHaveLength(0);
    });

    it('all fold ranges have valid line numbers', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const ranges = provideFoldingRanges(state);
      for (const r of ranges) {
        expect(r.startLine).toBeGreaterThanOrEqual(0);
        expect(r.endLine).toBeGreaterThanOrEqual(r.startLine);
      }
    });
  });
});
