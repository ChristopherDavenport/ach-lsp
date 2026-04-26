import { Location, Range } from 'vscode-languageserver/node';
import type { ACHDocumentState } from './achDocument';

/**
 * Provide references for ACH records.
 * Shows all related records for the current line:
 * - Batch header: all entries + addenda + batch control in that batch
 * - Entry detail: batch header, all addenda on this entry, batch control
 * - Batch control: batch header + all entries + addenda in that batch
 * - Addenda: parent entry + sibling addenda
 * - File header / file control: each other
 */
export function provideReferences(
  state: ACHDocumentState,
  uri: string,
  line: number
): Location[] {
  if (state.file) {
    return referencesFromFile(state, uri, line);
  }
  return referencesFromText(state.text, uri, line);
}

function referencesFromFile(state: ACHDocumentState, uri: string, line: number): Location[] {
  const file = state.file!;
  const achLine = line + 1; // ach-ts is 1-based
  const refs: Location[] = [];

  // File header → file control
  if (file.header.lineNumber === achLine) {
    if (file.control.lineNumber > 0) {
      refs.push(loc(uri, file.control.lineNumber - 1));
    }
    return refs;
  }

  // File control → file header
  if (file.control.lineNumber === achLine) {
    refs.push(loc(uri, file.header.lineNumber - 1));
    return refs;
  }

  for (const batch of file.batches) {
    const bh = batch.getHeader();
    const bc = batch.getControl();
    const entries = batch.getEntries();

    // Collect all lines in this batch
    const batchLines = [bh.lineNumber, bc.lineNumber];
    for (const entry of entries) {
      batchLines.push(entry.lineNumber);
      for (const a of getAllAddenda(entry)) {
        batchLines.push(a.lineNumber);
      }
    }

    if (!batchLines.includes(achLine)) continue;

    // On batch header or batch control: reference all other records in batch
    if (bh.lineNumber === achLine || bc.lineNumber === achLine) {
      for (const l of batchLines) {
        if (l !== achLine) refs.push(loc(uri, l - 1));
      }
      return refs;
    }

    // On entry: reference batch header, batch control, and all addenda for this entry
    for (const entry of entries) {
      if (entry.lineNumber === achLine) {
        refs.push(loc(uri, bh.lineNumber - 1));
        for (const a of getAllAddenda(entry)) {
          refs.push(loc(uri, a.lineNumber - 1));
        }
        refs.push(loc(uri, bc.lineNumber - 1));
        return refs;
      }

      // On addenda: reference parent entry and sibling addenda
      const addenda = getAllAddenda(entry);
      for (const a of addenda) {
        if (a.lineNumber === achLine) {
          refs.push(loc(uri, entry.lineNumber - 1));
          for (const sibling of addenda) {
            if (sibling.lineNumber !== achLine) {
              refs.push(loc(uri, sibling.lineNumber - 1));
            }
          }
          return refs;
        }
      }
    }
  }

  for (const batch of file.iatBatches) {
    const bh = batch.header;
    const bc = batch.control;

    const batchLines = [bh.lineNumber, bc.lineNumber];
    for (const entry of batch.entries) {
      batchLines.push(entry.lineNumber);
      for (const a of getAllIATAddenda(entry)) {
        batchLines.push(a.lineNumber);
      }
    }

    if (!batchLines.includes(achLine)) continue;

    if (bh.lineNumber === achLine || bc.lineNumber === achLine) {
      for (const l of batchLines) {
        if (l !== achLine) refs.push(loc(uri, l - 1));
      }
      return refs;
    }

    for (const entry of batch.entries) {
      if (entry.lineNumber === achLine) {
        refs.push(loc(uri, bh.lineNumber - 1));
        for (const a of getAllIATAddenda(entry)) {
          refs.push(loc(uri, a.lineNumber - 1));
        }
        refs.push(loc(uri, bc.lineNumber - 1));
        return refs;
      }

      const addenda = getAllIATAddenda(entry);
      for (const a of addenda) {
        if (a.lineNumber === achLine) {
          refs.push(loc(uri, entry.lineNumber - 1));
          for (const sibling of addenda) {
            if (sibling.lineNumber !== achLine) {
              refs.push(loc(uri, sibling.lineNumber - 1));
            }
          }
          return refs;
        }
      }
    }
  }

  return refs;
}

function referencesFromText(text: string, uri: string, line: number): Location[] {
  const lines = text.split('\n');
  const recordType = lines[line]?.charAt(0);
  if (!recordType) return [];

  const refs: Location[] = [];

  switch (recordType) {
    case '1': {
      // File header → file control
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i]?.charAt(0) === '9' && !/^9+$/.test(lines[i])) {
          refs.push(loc(uri, i));
          break;
        }
      }
      break;
    }
    case '5': {
      // Batch header → entries, addenda, batch control
      for (let i = line + 1; i < lines.length; i++) {
        const rt = lines[i]?.charAt(0);
        if (rt === '6' || rt === '7') refs.push(loc(uri, i));
        else if (rt === '8') { refs.push(loc(uri, i)); break; }
        else if (rt === '5' || rt === '9') break;
      }
      break;
    }
    case '6': {
      // Entry → batch header, addenda, batch control
      for (let i = line - 1; i >= 0; i--) {
        if (lines[i]?.charAt(0) === '5') { refs.push(loc(uri, i)); break; }
      }
      for (let i = line + 1; i < lines.length; i++) {
        const rt = lines[i]?.charAt(0);
        if (rt === '7') refs.push(loc(uri, i));
        else break;
      }
      for (let i = line + 1; i < lines.length; i++) {
        if (lines[i]?.charAt(0) === '8') { refs.push(loc(uri, i)); break; }
        if (lines[i]?.charAt(0) === '9') break;
      }
      break;
    }
    case '7': {
      // Addenda → parent entry
      for (let i = line - 1; i >= 0; i--) {
        if (lines[i]?.charAt(0) === '6') { refs.push(loc(uri, i)); break; }
      }
      break;
    }
    case '8': {
      // Batch control → batch header + all entries/addenda
      for (let i = line - 1; i >= 0; i--) {
        const rt = lines[i]?.charAt(0);
        if (rt === '6' || rt === '7') refs.push(loc(uri, i));
        else if (rt === '5') { refs.push(loc(uri, i)); break; }
      }
      break;
    }
    case '9': {
      if (!/^9+$/.test(lines[line])) {
        // File control → file header
        if (lines[0]?.charAt(0) === '1') refs.push(loc(uri, 0));
      }
      break;
    }
  }

  return refs;
}

function loc(uri: string, line: number): Location {
  return Location.create(uri, Range.create(line, 0, line, 94));
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
  for (const a of singles) { if (a) result.push(a); }
  for (const a of entry.addenda17 || []) result.push(a);
  for (const a of entry.addenda18 || []) result.push(a);
  return result;
}
