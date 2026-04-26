import { describe, it, expect } from 'vitest';
import { provideHover } from './hover';
import { makeDocument } from './testHelpers';
import { VALID_ACH, ACH_WITH_ADDENDA, WEB_ACH } from './testFixtures';

describe('provideHover', () => {
  describe('file header (record type 1)', () => {
    it('returns hover for record type field at column 0', () => {
      const doc = makeDocument(VALID_ACH);
      const hover = provideHover(doc, { line: 0, character: 0 });
      expect(hover).not.toBeNull();
      expect(hover!.contents).toHaveProperty('value');
      const md = (hover!.contents as { value: string }).value;
      expect(md).toContain('Record Type');
      expect(md).toContain('📋');
    });

    it('returns hover for immediate destination name', () => {
      const doc = makeDocument(VALID_ACH);
      // immediateDestinationName starts at column 40
      const hover = provideHover(doc, { line: 0, character: 41 });
      expect(hover).not.toBeNull();
      const md = (hover!.contents as { value: string }).value;
      expect(md).toContain('DEST BANK');
    });

    it('returns hover for immediate origin name', () => {
      const doc = makeDocument(VALID_ACH);
      // immediateOriginName starts at column 63
      const hover = provideHover(doc, { line: 0, character: 64 });
      expect(hover).not.toBeNull();
      const md = (hover!.contents as { value: string }).value;
      expect(md).toContain('ORIGIN BANK');
    });

    it('returns hover for file creation date with date formatting', () => {
      const doc = makeDocument(VALID_ACH);
      // fileCreationDate at columns 23-29 (YYMMDD)
      const hover = provideHover(doc, { line: 0, character: 23 });
      expect(hover).not.toBeNull();
      const md = (hover!.contents as { value: string }).value;
      expect(md).toContain('📅');
    });

    it('shows routing number validation for immediateDestination', () => {
      const doc = makeDocument(VALID_ACH);
      // immediateDestination starts at column 3
      const hover = provideHover(doc, { line: 0, character: 4 });
      expect(hover).not.toBeNull();
      const md = (hover!.contents as { value: string }).value;
      expect(md).toMatch(/[✅⚠️].*routing/i);
    });
  });

  describe('batch header (record type 5)', () => {
    it('returns hover for SEC code with description', () => {
      const doc = makeDocument(VALID_ACH);
      // standardEntryClassCode at columns 50-53
      const hover = provideHover(doc, { line: 1, character: 50 });
      expect(hover).not.toBeNull();
      const md = (hover!.contents as { value: string }).value;
      expect(md).toContain('PPD');
      expect(md).toContain('📑');
    });

    it('returns hover for service class code', () => {
      const doc = makeDocument(VALID_ACH);
      // serviceClassCode at columns 1-4
      const hover = provideHover(doc, { line: 1, character: 1 });
      expect(hover).not.toBeNull();
      const md = (hover!.contents as { value: string }).value;
      expect(md).toContain('🏷️');
    });
  });

  describe('entry detail (record type 6)', () => {
    it('returns hover for transaction code', () => {
      const doc = makeDocument(VALID_ACH);
      // transactionCode at columns 1-3
      const hover = provideHover(doc, { line: 2, character: 1 });
      expect(hover).not.toBeNull();
      const md = (hover!.contents as { value: string }).value;
      expect(md).toContain('💳');
    });

    it('returns hover for amount with dollar formatting', () => {
      const doc = makeDocument(VALID_ACH);
      // amount at columns 29-39
      const hover = provideHover(doc, { line: 2, character: 30 });
      expect(hover).not.toBeNull();
      const md = (hover!.contents as { value: string }).value;
      expect(md).toContain('💰');
      expect(md).toContain('$');
    });

    it('returns hover for RDFI routing number', () => {
      const doc = makeDocument(VALID_ACH);
      // rdfiIdentification at columns 3-11
      const hover = provideHover(doc, { line: 2, character: 4 });
      expect(hover).not.toBeNull();
      const md = (hover!.contents as { value: string }).value;
      expect(md).toMatch(/routing/i);
    });

    it('returns column range in hover', () => {
      const doc = makeDocument(VALID_ACH);
      const hover = provideHover(doc, { line: 2, character: 30 });
      expect(hover).not.toBeNull();
      const md = (hover!.contents as { value: string }).value;
      expect(md).toContain('Columns');
    });

    it('returns a range that covers the field', () => {
      const doc = makeDocument(VALID_ACH);
      const hover = provideHover(doc, { line: 2, character: 1 });
      expect(hover).not.toBeNull();
      expect(hover!.range).toBeDefined();
      expect(hover!.range!.start.line).toBe(2);
      expect(hover!.range!.end.line).toBe(2);
    });
  });

  describe('addenda record (record type 7)', () => {
    it('returns hover for addenda type code', () => {
      const doc = makeDocument(ACH_WITH_ADDENDA);
      // addendaTypeCode at columns 1-3 on line 3
      const hover = provideHover(doc, { line: 3, character: 1 });
      expect(hover).not.toBeNull();
      const md = (hover!.contents as { value: string }).value;
      expect(md).toContain('📎');
    });
  });

  describe('edge cases', () => {
    it('returns null for padding lines (all 9s)', () => {
      const doc = makeDocument(VALID_ACH);
      // Padding line is at line 5+
      const hover = provideHover(doc, { line: 5, character: 0 });
      expect(hover).toBeNull();
    });

    it('returns null for empty lines', () => {
      const doc = makeDocument('');
      const hover = provideHover(doc, { line: 0, character: 0 });
      expect(hover).toBeNull();
    });

    it('returns null when cursor is past line length', () => {
      const doc = makeDocument(VALID_ACH);
      const hover = provideHover(doc, { line: 0, character: 200 });
      expect(hover).toBeNull();
    });

    it('handles WEB SEC code entries', () => {
      const doc = makeDocument(WEB_ACH);
      const hover = provideHover(doc, { line: 1, character: 50 });
      expect(hover).not.toBeNull();
      const md = (hover!.contents as { value: string }).value;
      expect(md).toContain('WEB');
    });
  });
});
