import { describe, it, expect } from 'vitest';
import { provideCodeLens } from './codeLens';
import { makeState } from './testHelpers';
import { VALID_ACH, ACH_WITH_ADDENDA, MULTI_BATCH_ACH } from './testFixtures';

describe('provideCodeLens', () => {
  describe('valid file', () => {
    it('returns at least one lens for file header', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const lenses = provideCodeLens(state);
      expect(lenses.length).toBeGreaterThanOrEqual(1);
      // First lens should be on file header (line 0)
      expect(lenses[0].range.start.line).toBe(0);
    });

    it('file header lens shows batch and entry counts', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const lenses = provideCodeLens(state);
      const title = lenses[0].command!.title;
      expect(title).toContain('batch');
      expect(title).toContain('entr');
      expect(title).toContain('DR:');
      expect(title).toContain('CR:');
    });

    it('returns a lens for batch header', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const lenses = provideCodeLens(state);
      // Batch header is on line 1
      const batchLens = lenses.find(l => l.range.start.line === 1);
      expect(batchLens).toBeDefined();
      expect(batchLens!.command!.title).toContain('entr');
    });
  });

  describe('file with addenda', () => {
    it('shows addenda count on entries with addenda', () => {
      const state = makeState(ACH_WITH_ADDENDA, { skipAll: true });
      const lenses = provideCodeLens(state);
      // Entry with addenda is on line 2
      const entryLens = lenses.find(l => l.range.start.line === 2);
      expect(entryLens).toBeDefined();
      expect(entryLens!.command!.title).toContain('addenda');
    });
  });

  describe('entries without addenda', () => {
    it('does not show lens on entries without addenda', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const lenses = provideCodeLens(state);
      // Entry on line 2 has no addenda in VALID_ACH
      const entryLens = lenses.find(l => l.range.start.line === 2);
      expect(entryLens).toBeUndefined();
    });
  });

  describe('multi-batch', () => {
    it('returns lenses for each batch header', () => {
      const state = makeState(MULTI_BATCH_ACH, { skipAll: true });
      const lenses = provideCodeLens(state);
      const batchLenses = lenses.filter(l => l.command!.title.includes('entr') && l.range.start.line > 0);
      expect(batchLenses.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('null file', () => {
    it('returns empty array when file is null', () => {
      const state = {
        file: null,
        parseErrors: [new Error('bad')],
        validationErrors: [],
        text: 'garbage',
        version: 1,
      };
      const lenses = provideCodeLens(state);
      expect(lenses).toHaveLength(0);
    });
  });

  describe('lens format', () => {
    it('all lenses have commands with non-empty titles', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const lenses = provideCodeLens(state);
      for (const lens of lenses) {
        expect(lens.command).toBeDefined();
        expect(lens.command!.title.length).toBeGreaterThan(0);
      }
    });

    it('dollar amounts are formatted', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const lenses = provideCodeLens(state);
      const fileHeaderLens = lenses[0];
      // Amounts should have $ sign
      expect(fileHeaderLens.command!.title).toContain('$');
    });
  });
});
