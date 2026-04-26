import { describe, it, expect } from 'vitest';
import { provideWorkspaceSymbols } from '../workspaceSymbols';
import { makeState } from './testHelpers';
import { VALID_ACH, MULTI_BATCH_ACH } from './testFixtures';
import type { ACHDocumentState } from '../achDocument';

function makeDocMap(entries: [string, ACHDocumentState][]): Map<string, ACHDocumentState> {
  return new Map(entries);
}

describe('provideWorkspaceSymbols', () => {
  describe('empty query', () => {
    it('returns all symbols when query is empty', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const docs = makeDocMap([['file:///test.ach', state]]);
      const symbols = provideWorkspaceSymbols('', docs);
      expect(symbols.length).toBeGreaterThan(0);
    });
  });

  describe('company name search', () => {
    it('finds company name in batch header', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const docs = makeDocMap([['file:///test.ach', state]]);
      const symbols = provideWorkspaceSymbols('ACME', docs);
      expect(symbols.length).toBeGreaterThanOrEqual(1);
      expect(symbols.some(s => s.name.includes('ACME'))).toBe(true);
    });

    it('search is case-insensitive', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const docs = makeDocMap([['file:///test.ach', state]]);
      const symbols = provideWorkspaceSymbols('acme', docs);
      expect(symbols.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('individual name search', () => {
    it('finds individual names in entry details', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const docs = makeDocMap([['file:///test.ach', state]]);
      const symbols = provideWorkspaceSymbols('John', docs);
      expect(symbols.length).toBeGreaterThanOrEqual(1);
      expect(symbols.some(s => s.name.includes('John'))).toBe(true);
    });
  });

  describe('origin/destination name search', () => {
    it('finds origin bank name', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const docs = makeDocMap([['file:///test.ach', state]]);
      const symbols = provideWorkspaceSymbols('ORIGIN', docs);
      expect(symbols.some(s => s.name.includes('ORIGIN'))).toBe(true);
    });

    it('finds destination bank name', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const docs = makeDocMap([['file:///test.ach', state]]);
      const symbols = provideWorkspaceSymbols('DEST', docs);
      expect(symbols.some(s => s.name.includes('DEST'))).toBe(true);
    });
  });

  describe('multi-document search', () => {
    it('searches across multiple documents', () => {
      const state1 = makeState(VALID_ACH, { skipAll: true });
      const state2 = makeState(MULTI_BATCH_ACH, { skipAll: true });
      const docs = makeDocMap([
        ['file:///a.ach', state1],
        ['file:///b.ach', state2],
      ]);
      const symbols = provideWorkspaceSymbols('', docs);
      const uris = new Set(symbols.map(s => s.location.uri));
      expect(uris.size).toBe(2);
    });
  });

  describe('no matches', () => {
    it('returns empty for unmatched query', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const docs = makeDocMap([['file:///test.ach', state]]);
      const symbols = provideWorkspaceSymbols('NONEXISTENT_ZZZZZ', docs);
      expect(symbols).toHaveLength(0);
    });
  });

  describe('text fallback', () => {
    it('searches text when file is null', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      state.file = null;
      const docs = makeDocMap([['file:///test.ach', state]]);
      const symbols = provideWorkspaceSymbols('ACME', docs);
      expect(symbols.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('symbol metadata', () => {
    it('symbols have containerName', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const docs = makeDocMap([['file:///test.ach', state]]);
      const symbols = provideWorkspaceSymbols('', docs);
      for (const s of symbols) {
        expect(s.containerName).toBeDefined();
      }
    });

    it('symbols have valid locations', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const docs = makeDocMap([['file:///test.ach', state]]);
      const symbols = provideWorkspaceSymbols('', docs);
      for (const s of symbols) {
        expect(s.location.uri).toBe('file:///test.ach');
        expect(s.location.range.start.line).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
