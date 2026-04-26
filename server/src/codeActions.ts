import {
  CodeAction,
  CodeActionKind,
  TextEdit,
  CodeActionParams,
} from 'vscode-languageserver/node';
import { CalculateCheckDigit } from 'ach-ts';
import type { ACHDocumentState } from './achDocument';

// Field column positions (0-based, exclusive end)
const BC = { serviceClassCode: [1, 4], entryAddendaCount: [4, 10], entryHash: [10, 20], totalDebit: [20, 32], totalCredit: [32, 44], batchNumber: [87, 94] } as const;
const FC = { batchCount: [1, 7], blockCount: [7, 13], entryAddendaCount: [13, 21], entryHash: [21, 31], totalDebit: [31, 43], totalCredit: [43, 55] } as const;
const BH = { serviceClassCode: [1, 4], effectiveEntryDate: [69, 75] } as const;
const FH = { fileCreationDate: [23, 29], fileCreationTime: [29, 33] } as const;

/**
 * Provide quick-fix code actions for known diagnostic codes,
 * plus source actions for bulk operations.
 */
export function provideCodeActions(
  state: ACHDocumentState,
  params: CodeActionParams
): CodeAction[] {
  const actions: CodeAction[] = [];
  const lines = state.text.split('\n');
  const uri = params.textDocument.uri;

  // Diagnostic-driven quick fixes
  for (const diagnostic of params.context.diagnostics) {
    if (diagnostic.source !== 'ach') continue;

    const line = lines[diagnostic.range.start.line];
    if (!line) continue;
    const msg = diagnostic.message.toLowerCase();

    // Fix invalid check digit
    if (diagnostic.code === 'checkDigit' || msg.includes('check digit')) {
      const action = fixCheckDigit(line, diagnostic.range.start.line, uri);
      if (action) {
        action.diagnostics = [diagnostic];
        actions.push(action);
      }
    }

    // Fix line not being 94 characters
    if (msg.includes('record size') || msg.includes('94')) {
      if (line.length < 94) {
        actions.push({
          title: 'Pad line to 94 characters',
          kind: CodeActionKind.QuickFix,
          diagnostics: [diagnostic],
          edit: { changes: { [uri]: [TextEdit.replace({ start: { line: diagnostic.range.start.line, character: 0 }, end: { line: diagnostic.range.start.line, character: line.length } }, line.padEnd(94))] } },
        });
      }
    }

    // Fix record size field in file header
    if (msg.includes('record size') && line.charAt(0) === '1') {
      actions.push({
        title: 'Set record size to 094',
        kind: CodeActionKind.QuickFix,
        diagnostics: [diagnostic],
        edit: { changes: { [uri]: [TextEdit.replace({ start: { line: diagnostic.range.start.line, character: 34 }, end: { line: diagnostic.range.start.line, character: 37 } }, '094')] } },
      });
    }

    // Fix batch control totals
    if (line.charAt(0) === '8' && (msg.includes('count') || msg.includes('hash') || msg.includes('total') || msg.includes('debit') || msg.includes('credit') || msg.includes('amount'))) {
      const action = fixBatchControl(lines, diagnostic.range.start.line, uri);
      if (action) {
        action.diagnostics = [diagnostic];
        actions.push(action);
      }
    }

    // Fix file control totals
    if (line.charAt(0) === '9' && !/^9+$/.test(line) && (msg.includes('count') || msg.includes('hash') || msg.includes('total') || msg.includes('debit') || msg.includes('credit') || msg.includes('batch') || msg.includes('block') || msg.includes('amount'))) {
      const action = fixFileControl(lines, diagnostic.range.start.line, uri);
      if (action) {
        action.diagnostics = [diagnostic];
        actions.push(action);
      }
    }

    // Fix service class code
    if ((line.charAt(0) === '5' || line.charAt(0) === '8') && msg.includes('service class')) {
      const action = fixServiceClassCode(lines, diagnostic.range.start.line, uri);
      if (action) {
        action.diagnostics = [diagnostic];
        actions.push(action);
      }
    }

    // Fix effective entry date
    if (line.charAt(0) === '5' && (msg.includes('effective') || msg.includes('date'))) {
      const action = fixEffectiveEntryDate(diagnostic.range.start.line, uri);
      if (action) {
        action.diagnostics = [diagnostic];
        actions.push(action);
      }
    }

    // Fix file creation date/time
    if (line.charAt(0) === '1' && (msg.includes('creation') || msg.includes('date'))) {
      const action = fixFileCreationDate(diagnostic.range.start.line, uri);
      if (action) {
        action.diagnostics = [diagnostic];
        actions.push(action);
      }
    }
  }

  // Source action: recalculate all control totals (always available on ACH files)
  const recalcAction = recalculateAllControls(lines, uri);
  if (recalcAction) {
    actions.push(recalcAction);
  }

  return actions;
}

