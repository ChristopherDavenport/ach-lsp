import { describe, it, expect } from 'vitest';
import { provideDefinition } from '../definition';
import { makeState } from './testHelpers';
import { VALID_ACH, ACH_WITH_ADDENDA, MULTI_BATCH_ACH, PARTIAL_ACH } from './testFixtures';

const URI = 'file:///test.ach';

describe('provideDefinition', () => {
  describe('with parsed file', () => {
    it('batch header → batch control', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      // Line 1 is batch header
      const result = provideDefinition(state, URI, 1);
      expect(result).not.toBeNull();
      // Should point to batch control (line 3)
      expect(result!.range.start.line).toBe(3);
    });

    it('batch control → batch header', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      // Line 3 is batch control
      const result = provideDefinition(state, URI, 3);
      expect(result).not.toBeNull();
      expect(result!.range.start.line).toBe(1);
    });

    it('entry detail → batch header', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      // Line 2 is entry detail
      const result = provideDefinition(state, URI, 2);
      expect(result).not.toBeNull();
      expect(result!.range.start.line).toBe(1);
    });

    it('addenda → entry detail', () => {
      const state = makeState(ACH_WITH_ADDENDA, { skipAll: true });
      // Line 3 is addenda
      const result = provideDefinition(state, URI, 3);
      expect(result).not.toBeNull();
      expect(result!.range.start.line).toBe(2);
    });

    it('file control → file header', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      // Line 4 is file control
      const result = provideDefinition(state, URI, 4);
      expect(result).not.toBeNull();
      expect(result!.range.start.line).toBe(0);
    });

    it('returns null for padding lines', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      // Line 5+ are padding
      const result = provideDefinition(state, URI, 5);
      expect(result).toBeNull();
    });

    it('returns null for file header (no parent)', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const result = provideDefinition(state, URI, 0);
      expect(result).toBeNull();
    });

    it('works with multi-batch files', () => {
      const state = makeState(MULTI_BATCH_ACH, { skipAll: true });
      // Line 4 is second batch header
      const result = provideDefinition(state, URI, 4);
      expect(result).not.toBeNull();
      // Should point to second batch control (line 6)
      expect(result!.range.start.line).toBe(6);
    });

    it('result uri matches input uri', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const result = provideDefinition(state, URI, 1);
      expect(result!.uri).toBe(URI);
    });
  });

  describe('text fallback', () => {
    it('entry → preceding batch header (text fallback)', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      state.file = null; // Force text fallback
      const result = provideDefinition(state, URI, 2);
      expect(result).not.toBeNull();
      expect(result!.range.start.line).toBe(1);
    });

    it('batch header → batch control (text fallback)', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      state.file = null;
      const result = provideDefinition(state, URI, 1);
      expect(result).not.toBeNull();
      expect(result!.range.start.line).toBe(3);
    });

    it('batch control → batch header (text fallback)', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      state.file = null;
      const result = provideDefinition(state, URI, 3);
      expect(result).not.toBeNull();
      expect(result!.range.start.line).toBe(1);
    });
  });
});
