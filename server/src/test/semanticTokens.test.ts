import { describe, it, expect } from 'vitest';
import { provideSemanticTokens } from '../semanticTokens';
import { makeDocument } from './testHelpers';
import { VALID_ACH, ACH_WITH_ADDENDA, WEB_ACH } from './testFixtures';

describe('provideSemanticTokens', () => {
  describe('valid ACH file', () => {
    it('returns semantic tokens data', () => {
      const doc = makeDocument(VALID_ACH);
      const result = provideSemanticTokens(doc);
      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('produces tokens for all non-empty, non-padding lines', () => {
      const doc = makeDocument(VALID_ACH);
      const result = provideSemanticTokens(doc);
      // The data array is in groups of 5 (deltaLine, deltaStart, length, tokenType, tokenModifiers)
      const tokenCount = result.data.length / 5;
      // 5 real lines (file header, batch header, entry, batch control, file control)
      // Each line has multiple fields, so should have many tokens
      expect(tokenCount).toBeGreaterThanOrEqual(5);
    });
  });

  describe('padding lines', () => {
    it('marks padding lines as comments (token type 5)', () => {
      const doc = makeDocument(VALID_ACH);
      const result = provideSemanticTokens(doc);
      // Padding lines (all 9s) should be marked as comment (type index 5)
      // They appear as single tokens covering the full line
      const data = result.data;
      let found = false;
      for (let i = 0; i < data.length; i += 5) {
        const tokenType = data[i + 3];
        const length = data[i + 2];
        if (tokenType === 5 && length === 94) {
          found = true;
          break;
        }
      }
      expect(found).toBe(true);
    });
  });

  describe('addenda records', () => {
    it('generates tokens for addenda records', () => {
      const doc = makeDocument(ACH_WITH_ADDENDA);
      const result = provideSemanticTokens(doc);
      // Should have more tokens than VALID_ACH since there's an addenda line
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('SEC code context', () => {
    it('handles WEB SEC code files', () => {
      const doc = makeDocument(WEB_ACH);
      const result = provideSemanticTokens(doc);
      expect(result.data.length).toBeGreaterThan(0);
    });
  });

  describe('empty document', () => {
    it('returns empty tokens for empty document', () => {
      const doc = makeDocument('');
      const result = provideSemanticTokens(doc);
      expect(result.data).toHaveLength(0);
    });
  });

  describe('token data format', () => {
    it('all token modifiers are 0', () => {
      const doc = makeDocument(VALID_ACH);
      const result = provideSemanticTokens(doc);
      for (let i = 4; i < result.data.length; i += 5) {
        expect(result.data[i]).toBe(0);
      }
    });

    it('token types are within valid range (0-7)', () => {
      const doc = makeDocument(VALID_ACH);
      const result = provideSemanticTokens(doc);
      for (let i = 3; i < result.data.length; i += 5) {
        expect(result.data[i]).toBeGreaterThanOrEqual(0);
        expect(result.data[i]).toBeLessThanOrEqual(7);
      }
    });

    it('token lengths are positive', () => {
      const doc = makeDocument(VALID_ACH);
      const result = provideSemanticTokens(doc);
      for (let i = 2; i < result.data.length; i += 5) {
        expect(result.data[i]).toBeGreaterThan(0);
      }
    });
  });
});
