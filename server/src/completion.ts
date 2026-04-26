import {
  CompletionItem,
  CompletionItemKind,
  Position,
  InsertTextFormat,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  SEC_CODE_DESCRIPTIONS,
  TRANSACTION_CODE_DESCRIPTIONS,
  SERVICE_CLASS_DESCRIPTIONS,
  ADDENDA_TYPE_DESCRIPTIONS,
  RECORD_TYPE_DESCRIPTIONS,
  getFieldAtPosition,
} from '../../shared/src/achConstants';

export function provideCompletion(
  document: TextDocument,
  position: Position
): CompletionItem[] {
  const line = document.getText({
    start: { line: position.line, character: 0 },
    end: { line: position.line, character: 94 },
  });

  const col = position.character;

  // If line is empty or at position 0, suggest record types
  if (line.length === 0 || col === 0) {
    return recordTypeCompletions();
  }

  const recordType = line.charAt(0);
  const field = getFieldAtPosition(recordType, col);

  if (!field) return [];

  // Context-aware completions based on which field the cursor is in
  if (recordType === '5' && field.name === 'Standard Entry Class Code') {
    return secCodeCompletions();
  }

  if (recordType === '6' && field.name === 'Transaction Code') {
    return transactionCodeCompletions();
  }

  if (
    (recordType === '5' || recordType === '8') &&
    field.name === 'Service Class Code'
  ) {
    return serviceClassCompletions();
  }

  if (recordType === '7' && field.name === 'Addenda Type Code') {
    return addendaTypeCompletions();
  }

  if (recordType === '1' && field.name === 'File ID Modifier') {
    return fileIdModifierCompletions();
  }

  if (recordType === '1' && field.name === 'Record Size') {
    return [
      {
        label: '094',
        kind: CompletionItemKind.Value,
        detail: 'Standard NACHA record size',
        data: { type: 'recordSize' },
      },
    ];
  }

  if (recordType === '1' && field.name === 'Blocking Factor') {
    return [
      {
        label: '10',
        kind: CompletionItemKind.Value,
        detail: 'Standard NACHA blocking factor',
        data: { type: 'blockingFactor' },
      },
    ];
  }

  return [];
}

export function resolveCompletion(item: CompletionItem): CompletionItem {
  // Add additional documentation for the selected item
  if (item.data?.type === 'secCode') {
    const desc = SEC_CODE_DESCRIPTIONS[item.label];
    if (desc) {
      item.documentation = { kind: 'markdown', value: desc };
    }
  } else if (item.data?.type === 'transactionCode') {
    const desc = TRANSACTION_CODE_DESCRIPTIONS[parseInt(item.label, 10)];
    if (desc) {
      item.documentation = { kind: 'markdown', value: desc };
    }
  }
  return item;
}

function recordTypeCompletions(): CompletionItem[] {
  const templates: Record<string, string> = {
    '1': '101 ' + ' '.repeat(9) + ' '.repeat(10) + '      0000A094101' + ' '.repeat(23) + ' '.repeat(23) + ' '.repeat(8),
    '5': '5200' + ' '.repeat(16) + ' '.repeat(20) + ' '.repeat(10) + 'PPD' + ' '.repeat(10) + ' '.repeat(3) + '      ' + ' 12104288' + '0000001',
    '6': '622' + '23138010' + '4' + ' '.repeat(17) + '0000000000' + ' '.repeat(15) + ' '.repeat(22) + '  ' + '0' + '121042880000001',
    '7': '705' + ' '.repeat(80) + '0001' + '0000001',
    '8': '8200' + '000000' + '0000000000' + '000000000000' + '000000000000' + ' '.repeat(10) + ' '.repeat(19) + ' '.repeat(6) + '12104288' + '0000001',
    '9': '9' + '000000' + '000000' + '00000000' + '0000000000' + '000000000000' + '000000000000' + ' '.repeat(39),
  };

  return Object.entries(RECORD_TYPE_DESCRIPTIONS).map(([code, description]) => ({
    label: code,
    kind: CompletionItemKind.Snippet,
    detail: description,
    insertText: templates[code] || code,
    insertTextFormat: InsertTextFormat.PlainText,
    data: { type: 'recordType', code },
    sortText: code,
  }));
}

function secCodeCompletions(): CompletionItem[] {
  return Object.entries(SEC_CODE_DESCRIPTIONS).map(([code, description], i) => ({
    label: code,
    kind: CompletionItemKind.EnumMember,
    detail: description.split(' — ')[0],
    documentation: { kind: 'markdown' as const, value: description },
    data: { type: 'secCode' },
    sortText: String(i).padStart(2, '0'),
  }));
}

function transactionCodeCompletions(): CompletionItem[] {
  return Object.entries(TRANSACTION_CODE_DESCRIPTIONS).map(
    ([code, description], i) => ({
      label: code,
      kind: CompletionItemKind.EnumMember,
      detail: description.split(' — ')[0],
      documentation: { kind: 'markdown' as const, value: description },
      data: { type: 'transactionCode' },
      sortText: String(i).padStart(2, '0'),
    })
  );
}

function serviceClassCompletions(): CompletionItem[] {
  return Object.entries(SERVICE_CLASS_DESCRIPTIONS).map(
    ([code, description]) => ({
      label: code,
      kind: CompletionItemKind.EnumMember,
      detail: description,
      data: { type: 'serviceClass' },
    })
  );
}

function addendaTypeCompletions(): CompletionItem[] {
  return Object.entries(ADDENDA_TYPE_DESCRIPTIONS).map(
    ([code, description]) => ({
      label: code,
      kind: CompletionItemKind.EnumMember,
      detail: description,
      data: { type: 'addendaType' },
    })
  );
}

function fileIdModifierCompletions(): CompletionItem[] {
  const items: CompletionItem[] = [];
  for (let c = 65; c <= 90; c++) {
    items.push({
      label: String.fromCharCode(c),
      kind: CompletionItemKind.Value,
      data: { type: 'fileIdModifier' },
    });
  }
  for (let c = 48; c <= 57; c++) {
    items.push({
      label: String.fromCharCode(c),
      kind: CompletionItemKind.Value,
      data: { type: 'fileIdModifier' },
    });
  }
  return items;
}
