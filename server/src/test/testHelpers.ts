import { TextDocument } from 'vscode-languageserver-textdocument';
import { Reader } from 'ach-ts';
import type { ACHDocumentState } from '../achDocument';

/** Create a TextDocument from raw ACH text for use in tests. */
export function makeDocument(text: string, uri = 'file:///test.ach'): TextDocument {
  return TextDocument.create(uri, 'ach', 1, text);
}

/** Create an ACHDocumentState from raw ACH text. */
export function makeState(text: string, opts?: { skipAll?: boolean }): ACHDocumentState {
  const reader = new Reader(text);
  if (opts?.skipAll) {
    reader.setValidation({ skipAll: true });
  }
  const result = reader.readWithErrors();
  if (result.file) {
    result.file.annotateLineNumbers();
  }

  let validationErrors: Error[] = [];
  if (result.file && (!result.errors || result.errors.length === 0) && !opts?.skipAll) {
    try {
      validationErrors = result.file.validateAll();
    } catch (e) {
      if (e instanceof Error) {
        validationErrors = [e];
      }
    }
  }

  return {
    file: result.file,
    parseErrors: result.errors || [],
    validationErrors,
    text,
    version: 1,
  };
}