// ---------------------------------------------------------------------------
// Quick fix: check digit
// ---------------------------------------------------------------------------
function fixCheckDigit(
  line: string,
  lineNumber: number,
  uri: string
): CodeAction | null {
  const recordType = line.charAt(0);

  if (recordType === '6') {
    const routing = line.substring(3, 11);
    try {
      const correctDigit = String(CalculateCheckDigit(routing));
      const currentDigit = line.charAt(11);
      if (correctDigit !== currentDigit) {
        return {
          title: `Fix check digit: ${currentDigit} → ${correctDigit}`,
          kind: CodeActionKind.QuickFix,
          edit: { changes: { [uri]: [TextEdit.replace({ start: { line: lineNumber, character: 11 }, end: { line: lineNumber, character: 12 } }, correctDigit)] } },
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Quick fix: recalculate batch control totals
// ---------------------------------------------------------------------------
function fixBatchControl(
  lines: string[],
  controlLine: number,
  uri: string
): CodeAction | null {
  // Scan backward to find the batch header
  let headerLine = -1;
  for (let i = controlLine - 1; i >= 0; i--) {
    if (lines[i]?.charAt(0) === '5') { headerLine = i; break; }
    if (lines[i]?.charAt(0) === '1' || lines[i]?.charAt(0) === '9') break;
  }
  if (headerLine < 0) return null;

  const computed = computeBatchTotals(lines, headerLine, controlLine);
  const line = lines[controlLine];
  const svcClass = line.substring(BH.serviceClassCode[0], BH.serviceClassCode[1]);

  const newLine =
    '8' +
    svcClass +
    pad(computed.entryAddendaCount, 6) +
    pad(computed.entryHash, 10) +
    pad(computed.totalDebit, 12) +
    pad(computed.totalCredit, 12) +
    line.substring(44, 87) + // companyIdentification + MAC + reserved + ODFI
    line.substring(87, 94); // batchNumber

  return {
    title: 'Recalculate batch control totals',
    kind: CodeActionKind.QuickFix,
    edit: { changes: { [uri]: [TextEdit.replace({ start: { line: controlLine, character: 0 }, end: { line: controlLine, character: line.length } }, newLine)] } },
  };
}

// ---------------------------------------------------------------------------
// Quick fix: recalculate file control totals
// ---------------------------------------------------------------------------
function fixFileControl(
  lines: string[],
  controlLine: number,
  uri: string
): CodeAction | null {
  const computed = computeFileTotals(lines);
  const line = lines[controlLine];

  const newLine =
    '9' +
    pad(computed.batchCount, 6) +
    pad(computed.blockCount, 6) +
    pad(computed.entryAddendaCount, 8) +
    pad(computed.entryHash, 10) +
    pad(computed.totalDebit, 12) +
    pad(computed.totalCredit, 12) +
    ' '.repeat(39);

  return {
    title: 'Recalculate file control totals',
    kind: CodeActionKind.QuickFix,
    edit: { changes: { [uri]: [TextEdit.replace({ start: { line: controlLine, character: 0 }, end: { line: controlLine, character: line.length } }, newLine)] } },
  };
}

// ---------------------------------------------------------------------------
// Quick fix: service class code
// ---------------------------------------------------------------------------
function fixServiceClassCode(
  lines: string[],
  lineNum: number,
  uri: string
): CodeAction | null {
  const line = lines[lineNum];
  const recordType = line.charAt(0);

  // Find the batch header and control
  let headerLine = lineNum;
  let controlLine = lineNum;
  if (recordType === '5') {
    for (let i = lineNum + 1; i < lines.length; i++) {
      if (lines[i]?.charAt(0) === '8') { controlLine = i; break; }
      if (lines[i]?.charAt(0) === '5' || lines[i]?.charAt(0) === '9') break;
    }
  } else if (recordType === '8') {
    controlLine = lineNum;
    for (let i = lineNum - 1; i >= 0; i--) {
      if (lines[i]?.charAt(0) === '5') { headerLine = i; break; }
    }
  }

  const svcCode = inferServiceClassCode(lines, headerLine, controlLine);
  const edits: TextEdit[] = [];

  // Fix batch header
  if (headerLine >= 0 && headerLine < lines.length) {
    edits.push(TextEdit.replace(
      { start: { line: headerLine, character: BH.serviceClassCode[0] }, end: { line: headerLine, character: BH.serviceClassCode[1] } },
      svcCode
    ));
  }

  // Fix batch control
  if (controlLine >= 0 && controlLine < lines.length) {
    edits.push(TextEdit.replace(
      { start: { line: controlLine, character: BC.serviceClassCode[0] }, end: { line: controlLine, character: BC.serviceClassCode[1] } },
      svcCode
    ));
  }

  if (edits.length === 0) return null;

  return {
    title: `Set service class code to ${svcCode}`,
    kind: CodeActionKind.QuickFix,
    edit: { changes: { [uri]: edits } },
  };
}

// ---------------------------------------------------------------------------
// Quick fix: effective entry date → today
// ---------------------------------------------------------------------------
function fixEffectiveEntryDate(lineNum: number, uri: string): CodeAction | null {
  const today = formatDateYYMMDD(new Date());
  return {
    title: `Set effective entry date to ${today}`,
    kind: CodeActionKind.QuickFix,
    edit: { changes: { [uri]: [TextEdit.replace({ start: { line: lineNum, character: BH.effectiveEntryDate[0] }, end: { line: lineNum, character: BH.effectiveEntryDate[1] } }, today)] } },
  };
}

// ---------------------------------------------------------------------------
// Quick fix: file creation date/time → now
// ---------------------------------------------------------------------------
function fixFileCreationDate(lineNum: number, uri: string): CodeAction | null {
  const now = new Date();
  const date = formatDateYYMMDD(now);
  const time = formatTimeHHMM(now);
  return {
    title: `Set file creation date/time to now`,
    kind: CodeActionKind.QuickFix,
    edit: { changes: { [uri]: [
      TextEdit.replace({ start: { line: lineNum, character: FH.fileCreationDate[0] }, end: { line: lineNum, character: FH.fileCreationDate[1] } }, date),
      TextEdit.replace({ start: { line: lineNum, character: FH.fileCreationTime[0] }, end: { line: lineNum, character: FH.fileCreationTime[1] } }, time),
    ] } },
  };
}

// ---------------------------------------------------------------------------
// Source action: recalculate all control totals
// ---------------------------------------------------------------------------
function recalculateAllControls(lines: string[], uri: string): CodeAction | null {
  const edits: TextEdit[] = [];

  // Fix every batch control
  let headerLine = -1;
  for (let i = 0; i < lines.length; i++) {
    const rt = lines[i]?.charAt(0);
    if (rt === '5') {
      headerLine = i;
    } else if (rt === '8' && headerLine >= 0) {
      const computed = computeBatchTotals(lines, headerLine, i);
      const line = lines[i];
      const svcCode = inferServiceClassCode(lines, headerLine, i);

      const newLine =
        '8' +
        svcCode +
        pad(computed.entryAddendaCount, 6) +
        pad(computed.entryHash, 10) +
        pad(computed.totalDebit, 12) +
        pad(computed.totalCredit, 12) +
        line.substring(44, 87) +
        line.substring(87, 94);

      if (newLine !== line) {
        edits.push(TextEdit.replace(
          { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
          newLine
        ));
      }

      // Also fix batch header service class code if needed
      const bhLine = lines[headerLine];
      const currentBhSvc = bhLine.substring(BH.serviceClassCode[0], BH.serviceClassCode[1]);
      if (currentBhSvc !== svcCode) {
        edits.push(TextEdit.replace(
          { start: { line: headerLine, character: BH.serviceClassCode[0] }, end: { line: headerLine, character: BH.serviceClassCode[1] } },
          svcCode
        ));
      }

      headerLine = -1;
    }
  }

  // Fix file control
  const fileTotals = computeFileTotals(lines);
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (line?.charAt(0) === '9' && !/^9+$/.test(line)) {
      const newLine =
        '9' +
        pad(fileTotals.batchCount, 6) +
        pad(fileTotals.blockCount, 6) +
        pad(fileTotals.entryAddendaCount, 8) +
        pad(fileTotals.entryHash, 10) +
        pad(fileTotals.totalDebit, 12) +
        pad(fileTotals.totalCredit, 12) +
        ' '.repeat(39);

      if (newLine !== line) {
        edits.push(TextEdit.replace(
          { start: { line: i, character: 0 }, end: { line: i, character: line.length } },
          newLine
        ));
      }
      break;
    }
  }

  if (edits.length === 0) return null;

  return {
    title: 'Recalculate all control totals',
    kind: CodeActionKind.Source,
    edit: { changes: { [uri]: edits } },
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface BatchTotals {
  entryAddendaCount: number;
  entryHash: number;
  totalDebit: number;
  totalCredit: number;
}

function computeBatchTotals(lines: string[], headerLine: number, controlLine: number): BatchTotals {
  let entryAddendaCount = 0;
  let entryHash = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  for (let i = headerLine + 1; i < controlLine; i++) {
    const line = lines[i];
    if (!line) continue;
    const rt = line.charAt(0);

    if (rt === '6') {
      entryAddendaCount++;
      const rdfi = parseInt(line.substring(3, 11), 10);
      if (!isNaN(rdfi)) entryHash += rdfi;
      const txCode = parseInt(line.substring(1, 3), 10);
      const amount = parseInt(line.substring(29, 39), 10) || 0;
      if (isDebit(txCode)) {
        totalDebit += amount;
      } else {
        totalCredit += amount;
      }
    } else if (rt === '7') {
      entryAddendaCount++;
    }
  }

  // Entry hash is truncated to 10 digits
  entryHash = entryHash % 10000000000;

  return { entryAddendaCount, entryHash, totalDebit, totalCredit };
}

interface FileTotals {
  batchCount: number;
  blockCount: number;
  entryAddendaCount: number;
  entryHash: number;
  totalDebit: number;
  totalCredit: number;
}

function computeFileTotals(lines: string[]): FileTotals {
  let batchCount = 0;
  let entryAddendaCount = 0;
  let entryHash = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    if (!line) continue;
    const rt = line.charAt(0);

    if (rt === '8') {
      batchCount++;
      entryAddendaCount += parseInt(line.substring(BC.entryAddendaCount[0], BC.entryAddendaCount[1]), 10) || 0;
      entryHash += parseInt(line.substring(BC.entryHash[0], BC.entryHash[1]), 10) || 0;
      totalDebit += parseInt(line.substring(BC.totalDebit[0], BC.totalDebit[1]), 10) || 0;
      totalCredit += parseInt(line.substring(BC.totalCredit[0], BC.totalCredit[1]), 10) || 0;
    }
  }

  entryHash = entryHash % 10000000000;
  const totalLines = lines.filter(l => l.length > 0).length;
  const blockCount = Math.ceil(totalLines / 10);

  return { batchCount, blockCount, entryAddendaCount, entryHash, totalDebit, totalCredit };
}

function inferServiceClassCode(lines: string[], headerLine: number, controlLine: number): string {
  let hasDebits = false;
  let hasCredits = false;

  for (let i = headerLine + 1; i < controlLine; i++) {
    const line = lines[i];
    if (!line || line.charAt(0) !== '6') continue;
    const txCode = parseInt(line.substring(1, 3), 10);
    if (isDebit(txCode)) hasDebits = true;
    else hasCredits = true;
  }

  if (hasDebits && hasCredits) return '200';
  if (hasCredits) return '220';
  if (hasDebits) return '225';
  return '200'; // default mixed
}

function isDebit(txCode: number): boolean {
  // Debit transaction codes: 27,28,29 (checking), 37,38,39 (savings), 47 (GL), 55 (loan)
  return [27, 28, 29, 37, 38, 39, 47, 55].includes(txCode);
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, '0').slice(-width);
}

function formatDateYYMMDD(date: Date): string {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return yy + mm + dd;
}

function formatTimeHHMM(date: Date): string {
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return hh + mm;
}
