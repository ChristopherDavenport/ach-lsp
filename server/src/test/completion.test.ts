import { describe, it, expect } from 'vitest';
import { provideCompletion, resolveCompletion } from '../completion';
import { makeDocument } from './testHelpers';
import { VALID_ACH, WEB_ACH } from './testFixtures';

describe('provideCompletion', () => {
  describe('record type completions', () => {
    it('returns record type templates on an empty line', () => {
      const doc = makeDocument('');
      const items = provideCompletion(doc, { line: 0, character: 0 });
      expect(items.length).toBeGreaterThanOrEqual(6);
      const labels = items.map(i => i.label);
      expect(labels).toContain('1');
      expect(labels).toContain('5');
      expect(labels).toContain('6');
      expect(labels).toContain('7');
      expect(labels).toContain('8');
      expect(labels).toContain('9');
    });

    it('record type items have detail descriptions', () => {
      const doc = makeDocument('');
      const items = provideCompletion(doc, { line: 0, character: 0 });
      for (const item of items) {
        expect(item.detail).toBeTruthy();
      }
    });

    it('record type items include insert text templates', () => {
      const doc = makeDocument('');
      const items = provideCompletion(doc, { line: 0, character: 0 });
      const fileHeader = items.find(i => i.label === '1');
      expect(fileHeader).toBeDefined();
      expect(fileHeader!.insertText).toBeTruthy();
    });
  });

  describe('SEC code completions', () => {
    it('returns SEC codes when cursor is in SEC field of batch header', () => {
      const doc = makeDocument(VALID_ACH);
      // SEC code field is at columns 50-53 on batch header (line 1)
      const items = provideCompletion(doc, { line: 1, character: 50 });
      expect(items.length).toBeGreaterThan(10);
      const labels = items.map(i => i.label);
      expect(labels).toContain('PPD');
      expect(labels).toContain('CCD');
      expect(labels).toContain('WEB');
      expect(labels).toContain('IAT');
    });

    it('SEC code items have documentation', () => {
      const doc = makeDocument(VALID_ACH);
      const items = provideCompletion(doc, { line: 1, character: 50 });
      const ppd = items.find(i => i.label === 'PPD');
      expect(ppd).toBeDefined();
      expect(ppd!.detail).toBeTruthy();
    });
  });

  describe('transaction code completions', () => {
    it('returns transaction codes when cursor is in transaction code field', () => {
      const doc = makeDocument(VALID_ACH);
      // transactionCode at columns 1-3 on entry detail (line 2)
      const items = provideCompletion(doc, { line: 2, character: 1 });
      expect(items.length).toBeGreaterThan(5);
      const labels = items.map(i => i.label);
      expect(labels).toContain('22');
      expect(labels).toContain('27');
      expect(labels).toContain('32');
    });
  });

  describe('service class code completions', () => {
    it('returns service class codes on batch header service class field', () => {
      const doc = makeDocument(VALID_ACH);
      // serviceClassCode at columns 1-4 on batch header (line 1)
      const items = provideCompletion(doc, { line: 1, character: 1 });
      expect(items.length).toBeGreaterThanOrEqual(3);
      const labels = items.map(i => i.label);
      expect(labels).toContain('200');
      expect(labels).toContain('220');
      expect(labels).toContain('225');
    });
  });

  describe('addenda type completions', () => {
    it('returns addenda types on addenda record type code field', () => {
      const lines = VALID_ACH.split('\n');
      // Replace a line with an addenda record
      lines[3] = '705' + ' '.repeat(80) + '0001' + '0000001';
      const doc = makeDocument(lines.join('\n'));
      // typeCode at columns 1-3 on addenda (line 3)
      const items = provideCompletion(doc, { line: 3, character: 1 });
      expect(items.length).toBeGreaterThan(0);
    });
  });

  describe('file header specific completions', () => {
    it('returns record size 094 for file header record size field', () => {
      const doc = makeDocument(VALID_ACH);
      // Record size is at columns 34-37 on file header (line 0)
      const items = provideCompletion(doc, { line: 0, character: 34 });
      const labels = items.map(i => i.label);
      expect(labels).toContain('094');
    });

    it('returns blocking factor 10 for file header blocking factor field', () => {
      const doc = makeDocument(VALID_ACH);
      // Blocking factor at columns 37-39 on file header (line 0)
      const items = provideCompletion(doc, { line: 0, character: 37 });
      const labels = items.map(i => i.label);
      expect(labels).toContain('10');
    });

    it('returns file ID modifier letters and digits', () => {
      const doc = makeDocument(VALID_ACH);
      // fileIDModifier at column 33
      const items = provideCompletion(doc, { line: 0, character: 33 });
      expect(items.length).toBe(36); // A-Z + 0-9
    });
  });

  describe('no completions', () => {
    it('returns empty array for fields without specific completions', () => {
      const doc = makeDocument(VALID_ACH);
      // individualName at columns 54-76 on entry detail — no completions
      const items = provideCompletion(doc, { line: 2, character: 55 });
      expect(items).toHaveLength(0);
    });
  });
});

describe('resolveCompletion', () => {
  it('adds documentation for SEC code items', () => {
    const item = { label: 'PPD', data: { type: 'secCode' } };
    const resolved = resolveCompletion(item as any);
    expect(resolved.documentation).toBeDefined();
  });

  it('adds documentation for transaction code items', () => {
    const item = { label: '22', data: { type: 'transactionCode' } };
    const resolved = resolveCompletion(item as any);
    expect(resolved.documentation).toBeDefined();
  });

  it('passes through items without matching data type', () => {
    const item = { label: 'test', data: { type: 'unknown' } };
    const resolved = resolveCompletion(item as any);
    expect(resolved.documentation).toBeUndefined();
  });
});
