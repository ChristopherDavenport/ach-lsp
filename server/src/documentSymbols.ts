import {
  DocumentSymbol,
  SymbolKind,
  Range,
} from 'vscode-languageserver/node';
import type { ACHDocumentState } from './achDocument';
import type { Batcher } from 'ach-ts';
import type { IATBatch } from 'ach-ts';
import type { EntryDetail, IATEntryDetail } from 'ach-ts';

const TRANSACTION_TYPES: Record<number, string> = {
  22: 'Checking CR', 23: 'Checking CR Prenote', 24: 'Checking CR $0',
  27: 'Checking DR', 28: 'Checking DR Prenote', 29: 'Checking DR $0',
  32: 'Savings CR', 33: 'Savings CR Prenote', 34: 'Savings CR $0',
  37: 'Savings DR', 38: 'Savings DR Prenote', 39: 'Savings DR $0',
  42: 'GL CR', 47: 'GL DR', 52: 'Loan CR', 55: 'Loan DR',
};

const ADDENDA_TYPE_NAMES: Record<string, string> = {
  '02': 'POS/SHR/MTE terminal info',
  '05': 'Payment information',
  '10': 'IAT transaction type',
  '11': 'IAT originator name',
  '12': 'IAT originator address',
  '13': 'IAT ODFI info',
  '14': 'IAT RDFI info',
  '15': 'IAT receiver ID',
  '16': 'IAT receiver address',
  '17': 'IAT remittance',
  '18': 'IAT foreign bank',
  '98': 'Notification of Change',
  '99': 'Return',
};

function lineRange(lineNumber: number): Range {
  const line = lineNumber - 1; // ach-ts is 1-based, LSP is 0-based
  return Range.create(line, 0, line, 94);
}

function formatAmount(cents: number): string {
  return isNaN(cents) ? '?.??' : (cents / 100).toFixed(2);
}

function formatDate(yymmdd: string): string {
  if (yymmdd.length !== 6) return yymmdd;
  return `20${yymmdd.substring(0, 2)}-${yymmdd.substring(2, 4)}-${yymmdd.substring(4, 6)}`;
}

function addendaSymbolsForEntry(entry: EntryDetail): DocumentSymbol[] {
  const addenda: { typeCode: string; lineNumber: number }[] = [];
  if (entry.addenda02) addenda.push(entry.addenda02);
  for (const a of entry.addenda05) addenda.push(a);
  if (entry.addenda98) addenda.push(entry.addenda98);
  if (entry.addenda98Refused) addenda.push(entry.addenda98Refused);
  if (entry.addenda99) addenda.push(entry.addenda99);
  if (entry.addenda99Contested) addenda.push(entry.addenda99Contested);
  if (entry.addenda99Dishonored) addenda.push(entry.addenda99Dishonored);
  addenda.sort((a, b) => a.lineNumber - b.lineNumber);

  return addenda.map((a) => ({
    name: `Addenda ${a.typeCode}`,
    detail: ADDENDA_TYPE_NAMES[a.typeCode] || `Type ${a.typeCode}`,
    kind: SymbolKind.String,
    range: lineRange(a.lineNumber),
    selectionRange: lineRange(a.lineNumber),
  }));
}

