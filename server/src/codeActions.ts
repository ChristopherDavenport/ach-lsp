import {
  CodeAction,
  CodeActionKind,
  TextEdit,
  CodeActionParams,
} from 'vscode-languageserver/node';
import { CalculateCheckDigit } from 'ach-ts';
import type { ACHDocumentState } from './achDocument';

/**
 * Provide quick-fix code actions for known diagnostic codes.
 */
export function provideCodeActions(
  state: ACHDocumentState,
  params: CodeActionParams
): CodeAction[] {
  const actions: CodeAction[] = [];
  const lines = state.text.split('\n');

  for (const diagnostic of params.context.diagnostics) {
    if (diagnostic.source !== 'ach') continue;

    const line = lines[diagnostic.range.start.line];
    if (!line) continue;

    // Fix invalid check digit
    if (
      diagnostic.code === 'checkDigit' ||
      diagnostic.message.toLowerCase().includes('check digit')
    ) {
      const action = fixCheckDigit(line, diagnostic.range.start.line, params);
      if (action) actions.push(action);
    }

    // Fix line not being 94 characters
    if (
      diagnostic.message.toLowerCase().includes('record size') ||
      diagnostic.message.toLowerCase().includes('94')
    ) {
      if (line.length < 94) {
        actions.push({
          title: 'Pad line to 94 characters',
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          edit: {
            changes: {
              [params.textDocument.uri]: [
                TextEdit.replace(
                  {
                    start: { line: diagnostic.range.start.line, character: 0 },
                    end: { line: diagnostic.range.start.line, character: line.length },
                  },
                  line.padEnd(94)
                ),
              ],
            },
          },
        });
      }
    }

    // Fix record size field in file header
    if (
      diagnostic.message.toLowerCase().includes('record size') &&
      line.charAt(0) === '1'
    ) {
      const fixed = line.substring(0, 34) + '094' + line.substring(37);
      actions.push({
        title: 'Set record size to 094',
        kind: CodeActionKind.QuickFix,
        diagnostics: [diagnostic],
        edit: {
          changes: {
            [params.textDocument.uri]: [
              TextEdit.replace(
                {
                  start: { line: diagnostic.range.start.line, character: 34 },
                  end: { line: diagnostic.range.start.line, character: 37 },
                },
                '094'
              ),
            ],
          },
        },
      });
    }
  }

  return actions;
}

function fixCheckDigit(
  line: string,
  lineNumber: number,
  params: CodeActionParams
): CodeAction | null {
  const recordType = line.charAt(0);

  // Entry Detail (type 6): check digit at position 11, routing at positions 3-11
  if (recordType === '6') {
    const routing = line.substring(3, 11);
    try {
      const correctDigit = CalculateCheckDigit(routing);
      const currentDigit = line.charAt(11);
      if (correctDigit !== currentDigit) {
        return {
          title: `Fix check digit: ${currentDigit} → ${correctDigit}`,
          kind: CodeActionKind.QuickFix,
          edit: {
            changes: {
              [params.textDocument.uri]: [
                TextEdit.replace(
                  {
                    start: { line: lineNumber, character: 11 },
                    end: { line: lineNumber, character: 12 },
                  },
                  correctDigit
                ),
              ],
            },
          },
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}
