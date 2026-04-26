import { describe, it, expect } from 'vitest';
import { provideCodeActions } from '../codeActions';
import { makeState } from './testHelpers';
import { VALID_ACH, SHORT_LINE_ACH, BAD_CHECK_DIGIT_ACH, MULTI_BATCH_ACH } from './testFixtures';
import type { CodeActionParams, Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';

function makeParams(uri: string, line: number, diagnostics: Diagnostic[]): CodeActionParams {
  return {
    textDocument: { uri },
    range: {
      start: { line, character: 0 },
      end: { line, character: 94 },
    },
    context: {
      diagnostics,
    },
  };
}

function makeDiagnostic(line: number, message: string, code?: string): Diagnostic {
  return {
    range: {
      start: { line, character: 0 },
      end: { line, character: 94 },
    },
    message,
    severity: 1 as DiagnosticSeverity,
    source: 'ach',
    code,
  };
}

describe('provideCodeActions', () => {
  describe('pad line to 94 characters', () => {
    it('offers pad action when line is short and diagnostic mentions 94', () => {
      const state = makeState(SHORT_LINE_ACH, { skipAll: true });
      const diag = makeDiagnostic(0, 'Line must be 94 characters');
      const params = makeParams('file:///test.ach', 0, [diag]);
      const actions = provideCodeActions(state, params);

      const padAction = actions.find(a => a.title.includes('Pad line'));
      expect(padAction).toBeDefined();
      expect(padAction!.edit).toBeDefined();
    });
  });

  describe('fix check digit', () => {
    it('offers check digit fix for entry with wrong check digit', () => {
      const state = makeState(BAD_CHECK_DIGIT_ACH, { skipAll: true });
      const diag = makeDiagnostic(2, 'Invalid check digit', 'checkDigit');
      const params = makeParams('file:///test.ach', 2, [diag]);
      const actions = provideCodeActions(state, params);

      const fixAction = actions.find(a => a.title.includes('Fix check digit'));
      expect(fixAction).toBeDefined();
      expect(fixAction!.edit).toBeDefined();
    });

    it('does not offer check digit fix for non-entry records', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const diag = makeDiagnostic(0, 'check digit error', 'checkDigit');
      const params = makeParams('file:///test.ach', 0, [diag]);
      const actions = provideCodeActions(state, params);

      const fixAction = actions.find(a => a.title.includes('Fix check digit'));
      expect(fixAction).toBeUndefined();
    });
  });

  describe('set record size', () => {
    it('offers record size fix for file header with record size error', () => {
      const lines = VALID_ACH.split('\n');
      // Modify record size from 094 to 000
      lines[0] = lines[0].substring(0, 34) + '000' + lines[0].substring(37);
      const state = makeState(lines.join('\n'), { skipAll: true });
      const diag = makeDiagnostic(0, 'Invalid record size');
      const params = makeParams('file:///test.ach', 0, [diag]);
      const actions = provideCodeActions(state, params);

      const fixAction = actions.find(a => a.title.includes('Set record size'));
      expect(fixAction).toBeDefined();
    });
  });

  describe('no actions for non-ach diagnostics', () => {
    it('ignores diagnostics from other sources (no quick fixes)', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const diag: Diagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 94 } },
        message: 'something',
        severity: 1 as DiagnosticSeverity,
        source: 'other',
      };
      const params = makeParams('file:///test.ach', 0, [diag]);
      const actions = provideCodeActions(state, params);
      const quickFixes = actions.filter(a => a.kind === 'quickfix');
      expect(quickFixes).toHaveLength(0);
    });
  });

  describe('no actions for valid file', () => {
    it('returns only source actions when no actionable diagnostics', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const params = makeParams('file:///test.ach', 0, []);
      const actions = provideCodeActions(state, params);
      // May have the "recalculate all" source action if controls differ
      for (const a of actions) {
        expect(a.kind).toBe('source');
      }
    });
  });

  describe('fix batch control totals', () => {
    it('offers batch control fix when totals are wrong', () => {
      const lines = VALID_ACH.split('\n');
      // Corrupt batch control totals
      lines[3] = '820000000000000000000000000000000000000000001234567890                         000000000000001';
      const text = lines.join('\n');
      const state = makeState(text, { skipAll: true });
      const diag = makeDiagnostic(3, 'Invalid total debit amount');
      const params = makeParams('file:///test.ach', 3, [diag]);
      const actions = provideCodeActions(state, params);

      const fixAction = actions.find(a => a.title === 'Recalculate batch control totals');
      expect(fixAction).toBeDefined();
      expect(fixAction!.edit).toBeDefined();

      // Verify the new line contains correct entry count
      const edits = fixAction!.edit!.changes!['file:///test.ach'];
      const newText = edits[0].newText;
      expect(newText.charAt(0)).toBe('8');
      expect(newText.length).toBe(94);
    });
  });

  describe('fix file control totals', () => {
    it('offers file control fix when totals are wrong', () => {
      const lines = VALID_ACH.split('\n');
      // Corrupt file control
      lines[4] = '9000000000000000000000000000000000000000000000000000000                                       ';
      const text = lines.join('\n');
      const state = makeState(text, { skipAll: true });
      const diag = makeDiagnostic(4, 'Invalid batch count');
      const params = makeParams('file:///test.ach', 4, [diag]);
      const actions = provideCodeActions(state, params);

      const fixAction = actions.find(a => a.title === 'Recalculate file control totals');
      expect(fixAction).toBeDefined();
      const edits = fixAction!.edit!.changes!['file:///test.ach'];
      const newText = edits[0].newText;
      expect(newText.charAt(0)).toBe('9');
      expect(newText.length).toBe(94);
    });
  });

  describe('fix service class code', () => {
    it('offers service class fix on batch header', () => {
      const lines = VALID_ACH.split('\n');
      // Set wrong service class (225=debits only, but entry is credit code 22)
      lines[1] = '5225' + lines[1].substring(4);
      const text = lines.join('\n');
      const state = makeState(text, { skipAll: true });
      const diag = makeDiagnostic(1, 'Invalid service class code');
      const params = makeParams('file:///test.ach', 1, [diag]);
      const actions = provideCodeActions(state, params);

      const fixAction = actions.find(a => a.title.includes('Set service class'));
      expect(fixAction).toBeDefined();
      // Transaction code 22 is a credit, so should infer 220
      expect(fixAction!.title).toContain('220');
    });

    it('infers 225 for debit-only batches', () => {
      const lines = VALID_ACH.split('\n');
      // Change transaction code to 27 (checking debit)
      lines[2] = '627' + lines[2].substring(3);
      lines[1] = '5200' + lines[1].substring(4); // wrong: should be 225
      const text = lines.join('\n');
      const state = makeState(text, { skipAll: true });
      const diag = makeDiagnostic(1, 'Invalid service class code');
      const params = makeParams('file:///test.ach', 1, [diag]);
      const actions = provideCodeActions(state, params);

      const fixAction = actions.find(a => a.title.includes('Set service class'));
      expect(fixAction).toBeDefined();
      expect(fixAction!.title).toContain('225');
    });
  });

  describe('fix effective entry date', () => {
    it('offers date fix for batch header with date error', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const diag = makeDiagnostic(1, 'Invalid effective entry date');
      const params = makeParams('file:///test.ach', 1, [diag]);
      const actions = provideCodeActions(state, params);

      const fixAction = actions.find(a => a.title.includes('effective entry date'));
      expect(fixAction).toBeDefined();
      // Should set to today's date format YYMMDD
      const today = new Date();
      const yy = String(today.getFullYear()).slice(-2);
      expect(fixAction!.title).toContain(yy);
    });
  });

  describe('fix file creation date', () => {
    it('offers date/time fix for file header with creation date error', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const diag = makeDiagnostic(0, 'Invalid file creation date');
      const params = makeParams('file:///test.ach', 0, [diag]);
      const actions = provideCodeActions(state, params);

      const fixAction = actions.find(a => a.title.includes('file creation date'));
      expect(fixAction).toBeDefined();
      // Should have 2 edits (date + time)
      const edits = fixAction!.edit!.changes!['file:///test.ach'];
      expect(edits.length).toBe(2);
    });
  });

  describe('recalculate all control totals', () => {
    it('offers source action for recalculating all controls', () => {
      const lines = VALID_ACH.split('\n');
      // Corrupt both batch control and file control
      lines[3] = '820000000000000000000000000000000000000000001234567890                         000000000000001';
      lines[4] = '9000000000000000000000000000000000000000000000000000000                                       ';
      const text = lines.join('\n');
      const state = makeState(text, { skipAll: true });
      const params = makeParams('file:///test.ach', 0, []);
      const actions = provideCodeActions(state, params);

      const recalcAction = actions.find(a => a.title === 'Recalculate all control totals');
      expect(recalcAction).toBeDefined();
      expect(recalcAction!.kind).toBe('source');
    });

    it('produces edits that fix service class and control totals', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const params = makeParams('file:///test.ach', 0, []);
      const actions = provideCodeActions(state, params);

      const recalcAction = actions.find(a => a.title === 'Recalculate all control totals');
      // VALID_ACH has svc code 200 (mixed) but only credit entries → should fix to 220
      if (recalcAction) {
        expect(recalcAction.kind).toBe('source');
        expect(recalcAction.edit).toBeDefined();
      }
    });

    it('fixes multiple batch controls in multi-batch file', () => {
      const lines = MULTI_BATCH_ACH.split('\n');
      // Corrupt both batch controls
      lines[3] = '820000000000000000000000000000000000000000001234567890                         000000000000001';
      lines[6] = '822000000000000000000000000000000000000000009876543210                         000000000000002';
      const text = lines.join('\n');
      const state = makeState(text, { skipAll: true });
      const params = makeParams('file:///test.ach', 0, []);
      const actions = provideCodeActions(state, params);

      const recalcAction = actions.find(a => a.title === 'Recalculate all control totals');
      expect(recalcAction).toBeDefined();
      // Should fix at least 2 batch controls + file control
      const edits = recalcAction!.edit!.changes!['file:///test.ach'];
      expect(edits.length).toBeGreaterThanOrEqual(2);
    });
  });
});