function addendaSymbolsForIATEntry(entry: IATEntryDetail): DocumentSymbol[] {
  const addenda: { typeCode: string; lineNumber: number }[] = [];
  if (entry.addenda10) addenda.push({ typeCode: '10', lineNumber: entry.addenda10.lineNumber });
  if (entry.addenda11) addenda.push({ typeCode: '11', lineNumber: entry.addenda11.lineNumber });
  if (entry.addenda12) addenda.push({ typeCode: '12', lineNumber: entry.addenda12.lineNumber });
  if (entry.addenda13) addenda.push({ typeCode: '13', lineNumber: entry.addenda13.lineNumber });
  if (entry.addenda14) addenda.push({ typeCode: '14', lineNumber: entry.addenda14.lineNumber });
  if (entry.addenda15) addenda.push({ typeCode: '15', lineNumber: entry.addenda15.lineNumber });
  if (entry.addenda16) addenda.push({ typeCode: '16', lineNumber: entry.addenda16.lineNumber });
  for (const a of entry.addenda17) addenda.push({ typeCode: '17', lineNumber: a.lineNumber });
  for (const a of entry.addenda18) addenda.push({ typeCode: '18', lineNumber: a.lineNumber });
  if (entry.addenda98) addenda.push({ typeCode: '98', lineNumber: entry.addenda98.lineNumber });
  if (entry.addenda99) addenda.push({ typeCode: '99', lineNumber: entry.addenda99.lineNumber });
  addenda.sort((a, b) => a.lineNumber - b.lineNumber);

  return addenda.map((a) => ({
    name: `Addenda ${a.typeCode}`,
    detail: ADDENDA_TYPE_NAMES[a.typeCode] || `Type ${a.typeCode}`,
    kind: SymbolKind.String,
    range: lineRange(a.lineNumber),
    selectionRange: lineRange(a.lineNumber),
  }));
}

