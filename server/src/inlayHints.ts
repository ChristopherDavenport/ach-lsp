import { InlayHint, InlayHintKind } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  FIELD_DESCRIPTIONS,
  TRANSACTION_CODE_DESCRIPTIONS,
  SEC_CODE_DESCRIPTIONS,
  SERVICE_CLASS_DESCRIPTIONS,
  ADDENDA_TYPE_DESCRIPTIONS,
  RECORD_TYPE_DESCRIPTIONS,
  getSecCodeForLine,
} from '../../shared/src/achConstants';
import {
  recordTypeToFieldSpecs,
  CheckRoutingNumber,
  CalculateCheckDigit,
  FieldSpec,
} from 'ach-ts';
import { addendaFieldsByTypeCode } from './achFieldUtils';

function getFieldSpecs(recordType: string, line: string, lines: string[], lineIndex: number): FieldSpec[] | undefined {
  if (recordType === '7') {
    const typeCode = line.substring(1, 3);
    return addendaFieldsByTypeCode[typeCode];
  }
  const secCode = getSecCodeForLine(lines, lineIndex);
  return recordTypeToFieldSpecs(recordType, {
    secCode,
    isADV: secCode === 'ADV',
  });
}

// Short labels for inlay hints — keep compact
const SHORT_LABELS: Record<string, string> = {
  recordType: 'Type',
  priorityCode: 'Priority',
  immediateDestination: 'Dest RTN',
  immediateOrigin: 'Origin RTN',
  fileCreationDate: 'Created',
  fileCreationTime: 'Time',
  fileIDModifier: 'File ID',
  recordSize: 'Rec Size',
  blockingFactor: 'Block',
  formatCode: 'Fmt',
  immediateDestinationName: 'Dest',
  immediateOriginName: 'Origin',
  referenceCode: 'Ref',
  serviceClassCode: 'Svc Class',
  companyName: 'Company',
  companyDiscretionaryData: 'Disc Data',
  companyIdentification: 'Co ID',
  standardEntryClassCode: 'SEC',
  companyEntryDescription: 'Desc',
  companyDescriptiveDate: 'Desc Date',
  effectiveEntryDate: 'Eff Date',
  settlementDate: 'Settle',
  originatorStatusCode: 'Orig Status',
  odfiIdentification: 'ODFI',
  batchNumber: 'Batch #',
  transactionCode: 'Txn Code',
  rdfiIdentification: 'RDFI',
  checkDigit: 'Chk',
  dfiAccountNumber: 'Acct #',
  amount: 'Amt',
  identificationNumber: 'ID #',
  individualName: 'Name',
  discretionaryData: 'Disc',
  addendaRecordIndicator: 'Addenda?',
  traceNumber: 'Trace',
  addendaTypeCode: 'Addenda Type',
  typeCode: 'Addenda Type',
  paymentRelatedInformation: 'Payment Info',
  addendaSequenceNumber: 'Addenda Seq',
  sequenceNumber: 'Seq #',
  entryDetailSequenceNumber: 'Entry Seq',
  entryAddendaCount: 'Entry Ct',
  entryHash: 'Hash',
  totalDebitEntryDollarAmount: 'Total Dr',
  totalCreditEntryDollarAmount: 'Total Cr',
  messageAuthenticationCode: 'MAC',
  reserved: 'Rsvd',
  batchCount: 'Batches',
  blockCount: 'Blocks',
  totalDebitEntryDollarAmountInFile: 'File Dr',
  totalCreditEntryDollarAmountInFile: 'File Cr',
  changeCode: 'Chg Code',
  returnCode: 'Ret Code',
  originalTrace: 'Orig Trace',
  originalDFI: 'Orig DFI',
  correctedData: 'Corrected',
  dateOfDeath: 'DOD',
  addendaInformation: 'Addenda Info',
  foreignPaymentAmount: 'Fgn Amt',
  foreignTraceNumber: 'Fgn Trace',
  transactionTypeCode: 'Txn Type',
  originatorName: 'Originator',
  originatorStreetAddress: 'Orig Addr',
  originatorCityStateProvince: 'Orig City',
  originatorCountryPostalCode: 'Orig Ctry',
  odfiName: 'ODFI Name',
  rdfiName: 'RDFI Name',
  receiverIDNumber: 'Rcvr ID',
  receiverStreetAddress: 'Rcvr Addr',
  receiverCityStateProvince: 'Rcvr City',
  receiverCountryPostalCode: 'Rcvr Ctry',
  foreignExchangeIndicator: 'FX Type',
  foreignExchangeReference: 'FX Ref',
  isoDestinationCountryCode: 'Dest Ctry',
  isoOriginatingCurrencyCode: 'Orig CCY',
  isoDestinationCurrencyCode: 'Dest CCY',
  originatorIdentification: 'Orig ID',
  addendaRecords: 'Addenda Ct',
  foreignCorrespondentBankName: 'Fgn Bank',
  foreignCorrespondentBankIDNumber: 'Fgn Bank ID',
  adviceRoutingNumber: 'Adv RTN',
  achOperatorRoutingNumber: 'ACH Op RTN',
};

const SHORT_RECORD_TYPES: Record<string, string> = {
  '1': 'File Header',
  '5': 'Batch Header',
  '6': 'Entry Detail',
  '7': 'Addenda',
  '8': 'Batch Control',
  '9': 'File Control',
};

