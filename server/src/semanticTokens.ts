import {
  SemanticTokensLegend,
  SemanticTokensBuilder,
  SemanticTokens,
} from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  FieldSpec,
  recordTypeToFieldSpecs,
} from 'ach-ts';
import { addendaFieldsByTypeCode } from './achFieldUtils';

// Token types
const tokenTypes = [
  'keyword',    // 0 - record type codes
  'number',     // 1 - amounts, counts, hashes
  'string',     // 2 - names, descriptions
  'type',       // 3 - SEC codes, addenda types
  'variable',   // 4 - routing numbers, account numbers
  'comment',    // 5 - padding lines
  'parameter',  // 6 - dates, times
  'enum',       // 7 - transaction codes, service class codes
];

const tokenModifiers = ['declaration', 'definition', 'readonly'];

export const semanticTokensLegend: SemanticTokensLegend = {
  tokenTypes,
  tokenModifiers,
};

// Explicit per-field overrides to prevent adjacent fields from sharing the same color.
// Every record type's field sequence has been walked to ensure no two neighbors match.
const fieldOverrides: Record<string, number> = {
  // File Header – break 4× enum streak and date→time adjacency
  fileCreationTime: 3,                          // type (was parameter, same as fileCreationDate)
  recordSize: 1,                                // number (was enum, same as fileIDModifier)
  blockingFactor: 6,                            // parameter (was enum)

  // Batch Header – break string, date, and routing adjacencies
  companyDiscretionaryData: 6,                  // parameter (was string, same as companyName)
  effectiveEntryDate: 1,                        // number (was parameter, same as companyDescriptiveDate)
  settlementDate: 3,                            // type (was parameter)
  originatorStatusCode: 7,                      // enum (was caught by 'origin' → variable)

  // IAT Batch Header – break 4× string streak and routing adjacencies
  iatIndicator: 6,                              // parameter (was default string)
  foreignExchangeIndicator: 7,                  // enum (was default string)
  foreignExchangeReferenceIndicator: 3,         // type (was string via Reference)
  foreignExchangeReference: 1,                  // number (was string via Reference)
  isoDestinationCountryCode: 3,                 // type (was variable via Destination)
  isoOriginatingCurrencyCode: 3,                // type (was variable via Origin)

  // Entry Detail – break routing and string streaks
  checkDigit: 7,                                // enum (was variable, same as rdfiIdentification)
  dfiAccountNumber: 4,                          // variable (fix: 'Account' contains 'count', caught by Count check)
  identificationNumber: 4,                      // variable (was default string)
  discretionaryData: 6,                         // parameter (was string via Discretionary)

  // IAT Entry Detail – break string streak
  ofacScreeningIndicator: 7,                    // enum (was default string)
  secondaryOFACScreeningIndicator: 3,           // type (was default string)

  // ADV Entry Detail – break string streaks, fix routing numbers
  adviceRoutingNumber: 4,                       // variable (it's a routing number)
  fileIdentification: 7,                        // enum (was default string)
  achOperatorData: 3,                           // type (was default string)
  achOperatorRoutingNumber: 4,                  // variable (it's a routing number)
  julianDay: 6,                                 // parameter (it's a date)

  // Addenda 02 – break string and date streaks
  referenceInformationTwo: 4,                   // variable (was string via Reference)
  terminalIdentificationCode: 7,                // enum (was default string)
  transactionSerialNumber: 1,                   // number (was default string)
  authorizationCodeOrExpireDate: 7,             // enum (was parameter via Date)
  terminalCity: 4,                              // variable (was default string)
  terminalState: 3,                             // type (was default string)

  // Addenda 05/17/18 – break number adjacency
  entryDetailSequenceNumber: 7,                 // enum (was number via Sequence)

  // Addenda 10 – break string adjacencies, assign codes/amounts correctly
  transactionTypeCode: 7,                       // enum (it's a code)
  foreignPaymentAmount: 6,                      // parameter (was default string; can't use number due to foreignTraceNumber adjacency)
  name: 4,                                      // variable (was string, adjacent to reserved)

  // Addenda 12 – fix 'origin' false-match streak
  originatorCityStateProvince: 2,               // string (was variable via origin match)
  originatorDateOfBirth: 6,                     // parameter (it's a date, was variable via origin)

  // Addenda 13/14 – break string adjacencies
  odfiIDNumberQualifier: 7,                     // enum (was default string)
  rdfiIDNumberQualifier: 7,                     // enum (was default string)
  odfiBranchCountryCode: 3,                     // type (was default string)
  rdfiBranchCountryCode: 3,                     // type (was default string)

  // Addenda 15 – break string streak
  receiverIDNumber: 4,                          // variable (was default string)
  receiverStreetAddress: 6,                     // parameter (was default string)

  // Addenda 16 – break string adjacency
  receiverCountryPostalCode: 4,                 // variable (was default string)

  // Addenda 18 – break string streak in correspondent bank fields
  foreignCorrespondentBankIDNumberQualifier: 7, // enum (was default string)
  foreignCorrespondentBankIDNumber: 4,          // variable (was default string)
  foreignCorrespondentBankBranchCountryCode: 3, // type (was default string)

  // Addenda 98/98R – codes and corrected data
  changeCode: 7,                                // enum (it's a code)
  refusedChangeCode: 7,                         // enum (it's a code)
  correctedData: 6,                             // parameter (was default string)
  iatCorrectedData: 3,                          // type (was default string)

  // Addenda 99 Return – return code
  returnCode: 7,                                // enum (it's a code)

  // Addenda 99 Dishonored/Contested – codes and dates
  dishonoredReturnReasonCode: 7,                // enum (was default string)
  returnReasonCode: 7,                          // enum (was default string)
  contestedReturnCode: 7,                       // enum (was default string)
  dateOriginalEntryReturned: 6,                 // parameter (it's a date, was variable via Origin)
  originalSettlementDate: 3,                    // type (was variable via origin; break adjacency)

  // Batch Control – break string adjacency
  messageAuthenticationCode: 3,                 // type (was string via Message)
};