function symbolsFromFile(state: ACHDocumentState): DocumentSymbol[] {
  const file = state.file!;
  const symbols: DocumentSymbol[] = [];

  // File Header
  const h = file.header;
  symbols.push({
    name: 'File Header',
    detail: `${h.immediateOriginName.trim()} → ${h.immediateDestinationName.trim()} (${formatDate(h.fileCreationDate)})`,
    kind: SymbolKind.File,
    range: lineRange(h.lineNumber),
    selectionRange: lineRange(h.lineNumber),
  });

  // Merge regular and IAT batches, sorted by line number
  type BatchItem =
    | { kind: 'regular'; batch: Batcher }
    | { kind: 'iat'; batch: IATBatch };

  const allBatches: BatchItem[] = [
    ...file.batches.map((b): BatchItem => ({ kind: 'regular', batch: b })),
    ...file.iatBatches.map((b): BatchItem => ({ kind: 'iat', batch: b })),
  ];
  allBatches.sort((a, b) => {
    const aLine = a.kind === 'regular' ? a.batch.getHeader().lineNumber : a.batch.header.lineNumber;
    const bLine = b.kind === 'regular' ? b.batch.getHeader().lineNumber : b.batch.header.lineNumber;
    return aLine - bLine;
  });

  let batchIndex = 0;
  for (const item of allBatches) {
    batchIndex++;
    if (item.kind === 'regular') {
      const batch = item.batch;
      const bh = batch.getHeader();
      const bc = batch.getControl();
      const entries = batch.getEntries();

      const batchChildren: DocumentSymbol[] = [];

      // Batch Header
      batchChildren.push({
        name: 'Batch Header',
        detail: `${bh.standardEntryClassCode} ${bh.companyName.trim()}`,
        kind: SymbolKind.Property,
        range: lineRange(bh.lineNumber),
        selectionRange: lineRange(bh.lineNumber),
      });

      // Entries
      let entryIndex = 0;
      for (const entry of entries) {
        entryIndex++;
        const txType = TRANSACTION_TYPES[entry.transactionCode] || `Code ${entry.transactionCode}`;
        const entryChildren = addendaSymbolsForEntry(entry);

        const entryRange = entryChildren.length > 0
          ? Range.create(lineRange(entry.lineNumber).start, entryChildren[entryChildren.length - 1].range.end)
          : lineRange(entry.lineNumber);

        batchChildren.push({
          name: `Entry ${entryIndex}`,
          detail: `${entry.individualName.trim()} — $${formatAmount(entry.amount)} (${txType})`,
          kind: SymbolKind.Function,
          range: entryRange,
          selectionRange: lineRange(entry.lineNumber),
          children: entryChildren.length > 0 ? entryChildren : undefined,
        });
      }

      // Batch Control
      batchChildren.push({
        name: 'Batch Control',
        detail: `${bc.entryAddendaCount} entries — DR: $${formatAmount(bc.totalDebitEntryDollarAmount)} / CR: $${formatAmount(bc.totalCreditEntryDollarAmount)}`,
        kind: SymbolKind.Property,
        range: lineRange(bc.lineNumber),
        selectionRange: lineRange(bc.lineNumber),
      });

      const batchRange = Range.create(
        lineRange(bh.lineNumber).start,
        lineRange(bc.lineNumber).end,
      );

      symbols.push({
        name: `Batch ${batchIndex}`,
        detail: `${bh.standardEntryClassCode} — ${bh.companyName.trim()} — ${bh.companyEntryDescription.trim()}`,
        kind: SymbolKind.Module,
        range: batchRange,
        selectionRange: lineRange(bh.lineNumber),
        children: batchChildren,
      });
    } else {
      // IAT Batch
      const batch = item.batch;
      const bh = batch.header;
      const bc = batch.control;

      const batchChildren: DocumentSymbol[] = [];

      batchChildren.push({
        name: 'Batch Header',
        detail: `${bh.standardEntryClassCode} (IAT)`,
        kind: SymbolKind.Property,
        range: lineRange(bh.lineNumber),
        selectionRange: lineRange(bh.lineNumber),
      });

      let entryIndex = 0;
      for (const entry of batch.entries) {
        entryIndex++;
        const txType = TRANSACTION_TYPES[entry.transactionCode] || `Code ${entry.transactionCode}`;
        const entryChildren = addendaSymbolsForIATEntry(entry);

        const entryRange = entryChildren.length > 0
          ? Range.create(lineRange(entry.lineNumber).start, entryChildren[entryChildren.length - 1].range.end)
          : lineRange(entry.lineNumber);

        batchChildren.push({
          name: `Entry ${entryIndex}`,
          detail: `$${formatAmount(entry.amount)} (${txType})`,
          kind: SymbolKind.Function,
          range: entryRange,
          selectionRange: lineRange(entry.lineNumber),
          children: entryChildren.length > 0 ? entryChildren : undefined,
        });
      }

      batchChildren.push({
        name: 'Batch Control',
        detail: `${bc.entryAddendaCount} entries — DR: $${formatAmount(bc.totalDebitEntryDollarAmount)} / CR: $${formatAmount(bc.totalCreditEntryDollarAmount)}`,
        kind: SymbolKind.Property,
        range: lineRange(bc.lineNumber),
        selectionRange: lineRange(bc.lineNumber),
      });

      const batchRange = Range.create(
        lineRange(bh.lineNumber).start,
        lineRange(bc.lineNumber).end,
      );

      symbols.push({
        name: `Batch ${batchIndex}`,
        detail: `IAT — ${bh.companyEntryDescription.trim()}`,
        kind: SymbolKind.Module,
        range: batchRange,
        selectionRange: lineRange(bh.lineNumber),
        children: batchChildren,
      });
    }
  }

  // File Control
  const fc = file.control;
  if (fc.lineNumber > 0) {
    symbols.push({
      name: 'File Control',
      detail: `${fc.batchCount} batches, ${fc.entryAddendaCount} entries — DR: $${formatAmount(fc.totalDebitEntryDollarAmountInFile)} / CR: $${formatAmount(fc.totalCreditEntryDollarAmountInFile)}`,
      kind: SymbolKind.File,
      range: lineRange(fc.lineNumber),
      selectionRange: lineRange(fc.lineNumber),
    });
  }

  return symbols;
}

/**
 * Fallback: build symbols from raw text when parsing fails.
 */
