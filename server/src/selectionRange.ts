import { SelectionRange, Range } from 'vscode-languageserver/node';
import type { ACHDocumentState } from './achDocument';
import { getSecCodeForLine } from '../../shared/src/achConstants';
import { recordTypeToFieldSpecs, FieldSpec } from 'ach-ts';
import { addendaFieldsByTypeCode } from './achFieldUtils';

/**
 * Provide selection ranges for ACH files.
 * Expansion: field → record (line) → batch → entire file
 */
export function provideSelectionRanges(
  state: ACHDocumentState,
  positions: { line: number; character: number }[]
): SelectionRange[] {
  const lines = state.text.split('\n');

  return positions.map(pos => {
    const ranges = buildSelectionChain(state, lines, pos.line, pos.character);
    return chainToSelectionRange(ranges);
  });
}

function buildSelectionChain(
  state: ACHDocumentState,
  lines: string[],
  line: number,
  character: number
): Range[] {
  const chain: Range[] = [];
  const lineText = lines[line];
  if (!lineText) return [fullDocRange(lines)];

  // 1. Field range (innermost)
  const fieldRange = getFieldRange(lineText, lines, line, character);
  if (fieldRange) {
    chain.push(fieldRange);
  }

  // 2. Record (full line)
  const lineLen = Math.min(lineText.length, 94);
  chain.push(Range.create(line, 0, line, lineLen));

  // 3. Batch range (if inside a batch)
  const batchRange = getBatchRange(state, lines, line);
  if (batchRange) {
    chain.push(batchRange);
  }

  // 4. Entire file
  chain.push(fullDocRange(lines));

  // Deduplicate identical ranges
  return dedup(chain);
}

function getFieldRange(
  lineText: string,
  lines: string[],
  lineIndex: number,
  character: number
): Range | null {
  if (lineText.length === 0) return null;
  const recordType = lineText.charAt(0);
  if (recordType === '9' && /^9+$/.test(lineText)) return null;

  let specs: FieldSpec[] | undefined;
  if (recordType === '7') {
    const typeCode = lineText.substring(1, 3);
    specs = addendaFieldsByTypeCode[typeCode];
  } else {
    const secCode = getSecCodeForLine(lines, lineIndex);
    specs = recordTypeToFieldSpecs(recordType, {
      secCode,
      isADV: secCode === 'ADV',
    });
  }

  if (!specs) return null;

  for (const spec of specs) {
    if (character >= spec.start && character < spec.end) {
      const end = Math.min(spec.end, lineText.length);
      return Range.create(lineIndex, spec.start, lineIndex, end);
    }
  }

  return null;
}

function getBatchRange(
  state: ACHDocumentState,
  lines: string[],
  line: number
): Range | null {
  if (state.file) {
    return getBatchRangeFromFile(state, line);
  }
  return getBatchRangeFromText(lines, line);
}

function getBatchRangeFromFile(state: ACHDocumentState, line: number): Range | null {
  const achLine = line + 1;
  const file = state.file!;

  for (const batch of file.batches) {
    const bh = batch.getHeader();
    const bc = batch.getControl();
    if (achLine >= bh.lineNumber && achLine <= bc.lineNumber) {
      return Range.create(bh.lineNumber - 1, 0, bc.lineNumber - 1, 94);
    }
  }

  for (const batch of file.iatBatches) {
    const bh = batch.header;
    const bc = batch.control;
    if (achLine >= bh.lineNumber && achLine <= bc.lineNumber) {
      return Range.create(bh.lineNumber - 1, 0, bc.lineNumber - 1, 94);
    }
  }

  return null;
}

function getBatchRangeFromText(lines: string[], line: number): Range | null {
  let batchStart: number | null = null;

  // Scan backward for batch header
  for (let i = line; i >= 0; i--) {
    const rt = lines[i]?.charAt(0);
    if (rt === '5') { batchStart = i; break; }
    if (rt === '1' || rt === '9') break;
  }

  if (batchStart === null) return null;

  // Scan forward for batch control
  for (let i = batchStart + 1; i < lines.length; i++) {
    const rt = lines[i]?.charAt(0);
    if (rt === '8') {
      return Range.create(batchStart, 0, i, Math.min(lines[i].length, 94));
    }
    if (rt === '5' || rt === '9') break; // next batch or file control
  }

  // No control found — partial batch
  return Range.create(batchStart, 0, line, Math.min(lines[line].length, 94));
}

function fullDocRange(lines: string[]): Range {
  const lastLine = Math.max(0, lines.length - 1);
  const lastChar = lines[lastLine]?.length ?? 0;
  return Range.create(0, 0, lastLine, lastChar);
}

function dedup(ranges: Range[]): Range[] {
  const result: Range[] = [];
  for (const r of ranges) {
    const last = result[result.length - 1];
    if (last &&
      last.start.line === r.start.line &&
      last.start.character === r.start.character &&
      last.end.line === r.end.line &&
      last.end.character === r.end.character) {
      continue;
    }
    result.push(r);
  }
  return result;
}

function chainToSelectionRange(ranges: Range[]): SelectionRange {
  if (ranges.length === 0) {
    return { range: Range.create(0, 0, 0, 0) };
  }

  // Build from outermost to innermost, so last range is root
  let current: SelectionRange = { range: ranges[ranges.length - 1] };

  for (let i = ranges.length - 2; i >= 0; i--) {
    current = { range: ranges[i], parent: current };
  }

  return current;
}
