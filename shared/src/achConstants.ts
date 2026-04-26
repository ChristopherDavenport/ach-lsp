// Human-readable descriptions for ACH fields, SEC codes, transaction codes, and addenda types.

export const SEC_CODE_DESCRIPTIONS: Record<string, string> = {
  ACK: 'Acknowledgment — CCD acknowledgments',
  ADV: 'Automated Accounting Advice — non-monetary accounting info',
  ARC: 'Accounts Receivable Check — mailed check conversion',
  ATX: 'Acknowledgment (Tax) — CTX acknowledgments',
  BOC: 'Back Office Conversion — point-of-purchase check conversion',
  CCD: 'Corporate Credit or Debit — B2B payments',
  CIE: 'Customer Initiated Entry — consumer push payments',
  COR: 'Notification of Change — account info corrections',
  CTX: 'Corporate Trade Exchange — B2B with remittance data',
  DNE: 'Death Notification Entry — death benefits stop',
  ENR: 'Automated Enrollment Entry — government agency enrollment',
  IAT: 'International ACH Transaction — cross-border payments',
  MTE: 'Machine Transfer Entry — ATM transactions',
  POP: 'Point of Purchase — in-person check conversion',
  POS: 'Point of Sale — merchant debit card settlement',
  PPD: 'Prearranged Payment and Deposit — payroll, pension, recurring bills',
  RCK: 'Re-presented Check — returned check retry',
  SHR: 'Shared Network Transaction — shared ATM debit',
  TEL: 'Telephone-Initiated Entry — phone-authorized debits',
  TRC: 'Truncated Check Entry — truncated check debit',
  TRX: 'Check Truncation Exchange — multiple truncated checks',
  WEB: 'Internet-Initiated Entry — online bill payments',
  XCK: 'Destroyed Check Entry — destroyed check collection',
};

export const TRANSACTION_CODE_DESCRIPTIONS: Record<number, string> = {
  22: 'Checking Credit — deposit to checking account',
  23: 'Checking Credit Prenote — prenotification for checking credit',
  24: 'Checking Credit Zero Dollar — zero dollar checking credit with remittance',
  27: 'Checking Debit — withdrawal from checking account',
  28: 'Checking Debit Prenote — prenotification for checking debit',
  29: 'Checking Debit Zero Dollar — zero dollar checking debit with remittance',
  32: 'Savings Credit — deposit to savings account',
  33: 'Savings Credit Prenote — prenotification for savings credit',
  34: 'Savings Credit Zero Dollar — zero dollar savings credit with remittance',
  37: 'Savings Debit — withdrawal from savings account',
  38: 'Savings Debit Prenote — prenotification for savings debit',
  39: 'Savings Debit Zero Dollar — zero dollar savings debit with remittance',
  // GL entries
  42: 'GL Credit — general ledger credit',
  43: 'GL Credit Prenote — prenotification for GL credit',
  44: 'GL Credit Zero Dollar — zero dollar GL credit',
  47: 'GL Debit — general ledger debit',
  48: 'GL Debit Prenote — prenotification for GL debit',
  49: 'GL Debit Zero Dollar — zero dollar GL debit',
  // Loan entries
  52: 'Loan Credit — deposit to loan account',
  53: 'Loan Credit Prenote — prenotification for loan credit',
  54: 'Loan Credit Zero Dollar — zero dollar loan credit',
  55: 'Loan Debit — loan debit (reversal)',
  56: 'Loan Debit Prenote — loan debit prenotification',
  // ADV entries (Automated Accounting Advice)
  81: 'ADV Credit for Debits Originated — credit to offset debits originated',
  82: 'ADV Debit for Credits Originated — debit to offset credits originated',
  83: 'ADV Credit for Credits Received — credit for credits received',
  84: 'ADV Debit for Debits Received — debit for debits received',
  85: 'ADV Credit for Credits Rejected — credit for rejected credits',
  86: 'ADV Debit for Debits Rejected — debit for rejected debits',
  87: 'ADV Credit Summary — summary credit entry',
  88: 'ADV Debit Summary — summary debit entry',
};

export const SERVICE_CLASS_DESCRIPTIONS: Record<number, string> = {
  200: 'Mixed Debits and Credits',
  220: 'Credits Only',
  225: 'Debits Only',
  280: 'Automated Accounting Advices',
};

export const ADDENDA_TYPE_DESCRIPTIONS: Record<string, string> = {
  '02': 'POS/SHR/MTE terminal information',
  '05': 'General-purpose payment information',
  '10': 'IAT — transaction type and foreign payment',
  '11': 'IAT — originator name and address',
  '12': 'IAT — originator city/state/country',
  '13': 'IAT — ODFI information',
  '14': 'IAT — RDFI information',
  '15': 'IAT — receiver identification',
  '16': 'IAT — receiver address',
  '17': 'IAT — remittance information (max 2 per entry)',
  '18': 'IAT — foreign correspondent bank (max 5 per entry)',
  '98': 'Notification of Change (19 change codes)',
  '99': 'Return (54 return codes)',
};

