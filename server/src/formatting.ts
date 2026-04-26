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

/**
 * Format a range of lines in the ACH document.
 * Each line is padded/trimmed to exactly 94 characters.
 * Lines that can be reformatted via Writer are; otherwise
 * simple padding is applied.
 */
export function provideRangeFormatting(
  state: ACHDocumentState,
  range: Range
): TextEdit[] {
  const lines = state.text.split('\n');
  const startLine = range.start.line;
  const endLine = Math.min(range.end.line, lines.length - 1);
  const edits: TextEdit[] = [];

  for (let i = startLine; i <= endLine; i++) {
    const line = lines[i];
    if (line === undefined) continue;

    // Pad to 94 or trim trailing whitespace to 94
    const trimmed = line.replace(/\s+$/, '');
    const formatted = trimmed.padEnd(94).substring(0, 94);

    if (formatted !== line) {
      edits.push(
        TextEdit.replace(
          Range.create(i, 0, i, line.length),
          formatted
        )
      );
    }
  }

  return edits;
}
