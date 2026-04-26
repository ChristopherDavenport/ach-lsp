import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentSyncKind,
  InitializeResult,
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { ValidateOpts } from 'ach-ts';
import { parseDocument, parseDocumentImmediate, removeDocument, getDocument } from './achDocument';
import { computeDiagnostics } from './diagnostics';
import { provideHover } from './hover';
import { provideCompletion, resolveCompletion } from './completion';
import { provideFormatting } from './formatting';
import { provideCodeActions } from './codeActions';
import { provideDocumentSymbols } from './documentSymbols';
import {
  semanticTokensLegend,
  provideSemanticTokens,
} from './semanticTokens';
import { getFileStructure } from './fileStructure';
import { provideFoldingRanges } from './folding';
import { getFieldBoundaries } from './fieldBoundaries';
import { provideInlayHints } from './inlayHints';

const connection = createConnection(ProposedFeatures.all);
const documents = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;

interface ACHSettings {
  maxNumberOfProblems: number;
  validation: Partial<ValidateOpts>;
}

const defaultSettings: ACHSettings = {
  maxNumberOfProblems: 1000,
  validation: {},
};
let globalSettings: ACHSettings = defaultSettings;
const documentSettings = new Map<string, Thenable<ACHSettings>>();

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: [],
      },
      hoverProvider: true,
      documentFormattingProvider: true,
      codeActionProvider: true,
      documentSymbolProvider: true,
      foldingRangeProvider: true,
      semanticTokensProvider: {
        legend: semanticTokensLegend,
        full: true,
      },
    },
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true,
      },
    };
  }

  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }
});

function getDocumentSettings(resource: string): Thenable<ACHSettings> {
  if (!hasConfigurationCapability) {
    return Promise.resolve(globalSettings);
  }
  let result = documentSettings.get(resource);
  if (!result) {
    result = connection.workspace.getConfiguration({
      scopeUri: resource,
      section: 'ach',
    });
    documentSettings.set(resource, result);
  }
  return result;
}

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    documentSettings.clear();
  } else {
    globalSettings = (change.settings?.ach || defaultSettings) as ACHSettings;
  }
  documents.all().forEach(validateTextDocument);
});

documents.onDidClose((e) => {
  documentSettings.delete(e.document.uri);
  removeDocument(e.document.uri);
});

documents.onDidChangeContent((change) => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const settings = await getDocumentSettings(textDocument.uri);
  const validateOpts: ValidateOpts = {
    ...settings.validation,
  } as ValidateOpts;

  const state = await parseDocument(
    textDocument.uri,
    textDocument.getText(),
    textDocument.version,
    validateOpts
  );

  const diagnostics = computeDiagnostics(state, settings.maxNumberOfProblems);
  connection.sendDiagnostics({ uri: textDocument.uri, version: textDocument.version, diagnostics });
}

// LSP feature handlers
connection.onHover((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return null;
  return provideHover(document, params.position);
});

connection.onCompletion((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) return [];
  return provideCompletion(document, params.position);
});

connection.onCompletionResolve(resolveCompletion);

connection.onDocumentFormatting((params) => {
  let state = getDocument(params.textDocument.uri);
  if (!state) {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];
    state = parseDocumentImmediate(document.uri, document.getText(), document.version);
  }
  return provideFormatting(state);
});

connection.onCodeAction((params) => {
  let state = getDocument(params.textDocument.uri);
  if (!state) {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];
    state = parseDocumentImmediate(document.uri, document.getText(), document.version);
  }
  return provideCodeActions(state, params);
});

connection.onDocumentSymbol((params) => {
  let state = getDocument(params.textDocument.uri);
  if (!state) {
    // Cache miss (e.g. debounce hasn't fired yet) — parse immediately
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];
    state = parseDocumentImmediate(document.uri, document.getText(), document.version);
  }
  return provideDocumentSymbols(state);
});

connection.onFoldingRanges((params) => {
  let state = getDocument(params.textDocument.uri);
  if (!state) {
    const document = documents.get(params.textDocument.uri);
    if (!document) return [];
    state = parseDocumentImmediate(document.uri, document.getText(), document.version);
  }
  return provideFoldingRanges(state);
});

connection.languages.semanticTokens.on((params) => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return { data: [] };
  }
  return provideSemanticTokens(document);
});

// Custom request for tree view
connection.onRequest('ach/getFileStructure', (params: { uri: string }) => {
  const state = getDocument(params.uri);
  if (!state || !state.file) return null;
  return getFileStructure(state);
});

// Custom request for field boundary decorations
connection.onRequest('ach/getFieldBoundaries', (params: { uri: string }) => {
  const document = documents.get(params.uri);
  if (!document) return [];
  return getFieldBoundaries(document);
});

// Custom request for cursor-aware inlay hints
connection.onRequest('ach/getInlayHints', (params: { uri: string; cursors: { line: number; character: number }[] }) => {
  const document = documents.get(params.uri);
  if (!document) return [];
  return provideInlayHints(document, params.cursors);
});

documents.listen(connection);
connection.listen();
