import { TextEdit, Range } from 'vscode-languageserver/node';
import { Writer } from 'ach-ts';
import type { ACHDocumentState } from './achDocument';

/**
 * Format the ACH document using the ach-ts Writer.
 * If nothing was parsed at all, return no edits.
 * When there are parse errors, bypass Writer validation to
 * format whatever was successfully parsed.
 */
export function provideFormatting(state: ACHDocumentState): TextEdit[] {
  if (!state.file) {
    return [];
  }

  try {
    const writer = new Writer();
    if (state.parseErrors.length > 0) {
      writer.bypassValidation = true;
    }
    const formatted = writer.write(state.file);

    const lines = state.text.split('\n');
    const lastLine = lines.length - 1;
    const lastChar = lines[lastLine]?.length ?? 0;

    return [
      TextEdit.replace(
        Range.create(0, 0, lastLine, lastChar),
        formatted
      ),
    ];
  } catch {
    return [];
  }
}
