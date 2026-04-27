export interface ValidationSetting {
  key: string;
  type: string;
  default: boolean | number | string;
  description: string;
}

export const VALIDATION_SETTINGS: ValidationSetting[] = [
  { key: 'ach.fieldSeparators', type: 'boolean', default: true, description: 'Show zebra-striped field decorations that visually separate fixed-width fields.' },
  { key: 'ach.autoOpenPreview', type: 'boolean', default: false, description: 'Automatically open the structured preview panel when an ACH file is opened.' },
  { key: 'ach.maxNumberOfProblems', type: 'number', default: 1000, description: 'Controls the maximum number of problems produced by the server.' },
  { key: 'ach.trace.server', type: 'string', default: 'off', description: 'Traces the communication between VS Code and the ACH language server.' },
  { key: 'ach.validation.skipAll', type: 'boolean', default: false, description: 'Disable all validation.' },
  { key: 'ach.validation.allowZeroBatches', type: 'boolean', default: false, description: 'Allow files with no batches.' },
  { key: 'ach.validation.customTraceNumbers', type: 'boolean', default: false, description: 'Allow trace numbers that don\'t match ODFI.' },
  { key: 'ach.validation.requireABAOrigin', type: 'boolean', default: false, description: 'Require valid ABA routing number as origin.' },
  { key: 'ach.validation.bypassOriginValidation', type: 'boolean', default: false, description: 'Skip origin field validation.' },
  { key: 'ach.validation.bypassDestinationValidation', type: 'boolean', default: false, description: 'Skip destination field validation.' },
  { key: 'ach.validation.allowMissingFileHeader', type: 'boolean', default: false, description: 'Allow files without a FileHeader record.' },
  { key: 'ach.validation.allowMissingFileControl', type: 'boolean', default: false, description: 'Allow files without a FileControl record.' },
  { key: 'ach.validation.bypassCompanyIdentificationMatch', type: 'boolean', default: false, description: 'Skip batch header/control company ID match.' },
  { key: 'ach.validation.customReturnCodes', type: 'boolean', default: false, description: 'Allow non-standard return codes in Addenda99.' },
  { key: 'ach.validation.unequalServiceClassCode', type: 'boolean', default: false, description: 'Allow mismatched service class codes.' },
  { key: 'ach.validation.allowUnorderedBatchNumbers', type: 'boolean', default: false, description: 'Allow non-ascending batch numbers.' },
  { key: 'ach.validation.allowInvalidCheckDigit', type: 'boolean', default: false, description: 'Skip routing number check digit validation.' },
  { key: 'ach.validation.unequalAddendaCounts', type: 'boolean', default: false, description: 'Allow addenda count mismatches.' },
  { key: 'ach.validation.preserveSpaces', type: 'boolean', default: false, description: 'Retain trailing whitespace during parsing.' },
  { key: 'ach.validation.allowInvalidAmounts', type: 'boolean', default: false, description: 'Allow malformed amount fields.' },
  { key: 'ach.validation.allowZeroEntryAmount', type: 'boolean', default: false, description: 'Allow entries with zero dollar amounts.' },
  { key: 'ach.validation.allowSpecialCharacters', type: 'boolean', default: false, description: 'Allow non-alphanumeric characters in fields.' },
  { key: 'ach.validation.allowEmptyIndividualName', type: 'boolean', default: false, description: 'Allow blank individual name fields.' },
  { key: 'ach.validation.bypassBatchValidation', type: 'boolean', default: false, description: 'Skip all batch-level validation.' },
  { key: 'ach.validation.skipFileCreationValidation', type: 'boolean', default: false, description: 'Skip file creation date validation.' },
  { key: 'ach.validation.skipBatchHeaderCompanyValidation', type: 'boolean', default: false, description: 'Skip company name/ID validation in batch headers.' },
];
