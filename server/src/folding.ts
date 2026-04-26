import { FoldingRange, FoldingRangeKind } from 'vscode-languageserver/node';
import type { ACHDocumentState } from './achDocument';
import type { EntryDetail, IATEntryDetail } from 'ach-ts';

function lastAddendaLine(entry: EntryDetail): number | null {
  let last: number | null = null;
  if (entry.addenda02) last = entry.addenda02.lineNumber;
  for (const a of entry.addenda05) last = a.lineNumber;
  if (entry.addenda98 && entry.addenda98.lineNumber > (last ?? 0)) last = entry.addenda98.lineNumber;
  if (entry.addenda98Refused && entry.addenda98Refused.lineNumber > (last ?? 0)) last = entry.addenda98Refused.lineNumber;
  if (entry.addenda99 && entry.addenda99.lineNumber > (last ?? 0)) last = entry.addenda99.lineNumber;
  if (entry.addenda99Contested && entry.addenda99Contested.lineNumber > (last ?? 0)) last = entry.addenda99Contested.lineNumber;
  if (entry.addenda99Dishonored && entry.addenda99Dishonored.lineNumber > (last ?? 0)) last = entry.addenda99Dishonored.lineNumber;
  return last;
}

function lastIATAddendaLine(entry: IATEntryDetail): number | null {
  let last: number | null = null;
  const singles = [entry.addenda10, entry.addenda11, entry.addenda12, entry.addenda13, entry.addenda14, entry.addenda15, entry.addenda16, entry.addenda98, entry.addenda99];
  for (const a of singles) {
    if (a && a.lineNumber > (last ?? 0)) last = a.lineNumber;
  }
  for (const a of entry.addenda17) { if (a.lineNumber > (last ?? 0)) last = a.lineNumber; }
  for (const a of entry.addenda18) { if (a.lineNumber > (last ?? 0)) last = a.lineNumber; }
  return last;
}

function foldingFromFile(state: ACHDocumentState): FoldingRange[] {
  const file = state.file!;
  const ranges: FoldingRange[] = [];

  for (const batch of file.batches) {
    const bh = batch.getHeader();
    const bc = batch.getControl();

    // Batch fold: header → control
    ranges.push({
      startLine: bh.lineNumber - 1,
      endLine: bc.lineNumber - 1,
      kind: FoldingRangeKind.Region,
    });

    // Entry + addenda folds
    for (const entry of batch.getEntries()) {
      const addendaEnd = lastAddendaLine(entry);
      if (addendaEnd !== null) {
        ranges.push({
          startLine: entry.lineNumber - 1,
          endLine: addendaEnd - 1,
          kind: FoldingRangeKind.Region,
        });
      }
    }
  }

  for (const batch of file.iatBatches) {
    const bh = batch.header;
    const bc = batch.control;

    ranges.push({
      startLine: bh.lineNumber - 1,
      endLine: bc.lineNumber - 1,
      kind: FoldingRangeKind.Region,
    });

    for (const entry of batch.entries) {
      const addendaEnd = lastIATAddendaLine(entry);
      if (addendaEnd !== null) {
        ranges.push({
          startLine: entry.lineNumber - 1,
          endLine: addendaEnd - 1,
          kind: FoldingRangeKind.Region,
        });
      }
    }
  }

  return ranges;
}

/**
 * Fallback: build folding ranges from raw text when parsing fails.
 */
function foldingFromText(text: string): FoldingRange[] {
  const lines = text.split('\n');
  const ranges: FoldingRange[] = [];

  let batchStartLine: number | null = null;
  let entryStartLine: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue;

    const recordType = line.charAt(0);

    switch (recordType) {
      case '5': {
        if (entryStartLine !== null) {
          ranges.push({ startLine: entryStartLine, endLine: i - 1, kind: FoldingRangeKind.Region });
          entryStartLine = null;
        }
        batchStartLine = i;
        break;
      }
      case '6': {
        if (entryStartLine !== null) {
          ranges.push({ startLine: entryStartLine, endLine: i - 1, kind: FoldingRangeKind.Region });
        }
        entryStartLine = i;
        break;
      }
      case '7': break;
      case '8': {
        if (entryStartLine !== null) {
          ranges.push({ startLine: entryStartLine, endLine: i - 1, kind: FoldingRangeKind.Region });
          entryStartLine = null;
        }
        if (batchStartLine !== null) {
          ranges.push({ startLine: batchStartLine, endLine: i, kind: FoldingRangeKind.Region });
          batchStartLine = null;
        }
        break;
      }
    }
  }

  if (entryStartLine !== null && batchStartLine !== null) {
    ranges.push({ startLine: entryStartLine, endLine: lines.length - 1, kind: FoldingRangeKind.Region });
  }
  if (batchStartLine !== null) {
    ranges.push({ startLine: batchStartLine, endLine: lines.length - 1, kind: FoldingRangeKind.Region });
  }

  return ranges;
}

/**
 * Provide folding ranges so batches (and entries with addenda) can be
 * collapsed directly in the editor.
 */
export function provideFoldingRanges(state: ACHDocumentState): FoldingRange[] {
  if (state.file) {
    return foldingFromFile(state);
  }
  return foldingFromText(state.text);
}
