import { describe, it, expect } from 'vitest';
import { getFieldBoundaries } from './fieldBoundaries';
import { makeDocument } from './testHelpers';
import { VALID_ACH, ACH_WITH_ADDENDA, WEB_ACH } from './testFixtures';

describe('getFieldBoundaries', () => {
  describe('valid ACH file', () => {
    it('returns boundaries for non-padding lines', () => {
      const doc = makeDocument(VALID_ACH);
      const result = getFieldBoundaries(doc);
      expect(result.length).toBeGreaterThanOrEqual(5); // file header + batch header + entry + batch control + file control
    });

    it('each boundary entry has a line number and boundaries array', () => {
      const doc = makeDocument(VALID_ACH);
      const result = getFieldBoundaries(doc);
      for (const entry of result) {
        expect(typeof entry.line).toBe('number');
        expect(entry.line).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(entry.boundaries)).toBe(true);
        expect(entry.boundaries.length).toBeGreaterThan(0);
      }
    });

    it('boundaries are in ascending order within each line', () => {
      const doc = makeDocument(VALID_ACH);
      const result = getFieldBoundaries(doc);
      for (const entry of result) {
        for (let i = 1; i < entry.boundaries.length; i++) {
          expect(entry.boundaries[i]).toBeGreaterThan(entry.boundaries[i - 1]);
        }
      }
    });

    it('boundaries are within line length (max 94)', () => {
      const doc = makeDocument(VALID_ACH);
      const result = getFieldBoundaries(doc);
      for (const entry of result) {
        for (const b of entry.boundaries) {
          expect(b).toBeGreaterThan(0);
          expect(b).toBeLessThanOrEqual(94);
        }
      }
    });
  });

  describe('padding lines', () => {
    it('excludes padding lines (all 9s) from boundaries', () => {
      const doc = makeDocument(VALID_ACH);
      const result = getFieldBoundaries(doc);
      const paddingLines = result.filter(r => r.line >= 5);
      expect(paddingLines).toHaveLength(0);
    });
  });

  describe('addenda records', () => {
    it('returns boundaries for addenda lines', () => {
      const doc = makeDocument(ACH_WITH_ADDENDA);
      const result = getFieldBoundaries(doc);
      // Line 3 is the addenda record
      const addendaBoundary = result.find(r => r.line === 3);
      expect(addendaBoundary).toBeDefined();
      expect(addendaBoundary!.boundaries.length).toBeGreaterThan(0);
    });
  });

  describe('different record types', () => {
    it('file header has different boundary count than entry detail', () => {
      const doc = makeDocument(VALID_ACH);
      const result = getFieldBoundaries(doc);
      const fileHeaderBounds = result.find(r => r.line === 0);
      const entryBounds = result.find(r => r.line === 2);
      expect(fileHeaderBounds).toBeDefined();
      expect(entryBounds).toBeDefined();
      // Different record types have different field counts
      expect(fileHeaderBounds!.boundaries.length).not.toBe(entryBounds!.boundaries.length);
    });
  });

  describe('SEC code context', () => {
    it('handles WEB SEC code entries', () => {
      const doc = makeDocument(WEB_ACH);
      const result = getFieldBoundaries(doc);
      expect(result.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('empty document', () => {
    it('returns empty array for empty document', () => {
      const doc = makeDocument('');
      const result = getFieldBoundaries(doc);
      expect(result).toHaveLength(0);
    });
  });
});