export const RECORD_TYPE_DESCRIPTIONS: Record<string, string> = {
  '1': 'File Header Record — identifies the destination and origin of the file, creation date/time, and file-level settings. Exactly one per file, always the first record.',
  '5': 'Batch Header Record — opens a batch of entries with a common SEC code, company identification, effective date, and originating bank. One per batch.',
  '6': 'Entry Detail Record — a single ACH transaction: the receiving account, routing number, amount, and individual identification.',
  '7': 'Addenda Record — supplemental data attached to an entry detail (payment info, return reason, NOC data, or IAT details).',
  '8': 'Batch Control Record — closes a batch with entry/addenda counts, entry hash, and total debit/credit amounts for the batch.',
  '9': 'File Control Record — closes the file with batch count, block count, total entry/addenda count, entry hash, and total debit/credit amounts for the entire file.',
};

/** Field descriptions keyed by record type and field name */
export interface FieldDescription {
  name: string;
  description: string;
  format?: string;
  start: number;
  end: number;
}

export const FILE_HEADER_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "1" for File Header', start: 0, end: 1 },
  { name: 'Priority Code', description: 'Priority code for processing (usually 01)', format: 'NN', start: 1, end: 3 },
  { name: 'Immediate Destination', description: 'Routing number of the receiving bank (ACH Operator)', format: 'bNNNNNNNNN (space-padded)', start: 3, end: 13 },
  { name: 'Immediate Origin', description: 'Routing number or tax ID of the sending institution', format: 'bNNNNNNNNN (space-padded)', start: 13, end: 23 },
  { name: 'File Creation Date', description: 'Date the file was created', format: 'YYMMDD', start: 23, end: 29 },
  { name: 'File Creation Time', description: 'Time the file was created', format: 'HHMM', start: 29, end: 33 },
  { name: 'File ID Modifier', description: 'Distinguishes between multiple files created on the same date', format: 'A-Z or 0-9', start: 33, end: 34 },
  { name: 'Record Size', description: 'Number of characters per record (always 094)', format: 'NNN', start: 34, end: 37 },
  { name: 'Blocking Factor', description: 'Number of records per block (always 10)', format: 'NN', start: 37, end: 39 },
  { name: 'Format Code', description: 'Format code (always 1)', format: 'N', start: 39, end: 40 },
  { name: 'Immediate Destination Name', description: 'Name of the receiving institution', format: '23 chars', start: 40, end: 63 },
  { name: 'Immediate Origin Name', description: 'Name of the sending institution', format: '23 chars', start: 63, end: 86 },
  { name: 'Reference Code', description: 'Optional reference code', format: '8 chars', start: 86, end: 94 },
];

export const BATCH_HEADER_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "5" for Batch Header', start: 0, end: 1 },
  { name: 'Service Class Code', description: '200=mixed, 220=credits, 225=debits', format: 'NNN', start: 1, end: 4 },
  { name: 'Company Name', description: 'Name of the company originating the batch', format: '16 chars', start: 4, end: 20 },
  { name: 'Company Discretionary Data', description: 'Optional data for company use', format: '20 chars', start: 20, end: 40 },
  { name: 'Company Identification', description: 'Tax ID or assigned identification number', format: '10 chars', start: 40, end: 50 },
  { name: 'Standard Entry Class Code', description: 'SEC code identifying the type of entries (PPD, CCD, WEB, etc.)', format: 'AAA', start: 50, end: 53 },
  { name: 'Company Entry Description', description: 'Description of the transaction (e.g., PAYROLL)', format: '10 chars', start: 53, end: 63 },
  { name: 'Company Descriptive Date', description: 'Date displayed to the receiver', format: '6 chars', start: 63, end: 69 },
  { name: 'Effective Entry Date', description: 'Date entries are to be settled', format: 'YYMMDD', start: 69, end: 75 },
  { name: 'Settlement Date', description: 'Julian date — inserted by ACH Operator', format: 'NNN', start: 75, end: 78 },
  { name: 'Originator Status Code', description: 'Always "1" — originator is an institution', format: 'N', start: 78, end: 79 },
  { name: 'ODFI Identification', description: 'First 8 digits of the originating bank routing number', format: 'NNNNNNNN', start: 79, end: 87 },
  { name: 'Batch Number', description: 'Sequential batch number within the file', format: 'NNNNNNN', start: 87, end: 94 },
];

export const ENTRY_DETAIL_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "6" for Entry Detail', start: 0, end: 1 },
  { name: 'Transaction Code', description: 'Identifies debit/credit and account type', format: 'NN', start: 1, end: 3 },
  { name: 'RDFI Identification', description: 'First 8 digits of the receiving bank routing number', format: 'NNNNNNNN', start: 3, end: 11 },
  { name: 'Check Digit', description: 'Routing number check digit', format: 'N', start: 11, end: 12 },
  { name: 'DFI Account Number', description: "Receiver's account number at the RDFI", format: '17 chars', start: 12, end: 29 },
  { name: 'Amount', description: 'Transaction amount in cents (no decimal point)', format: '10 digits', start: 29, end: 39 },
  { name: 'Individual Identification Number', description: "Receiver's identification number assigned by the originator", format: '15 chars', start: 39, end: 54 },
  { name: 'Individual Name', description: "Receiver's name", format: '22 chars', start: 54, end: 76 },
  { name: 'Discretionary Data', description: 'Optional data for originator use', format: '2 chars', start: 76, end: 78 },
  { name: 'Addenda Record Indicator', description: '0=no addenda, 1=has addenda records', format: 'N', start: 78, end: 79 },
  { name: 'Trace Number', description: 'Unique identifier: ODFI routing (8) + sequence (7)', format: '15 digits', start: 79, end: 94 },
];

