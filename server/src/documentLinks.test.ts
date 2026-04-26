import { describe, it, expect } from 'vitest';
import { provideDocumentLinks } from './documentLinks';
import { makeDocument } from './testHelpers';
import { VALID_ACH, ACH_WITH_ADDENDA, WEB_ACH } from './testFixtures';

describe('provideDocumentLinks', () => {
  describe('routing number links', () => {
    it('creates links for routing number fields', () => {
      const doc = makeDocument(VALID_ACH);
      const links = provideDocumentLinks(doc);
      expect(links.length).toBeGreaterThan(0);
    });

    it('file header has links for immediateDestination and immediateOrigin', () => {
      const doc = makeDocument(VALID_ACH);
      const links = provideDocumentLinks(doc);
      const fileHeaderLinks = links.filter(l => l.range.start.line === 0);
      expect(fileHeaderLinks.length).toBeGreaterThanOrEqual(2);
    });

    it('entry detail has link for rdfiIdentification', () => {
      const doc = makeDocument(VALID_ACH);
      const links = provideDocumentLinks(doc);
      const entryLinks = links.filter(l => l.range.start.line === 2);
      expect(entryLinks.length).toBeGreaterThanOrEqual(1);
    });

    it('links have target URLs', () => {
      const doc = makeDocument(VALID_ACH);
      const links = provideDocumentLinks(doc);
      for (const link of links) {
        expect(link.target).toBeDefined();
        expect(link.target).toContain('http');
      }
    });

    it('links have tooltips', () => {
      const doc = makeDocument(VALID_ACH);
      const links = provideDocumentLinks(doc);
      for (const link of links) {
        expect(link.tooltip).toBeDefined();
        expect(link.tooltip).toContain('routing');
      }
    });

    it('target URL includes the routing number', () => {
      const doc = makeDocument(VALID_ACH);
      const links = provideDocumentLinks(doc);
      for (const link of links) {
        expect(link.target).toMatch(/routingNumber=\d+/);
      }
    });
  });

  describe('padding lines', () => {
    it('excludes padding lines', () => {
      const doc = makeDocument(VALID_ACH);
      const links = provideDocumentLinks(doc);
      const paddingLinks = links.filter(l => l.range.start.line >= 5);
      expect(paddingLinks).toHaveLength(0);
    });
  });

  describe('empty document', () => {
    it('returns empty for empty document', () => {
      const doc = makeDocument('');
      const links = provideDocumentLinks(doc);
      expect(links).toHaveLength(0);
    });
  });

  describe('batch header', () => {
    it('creates link for ODFI routing on batch header', () => {
      const doc = makeDocument(VALID_ACH);
      const links = provideDocumentLinks(doc);
      // Batch header line 1 has odfiIdentification
      const bhLinks = links.filter(l => l.range.start.line === 1);
      expect(bhLinks.length).toBeGreaterThanOrEqual(0);
    });
  });
});
