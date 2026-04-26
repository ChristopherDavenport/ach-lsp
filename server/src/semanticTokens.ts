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
import { TOKEN_TYPES, getTokenType } from '../../shared/src/semanticTokenMap';

const tokenModifiers = ['declaration', 'definition', 'readonly'];

export const semanticTokensLegend: SemanticTokensLegend = {
  tokenTypes: [...TOKEN_TYPES],
  tokenModifiers,
};

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
