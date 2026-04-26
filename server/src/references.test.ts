import { describe, it, expect } from 'vitest';
import { provideReferences } from './references';
import { makeState } from './testHelpers';
import { VALID_ACH, ACH_WITH_ADDENDA, MULTI_BATCH_ACH } from './testFixtures';

const URI = 'file:///test.ach';

describe('provideReferences', () => {
  describe('with parsed file', () => {
    it('batch header → returns entries + batch control', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const refs = provideReferences(state, URI, 1);
      expect(refs.length).toBeGreaterThanOrEqual(2);
      const lines = refs.map(r => r.range.start.line);
      expect(lines).toContain(2); // entry
      expect(lines).toContain(3); // batch control
    });

    it('batch control → returns batch header + entries', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const refs = provideReferences(state, URI, 3);
      expect(refs.length).toBeGreaterThanOrEqual(2);
      const lines = refs.map(r => r.range.start.line);
      expect(lines).toContain(1); // batch header
      expect(lines).toContain(2); // entry
    });

    it('entry → returns batch header + batch control', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const refs = provideReferences(state, URI, 2);
      const lines = refs.map(r => r.range.start.line);
      expect(lines).toContain(1); // batch header
      expect(lines).toContain(3); // batch control
    });

    it('entry with addenda → includes addenda in references', () => {
      const state = makeState(ACH_WITH_ADDENDA, { skipAll: true });
      const refs = provideReferences(state, URI, 2);
      const lines = refs.map(r => r.range.start.line);
      expect(lines).toContain(3); // addenda
    });

    it('addenda → returns parent entry', () => {
      const state = makeState(ACH_WITH_ADDENDA, { skipAll: true });
      const refs = provideReferences(state, URI, 3);
      const lines = refs.map(r => r.range.start.line);
      expect(lines).toContain(2); // parent entry
    });

    it('file header → returns file control', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const refs = provideReferences(state, URI, 0);
      expect(refs.length).toBe(1);
      expect(refs[0].range.start.line).toBe(4); // file control
    });

    it('file control → returns file header', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const refs = provideReferences(state, URI, 4);
      expect(refs.length).toBe(1);
      expect(refs[0].range.start.line).toBe(0); // file header
    });

    it('does not include the current line in references', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const refs = provideReferences(state, URI, 1);
      const lines = refs.map(r => r.range.start.line);
      expect(lines).not.toContain(1);
    });

    it('returns empty for padding lines', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const refs = provideReferences(state, URI, 5);
      expect(refs).toHaveLength(0);
    });

    it('all references have correct uri', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const refs = provideReferences(state, URI, 1);
      for (const ref of refs) {
        expect(ref.uri).toBe(URI);
      }
    });
  });

  describe('text fallback', () => {
    it('batch header → entries + control (text fallback)', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      state.file = null;
      const refs = provideReferences(state, URI, 1);
      expect(refs.length).toBeGreaterThanOrEqual(2);
    });

    it('entry → batch header + control (text fallback)', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      state.file = null;
      const refs = provideReferences(state, URI, 2);
      const lines = refs.map(r => r.range.start.line);
      expect(lines).toContain(1);
    });
  });
});
