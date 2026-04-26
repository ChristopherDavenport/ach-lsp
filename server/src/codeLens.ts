import { CodeLens, Range, Command } from 'vscode-languageserver/node';
import type { ACHDocumentState } from './achDocument';

/**
 * Provide CodeLens annotations for ACH records:
 * - File header: batch count, entry count, total amounts
 * - Batch headers: entry count, debit/credit totals
 * - Entries with addenda: addenda count
 */
export function provideCodeLens(state: ACHDocumentState): CodeLens[] {
  if (!state.file) return [];

  const lenses: CodeLens[] = [];
  const file = state.file;

  // File header
  const h = file.header;
  const fc = file.control;
  lenses.push({
    range: lineRange(h.lineNumber - 1),
    command: {
      title: `${fc.batchCount} batch${fc.batchCount !== 1 ? 'es' : ''} | ${fc.entryAddendaCount} entries | DR: $${formatAmount(fc.totalDebitEntryDollarAmountInFile)} | CR: $${formatAmount(fc.totalCreditEntryDollarAmountInFile)}`,
      command: '',
    },
  });

  // Regular batches
  for (const batch of file.batches) {
    const bh = batch.getHeader();
    const bc = batch.getControl();
    const entries = batch.getEntries();

    lenses.push({
      range: lineRange(bh.lineNumber - 1),
      command: {
        title: `${bc.entryAddendaCount} entries | DR: $${formatAmount(bc.totalDebitEntryDollarAmount)} | CR: $${formatAmount(bc.totalCreditEntryDollarAmount)}`,
        command: '',
      },
    });

    // Entries with addenda
    for (const entry of entries) {
      const addendaCount = countAddenda(entry);
      if (addendaCount > 0) {
        lenses.push({
          range: lineRange(entry.lineNumber - 1),
          command: {
            title: `${addendaCount} addenda`,
            command: '',
          },
        });
      }
    }
  }

  // IAT batches
  for (const batch of file.iatBatches) {
    const bh = batch.header;
    const bc = batch.control;

    lenses.push({
      range: lineRange(bh.lineNumber - 1),
      command: {
        title: `${bc.entryAddendaCount} entries | DR: $${formatAmount(bc.totalDebitEntryDollarAmount)} | CR: $${formatAmount(bc.totalCreditEntryDollarAmount)}`,
        command: '',
      },
    });

    for (const entry of batch.entries) {
      const addendaCount = countIATAddenda(entry);
      if (addendaCount > 0) {
        lenses.push({
          range: lineRange(entry.lineNumber - 1),
          command: {
            title: `${addendaCount} addenda`,
            command: '',
          },
        });
      }
    }
  }

  return lenses;
}

function lineRange(line: number): Range {
  return Range.create(line, 0, line, 0);
}

function formatAmount(cents: number): string {
  if (isNaN(cents)) return '0.00';
  const dollars = (cents / 100).toFixed(2);
  return dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function countAddenda(entry: any): number {
  let count = 0;
  if (entry.addenda02) count++;
  count += (entry.addenda05 || []).length;
  if (entry.addenda98) count++;
  if (entry.addenda98Refused) count++;
  if (entry.addenda99) count++;
  if (entry.addenda99Contested) count++;
  if (entry.addenda99Dishonored) count++;
  return count;
}

function countIATAddenda(entry: any): number {
  let count = 0;
  const singles = [entry.addenda10, entry.addenda11, entry.addenda12, entry.addenda13,
    entry.addenda14, entry.addenda15, entry.addenda16, entry.addenda98, entry.addenda99];
  for (const a of singles) { if (a) count++; }
  count += (entry.addenda17 || []).length;
  count += (entry.addenda18 || []).length;
  return count;
}