export const ADDENDA_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "7" for Addenda', start: 0, end: 1 },
  { name: 'Addenda Type Code', description: 'Type of addenda record (02, 05, 10-18, 98, 99)', format: 'NN', start: 1, end: 3 },
  { name: 'Payment Related Information', description: 'Content varies by addenda type', format: '80 chars', start: 3, end: 83 },
  { name: 'Addenda Sequence Number', description: 'Sequence number within the entry', format: 'NNNN', start: 83, end: 87 },
  { name: 'Entry Detail Sequence Number', description: 'Last 7 digits of the related entry trace number', format: 'NNNNNNN', start: 87, end: 94 },
];

export const BATCH_CONTROL_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "8" for Batch Control', start: 0, end: 1 },
  { name: 'Service Class Code', description: 'Must match Batch Header (200, 220, or 225)', format: 'NNN', start: 1, end: 4 },
  { name: 'Entry/Addenda Count', description: 'Total number of Entry Detail and Addenda records in batch', format: '6 digits', start: 4, end: 10 },
  { name: 'Entry Hash', description: 'Sum of RDFI routing numbers (rightmost 10 digits)', format: '10 digits', start: 10, end: 20 },
  { name: 'Total Debit Dollar Amount', description: 'Sum of all debit amounts in cents', format: '12 digits', start: 20, end: 32 },
  { name: 'Total Credit Dollar Amount', description: 'Sum of all credit amounts in cents', format: '12 digits', start: 32, end: 44 },
  { name: 'Company Identification', description: 'Must match Batch Header company identification', format: '10 chars', start: 44, end: 54 },
  { name: 'Message Authentication Code', description: 'Optional MAC for security', format: '19 chars', start: 54, end: 73 },
  { name: 'Reserved', description: 'Reserved for future use (spaces)', format: '6 chars', start: 73, end: 79 },
  { name: 'ODFI Identification', description: 'Must match Batch Header ODFI routing', format: 'NNNNNNNN', start: 79, end: 87 },
  { name: 'Batch Number', description: 'Must match Batch Header batch number', format: 'NNNNNNN', start: 87, end: 94 },
];

export const FILE_CONTROL_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "9" for File Control', start: 0, end: 1 },
  { name: 'Batch Count', description: 'Total number of batches in the file', format: '6 digits', start: 1, end: 7 },
  { name: 'Block Count', description: 'Total number of blocks (groups of 10 records)', format: '6 digits', start: 7, end: 13 },
  { name: 'Entry/Addenda Count', description: 'Total Entry Detail and Addenda records in file', format: '8 digits', start: 13, end: 21 },
  { name: 'Entry Hash', description: 'Sum of all batch entry hashes (rightmost 10 digits)', format: '10 digits', start: 21, end: 31 },
  { name: 'Total Debit Dollar Amount', description: 'Sum of all debit amounts across all batches', format: '12 digits', start: 31, end: 43 },
  { name: 'Total Credit Dollar Amount', description: 'Sum of all credit amounts across all batches', format: '12 digits', start: 43, end: 55 },
  { name: 'Reserved', description: 'Reserved for future use (spaces)', format: '39 chars', start: 55, end: 94 },
];

// --- IAT Addenda field descriptions (by addenda type code) ---

export const ADDENDA_10_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "7" for Addenda', start: 0, end: 1 },
  { name: 'Addenda Type Code', description: 'Always "10" for IAT Transaction Info', format: 'NN', start: 1, end: 3 },
  { name: 'Transaction Type Code', description: 'Type of transaction (ANN, BUS, DEP, LOA, MIS, MOR, PEN, RLS, SAL, TAX)', format: 'AAA', start: 3, end: 6 },
  { name: 'Foreign Payment Amount', description: 'Payment amount in foreign currency', format: '18 digits', start: 6, end: 24 },
  { name: 'Foreign Trace Number', description: 'Trace number assigned by the foreign institution', format: '22 chars', start: 24, end: 46 },
  { name: 'Name', description: 'Name associated with the transaction', format: '35 chars', start: 46, end: 81 },
  { name: 'Reserved', description: 'Reserved for future use', format: '6 chars', start: 81, end: 87 },
  { name: 'Entry Detail Sequence Number', description: 'Last 7 digits of the related entry trace number', format: 'NNNNNNN', start: 87, end: 94 },
];

export const ADDENDA_11_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "7" for Addenda', start: 0, end: 1 },
  { name: 'Addenda Type Code', description: 'Always "11" for IAT Originator Name/Address', format: 'NN', start: 1, end: 3 },
  { name: 'Originator Name', description: 'Name of the originator', format: '35 chars', start: 3, end: 38 },
  { name: 'Originator Street Address', description: 'Street address of the originator', format: '35 chars', start: 38, end: 73 },
  { name: 'Reserved', description: 'Reserved for future use', format: '14 chars', start: 73, end: 87 },
  { name: 'Entry Detail Sequence Number', description: 'Last 7 digits of the related entry trace number', format: 'NNNNNNN', start: 87, end: 94 },
];

export const ADDENDA_12_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "7" for Addenda', start: 0, end: 1 },
  { name: 'Addenda Type Code', description: 'Always "12" for IAT Originator City/Country', format: 'NN', start: 1, end: 3 },
  { name: 'Originator City & State/Province', description: 'City and state/province of the originator', format: '35 chars', start: 3, end: 38 },
  { name: 'Originator Country & Postal Code', description: 'Country and postal code of the originator', format: '35 chars', start: 38, end: 73 },
  { name: 'Originator Date of Birth', description: 'Date of birth of the originator', format: 'YYYYMMDD (or spaces)', start: 73, end: 83 },
  { name: 'Reserved', description: 'Reserved for future use', format: '4 chars', start: 83, end: 87 },
  { name: 'Entry Detail Sequence Number', description: 'Last 7 digits of the related entry trace number', format: 'NNNNNNN', start: 87, end: 94 },
];

