import { TextDocument } from 'vscode-languageserver-textdocument';
import {
  recordTypeToFieldSpecs,
  FieldSpec,
} from 'ach-ts';
import { getSecCodeForLine } from '../../shared/src/achConstants';
import { addendaFieldsByTypeCode } from './achFieldUtils';
import type { LineBoundaries } from '../../shared/src/types';
export type { LineBoundaries } from '../../shared/src/types';

export function getFieldBoundaries(document: TextDocument): LineBoundaries[] {
  const text = document.getText();
  const lines = text.split('\n');
  const result: LineBoundaries[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue;

    // Padding lines (all 9s) — no field boundaries
    if (/^9{10,}$/.test(line.trim())) continue;

    const recordType = line.charAt(0);

    let fields: FieldSpec[] | undefined;
    if (recordType === '7') {
      const typeCode = line.substring(1, 3);
      fields = addendaFieldsByTypeCode[typeCode];
    } else {
      const secCode = getSecCodeForLine(lines, i);
      fields = recordTypeToFieldSpecs(recordType, {
        secCode,
        isADV: secCode === 'ADV',
      });
    }

    if (!fields || fields.length === 0) continue;

    // Collect boundary points between fields (end of each field except the last)
    const boundaries: number[] = [];
    for (let f = 0; f < fields.length - 1; f++) {
      const end = Math.min(fields[f].end, line.length);
      if (end > 0 && end < line.length) {
        boundaries.push(end);
      }
    }

    if (boundaries.length > 0) {
      result.push({ line: i, boundaries });
    }
  }

  return result;
}
