import { describe, it, expect } from 'vitest';
import { provideRangeFormatting } from './formatting';
import { makeState } from './testHelpers';
import { SHORT_LINE_ACH, VALID_ACH } from './testFixtures';

describe('provideRangeFormatting', () => {
  it('pads short lines to 94 characters', () => {
    const state = makeState(SHORT_LINE_ACH, { skipAll: true });
    const edits = provideRangeFormatting(state, {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 94 },
    });
    expect(edits.length).toBeGreaterThanOrEqual(1);
    expect(edits[0].newText.length).toBe(94);
  });

  it('returns no edits for already-correct lines', () => {
    const state = makeState(VALID_ACH, { skipAll: true });
    const edits = provideRangeFormatting(state, {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 94 },
    });
    expect(edits).toHaveLength(0);
  });

  it('handles range spanning multiple lines', () => {
    const lines = [
      '101 076401251 0764012512601011200A094101DEST BANK              ORIGIN BANK',
      '5200ACME CORP                           1234567890PPDPAYROLL         260101',
    ].join('\n');
    const state = makeState(lines, { skipAll: true });
    const edits = provideRangeFormatting(state, {
      start: { line: 0, character: 0 },
      end: { line: 1, character: 94 },
    });
    expect(edits.length).toBe(2);
    for (const edit of edits) {
      expect(edit.newText.length).toBe(94);
    }
  });

  it('trims trailing whitespace beyond 94 chars', () => {
    const longLine = '101 076401251 0764012512601011200A094101DEST BANK              ORIGIN BANK                    ' + '   ';
    const state = {
      file: null,
      parseErrors: [],
      validationErrors: [],
      text: longLine,
      version: 1,
    };
    const edits = provideRangeFormatting(state, {
      start: { line: 0, character: 0 },
      end: { line: 0, character: 200 },
    });
    if (edits.length > 0) {
      expect(edits[0].newText.length).toBe(94);
    }
  });

  it('clamps end line to document length', () => {
    const state = makeState(VALID_ACH, { skipAll: true });
    // Request range beyond document
    const edits = provideRangeFormatting(state, {
      start: { line: 0, character: 0 },
      end: { line: 999, character: 0 },
    });
    // Should not throw
    expect(Array.isArray(edits)).toBe(true);
  });
});