function symbolsFromText(text: string): DocumentSymbol[] {
  const lines = text.split('\n');
  const symbols: DocumentSymbol[] = [];

  let currentBatch: DocumentSymbol | null = null;
  let currentEntry: DocumentSymbol | null = null;
  let batchIndex = 0;
  let entryIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue;

    const recordType = line.charAt(0);
    const lr = Range.create(i, 0, i, Math.min(line.length, 94));

    switch (recordType) {
      case '1': {
        const destName = line.substring(40, 63).trim();
        const originName = line.substring(63, 86).trim();
        const date = line.substring(23, 29);
        symbols.push({
          name: 'File Header',
          detail: `${originName} → ${destName} (${formatDate(date)})`,
          kind: SymbolKind.File,
          range: lr,
          selectionRange: lr,
        });
        break;
      }

      case '5': {
        batchIndex++;
        entryIndex = 0;
        const companyName = line.substring(4, 20).trim();
        const secCode = line.substring(50, 53).trim();
        const entryDesc = line.substring(53, 63).trim();

        currentBatch = {
          name: `Batch ${batchIndex}`,
          detail: `${secCode} — ${companyName} — ${entryDesc}`,
          kind: SymbolKind.Module,
          range: lr,
          selectionRange: lr,
          children: [],
        };
        break;
      }

      case '6': {
        entryIndex++;
        const name = line.substring(54, 76).trim();
        const amountStr = line.substring(29, 39);
        const amount = parseInt(amountStr, 10);
        const dollars = formatAmount(amount);
        const txCode = line.substring(1, 3);
        const txType = TRANSACTION_TYPES[parseInt(txCode, 10)] || `Code ${txCode}`;

        currentEntry = {
          name: `Entry ${entryIndex}`,
          detail: `${name} — $${dollars} (${txType})`,
          kind: SymbolKind.Function,
          range: lr,
          selectionRange: lr,
          children: [],
        };

        if (currentBatch) {
          currentBatch.children!.push(currentEntry);
        } else {
          symbols.push(currentEntry);
        }
        break;
      }

      case '7': {
        const addendaType = line.substring(1, 3);
        const addendaSymbol: DocumentSymbol = {
          name: `Addenda ${addendaType}`,
          detail: ADDENDA_TYPE_NAMES[addendaType] || `Type ${addendaType}`,
          kind: SymbolKind.String,
          range: lr,
          selectionRange: lr,
        };

        if (currentEntry) {
          currentEntry.children!.push(addendaSymbol);
        } else if (currentBatch) {
          currentBatch.children!.push(addendaSymbol);
        } else {
          symbols.push(addendaSymbol);
        }
        break;
      }

      case '8': {
        const entryCount = line.substring(4, 10).trim();
        const debitTotal = parseInt(line.substring(20, 32), 10);
        const creditTotal = parseInt(line.substring(32, 44), 10);

        const controlSymbol: DocumentSymbol = {
          name: 'Batch Control',
          detail: `${entryCount} entries — DR: $${formatAmount(debitTotal)} / CR: $${formatAmount(creditTotal)}`,
          kind: SymbolKind.Property,
          range: lr,
          selectionRange: lr,
        };

        if (currentBatch) {
          currentBatch.range = Range.create(currentBatch.range.start, lr.end);
          currentBatch.children!.push(controlSymbol);
          symbols.push(currentBatch);
          currentBatch = null;
        } else {
          symbols.push(controlSymbol);
        }
        currentEntry = null;
        break;
      }

      case '9': {
        if (/^9{94}$/.test(line)) continue;
        const batchCount = line.substring(1, 7).trim();
        const entryAddendaCount = line.substring(13, 21).trim();
        const totalDebit = parseInt(line.substring(31, 43), 10);
        const totalCredit = parseInt(line.substring(43, 55), 10);

        symbols.push({
          name: 'File Control',
          detail: `${batchCount} batches, ${entryAddendaCount} entries — DR: $${formatAmount(totalDebit)} / CR: $${formatAmount(totalCredit)}`,
          kind: SymbolKind.File,
          range: lr,
          selectionRange: lr,
        });
        break;
      }
    }
  }

  if (currentBatch) {
    symbols.push(currentBatch);
  }

  return symbols;
}

/**
 * Provide a hierarchical document symbol tree for the ACH file.
 * File → Batches → Entries → Addenda
 */
export function provideDocumentSymbols(
  state: ACHDocumentState
): DocumentSymbol[] {
  if (state.file) {
    return symbolsFromFile(state);
  }
  return symbolsFromText(state.text);
}
