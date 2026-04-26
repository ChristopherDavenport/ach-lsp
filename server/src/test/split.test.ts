import { describe, it, expect } from 'vitest';
import { splitAchContent } from '../split';
import { VALID_ACH, MULTI_BATCH_ACH, MALFORMED_ACH, PARTIAL_ACH } from './testFixtures';

describe('splitAchContent', () => {
  describe('conditions mode', () => {
    it('splits a file by maxEntries', () => {
      const result = splitAchContent({
        content: MULTI_BATCH_ACH,
        mode: 'conditions',
        conditions: { maxEntries: 1 },
      });
      expect(result.error).toBeUndefined();
      expect(result.files).toBeDefined();
      const allFiles = Object.values(result.files!).flat();
      expect(allFiles.length).toBeGreaterThanOrEqual(2);
      for (const text of allFiles) {
        const entryLines = text.split('\n').filter(l => l.startsWith('6'));
        expect(entryLines.length).toBeLessThanOrEqual(1);
      }
    });

    it('keeps file in one piece when conditions are not exceeded', () => {
      const result = splitAchContent({
        content: VALID_ACH,
        mode: 'conditions',
        conditions: { maxEntries: 100 },
      });
      expect(result.error).toBeUndefined();
      expect(result.files).toBeDefined();
      const allFiles = Object.values(result.files!).flat();
      expect(allFiles.length).toBe(1);
    });

    it('splits by maxBatches', () => {
      const result = splitAchContent({
        content: MULTI_BATCH_ACH,
        mode: 'conditions',
        conditions: { maxBatches: 1 },
      });
      expect(result.error).toBeUndefined();
      expect(result.files).toBeDefined();
      const allFiles = Object.values(result.files!).flat();
      expect(allFiles.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('companyId mode', () => {
    it('groups batches by company identification', () => {
      const result = splitAchContent({
        content: MULTI_BATCH_ACH,
        mode: 'companyId',
      });
      expect(result.error).toBeUndefined();
      expect(result.files).toBeDefined();
      const keys = Object.keys(result.files!);
      // MULTI_BATCH_ACH has companyIdentification 1234567890 and 9876543210
      expect(keys.length).toBe(2);
      expect(keys).toContain('1234567890');
      expect(keys).toContain('9876543210');
    });

    it('each group output starts with a file header', () => {
      const result = splitAchContent({
        content: MULTI_BATCH_ACH,
        mode: 'companyId',
      });
      for (const files of Object.values(result.files!)) {
        for (const text of files) {
          expect(text.startsWith('101')).toBe(true);
        }
      }
    });
  });

  describe('companyName mode', () => {
    it('groups batches by company name', () => {
      const result = splitAchContent({
        content: MULTI_BATCH_ACH,
        mode: 'companyName',
      });
      expect(result.error).toBeUndefined();
      expect(result.files).toBeDefined();
      const keys = Object.keys(result.files!);
      // MULTI_BATCH_ACH has companyName "ACME CORP" and "WIDGET INC"
      expect(keys.length).toBe(2);
      expect(keys).toContain('ACME CORP');
      expect(keys).toContain('WIDGET INC');
    });
  });

  describe('secCode mode', () => {
    it('groups batches by SEC code', () => {
      const result = splitAchContent({
        content: MULTI_BATCH_ACH,
        mode: 'secCode',
      });
      expect(result.error).toBeUndefined();
      expect(result.files).toBeDefined();
      const keys = Object.keys(result.files!);
      // MULTI_BATCH_ACH has PPD and CCD batches
      expect(keys.length).toBe(2);
      expect(keys).toContain('PPD');
      expect(keys).toContain('CCD');
    });
  });

  describe('output validity', () => {
    it('produces valid 94-character lines', () => {
      const result = splitAchContent({
        content: MULTI_BATCH_ACH,
        mode: 'companyId',
      });
      for (const files of Object.values(result.files!)) {
        for (const text of files) {
          const lines = text.split('\n').filter(l => l.length > 0);
          for (const line of lines) {
            expect(line.length).toBe(94);
          }
        }
      }
    });

    it('each output has exactly one file header and one file control', () => {
      const result = splitAchContent({
        content: MULTI_BATCH_ACH,
        mode: 'companyId',
      });
      for (const files of Object.values(result.files!)) {
        for (const text of files) {
          const lines = text.split('\n');
          const fileHeaders = lines.filter(l => l.startsWith('1'));
          const fileControls = lines.filter(l => l.startsWith('9') && !l.startsWith('99'));
          expect(fileHeaders.length).toBe(1);
          expect(fileControls.length).toBe(1);
        }
      }
    });
  });

  describe('error handling', () => {
    it('returns error for unparseable content', () => {
      const result = splitAchContent({
        content: 'not ach content',
        mode: 'conditions',
      });
      expect(result.error).toBeDefined();
    });

    it('returns error for empty content', () => {
      const result = splitAchContent({
        content: '',
        mode: 'conditions',
      });
      expect(result.error).toBeDefined();
    });

    it('handles partial/malformed files gracefully', () => {
      const result = splitAchContent({
        content: MALFORMED_ACH,
        mode: 'conditions',
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    it('handles partial file input', () => {
      const result = splitAchContent({
        content: PARTIAL_ACH,
        mode: 'conditions',
      });
      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });
  });

  describe('single-batch file', () => {
    it('returns one group for a single-batch file in companyId mode', () => {
      const result = splitAchContent({
        content: VALID_ACH,
        mode: 'companyId',
      });
      expect(result.error).toBeUndefined();
      expect(result.files).toBeDefined();
      const keys = Object.keys(result.files!);
      expect(keys.length).toBe(1);
      expect(keys).toContain('1234567890');
    });
  });
});
