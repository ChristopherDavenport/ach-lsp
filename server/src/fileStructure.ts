import type { ACHDocumentState } from './achDocument';
import type { Batcher } from 'ach-ts';
import type { IATBatch } from 'ach-ts';
import type { EntryDetail, IATEntryDetail } from 'ach-ts';

export type { TreeNode } from '../../shared/src/types';
import type { TreeNode } from '../../shared/src/types';

function formatAmount(cents: number): string {
  return isNaN(cents) ? '?.??' : (cents / 100).toFixed(2);
}

function addendaNodesForEntry(entry: EntryDetail): TreeNode[] {
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
    label: `Addenda ${a.typeCode}`,
    line: a.lineNumber - 1,
    type: 'addenda' as const,
  }));
}

function addendaNodesForIATEntry(entry: IATEntryDetail): TreeNode[] {
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
    label: `Addenda ${a.typeCode}`,
    line: a.lineNumber - 1,
    type: 'addenda' as const,
  }));
}

function structureFromFile(state: ACHDocumentState): TreeNode[] {
  const file = state.file!;
  const nodes: TreeNode[] = [];

  // File Header
  const h = file.header;
  nodes.push({
    label: 'File Header',
    detail: `${h.immediateOriginName.trim()} → ${h.immediateDestinationName.trim()}`,
    line: h.lineNumber - 1,
    type: 'fileHeader',
  });

  // Merge regular and IAT batches
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

      const children: TreeNode[] = [];

      let entryIndex = 0;
      for (const entry of entries) {
        entryIndex++;
        const addendaNodes = addendaNodesForEntry(entry);
        children.push({
          label: entry.individualName.trim() || `Entry ${entryIndex}`,
          detail: `$${formatAmount(entry.amount)}`,
          line: entry.lineNumber - 1,
          type: 'entry',
          children: addendaNodes.length > 0 ? addendaNodes : undefined,
        });
      }

      children.push({
        label: 'Batch Control',
        detail: `${bc.entryAddendaCount} entries`,
        line: bc.lineNumber - 1,
        type: 'batchControl',
      });

      nodes.push({
        label: `Batch ${batchIndex} (${bh.standardEntryClassCode})`,
        detail: bh.companyName.trim(),
        line: bh.lineNumber - 1,
        type: 'batch',
        children,
      });
    } else {
      const batch = item.batch;
      const bh = batch.header;
      const bc = batch.control;

      const children: TreeNode[] = [];

      let entryIndex = 0;
      for (const entry of batch.entries) {
        entryIndex++;
        const addendaNodes = addendaNodesForIATEntry(entry);
        children.push({
          label: `Entry ${entryIndex}`,
          detail: `$${formatAmount(entry.amount)}`,
          line: entry.lineNumber - 1,
          type: 'entry',
          children: addendaNodes.length > 0 ? addendaNodes : undefined,
        });
      }

      children.push({
        label: 'Batch Control',
        detail: `${bc.entryAddendaCount} entries`,
        line: bc.lineNumber - 1,
        type: 'batchControl',
      });

      nodes.push({
        label: `Batch ${batchIndex} (IAT)`,
        detail: bh.companyEntryDescription.trim(),
        line: bh.lineNumber - 1,
        type: 'batch',
        children,
      });
    }
  }

  // File Control
  const fc = file.control;
  if (fc.lineNumber > 0) {
    nodes.push({
      label: 'File Control',
      detail: `${fc.batchCount} batches`,
      line: fc.lineNumber - 1,
      type: 'fileControl',
    });
  }

  return nodes;
}

/**
 * Fallback: build tree from raw text when parsing fails.
 */
function structureFromText(text: string): TreeNode[] {
  const lines = text.split('\n');
  const nodes: TreeNode[] = [];

  let currentBatch: TreeNode | null = null;
  let currentEntry: TreeNode | null = null;
  let batchIndex = 0;
  let entryIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue;

    const recordType = line.charAt(0);

    switch (recordType) {
      case '1': {
        const destName = line.substring(40, 63).trim();
        const originName = line.substring(63, 86).trim();
        nodes.push({
          label: 'File Header',
          detail: `${originName} → ${destName}`,
          line: i,
          type: 'fileHeader',
        });
        break;
      }

      case '5': {
        batchIndex++;
        entryIndex = 0;
        const companyName = line.substring(4, 20).trim();
        const secCode = line.substring(50, 53).trim();
        currentBatch = {
          label: `Batch ${batchIndex} (${secCode})`,
          detail: companyName,
          line: i,
          type: 'batch',
          children: [],
        };
        break;
      }

      case '6': {
        entryIndex++;
        const name = line.substring(54, 76).trim();
        const amountStr = line.substring(29, 39);
        const amount = parseInt(amountStr, 10);
        const dollars = isNaN(amount) ? '?.??' : (amount / 100).toFixed(2);

        currentEntry = {
          label: name || `Entry ${entryIndex}`,
          detail: `$${dollars}`,
          line: i,
          type: 'entry',
          children: [],
        };

        if (currentBatch) {
          currentBatch.children!.push(currentEntry);
        } else {
          nodes.push(currentEntry);
        }
        break;
      }

      case '7': {
        const addendaType = line.substring(1, 3);
        const addendaNode: TreeNode = {
          label: `Addenda ${addendaType}`,
          line: i,
          type: 'addenda',
        };

        if (currentEntry) {
          currentEntry.children!.push(addendaNode);
        } else if (currentBatch) {
          currentBatch.children!.push(addendaNode);
        } else {
          nodes.push(addendaNode);
        }
        break;
      }

      case '8': {
        const entryCount = line.substring(4, 10).trim();
        if (currentBatch) {
          currentBatch.children!.push({
            label: 'Batch Control',
            detail: `${entryCount} entries`,
            line: i,
            type: 'batchControl',
          });
          nodes.push(currentBatch);
          currentBatch = null;
        }
        currentEntry = null;
        break;
      }

      case '9': {
        if (/^9{94}$/.test(line)) continue;
        const batchCount = line.substring(1, 7).trim();
        nodes.push({
          label: 'File Control',
          detail: `${batchCount} batches`,
          line: i,
          type: 'fileControl',
        });
        break;
      }
    }
  }

  if (currentBatch) {
    nodes.push(currentBatch);
  }

  return nodes;
}

/**
 * Build a tree structure from the parsed ACH file for the tree view.
 */
export function getFileStructure(state: ACHDocumentState): TreeNode[] {
  if (state.file) {
    return structureFromFile(state);
  }
  return structureFromText(state.text);
}