// Map ach-ts camelCase field names to token types
function getTokenType(fieldName: string): number {
  // Check explicit overrides first (adjacency fixes)
  const override = fieldOverrides[fieldName];
  if (override !== undefined) return override;

  // Record type indicator
  if (fieldName === 'recordType') return 0; // keyword

  // File Header – differentiate origin from destination
  if (fieldName === 'immediateOrigin') return 3; // type (distinct from destination → variable)
  if (fieldName === 'immediateOriginName') return 6; // parameter (distinct from destination name → string)

  // File Control / Batch Control – spread adjacent fields across distinct colors
  if (fieldName === 'batchCount') return 1; // number
  if (fieldName === 'blockCount') return 7; // enum
  if (fieldName === 'entryAddendaCount' || fieldName === 'addendaRecords') return 6; // parameter

  // Hashes
  if (fieldName.includes('Hash') || fieldName.includes('hash')) return 4; // variable

  // Debit totals
  if (fieldName.includes('Debit') && fieldName.includes('Amount')) return 1; // number
  // Credit totals
  if (fieldName.includes('Credit') && fieldName.includes('Amount')) return 3; // type

  // Other amounts (entry detail amount)
  if (fieldName === 'amount') return 1; // number

  // Other counts
  if (fieldName.includes('Count') || fieldName.includes('count')) return 7; // enum

  // Names, descriptions, text fields
  if (fieldName.includes('Name') || fieldName.includes('name') ||
      fieldName.includes('Description') || fieldName.includes('description') ||
      fieldName.includes('Discretionary') || fieldName.includes('discretionary') ||
      fieldName.includes('Information') || fieldName.includes('information') ||
      fieldName.includes('Reserved') || fieldName.includes('reserved') ||
      fieldName.includes('Reference') || fieldName.includes('reference') ||
      fieldName.includes('Message') || fieldName.includes('message') ||
      fieldName === 'paymentRelatedInformation') {
    return 2; // string
  }

  // SEC code, addenda type
  if (fieldName === 'standardEntryClassCode' || fieldName === 'typeCode' ||
      fieldName === 'addendaTypeCode') {
    return 3; // type
  }

  // Routing, identifiers, account numbers
  if (fieldName.includes('Destination') || fieldName.includes('destination') ||
      fieldName.includes('Origin') || fieldName.includes('origin') ||
      fieldName === 'rdfiIdentification' || fieldName === 'odfiIdentification' ||
      fieldName === 'dfiAccountNumber' ||
      fieldName === 'companyIdentification' || fieldName === 'originatorIdentification' ||
      fieldName === 'immediateDestination' || fieldName === 'immediateOrigin') {
    return 4; // variable
  }

  // Dates and times
  if (fieldName.includes('Date') || fieldName.includes('date') ||
      fieldName.includes('Time') || fieldName.includes('time')) {
    return 6; // parameter
  }

  // Enumerated codes
  if (fieldName === 'transactionCode' || fieldName === 'serviceClassCode' ||
      fieldName === 'priorityCode' || fieldName === 'formatCode' ||
      fieldName === 'addendaRecordIndicator' || fieldName === 'fileIDModifier') {
    return 7; // enum
  }

  // Trace/sequence numbers
  if (fieldName.includes('Trace') || fieldName.includes('trace') ||
      fieldName.includes('Sequence') || fieldName.includes('sequence') ||
      fieldName.includes('batchNumber')) {
    return 1; // number
  }

  return 2; // string (default)
}

export function provideSemanticTokens(document: TextDocument): SemanticTokens {
  const builder = new SemanticTokensBuilder();
  const text = document.getText();
  const lines = text.split('\n');

  let currentSecCode: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue;

    // Padding line (all 9s)
    if (/^9{10,}$/.test(line.trim())) {
      builder.push(i, 0, line.length, 5, 0); // comment
      continue;
    }

    const recordType = line.charAt(0);

    // Track current SEC code from batch headers
    if (recordType === '5') {
      currentSecCode = line.substring(50, 53).trim() || undefined;
    }

    let fields: FieldSpec[] | undefined;

    // Addenda records need type-code-specific field specs
    if (recordType === '7') {
      const typeCode = line.substring(1, 3);
      fields = addendaFieldsByTypeCode[typeCode];
    } else {
      fields = recordTypeToFieldSpecs(recordType, {
        secCode: currentSecCode,
        isADV: currentSecCode === 'ADV',
      });
    }

    if (!fields || fields.length === 0) continue;

    for (const field of fields) {
      const start = field.start;
      const length = Math.min(field.end, line.length) - start;
      if (length <= 0) continue;

      const tokenType = getTokenType(field.name);
      builder.push(i, start, length, tokenType, 0);
    }
  }

  return builder.build();
}
