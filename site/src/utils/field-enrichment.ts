import { CheckRoutingNumber, CalculateCheckDigit } from 'ach-ts/dist/utils/validators.js';
import {
  RECORD_TYPE_DESCRIPTIONS,
  TRANSACTION_CODE_DESCRIPTIONS,
  SEC_CODE_DESCRIPTIONS,
  SERVICE_CLASS_DESCRIPTIONS,
  ADDENDA_TYPE_DESCRIPTIONS,
} from '../data/ach-data.js';

/** Convert an amount in cents string (e.g. "0000123456") to formatted dollars ("$1,234.56") */
export function formatAmount(value: string): string | null {
  const cents = parseInt(value, 10);
  if (isNaN(cents)) return null;
  const dollars = (cents / 100).toFixed(2);
  return `$${dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** Validate a routing number, returns status + computed check digit */
export function validateRoutingNumber(value: string): { valid: boolean; message: string } | null {
  const routing = value.replace(/\s/g, '');
  if (routing.length < 8) return null;
  try {
    const fullRouting = routing.length === 8
      ? routing + CalculateCheckDigit(routing)
      : routing;
    const err = CheckRoutingNumber(fullRouting);
    if (err) {
      return { valid: false, message: '⚠️ Invalid routing number' };
    }
    return { valid: true, message: '✅ Valid routing number' };
  } catch {
    return null;
  }
}

/** Convert YYMMDD to formatted date string */
export function formatDate(value: string): string | null {
  if (value.length !== 6) return null;
  const yy = value.substring(0, 2);
  const mm = value.substring(2, 4);
  const dd = value.substring(4, 6);
  if (isNaN(Number(mm)) || isNaN(Number(dd))) return null;
  return `📅 20${yy}-${mm}-${dd}`;
}

/** Get contextual enrichment for a given field name and trimmed value */
export function getContextualInfo(fieldName: string, value: string): string | null {
  if (fieldName === 'recordType') {
    const desc = RECORD_TYPE_DESCRIPTIONS[value];
    return desc ? `📋 ${desc}` : null;
  }

  if (fieldName === 'transactionCode') {
    const code = parseInt(value, 10);
    const desc = TRANSACTION_CODE_DESCRIPTIONS[code];
    return desc ? `💳 ${desc}` : null;
  }

  if (fieldName === 'standardEntryClassCode') {
    const desc = SEC_CODE_DESCRIPTIONS[value];
    return desc ? `📑 ${desc}` : null;
  }

  if (fieldName === 'serviceClassCode') {
    const code = parseInt(value, 10);
    const desc = SERVICE_CLASS_DESCRIPTIONS[code];
    return desc ? `🏷️ ${desc}` : null;
  }

  if (fieldName === 'addendaTypeCode' || fieldName === 'typeCode') {
    const desc = ADDENDA_TYPE_DESCRIPTIONS[value];
    return desc ? `📎 ${desc}` : null;
  }

  if (fieldName.toLowerCase().includes('amount')) {
    const formatted = formatAmount(value);
    return formatted ? `💰 ${formatted}` : null;
  }

  if (
    fieldName === 'immediateDestination' ||
    fieldName === 'immediateOrigin' ||
    fieldName === 'rdfiIdentification' ||
    fieldName === 'odfiIdentification'
  ) {
    const result = validateRoutingNumber(value);
    return result ? result.message : null;
  }

  if (fieldName.toLowerCase().includes('date') && value.length === 6) {
    return formatDate(value);
  }

  return null;
}
