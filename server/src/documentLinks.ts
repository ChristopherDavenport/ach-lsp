import { DocumentLink, Range } from 'vscode-languageserver/node';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { getSecCodeForLine } from '../../shared/src/achConstants';
import { recordTypeToFieldSpecs, FieldSpec } from 'ach-ts';
import { addendaFieldsByTypeCode } from './achFieldUtils';

const FEDACH_LOOKUP_URL = 'https://www.frbservices.org/EPaymentsDirectory/search.html';

/**
 * Provide document links for ACH files.
 * - Routing numbers → FedACH lookup
 */
export function provideDocumentLinks(document: TextDocument): DocumentLink[] {
  const text = document.getText();
  const lines = text.split('\n');
  const links: DocumentLink[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length === 0) continue;
    if (/^9+$/.test(line.trim())) continue;

    const recordType = line.charAt(0);

    let specs: FieldSpec[] | undefined;
    if (recordType === '7') {
      const typeCode = line.substring(1, 3);
      specs = addendaFieldsByTypeCode[typeCode];
    } else {
      const secCode = getSecCodeForLine(lines, i);
      specs = recordTypeToFieldSpecs(recordType, {
        secCode,
        isADV: secCode === 'ADV',
      });
    }

    if (!specs) continue;

    for (const spec of specs) {
      // Link routing number fields
      if (isRoutingField(spec.name)) {
        const value = line.substring(spec.start, Math.min(spec.end, line.length)).trim();
        if (value.length >= 8 && /^\d+$/.test(value)) {
          const routing = value.length === 9 ? value : value.substring(0, 8);
          links.push({
            range: Range.create(i, spec.start, i, Math.min(spec.end, line.length)),
            target: `${FEDACH_LOOKUP_URL}?routingNumber=${routing}`,
            tooltip: `Look up routing number ${routing}`,
          });
        }
      }
    }
  }

  return links;
}

function isRoutingField(fieldName: string): boolean {
  return fieldName === 'immediateDestination' ||
    fieldName === 'immediateOrigin' ||
    fieldName === 'rdfiIdentification' ||
    fieldName === 'odfiIdentification';
}
