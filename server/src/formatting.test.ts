import { describe, it, expect } from 'vitest';
import { provideFormatting } from './formatting';
import { Reader } from 'ach-ts';
import type { ACHDocumentState } from './achDocument';

// A minimal ACH file produced by Writer (every line is exactly 94 chars)
const VALID_ACH = [
  '101 076401251 0764012512601011200A094101DEST BANK              ORIGIN BANK                    ',
  '5200ACME CORP                           1234567890PPDPAYROLL         260101   0000000000000001',
  '622000000001                 0000050000               John Smith              0076401250000001',
  '820000000100076401250000000000000000000000001234567890                         000000000000001',
  '9000001000001000000010007640125000000000000000000000000                                       ',
  '9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999',
  '9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999',
  '9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999',
  '9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999',
  '9999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999999',
].join('\n');

function makeState(text: string, opts?: { skipAll?: boolean }): ACHDocumentState {
  const reader = new Reader(text);
  if (opts?.skipAll) {
    reader.setValidation({ skipAll: true });
  }
  const result = reader.readWithErrors();
  if (result.file) {
    result.file.annotateLineNumbers();
  }
  return {
    file: result.file,
    parseErrors: result.errors || [],
    validationErrors: [],
    text,
    version: 1,
  };
}

describe('provideFormatting', () => {
  it('formats a valid ACH file', () => {
    const state = makeState(VALID_ACH, { skipAll: true });
    expect(state.parseErrors).toHaveLength(0);

    const edits = provideFormatting(state);
    expect(edits).toHaveLength(1);
    expect(edits[0].newText).toBeTruthy();
    // Output should start with a file header record
    expect(edits[0].newText.startsWith('1')).toBe(true);
  });

  it('formats a file with parse errors (partial parse)', () => {
    // Corrupt the batch control line to trigger parse errors
    const lines = VALID_ACH.split('\n');
    lines[3] = 'XINVALID_BATCH_CONTROL_RECORD' + '0'.repeat(65);
    const corruptText = lines.join('\n');

    const state = makeState(corruptText);
    expect(state.parseErrors.length).toBeGreaterThan(0);
    expect(state.file).not.toBeNull();

    const edits = provideFormatting(state);
    expect(edits).toHaveLength(1);
    expect(edits[0].newText).toBeTruthy();
  });

  it('returns no edits when file is null', () => {
    const state: ACHDocumentState = {
      file: null,
      parseErrors: [new Error('total parse failure')],
      validationErrors: [],
      text: 'garbage',
      version: 1,
    };

    const edits = provideFormatting(state);
    expect(edits).toHaveLength(0);
  });

  it('returns no edits when Writer throws', () => {
    // Create a state with a file object that will cause Writer to throw
    // even with bypassValidation (e.g., completely empty file object)
    const state: ACHDocumentState = {
      file: { header: null } as any,
      parseErrors: [new Error('bad')],
      validationErrors: [],
      text: 'x',
      version: 1,
    };

    const edits = provideFormatting(state);
    expect(edits).toHaveLength(0);
  });
});