export const ADDENDA_13_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "7" for Addenda', start: 0, end: 1 },
  { name: 'Addenda Type Code', description: 'Always "13" for IAT ODFI Information', format: 'NN', start: 1, end: 3 },
  { name: 'ODFI Name', description: 'Name of the originating depository financial institution', format: '35 chars', start: 3, end: 38 },
  { name: 'ODFI ID Number Qualifier', description: 'Qualifier (01=routing, 02=SWIFT, 03=CHIPS)', format: 'NN', start: 38, end: 40 },
  { name: 'ODFI Identification', description: 'Identification number of the ODFI', format: '34 chars', start: 40, end: 74 },
  { name: 'ODFI Branch Country Code', description: 'Country code of the ODFI branch', format: '3 chars', start: 74, end: 77 },
  { name: 'Reserved', description: 'Reserved for future use', format: '10 chars', start: 77, end: 87 },
  { name: 'Entry Detail Sequence Number', description: 'Last 7 digits of the related entry trace number', format: 'NNNNNNN', start: 87, end: 94 },
];

export const ADDENDA_14_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "7" for Addenda', start: 0, end: 1 },
  { name: 'Addenda Type Code', description: 'Always "14" for IAT RDFI Information', format: 'NN', start: 1, end: 3 },
  { name: 'RDFI Name', description: 'Name of the receiving depository financial institution', format: '35 chars', start: 3, end: 38 },
  { name: 'RDFI ID Number Qualifier', description: 'Qualifier (01=routing, 02=SWIFT, 03=CHIPS)', format: 'NN', start: 38, end: 40 },
  { name: 'RDFI Identification', description: 'Identification number of the RDFI', format: '34 chars', start: 40, end: 74 },
  { name: 'RDFI Branch Country Code', description: 'Country code of the RDFI branch', format: '3 chars', start: 74, end: 77 },
  { name: 'Reserved', description: 'Reserved for future use', format: '10 chars', start: 77, end: 87 },
  { name: 'Entry Detail Sequence Number', description: 'Last 7 digits of the related entry trace number', format: 'NNNNNNN', start: 87, end: 94 },
];

export const ADDENDA_15_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "7" for Addenda', start: 0, end: 1 },
  { name: 'Addenda Type Code', description: 'Always "15" for IAT Receiver Identification', format: 'NN', start: 1, end: 3 },
  { name: 'Receiver ID Number', description: 'Identification number of the receiver', format: '15 chars', start: 3, end: 18 },
  { name: 'Receiver Street Address', description: 'Street address of the receiver', format: '35 chars', start: 18, end: 53 },
  { name: 'Reserved', description: 'Reserved for future use', format: '34 chars', start: 53, end: 87 },
  { name: 'Entry Detail Sequence Number', description: 'Last 7 digits of the related entry trace number', format: 'NNNNNNN', start: 87, end: 94 },
];

export const ADDENDA_16_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "7" for Addenda', start: 0, end: 1 },
  { name: 'Addenda Type Code', description: 'Always "16" for IAT Receiver Address', format: 'NN', start: 1, end: 3 },
  { name: 'Receiver City & State/Province', description: 'City and state/province of the receiver', format: '35 chars', start: 3, end: 38 },
  { name: 'Receiver Country & Postal Code', description: 'Country and postal code of the receiver', format: '35 chars', start: 38, end: 73 },
  { name: 'Receiver Date of Birth', description: 'Date of birth of the receiver', format: 'YYYYMMDD (or spaces)', start: 73, end: 83 },
  { name: 'Reserved', description: 'Reserved for future use', format: '4 chars', start: 83, end: 87 },
  { name: 'Entry Detail Sequence Number', description: 'Last 7 digits of the related entry trace number', format: 'NNNNNNN', start: 87, end: 94 },
];

export const ADDENDA_17_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "7" for Addenda', start: 0, end: 1 },
  { name: 'Addenda Type Code', description: 'Always "17" for IAT Remittance Information', format: 'NN', start: 1, end: 3 },
  { name: 'Payment Related Information', description: 'Free-form remittance data', format: '80 chars', start: 3, end: 83 },
  { name: 'Sequence Number', description: 'Sequence number within the entry', format: 'NNNN', start: 83, end: 87 },
  { name: 'Entry Detail Sequence Number', description: 'Last 7 digits of the related entry trace number', format: 'NNNNNNN', start: 87, end: 94 },
];

export const ADDENDA_18_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "7" for Addenda', start: 0, end: 1 },
  { name: 'Addenda Type Code', description: 'Always "18" for Foreign Correspondent Bank', format: 'NN', start: 1, end: 3 },
  { name: 'Foreign Correspondent Bank Name', description: 'Name of the foreign correspondent bank', format: '35 chars', start: 3, end: 38 },
  { name: 'Foreign Bank ID Qualifier', description: 'Qualifier (01=routing, 02=SWIFT, 03=CHIPS)', format: 'NN', start: 38, end: 40 },
  { name: 'Foreign Correspondent Bank ID', description: 'Identification number of the foreign correspondent bank', format: '34 chars', start: 40, end: 74 },
  { name: 'Foreign Bank Branch Country Code', description: 'Country code of the foreign correspondent bank branch', format: '3 chars', start: 74, end: 77 },
  { name: 'Reserved', description: 'Reserved for future use', format: '6 chars', start: 77, end: 83 },
  { name: 'Sequence Number', description: 'Sequence number within the entry', format: 'NNNN', start: 83, end: 87 },
  { name: 'Entry Detail Sequence Number', description: 'Last 7 digits of the related entry trace number', format: 'NNNNNNN', start: 87, end: 94 },
];

