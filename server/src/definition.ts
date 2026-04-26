import { Location, Range } from 'vscode-languageserver/node';
import type { ACHDocumentState } from './achDocument';

/**
 * Provide go-to-definition for ACH records.
 * - Batch header (5) → batch control (8)
 * - Batch control (8) → batch header (5)
 * - Entry detail (6) → containing batch header (5)
 * - Addenda (7) → containing entry detail (6)
 */
export function provideDefinition(
  state: ACHDocumentState,
  uri: string,
  line: number
): Location | null {
  if (state.file) {
    return definitionFromFile(state, uri, line);
  }
  return definitionFromText(state.text, uri, line);
}

function definitionFromFile(state: ACHDocumentState, uri: string, line: number): Location | null {
  const file = state.file!;
  const lspLine = line; // 0-based
  const achLine = line + 1; // ach-ts is 1-based

  for (const batch of file.batches) {
    const bh = batch.getHeader();
    const bc = batch.getControl();

    // Batch header → batch control
    if (bh.lineNumber === achLine) {
      return Location.create(uri, lineRange(bc.lineNumber - 1));
    }
    // Batch control → batch header
    if (bc.lineNumber === achLine) {
      return Location.create(uri, lineRange(bh.lineNumber - 1));
    }

    // Entry → batch header
    for (const entry of batch.getEntries()) {
      if (entry.lineNumber === achLine) {
        return Location.create(uri, lineRange(bh.lineNumber - 1));
      }
      // Addenda → entry
      const addenda = getAllAddenda(entry);
      for (const a of addenda) {
        if (a.lineNumber === achLine) {
          return Location.create(uri, lineRange(entry.lineNumber - 1));
        }
      }
    }
  }

  for (const batch of file.iatBatches) {
    const bh = batch.header;
    const bc = batch.control;

    if (bh.lineNumber === achLine) {
      return Location.create(uri, lineRange(bc.lineNumber - 1));
    }
    if (bc.lineNumber === achLine) {
      return Location.create(uri, lineRange(bh.lineNumber - 1));
    }

    for (const entry of batch.entries) {
      if (entry.lineNumber === achLine) {
        return Location.create(uri, lineRange(bh.lineNumber - 1));
      }
      const addenda = getAllIATAddenda(entry);
      for (const a of addenda) {
        if (a.lineNumber === achLine) {
          return Location.create(uri, lineRange(entry.lineNumber - 1));
        }
      }
    }
  }

  // File control → file header
  if (file.control.lineNumber === achLine) {
    return Location.create(uri, lineRange(file.header.lineNumber - 1));
  }

  return null;
}

function definitionFromText(text: string, uri: string, line: number): Location | null {
  const lines = text.split('\n');
  const recordType = lines[line]?.charAt(0);
  if (!recordType) return null;

  switch (recordType) {
    case '6': {
      // Entry → find preceding batch header
      for (let i = line - 1; i >= 0; i--) {
        if (lines[i]?.charAt(0) === '5') {
          return Location.create(uri, lineRange(i));
        }
      }
      break;
    }
    case '7': {
      // Addenda → find preceding entry
      for (let i = line - 1; i >= 0; i--) {
        if (lines[i]?.charAt(0) === '6') {
          return Location.create(uri, lineRange(i));
        }
      }
      break;
    }
    case '8': {
      // Batch control → find matching batch header
      for (let i = line - 1; i >= 0; i--) {
        if (lines[i]?.charAt(0) === '5') {
          return Location.create(uri, lineRange(i));
        }
      }
      break;
    }
    case '5': {
      // Batch header → find batch control
      for (let i = line + 1; i < lines.length; i++) {
        if (lines[i]?.charAt(0) === '8') {
          return Location.create(uri, lineRange(i));
          }
        if (lines[i]?.charAt(0) === '5') break; // next batch started
      }
      break;
    }
    case '9': {
      // File control → file header
      if (!/^9+$/.test(lines[line])) {
        if (lines[0]?.charAt(0) === '1') {
          return Location.create(uri, lineRange(0));
        }
      }
      break;
    }
  }

  return null;
}

function lineRange(line: number): Range {
  return Range.create(line, 0, line, 94);
}

function getAllAddenda(entry: any): { lineNumber: number }[] {
  const result: { lineNumber: number }[] = [];
  if (entry.addenda02) result.push(entry.addenda02);
  for (const a of entry.addenda05 || []) result.push(a);
  if (entry.addenda98) result.push(entry.addenda98);
  if (entry.addenda98Refused) result.push(entry.addenda98Refused);
  if (entry.addenda99) result.push(entry.addenda99);
  if (entry.addenda99Contested) result.push(entry.addenda99Contested);
  if (entry.addenda99Dishonored) result.push(entry.addenda99Dishonored);
  return result;
}

function getAllIATAddenda(entry: any): { lineNumber: number }[] {
  const result: { lineNumber: number }[] = [];
  const singles = [entry.addenda10, entry.addenda11, entry.addenda12, entry.addenda13,
    entry.addenda14, entry.addenda15, entry.addenda16, entry.addenda98, entry.addenda99];
  for (const a of singles) {
    if (a) result.push(a);
  }
  for (const a of entry.addenda17 || []) result.push(a);
  for (const a of entry.addenda18 || []) result.push(a);
  return result;
}
