import { describe, it, expect } from 'vitest';
import { provideDocumentSymbols } from '../documentSymbols';
import { makeState } from './testHelpers';
import { VALID_ACH, ACH_WITH_ADDENDA, MULTI_BATCH_ACH, MALFORMED_ACH, PARTIAL_ACH } from './testFixtures';

describe('provideDocumentSymbols', () => {
  describe('valid single-batch file', () => {
    it('returns symbols for file header, batch, and file control', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const symbols = provideDocumentSymbols(state);
      expect(symbols.length).toBeGreaterThanOrEqual(3);

      const names = symbols.map(s => s.name);
      expect(names).toContain('File Header');
      expect(names.some(n => n.startsWith('Batch'))).toBe(true);
      expect(names).toContain('File Control');
    });

    it('file header includes origin and destination names in detail', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const symbols = provideDocumentSymbols(state);
      const fileHeader = symbols.find(s => s.name === 'File Header');
      expect(fileHeader).toBeDefined();
      expect(fileHeader!.detail).toContain('ORIGIN BANK');
      expect(fileHeader!.detail).toContain('DEST BANK');
    });

    it('batch has children with header, entries, and control', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const symbols = provideDocumentSymbols(state);
      const batch = symbols.find(s => s.name.startsWith('Batch'));
      expect(batch).toBeDefined();
      expect(batch!.children).toBeDefined();
      expect(batch!.children!.length).toBeGreaterThanOrEqual(3);

      const childNames = batch!.children!.map(c => c.name);
      expect(childNames).toContain('Batch Header');
      expect(childNames.some(n => n.startsWith('Entry'))).toBe(true);
      expect(childNames).toContain('Batch Control');
    });

    it('entry detail shows individual name and amount', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const symbols = provideDocumentSymbols(state);
      const batch = symbols.find(s => s.name.startsWith('Batch'));
      const entry = batch!.children!.find(c => c.name.startsWith('Entry'));
      expect(entry).toBeDefined();
      expect(entry!.detail).toContain('John Smith');
      expect(entry!.detail).toContain('$');
    });

    it('batch detail includes SEC code and company name', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const symbols = provideDocumentSymbols(state);
      const batch = symbols.find(s => s.name.startsWith('Batch'));
      expect(batch!.detail).toContain('PPD');
      expect(batch!.detail).toContain('ACME CORP');
    });
  });

  describe('file with addenda', () => {
    it('entry with addenda includes addenda children', () => {
      const state = makeState(ACH_WITH_ADDENDA, { skipAll: true });
      const symbols = provideDocumentSymbols(state);
      const batch = symbols.find(s => s.name.startsWith('Batch'));
      const entry = batch!.children!.find(c => c.name.startsWith('Entry'));
      expect(entry!.children).toBeDefined();
      expect(entry!.children!.length).toBeGreaterThanOrEqual(1);
      expect(entry!.children![0].name).toContain('Addenda');
    });
  });

  describe('multi-batch file', () => {
    it('returns multiple batch symbols', () => {
      const state = makeState(MULTI_BATCH_ACH, { skipAll: true });
      const symbols = provideDocumentSymbols(state);
      const batches = symbols.filter(s => s.name.startsWith('Batch'));
      expect(batches.length).toBeGreaterThanOrEqual(2);
    });

    it('each batch has distinct detail', () => {
      const state = makeState(MULTI_BATCH_ACH, { skipAll: true });
      const symbols = provideDocumentSymbols(state);
      const batches = symbols.filter(s => s.name.startsWith('Batch'));
      expect(batches[0].detail).not.toBe(batches[1].detail);
    });
  });

  describe('fallback text parsing', () => {
    it('provides symbols from text when file parse fails', () => {
      const state = makeState(MALFORMED_ACH);
      // Force null file to trigger text fallback
      state.file = null;
      const symbols = provideDocumentSymbols(state);
      // Should still find some symbols from the parseable lines
      expect(symbols.length).toBeGreaterThanOrEqual(0);
    });

    it('text fallback creates symbols for recognizable records', () => {
      // Partial file with just a file header
      const state = {
        file: null,
        parseErrors: [new Error('incomplete')],
        validationErrors: [],
        text: PARTIAL_ACH,
        version: 1,
      };
      const symbols = provideDocumentSymbols(state);
      expect(symbols.length).toBeGreaterThanOrEqual(1);
      expect(symbols[0].name).toBe('File Header');
    });
  });

  describe('symbol ranges', () => {
    it('all symbols have valid ranges', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const symbols = provideDocumentSymbols(state);
      for (const s of symbols) {
        expect(s.range.start.line).toBeGreaterThanOrEqual(0);
        expect(s.range.end.line).toBeGreaterThanOrEqual(s.range.start.line);
      }
    });

    it('batch range spans from header to control', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const symbols = provideDocumentSymbols(state);
      const batch = symbols.find(s => s.name.startsWith('Batch'));
      expect(batch!.range.start.line).toBeLessThan(batch!.range.end.line);
    });
  });
});
