import { describe, it, expect } from 'vitest';
import { provideCodeActions } from './codeActions';
import { makeState } from './testHelpers';
import { VALID_ACH, SHORT_LINE_ACH, BAD_CHECK_DIGIT_ACH } from './testFixtures';
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
    it('ignores diagnostics from other sources', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const diag: Diagnostic = {
        range: { start: { line: 0, character: 0 }, end: { line: 0, character: 94 } },
        message: 'something',
        severity: 1 as DiagnosticSeverity,
        source: 'other',
      };
      const params = makeParams('file:///test.ach', 0, [diag]);
      const actions = provideCodeActions(state, params);
      expect(actions).toHaveLength(0);
    });
  });

  describe('no actions for valid file', () => {
    it('returns empty when no actionable diagnostics', () => {
      const state = makeState(VALID_ACH, { skipAll: true });
      const params = makeParams('file:///test.ach', 0, []);
      const actions = provideCodeActions(state, params);
      expect(actions).toHaveLength(0);
    });
  });
});
