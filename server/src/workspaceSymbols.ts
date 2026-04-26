import { SymbolInformation, SymbolKind, Location, Range } from 'vscode-languageserver/node';
import type { ACHDocumentState } from './achDocument';

/**
 * Provide workspace-level symbols for ACH files.
 * Returns company names, batch descriptions, and entry names that match the query.
 */
export function provideWorkspaceSymbols(
  query: string,
  documentStates: Map<string, ACHDocumentState>
): SymbolInformation[] {
  const symbols: SymbolInformation[] = [];
  const lowerQuery = query.toLowerCase();

  for (const [uri, state] of documentStates) {
    if (state.file) {
      symbolsFromFile(uri, state, lowerQuery, symbols);
    } else {
      symbolsFromText(uri, state.text, lowerQuery, symbols);
    }
  }

  return symbols;
}

function symbolsFromFile(
  uri: string,
  state: ACHDocumentState,
  query: string,
  symbols: SymbolInformation[]
): void {
  const file = state.file!;

  // File header: origin/destination names
  const originName = file.header.immediateOriginName?.trim();
  const destName = file.header.immediateDestinationName?.trim();
  if (originName && matches(originName, query)) {
    symbols.push({
      name: originName,
      kind: SymbolKind.File,
      location: Location.create(uri, lineRange(file.header.lineNumber - 1)),
      containerName: 'File Header — Origin',
    });
  }
  if (destName && matches(destName, query)) {
    symbols.push({
      name: destName,
      kind: SymbolKind.File,
      location: Location.create(uri, lineRange(file.header.lineNumber - 1)),
      containerName: 'File Header — Destination',
    });
  }

  for (const batch of file.batches) {
    const bh = batch.getHeader();
    const companyName = bh.companyName?.trim();
    const entryDesc = bh.companyEntryDescription?.trim();

    if (companyName && matches(companyName, query)) {
      symbols.push({
        name: companyName,
        kind: SymbolKind.Module,
        location: Location.create(uri, lineRange(bh.lineNumber - 1)),
        containerName: `Batch ${bh.batchNumber} — ${bh.standardEntryClassCode}`,
      });
    }

    if (entryDesc && matches(entryDesc, query)) {
      symbols.push({
        name: entryDesc,
        kind: SymbolKind.Property,
        location: Location.create(uri, lineRange(bh.lineNumber - 1)),
        containerName: `Batch ${bh.batchNumber}`,
      });
    }

    for (const entry of batch.getEntries()) {
      const name = entry.individualName?.trim();
      if (name && matches(name, query)) {
        symbols.push({
          name,
          kind: SymbolKind.Function,
          location: Location.create(uri, lineRange(entry.lineNumber - 1)),
          containerName: `${companyName} — ${bh.standardEntryClassCode}`,
        });
      }
    }
  }

  for (const batch of file.iatBatches) {
    const bh = batch.header;
    const entryDesc = bh.companyEntryDescription?.trim();

    if (entryDesc && matches(entryDesc, query)) {
      symbols.push({
        name: entryDesc,
        kind: SymbolKind.Property,
        location: Location.create(uri, lineRange(bh.lineNumber - 1)),
        containerName: `IAT Batch ${bh.batchNumber}`,
      });
    }
  }
}

function symbolsFromText(
  uri: string,
  text: string,
  query: string,
  symbols: SymbolInformation[]
): void {
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue;

    const recordType = line.charAt(0);

    if (recordType === '1') {
      const destName = line.substring(40, 63).trim();
      const originName = line.substring(63, 86).trim();
      if (destName && matches(destName, query)) {
        symbols.push({
          name: destName,
          kind: SymbolKind.File,
          location: Location.create(uri, lineRange(i)),
          containerName: 'File Header — Destination',
        });
      }
      if (originName && matches(originName, query)) {
        symbols.push({
          name: originName,
          kind: SymbolKind.File,
          location: Location.create(uri, lineRange(i)),
          containerName: 'File Header — Origin',
        });
      }
    }

    if (recordType === '5') {
      const companyName = line.substring(4, 20).trim();
      if (companyName && matches(companyName, query)) {
        symbols.push({
          name: companyName,
          kind: SymbolKind.Module,
          location: Location.create(uri, lineRange(i)),
          containerName: 'Batch Header',
        });
      }
    }

    if (recordType === '6') {
      const name = line.substring(54, 76).trim();
      if (name && matches(name, query)) {
        symbols.push({
          name,
          kind: SymbolKind.Function,
          location: Location.create(uri, lineRange(i)),
          containerName: 'Entry Detail',
        });
      }
    }
  }
}

function matches(text: string, query: string): boolean {
  if (query === '') return true;
  return text.toLowerCase().includes(query);
}

function lineRange(line: number): Range {
  return Range.create(line, 0, line, 94);
}
