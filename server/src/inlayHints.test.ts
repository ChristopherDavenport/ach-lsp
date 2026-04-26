import { describe, it, expect } from 'vitest';
import { provideInlayHints } from './inlayHints';
import { makeDocument } from './testHelpers';
import { VALID_ACH, ACH_WITH_ADDENDA, WEB_ACH } from './testFixtures';

describe('provideInlayHints', () => {
  describe('basic hint generation', () => {
    it('returns a hint when cursor is on a field', () => {
      const doc = makeDocument(VALID_ACH);
      const hints = provideInlayHints(doc, [{ line: 0, character: 0 }]);
      expect(hints.length).toBe(1);
    });

    it('hint has a label string', () => {
      const doc = makeDocument(VALID_ACH);
      const hints = provideInlayHints(doc, [{ line: 0, character: 0 }]);
      expect(typeof hints[0].label).toBe('string');
      expect((hints[0].label as string).length).toBeGreaterThan(0);
    });

    it('hint has paddingLeft set to true', () => {
      const doc = makeDocument(VALID_ACH);
      const hints = provideInlayHints(doc, [{ line: 0, character: 0 }]);
      expect(hints[0].paddingLeft).toBe(true);
    });
  });

  describe('record type hints', () => {
    it('shows "File Header" for record type 1', () => {
      const doc = makeDocument(VALID_ACH);
      const hints = provideInlayHints(doc, [{ line: 0, character: 0 }]);
      expect((hints[0].label as string)).toContain('File Header');
    });

    it('shows "Batch Header" for record type 5', () => {
      const doc = makeDocument(VALID_ACH);
      const hints = provideInlayHints(doc, [{ line: 1, character: 0 }]);
      expect((hints[0].label as string)).toContain('Batch Header');
    });

    it('shows "Entry Detail" for record type 6', () => {
      const doc = makeDocument(VALID_ACH);
      const hints = provideInlayHints(doc, [{ line: 2, character: 0 }]);
      expect((hints[0].label as string)).toContain('Entry Detail');
    });
  });

  describe('contextual value hints', () => {
    it('shows transaction code description', () => {
      const doc = makeDocument(VALID_ACH);
      // transactionCode field at cols 1-3 on entry (line 2)
      const hints = provideInlayHints(doc, [{ line: 2, character: 1 }]);
      expect(hints.length).toBe(1);
      const label = hints[0].label as string;
      expect(label).toContain('Txn Code');
    });

    it('shows dollar amount for amount fields', () => {
      const doc = makeDocument(VALID_ACH);
      // amount field on entry (line 2), cols 29-39
      const hints = provideInlayHints(doc, [{ line: 2, character: 30 }]);
      expect(hints.length).toBe(1);
      const label = hints[0].label as string;
      expect(label).toContain('$');
    });

    it('shows SEC code label on batch header', () => {
      const doc = makeDocument(VALID_ACH);
      // SEC code field at cols 50-53 on batch header (line 1)
      const hints = provideInlayHints(doc, [{ line: 1, character: 50 }]);
      expect(hints.length).toBe(1);
      const label = hints[0].label as string;
      expect(label).toContain('SEC');
    });

    it('shows routing number validation status', () => {
      const doc = makeDocument(VALID_ACH);
      // RDFI at cols 3-11 on entry (line 2)
      const hints = provideInlayHints(doc, [{ line: 2, character: 4 }]);
      expect(hints.length).toBe(1);
      const label = hints[0].label as string;
      expect(label).toMatch(/Valid|Invalid/);
    });
  });

  describe('multi-cursor support', () => {
    it('returns hints for multiple cursor positions', () => {
      const doc = makeDocument(VALID_ACH);
      const hints = provideInlayHints(doc, [
        { line: 0, character: 0 },
        { line: 1, character: 0 },
        { line: 2, character: 0 },
      ]);
      expect(hints.length).toBe(3);
    });

    it('deduplicates hints for same field position', () => {
      const doc = makeDocument(VALID_ACH);
      // Two cursors on the same field
      const hints = provideInlayHints(doc, [
        { line: 0, character: 0 },
        { line: 0, character: 0 },
      ]);
      expect(hints.length).toBe(1);
    });
  });

  describe('padding lines', () => {
    it('returns no hints for padding lines (all 9s)', () => {
      const doc = makeDocument(VALID_ACH);
      const hints = provideInlayHints(doc, [{ line: 5, character: 0 }]);
      expect(hints).toHaveLength(0);
    });
  });

  describe('empty cursors', () => {
    it('returns empty array when no cursors provided', () => {
      const doc = makeDocument(VALID_ACH);
      const hints = provideInlayHints(doc, []);
      expect(hints).toHaveLength(0);
    });
  });

  describe('addenda hints', () => {
    it('returns hint for addenda type code', () => {
      const doc = makeDocument(ACH_WITH_ADDENDA);
      // addenda line is at index 3, type code at cols 1-3
      const hints = provideInlayHints(doc, [{ line: 3, character: 1 }]);
      expect(hints.length).toBe(1);
      const label = hints[0].label as string;
      expect(label).toContain('Addenda Type');
    });
  });

  describe('date formatting', () => {
    it('formats date as YYYY-MM-DD for file creation date', () => {
      const doc = makeDocument(VALID_ACH);
      // fileCreationDate at cols 23-29 on file header (line 0)
      const hints = provideInlayHints(doc, [{ line: 0, character: 23 }]);
      expect(hints.length).toBe(1);
      const label = hints[0].label as string;
      expect(label).toMatch(/20\d{2}-\d{2}-\d{2}/);
    });
  });

  describe('hint position', () => {
    it('hint position is at the end of the field', () => {
      const doc = makeDocument(VALID_ACH);
      const hints = provideInlayHints(doc, [{ line: 0, character: 0 }]);
      expect(hints[0].position.line).toBe(0);
      // recordType field ends at column 1, so position should be at 1
      expect(hints[0].position.character).toBe(1);
    });
  });
});
