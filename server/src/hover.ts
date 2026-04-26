import { Hover, Position } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  RECORD_TYPE_DESCRIPTIONS,
  TRANSACTION_CODE_DESCRIPTIONS,
  SEC_CODE_DESCRIPTIONS,
  SERVICE_CLASS_DESCRIPTIONS,
  ADDENDA_TYPE_DESCRIPTIONS,
  FIELD_DESCRIPTIONS,
  getSecCodeForLine,
} from '../../shared/src/achConstants';
import {
  recordTypeToFieldSpecs,
  CheckRoutingNumber,
  CalculateCheckDigit,
  FieldSpec,
} from 'ach-ts';
import { addendaFieldsByTypeCode } from './achFieldUtils';

interface FieldHit {
  name: string;
  start: number;
  end: number;
}

function getFieldAtCursor(recordType: string, column: number, line: string, lines: string[], lineIndex: number): FieldHit | null {
  let specs;
  if (recordType === '7') {
    const typeCode = line.substring(1, 3);
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
    if (column >= spec.start && column < spec.end) {
      return { name: spec.name, start: spec.start, end: spec.end };
    }
  }
  return null;
}

export function provideHover(
  document: TextDocument,
  position: Position
): Hover | null {
  // Get the full line content (not clamped to 94)
  const lineRange = {
    start: { line: position.line, character: 0 },
    end: { line: position.line + 1, character: 0 },
  };
  const rawLine = document.getText(lineRange);
  const line = rawLine.replace(/[\r\n]+$/, '');

  if (line.length === 0) return null;
  if (position.character >= line.length) return null;

  const recordType = line.charAt(0);

  // Skip filler rows (all 9s used to pad the file to a block of 10)
  if (recordType === '9' && /^9+$/.test(line)) return null;

  const allText = document.getText();
  const lines = allText.split('\n');
  const field = getFieldAtCursor(recordType, position.character, line, lines, position.line);

  if (!field) return null;

  const endChar = Math.min(field.end, line.length);
  const value = line.substring(field.start, endChar);
  const desc = FIELD_DESCRIPTIONS[field.name];
  const parts: string[] = [];

  // Title: human name or camelCase name
  const humanName = desc?.label ?? field.name;
  parts.push(`**${humanName}**`);

  if (desc?.description) {
    parts.push('');
    parts.push(desc.description);
  }

  if (desc?.format) {
    parts.push('');
    parts.push(`*Format:* \`${desc.format}\``);
  }

  parts.push('');
  parts.push(`*Value:* \`${value}\``);
  parts.push('');
  parts.push(`*Columns:* ${field.start}–${field.end - 1}`);

  // Contextual information
  const extra = getContextualInfo(field.name, value.trim());
  if (extra) {
    parts.push('');
    parts.push(extra);
  }

  return {
    contents: {
      kind: 'markdown',
      value: parts.join('\n'),
    },
    range: {
      start: { line: position.line, character: field.start },
      end: { line: position.line, character: endChar },
    },
  };
}

function getContextualInfo(
  fieldName: string,
  value: string
): string | null {
  // Record type description
  if (fieldName === 'recordType') {
    const desc = RECORD_TYPE_DESCRIPTIONS[value];
    return desc ? `📋 ${desc}` : null;
  }

  // Transaction code
  if (fieldName === 'transactionCode') {
    const code = parseInt(value, 10);
    const desc = TRANSACTION_CODE_DESCRIPTIONS[code];
    return desc ? `💳 ${desc}` : null;
  }

  // SEC code
  if (fieldName === 'standardEntryClassCode') {
    const desc = SEC_CODE_DESCRIPTIONS[value];
    return desc ? `📑 ${desc}` : null;
  }

  // Service class code
  if (fieldName === 'serviceClassCode') {
    const code = parseInt(value, 10);
    const desc = SERVICE_CLASS_DESCRIPTIONS[code];
    return desc ? `🏷️ ${desc}` : null;
  }

  // Addenda type code
  if (fieldName === 'addendaTypeCode' || fieldName === 'typeCode') {
    const desc = ADDENDA_TYPE_DESCRIPTIONS[value];
    return desc ? `📎 ${desc}` : null;
  }

  // Amount fields (convert cents to dollars)
  if (fieldName.toLowerCase().includes('amount')) {
    const cents = parseInt(value, 10);
    if (!isNaN(cents)) {
      const dollars = (cents / 100).toFixed(2);
      return `💰 $${dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
    }
  }

  // Routing number validation
  if (
    fieldName === 'immediateDestination' ||
    fieldName === 'immediateOrigin' ||
    fieldName === 'rdfiIdentification' ||
    fieldName === 'odfiIdentification'
  ) {
    const routing = value.replace(/\s/g, '');
    if (routing.length >= 8) {
      try {
        const fullRouting = routing.length === 8
          ? routing + CalculateCheckDigit(routing)
          : routing;
        const err = CheckRoutingNumber(fullRouting);
        if (err) {
          return `⚠️ Invalid routing number`;
        }
        return `✅ Valid routing number`;
      } catch {
        return null;
      }
    }
  }

  // Date fields
  if (fieldName.toLowerCase().includes('date') && value.length === 6) {
    const yy = value.substring(0, 2);
    const mm = value.substring(2, 4);
    const dd = value.substring(4, 6);
    return `📅 20${yy}-${mm}-${dd}`;
  }

  return null;
}