function getShortLabel(fieldName: string, value: string): string | null {
  if (fieldName === 'recordType') {
    return SHORT_RECORD_TYPES[value] ?? null;
  }
  if (fieldName === 'transactionCode') {
    const code = parseInt(value, 10);
    const desc = TRANSACTION_CODE_DESCRIPTIONS[code];
    return desc ? desc.split('—')[0]?.trim() ?? desc : null;
  }
  if (fieldName === 'standardEntryClassCode') {
    const desc = SEC_CODE_DESCRIPTIONS[value];
    return desc ? desc.split('—')[0]?.trim() ?? desc : null;
  }
  if (fieldName === 'serviceClassCode') {
    const code = parseInt(value, 10);
    const desc = SERVICE_CLASS_DESCRIPTIONS[code];
    return desc ? desc.split('—')[0]?.trim() ?? desc : null;
  }
  if (fieldName === 'addendaTypeCode' || fieldName === 'typeCode') {
    return ADDENDA_TYPE_DESCRIPTIONS[value] ?? null;
  }

  // Routing number fields
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
        return err ? '⚠ Invalid' : '✓ Valid RTN';
      } catch {
        return null;
      }
    }
  }

  // Account number — show trimmed value
  if (fieldName === 'dfiAccountNumber') {
    return value;
  }

  // Individual/company name — show trimmed value
  if (
    fieldName === 'individualName' ||
    fieldName === 'companyName' ||
    fieldName === 'immediateDestinationName' ||
    fieldName === 'immediateOriginName' ||
    fieldName === 'originatorName' ||
    fieldName === 'odfiName' ||
    fieldName === 'rdfiName' ||
    fieldName === 'foreignCorrespondentBankName'
  ) {
    return value;
  }

  // Identification numbers
  if (
    fieldName === 'identificationNumber' ||
    fieldName === 'companyIdentification' ||
    fieldName === 'originatorIdentification' ||
    fieldName === 'receiverIDNumber'
  ) {
    return value;
  }

  // Trace number — format as ODFI(8) + seq(7)
  if (fieldName === 'traceNumber' && value.length === 15) {
    return value.substring(0, 8) + '-' + value.substring(8);
  }

  // Check digit
  if (fieldName === 'checkDigit') {
    return value;
  }

  // Addenda record indicator
  if (fieldName === 'addendaRecordIndicator') {
    return value === '1' ? 'Yes' : 'No';
  }

  // Amount fields (convert cents to dollars)
  if (fieldName.toLowerCase().includes('amount')) {
    const cents = parseInt(value, 10);
    if (!isNaN(cents)) {
      const dollars = (cents / 100).toFixed(2);
      return '$' + dollars.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
  }

  // Entry/addenda counts, batch/block counts
  if (
    fieldName === 'entryAddendaCount' ||
    fieldName === 'batchCount' ||
    fieldName === 'blockCount' ||
    fieldName === 'batchNumber' ||
    fieldName === 'addendaRecords'
  ) {
    const n = parseInt(value, 10);
    return !isNaN(n) ? String(n) : null;
  }

  // Hash
  if (fieldName === 'entryHash') {
    const n = parseInt(value, 10);
    return !isNaN(n) ? String(n) : null;
  }

  // Time fields
  if (fieldName === 'fileCreationTime' && value.length === 4) {
    return value.substring(0, 2) + ':' + value.substring(2);
  }

  // Date fields (YYMMDD)
  if (fieldName.toLowerCase().includes('date') && value.length === 6) {
    const yy = value.substring(0, 2);
    const mm = value.substring(2, 4);
    const dd = value.substring(4, 6);
    return `20${yy}-${mm}-${dd}`;
  }

  // Company entry description
  if (fieldName === 'companyEntryDescription') {
    return value;
  }

  // Return/change codes
  if (fieldName === 'returnCode' || fieldName === 'changeCode') {
    return value;
  }

  // Foreign exchange indicator
  if (fieldName === 'foreignExchangeIndicator') {
    if (value === 'FF') return 'Fix-Fix';
    if (value === 'FV') return 'Fix-Var';
    return value;
  }

  // Originator status code
  if (fieldName === 'originatorStatusCode') {
    return value === '1' ? 'Inst' : value;
  }

  return null;
}

export function provideInlayHints(
  document: TextDocument,
  cursors: { line: number; character: number }[]
): InlayHint[] {
  if (!cursors || cursors.length === 0) return [];

  const allText = document.getText();
  const lines = allText.split('\n');
  const hints: InlayHint[] = [];
  const seen = new Set<string>();

  for (const cursor of cursors) {
    const line = lines[cursor.line]?.replace(/[\r\n]+$/, '');
    if (!line || line.length === 0) continue;

    const recordType = line.charAt(0);
    // Skip filler rows
    if (recordType === '9' && /^9+$/.test(line)) continue;

    const specs = getFieldSpecs(recordType, line, lines, cursor.line);
    if (!specs) continue;

    // Find the field the cursor is in
    const cursorSpec = specs.find(s => cursor.character >= s.start && cursor.character < s.end);
    if (!cursorSpec) continue;
    if (cursorSpec.start >= line.length) continue;

    // Deduplicate: don't add the same hint twice (same line + field start)
    const key = `${cursor.line}:${cursorSpec.start}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const endChar = Math.min(cursorSpec.end, line.length);
    const value = line.substring(cursorSpec.start, endChar).trim();
    if (value === '') continue;

    const label = SHORT_LABELS[cursorSpec.name] ?? FIELD_DESCRIPTIONS[cursorSpec.name]?.label ?? cursorSpec.name;
    const contextLabel = getShortLabel(cursorSpec.name, value);
    const hintLabel = contextLabel ? `${label}: ${contextLabel}` : label;

    hints.push({
      position: { line: cursor.line, character: endChar },
      label: hintLabel,
      kind: InlayHintKind.Parameter,
      paddingLeft: true,
    });
  }

  return hints;
}