export const ADDENDA_98_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "7" for Addenda', start: 0, end: 1 },
  { name: 'Addenda Type Code', description: 'Always "98" for Notification of Change', format: 'NN', start: 1, end: 3 },
  { name: 'Change Code', description: 'Code identifying the type of change (C01–C14, C61–C69)', format: 'CNN', start: 3, end: 6 },
  { name: 'Original Trace Number', description: 'Trace number of the original entry', format: '15 digits', start: 6, end: 21 },
  { name: 'Reserved', description: 'Reserved for future use', format: '6 chars', start: 21, end: 27 },
  { name: 'Original RDFI Identification', description: 'Routing number of the original receiving DFI', format: 'NNNNNNNN', start: 27, end: 35 },
  { name: 'Corrected Data', description: 'Corrected information for the field identified by the change code', format: '29 chars', start: 35, end: 64 },
  { name: 'IAT Corrected Data', description: 'Additional corrected data for IAT entries', format: '6 chars', start: 64, end: 70 },
  { name: 'Reserved', description: 'Reserved for future use', format: '9 chars', start: 70, end: 79 },
  { name: 'Trace Number', description: 'Unique identifier for this addenda record', format: '15 digits', start: 79, end: 94 },
];

export const ADDENDA_99_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "7" for Addenda', start: 0, end: 1 },
  { name: 'Addenda Type Code', description: 'Always "99" for Return', format: 'NN', start: 1, end: 3 },
  { name: 'Return Reason Code', description: 'Code identifying the reason for the return (R01–R85)', format: 'RNN', start: 3, end: 6 },
  { name: 'Original Trace Number', description: 'Trace number of the original entry being returned', format: '15 digits', start: 6, end: 21 },
  { name: 'Date of Death', description: 'Date of death for DNE entries, or spaces', format: 'YYMMDD', start: 21, end: 27 },
  { name: 'Original RDFI Identification', description: 'Routing number of the original receiving DFI', format: 'NNNNNNNN', start: 27, end: 35 },
  { name: 'Addenda Information', description: 'Additional return information', format: '44 chars', start: 35, end: 79 },
  { name: 'Trace Number', description: 'Unique identifier for this return addenda', format: '15 digits', start: 79, end: 94 },
];

export const ADV_ENTRY_DETAIL_FIELDS: FieldDescription[] = [
  { name: 'Record Type Code', description: 'Always "6" for Entry Detail', start: 0, end: 1 },
  { name: 'Transaction Code', description: 'ADV transaction code (81–88)', format: 'NN', start: 1, end: 3 },
  { name: 'RDFI Identification', description: 'First 8 digits of the receiving bank routing number', format: 'NNNNNNNN', start: 3, end: 11 },
  { name: 'Check Digit', description: 'Routing number check digit', format: 'N', start: 11, end: 12 },
  { name: 'DFI Account Number', description: "Receiver's account number at the RDFI", format: '15 chars', start: 12, end: 27 },
  { name: 'Amount', description: 'Advisory amount in cents', format: '12 digits', start: 27, end: 39 },
  { name: 'Advice Routing Number', description: 'Routing number for the advice', format: '9 digits', start: 39, end: 48 },
  { name: 'File Identification', description: 'File identification for the ADV entry', format: '5 chars', start: 48, end: 53 },
  { name: 'ACH Operator Data', description: 'Data for the ACH Operator', format: '1 char', start: 53, end: 54 },
  { name: 'Individual Name', description: "Receiver's name", format: '22 chars', start: 54, end: 76 },
  { name: 'Discretionary Data', description: 'Optional data for originator use', format: '2 chars', start: 76, end: 78 },
  { name: 'Addenda Record Indicator', description: '0=no addenda, 1=has addenda records', format: 'N', start: 78, end: 79 },
  { name: 'ACH Operator Routing Number', description: 'Routing number of the ACH Operator', format: '8 chars', start: 79, end: 87 },
  { name: 'Julian Day', description: 'Day of the year (001–366)', format: 'NNN', start: 87, end: 90 },
  { name: 'Sequence Number', description: 'Sequence number within the batch', format: 'NNNN', start: 90, end: 94 },
];

/** Get field descriptions for a given record type character */
function getFieldsForRecordType(recordType: string): FieldDescription[] {
  switch (recordType) {
    case '1': return FILE_HEADER_FIELDS;
    case '5': return BATCH_HEADER_FIELDS;
    case '6': return ENTRY_DETAIL_FIELDS;
    case '7': return ADDENDA_FIELDS;
    case '8': return BATCH_CONTROL_FIELDS;
    case '9': return FILE_CONTROL_FIELDS;
    default: return [];
  }
}

/** Find the field at a given column position for a record type */
export function getFieldAtPosition(recordType: string, column: number): FieldDescription | undefined {
  const fields = getFieldsForRecordType(recordType);
  return fields.find(f => column >= f.start && column < f.end);
}

