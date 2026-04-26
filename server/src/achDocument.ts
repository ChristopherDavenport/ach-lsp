import { Reader } from 'ach-ts';
import type { File } from 'ach-ts';
import type { ValidateOpts } from 'ach-ts';

export interface ACHDocumentState {
  file: File | null;
  parseErrors: Error[];
  validationErrors: Error[];
  text: string;
  version: number;
}

const documentCache = new Map<string, ACHDocumentState>();
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * Parse an ACH document and cache the result. Debounces rapid calls.
 */
export function parseDocument(
  uri: string,
  text: string,
  version: number,
  validateOpts?: ValidateOpts,
  debounceMs = 200
): Promise<ACHDocumentState> {
  return new Promise((resolve) => {
    const existing = debounceTimers.get(uri);
    if (existing) {
      clearTimeout(existing);
    }

    const timer = setTimeout(() => {
      debounceTimers.delete(uri);
      const state = parseDocumentImmediate(uri, text, version, validateOpts);
      resolve(state);
    }, debounceMs);

    debounceTimers.set(uri, timer);
  });
}

/**
 * Parse an ACH document immediately without debouncing.
 */
export function parseDocumentImmediate(
  uri: string,
  text: string,
  version: number,
  validateOpts?: ValidateOpts
): ACHDocumentState {
  let file: File | null = null;
  let parseErrors: Error[] = [];
  let validationErrors: Error[] = [];

  try {
    const reader = new Reader(text);
    if (validateOpts) {
      reader.setValidation(validateOpts);
    }
    const result = reader.readWithErrors();
    file = result.file;
    parseErrors = result.errors || [];

    if (file) { 
      file.annotateLineNumbers();
    }

    if (file && parseErrors.length === 0) {
      try {
        validationErrors = file.validateAll();
      } catch (e) {
        if (e instanceof Error) {
          validationErrors = [e];
        }
      }
    }
  } catch (e) {
    if (e instanceof Error) {
      parseErrors = [e];
    }
  }

  const state: ACHDocumentState = { file, parseErrors, validationErrors, text, version };
  documentCache.set(uri, state);
  return state;
}

/**
 * Get the cached document state for a URI.
 */
export function getDocument(uri: string): ACHDocumentState | undefined {
  return documentCache.get(uri);
}

/**
 * Remove a document from the cache.
 */
export function removeDocument(uri: string): void {
  documentCache.delete(uri);
  const timer = debounceTimers.get(uri);
  if (timer) {
    clearTimeout(timer);
    debounceTimers.delete(uri);
  }
}
