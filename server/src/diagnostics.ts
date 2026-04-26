import { Diagnostic, DiagnosticSeverity } from 'vscode-languageserver/node';
import type { ACHDocumentState } from './achDocument';
import type { FieldPosition } from 'ach-ts';
import {
  fileHeaderFieldPositions,
  batchHeaderFieldPositions,
  entryDetailFieldPositions,
  batchControlFieldPositions,
  fileControlFieldPositions,
  iatBatchHeaderFieldPositions,
  iatEntryDetailFieldPositions,
  advBatchControlFieldPositions,
  advEntryDetailFieldPositions,
  advFileControlFieldPositions,
  addenda02FieldPositions,
  addenda05FieldPositions,
  addenda10FieldPositions,
  addenda11FieldPositions,
  addenda12FieldPositions,
  addenda13FieldPositions,
  addenda14FieldPositions,
  addenda15FieldPositions,
  addenda16FieldPositions,
  addenda17FieldPositions,
  addenda18FieldPositions,
  addenda98FieldPositions,
  addenda98RefusedFieldPositions,
  addenda99FieldPositions,
  addenda99DishonoredFieldPositions,
  addenda99ContestedFieldPositions,
} from 'ach-ts';

/** Look up all position maps for a record type, returning the most common first. */
function getPositionMapsForRecordType(recordType: string, addendaTypeCode?: string): Record<string, FieldPosition>[] {
  switch (recordType) {
    case '1': return [fileHeaderFieldPositions];
    case '5': return [batchHeaderFieldPositions, iatBatchHeaderFieldPositions];
    case '6': return [entryDetailFieldPositions, iatEntryDetailFieldPositions, advEntryDetailFieldPositions];
    case '7': {
      // Try to pick the right addenda map based on the addenda type code
      const addendaMaps: Record<string, Record<string, FieldPosition>> = {
        '02': addenda02FieldPositions,
        '05': addenda05FieldPositions,
        '10': addenda10FieldPositions,
        '11': addenda11FieldPositions,
        '12': addenda12FieldPositions,
        '13': addenda13FieldPositions,
        '14': addenda14FieldPositions,
        '15': addenda15FieldPositions,
        '16': addenda16FieldPositions,
        '17': addenda17FieldPositions,
        '18': addenda18FieldPositions,
        '98': addenda98FieldPositions,
        '99': addenda99FieldPositions,
      };
      if (addendaTypeCode && addendaMaps[addendaTypeCode]) {
        return [addendaMaps[addendaTypeCode]];
      }
      // Fallback: try addenda05 (most common), then all others
      return [
        addenda05FieldPositions,
        addenda02FieldPositions,
        addenda98FieldPositions, addenda98RefusedFieldPositions,
        addenda99FieldPositions, addenda99DishonoredFieldPositions, addenda99ContestedFieldPositions,
        addenda10FieldPositions, addenda11FieldPositions, addenda12FieldPositions,
        addenda13FieldPositions, addenda14FieldPositions, addenda15FieldPositions,
        addenda16FieldPositions, addenda17FieldPositions, addenda18FieldPositions,
      ];
    }
    case '8': return [batchControlFieldPositions, advBatchControlFieldPositions];
    case '9': return [fileControlFieldPositions, advFileControlFieldPositions];
    default: return [];
  }
}

/** Try to resolve a field name to a position using the record type's position maps. */
function resolveFieldPosition(
  fieldName: string,
  recordType: string,
  addendaTypeCode?: string,
): FieldPosition | undefined {
  const maps = getPositionMapsForRecordType(recordType, addendaTypeCode);
  for (const map of maps) {
    const pos = map[fieldName];
    if (pos) return pos;
  }
  return undefined;
}

/**
 * Convert ach-ts errors into LSP Diagnostic[].
 * ach-ts errors carry: line, startColumn, endColumn, code, severity
 */
export function computeDiagnostics(
  state: ACHDocumentState,
  maxProblems: number
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const allErrors = [...state.parseErrors, ...state.validationErrors];
  const lines = state.text.split('\n');

  for (const err of allErrors) {
    if (diagnostics.length >= maxProblems) break;

    const diagnostic = errorToDiagnostic(err, lines);
    if (diagnostic) {
      diagnostics.push(diagnostic);
    }
  }

  return diagnostics;
}

function errorToDiagnostic(err: Error, lines: string[]): Diagnostic | null {
  const achErr = err as Error & {
    line?: number;
    startColumn?: number;
    endColumn?: number;
    code?: string;
    severity?: string;
    fieldName?: string;
    field?: string;
    msg?: string;
  };

  // Determine line (1-based from ach-ts → 0-based for LSP)
  const line = typeof achErr.line === 'number' ? achErr.line - 1 : 0;
  const safeLine = Math.max(0, Math.min(line, lines.length - 1));
  const lineText = lines[safeLine] ?? '';
  const lineLength = lineText.length || 94;

  // Determine column range
  let startCol = typeof achErr.startColumn === 'number' ? achErr.startColumn : 0;
  let endCol = typeof achErr.endColumn === 'number' ? achErr.endColumn : lineLength;

  // If the range spans the full line, try to narrow it to the specific field.
  // Field name may be on the error itself, or on its cause (e.g. ParseError wraps FieldError).
  if (startCol === 0 && endCol >= lineLength) {
    const cause = achErr.cause as (Error & { fieldName?: string }) | undefined;
    const errFieldName = achErr.fieldName ?? achErr.field ?? cause?.fieldName;
    if (errFieldName && lineText.length > 0) {
      const recordType = lineText.charAt(0);
      const addendaTypeCode = recordType === '7' ? lineText.substring(1, 3) : undefined;
      const pos = resolveFieldPosition(errFieldName, recordType, addendaTypeCode);
      if (pos) {
        startCol = pos.start;
        endCol = pos.end;
      }
    }
  }

  // Map severity
  let severity = DiagnosticSeverity.Error;
  if (achErr.severity === 'warning') {
    severity = DiagnosticSeverity.Warning;
  } else if (achErr.severity === 'info') {
    severity = DiagnosticSeverity.Information;
  }

  return {
    severity,
    range: {
      start: { line: safeLine, character: startCol },
      end: { line: safeLine, character: endCol },
    },
    message: achErr.message,
    source: 'ach',
    code: achErr.code || undefined,
  };
}