/**
 * Human-readable labels, descriptions, and formats keyed by ach-ts camelCase field names.
 * Used by hover to display friendly info from ach-ts's recordTypeToFieldSpecs().
 */
export const FIELD_DESCRIPTIONS: Record<string, { label: string; description: string; format?: string }> = {
  // File Header (type 1)
  recordType: { label: 'Record Type Code', description: 'Identifies the record type (1, 5, 6, 7, 8, or 9)' },
  priorityCode: { label: 'Priority Code', description: 'Priority code for processing (usually 01)', format: 'NN' },
  immediateDestination: { label: 'Immediate Destination', description: 'Routing number of the receiving bank (ACH Operator)', format: 'bNNNNNNNNN (space-padded)' },
  immediateOrigin: { label: 'Immediate Origin', description: 'Routing number or tax ID of the sending institution', format: 'bNNNNNNNNN (space-padded)' },
  fileCreationDate: { label: 'File Creation Date', description: 'Date the file was created', format: 'YYMMDD' },
  fileCreationTime: { label: 'File Creation Time', description: 'Time the file was created', format: 'HHMM' },
  fileIDModifier: { label: 'File ID Modifier', description: 'Distinguishes between multiple files created on the same date', format: 'A-Z or 0-9' },
  recordSize: { label: 'Record Size', description: 'Number of characters per record (always 094)', format: 'NNN' },
  blockingFactor: { label: 'Blocking Factor', description: 'Number of records per block (always 10)', format: 'NN' },
  formatCode: { label: 'Format Code', description: 'Format code (always 1)', format: 'N' },
  immediateDestinationName: { label: 'Immediate Destination Name', description: 'Name of the receiving institution', format: '23 chars' },
  immediateOriginName: { label: 'Immediate Origin Name', description: 'Name of the sending institution', format: '23 chars' },
  referenceCode: { label: 'Reference Code', description: 'Optional reference code', format: '8 chars' },

  // Batch Header (type 5)
  serviceClassCode: { label: 'Service Class Code', description: '200 = mixed debits/credits, 220 = credits only, 225 = debits only', format: 'NNN' },
  companyName: { label: 'Company Name', description: 'Name of the company originating the batch', format: '16 chars' },
  companyDiscretionaryData: { label: 'Company Discretionary Data', description: 'Optional data for company use', format: '20 chars' },
  companyIdentification: { label: 'Company Identification', description: 'Tax ID or assigned identification number', format: '10 chars' },
  standardEntryClassCode: { label: 'Standard Entry Class Code', description: 'SEC code identifying the type of entries (PPD, CCD, WEB, etc.)', format: 'AAA' },
  companyEntryDescription: { label: 'Company Entry Description', description: 'Description of the transaction (e.g., PAYROLL)', format: '10 chars' },
  companyDescriptiveDate: { label: 'Company Descriptive Date', description: 'Date displayed to the receiver', format: '6 chars' },
  effectiveEntryDate: { label: 'Effective Entry Date', description: 'Date entries are to be settled', format: 'YYMMDD' },
  settlementDate: { label: 'Settlement Date', description: 'Julian date — inserted by ACH Operator', format: 'NNN' },
  originatorStatusCode: { label: 'Originator Status Code', description: 'Always "1" — originator is an institution', format: 'N' },
  odfiIdentification: { label: 'ODFI Identification', description: 'First 8 digits of the originating bank routing number', format: 'NNNNNNNN' },
  batchNumber: { label: 'Batch Number', description: 'Sequential batch number within the file', format: 'NNNNNNN' },

  // Entry Detail (type 6)
  transactionCode: { label: 'Transaction Code', description: 'Identifies debit/credit and account type', format: 'NN' },
  rdfiIdentification: { label: 'RDFI Identification', description: 'First 8 digits of the receiving bank routing number', format: 'NNNNNNNN' },
  checkDigit: { label: 'Check Digit', description: 'Routing number check digit', format: 'N' },
  dfiAccountNumber: { label: 'DFI Account Number', description: "Receiver's account number at the RDFI", format: '17 chars' },
  amount: { label: 'Amount', description: 'Transaction amount in cents (no decimal point)', format: '10 digits' },
  identificationNumber: { label: 'Individual Identification Number', description: "Receiver's identification number assigned by the originator", format: '15 chars' },
  individualName: { label: 'Individual Name', description: "Receiver's name", format: '22 chars' },
  discretionaryData: { label: 'Discretionary Data', description: 'Optional data for originator use', format: '2 chars' },
  addendaRecordIndicator: { label: 'Addenda Record Indicator', description: '0 = no addenda, 1 = has addenda records', format: 'N' },
  traceNumber: { label: 'Trace Number', description: 'Unique identifier: ODFI routing (8) + sequence (7)', format: '15 digits' },

  // Addenda (type 7)
  addendaTypeCode: { label: 'Addenda Type Code', description: 'Type of addenda record (02, 05, 10-18, 98, 99)', format: 'NN' },
  typeCode: { label: 'Addenda Type Code', description: 'Type of addenda record (02, 05, 10-18, 98, 99)', format: 'NN' },
  paymentRelatedInformation: { label: 'Payment Related Information', description: 'Content varies by addenda type', format: '80 chars' },
  addendaSequenceNumber: { label: 'Addenda Sequence Number', description: 'Sequence number within the entry', format: 'NNNN' },
  sequenceNumber: { label: 'Sequence Number', description: 'Sequence number within the entry', format: 'NNNN' },
  entryDetailSequenceNumber: { label: 'Entry Detail Sequence Number', description: 'Last 7 digits of the related entry trace number', format: 'NNNNNNN' },

  // Addenda 02 (POS/SHR/MTE terminal info)
  referenceInformationOne: { label: 'Reference Information 1', description: 'Reference information from the terminal', format: '7 chars' },
  referenceInformationTwo: { label: 'Reference Information 2', description: 'Additional reference information', format: '3 chars' },
  terminalIdentificationCode: { label: 'Terminal Identification Code', description: 'Code identifying the terminal', format: '6 chars' },
  transactionSerialNumber: { label: 'Transaction Serial Number', description: 'Serial number assigned by the terminal', format: '6 chars' },
  transactionDate: { label: 'Transaction Date', description: 'Date of the transaction at the terminal', format: 'MMDD' },
  authorizationCodeOrExpireDate: { label: 'Authorization Code / Expire Date', description: 'Authorization code or card expiration date', format: '6 chars' },
  terminalLocation: { label: 'Terminal Location', description: 'Location of the terminal', format: '27 chars' },
  terminalCity: { label: 'Terminal City', description: 'City where the terminal is located', format: '15 chars' },
  terminalState: { label: 'Terminal State', description: 'State where the terminal is located', format: '2 chars' },

  // Addenda 98 (Notification of Change)
  changeCode: { label: 'Change Code', description: 'Code identifying the type of change (C01–C14, C61–C69)', format: 'CNN' },
  originalTrace: { label: 'Original Trace Number', description: 'Trace number of the original entry', format: '15 digits' },
  originalDFI: { label: 'Original RDFI Identification', description: 'Routing number of the original receiving DFI', format: 'NNNNNNNN' },
  correctedData: { label: 'Corrected Data', description: 'Corrected information for the field identified by the change code', format: '29 chars' },
  iatCorrectedData: { label: 'IAT Corrected Data', description: 'Additional corrected data for IAT entries', format: '6 chars' },

  // Addenda 99 (Return)
  returnCode: { label: 'Return Reason Code', description: 'Code identifying the reason for the return (R01–R85)', format: 'RNN' },
  dateOfDeath: { label: 'Date of Death', description: 'Date of death for DNE entries, or spaces', format: 'YYMMDD' },
  addendaInformation: { label: 'Addenda Information', description: 'Additional return information', format: '44 chars' },

  // IAT Addenda 10 (Transaction Info)
  transactionTypeCode: { label: 'Transaction Type Code', description: 'Type of transaction (ANN, BUS, DEP, LOA, MIS, MOR, PEN, RLS, SAL, TAX)', format: 'AAA' },
  foreignPaymentAmount: { label: 'Foreign Payment Amount', description: 'Payment amount in foreign currency', format: '18 digits' },
  foreignTraceNumber: { label: 'Foreign Trace Number', description: 'Trace number assigned by the foreign institution', format: '22 chars' },

  // IAT Addenda 11 (Originator Name/Address)
  originatorName: { label: 'Originator Name', description: 'Name of the originator', format: '35 chars' },
  originatorStreetAddress: { label: 'Originator Street Address', description: 'Street address of the originator', format: '35 chars' },

  // IAT Addenda 12 (Originator City/Country)
  originatorCityStateProvince: { label: 'Originator City & State/Province', description: 'City and state/province of the originator', format: '35 chars' },
  originatorCountryPostalCode: { label: 'Originator Country & Postal Code', description: 'Country and postal code of the originator', format: '35 chars' },
  originatorDateOfBirth: { label: 'Originator Date of Birth', description: 'Date of birth of the originator', format: 'YYYYMMDD (or spaces)' },

  // IAT Addenda 13 (ODFI Info)
  odfiName: { label: 'ODFI Name', description: 'Name of the originating depository financial institution', format: '35 chars' },
  odfiIDNumberQualifier: { label: 'ODFI ID Number Qualifier', description: 'Qualifier for the ODFI identification number (01=routing, 02=SWIFT, 03=CHIPS)', format: 'NN' },

  // IAT Addenda 14 (RDFI Info)
  rdfiName: { label: 'RDFI Name', description: 'Name of the receiving depository financial institution', format: '35 chars' },
  rdfiIDNumberQualifier: { label: 'RDFI ID Number Qualifier', description: 'Qualifier for the RDFI identification number (01=routing, 02=SWIFT, 03=CHIPS)', format: 'NN' },
  rdfiBranchCountryCode: { label: 'RDFI Branch Country Code', description: 'Country code of the RDFI branch', format: '3 chars' },
  odfiBranchCountryCode: { label: 'ODFI Branch Country Code', description: 'Country code of the ODFI branch', format: '3 chars' },

  // IAT Addenda 15 (Receiver ID)
  receiverIDNumber: { label: 'Receiver ID Number', description: 'Identification number of the receiver', format: '15 chars' },
  receiverStreetAddress: { label: 'Receiver Street Address', description: 'Street address of the receiver', format: '35 chars' },

  // IAT Addenda 16 (Receiver Address)
  receiverCityStateProvince: { label: 'Receiver City & State/Province', description: 'City and state/province of the receiver', format: '35 chars' },
  receiverCountryPostalCode: { label: 'Receiver Country & Postal Code', description: 'Country and postal code of the receiver', format: '35 chars' },
  receiverDateOfBirth: { label: 'Receiver Date of Birth', description: 'Date of birth of the receiver', format: 'YYYYMMDD (or spaces)' },

  // IAT Addenda 18 (Foreign Correspondent Bank)
  foreignCorrespondentBankName: { label: 'Foreign Correspondent Bank Name', description: 'Name of the foreign correspondent bank', format: '35 chars' },
  foreignCorrespondentBankIDNumberQualifier: { label: 'Foreign Bank ID Qualifier', description: 'Qualifier for the bank identification number (01=routing, 02=SWIFT, 03=CHIPS)', format: 'NN' },
  foreignCorrespondentBankIDNumber: { label: 'Foreign Correspondent Bank ID', description: 'Identification number of the foreign correspondent bank', format: '34 chars' },
  foreignCorrespondentBankBranchCountryCode: { label: 'Foreign Bank Branch Country Code', description: 'Country code of the foreign correspondent bank branch', format: '3 chars' },

  // IAT Batch Header (type 5, SEC=IAT)
  iatIndicator: { label: 'IAT Indicator', description: 'Identifies an IAT batch (spaces for standard IAT)', format: '16 chars' },
  foreignExchangeIndicator: { label: 'Foreign Exchange Indicator', description: 'FF = fixed-to-fixed, FV = fixed-to-variable', format: '2 chars' },
  foreignExchangeReferenceIndicator: { label: 'Foreign Exchange Reference Indicator', description: '1 = FX rate, 2 = foreign currency amount, 3 = not applicable', format: 'N' },
  foreignExchangeReference: { label: 'Foreign Exchange Reference', description: 'Foreign exchange rate or reference', format: '15 chars' },
  isoDestinationCountryCode: { label: 'ISO Destination Country Code', description: 'Two-character ISO 3166 country code for the destination', format: '2 chars' },
  originatorIdentification: { label: 'Originator Identification', description: 'Identification number of the originator', format: '10 chars' },
  isoOriginatingCurrencyCode: { label: 'ISO Originating Currency Code', description: 'Three-character ISO 4217 currency code for the originator', format: '3 chars' },
  isoDestinationCurrencyCode: { label: 'ISO Destination Currency Code', description: 'Three-character ISO 4217 currency code for the destination', format: '3 chars' },

  // IAT Entry Detail (type 6, SEC=IAT)
  addendaRecords: { label: 'Number of Addenda Records', description: 'Count of addenda records for this IAT entry', format: '4 digits' },
  ofacScreeningIndicator: { label: 'OFAC Screening Indicator', description: 'OFAC screening status indicator', format: '1 char' },
  secondaryOFACScreeningIndicator: { label: 'Secondary OFAC Screening Indicator', description: 'Secondary OFAC screening status indicator', format: '1 char' },

  // IAT Addenda 10 name field
  name: { label: 'Name', description: 'Name associated with the transaction', format: '35 chars' },

  // ADV Entry Detail (type 6, SEC=ADV)
  adviceRoutingNumber: { label: 'Advice Routing Number', description: 'Routing number for the advice', format: '9 digits' },
  fileIdentification: { label: 'File Identification', description: 'File identification for the ADV entry', format: '5 chars' },
  achOperatorData: { label: 'ACH Operator Data', description: 'Data for the ACH Operator', format: '1 char' },
  achOperatorRoutingNumber: { label: 'ACH Operator Routing Number', description: 'Routing number of the ACH Operator', format: '8 chars' },
  julianDay: { label: 'Julian Day', description: 'Day of the year (001–366)', format: 'NNN' },

  // Batch Control (type 8)
  entryAddendaCount: { label: 'Entry/Addenda Count', description: 'Total number of Entry Detail and Addenda records', format: '6 digits' },
  entryHash: { label: 'Entry Hash', description: 'Sum of RDFI routing numbers (rightmost 10 digits)', format: '10 digits' },
  totalDebitEntryDollarAmount: { label: 'Total Debit Dollar Amount', description: 'Sum of all debit amounts in cents', format: '12 digits' },
  totalCreditEntryDollarAmount: { label: 'Total Credit Dollar Amount', description: 'Sum of all credit amounts in cents', format: '12 digits' },
  messageAuthenticationCode: { label: 'Message Authentication Code', description: 'Optional MAC for security', format: '19 chars' },
  reserved: { label: 'Reserved', description: 'Reserved for future use (spaces)' },

  // File Control (type 9)
  batchCount: { label: 'Batch Count', description: 'Total number of batches in the file', format: '6 digits' },
  blockCount: { label: 'Block Count', description: 'Total number of blocks (groups of 10 records)', format: '6 digits' },
  totalDebitEntryDollarAmountInFile: { label: 'Total Debit Dollar Amount', description: 'Sum of all debit amounts across all batches', format: '12 digits' },
  totalCreditEntryDollarAmountInFile: { label: 'Total Credit Dollar Amount', description: 'Sum of all credit amounts across all batches', format: '12 digits' },
};

/**
 * Scan backward from lineIndex to find the SEC code of the enclosing batch.
 * Returns the SEC code (e.g. 'PPD', 'IAT', 'ADV') or undefined if not found.
 * Works for both regular and IAT batch headers (SEC code is at columns 50-53 in both).
 */
export function getSecCodeForLine(lines: string[], lineIndex: number): string | undefined {
  for (let i = lineIndex; i >= 0; i--) {
    const ch = lines[i].charAt(0);
    if (ch === '5') return lines[i].substring(50, 53).trim() || undefined;
    if (ch === '1') return undefined; // hit file header — no enclosing batch
  }
  return undefined;
}
