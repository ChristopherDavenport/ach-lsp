import * as path from 'path';
import {
  ExtensionContext,
  EventEmitter,
  InlayHint,
  InlayHintKind,
  Position,
  commands,
  languages,
  workspace,
  window,
  Uri,
} from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';
import { ACHTreeDataProvider } from './achTreeView';
import { AchPreviewPanel } from './achPreview';
import { activateFieldDecorations } from './fieldDecorations';
import { activateFieldNavigation } from './fieldNavigation';
import { activateStatusBar } from './statusBar';
import { activateContextCommands } from './contextCommands';
import { activateAdvancedCommands } from './advancedCommands';

let client: LanguageClient | undefined;

export async function activate(context: ExtensionContext) {
  const serverModule = context.asAbsolutePath(
    path.join('server', 'out', 'server.js')
  );

  const runOptions = { execArgv: ['--no-deprecation'] };
  const debugOptions = { execArgv: ['--nolazy', '--no-deprecation', '--inspect=6009'] };

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc, options: runOptions },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions,
    },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [
      { scheme: 'file', language: 'ach' },
      { scheme: 'untitled', language: 'ach' },
    ],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/*.ach'),
    },
  };

  client = new LanguageClient(
    'achLanguageServer',
    'ACH Language Server',
    serverOptions,
    clientOptions
  );

  // Register tree view
  const treeProvider = new ACHTreeDataProvider(client);
  const treeView = window.createTreeView('achExplorer', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  // Refresh tree view when active editor changes
  context.subscriptions.push(
    window.onDidChangeActiveTextEditor((editor) => {
      if (editor?.document.languageId === 'ach') {
        treeProvider.refresh(editor.document.uri);
        AchPreviewPanel.followEditor(editor.document);
      } else {
        treeProvider.clear();
      }
    }),
    workspace.onDidChangeTextDocument((e) => {
      if (
        e.document.languageId === 'ach' &&
        window.activeTextEditor?.document === e.document
      ) {
        treeProvider.refresh(e.document.uri);
        AchPreviewPanel.updateIfActive(e.document);
      }
    }),
    treeView,
    languages.onDidChangeDiagnostics((e) => {
      for (const uri of e.uris) {
        AchPreviewPanel.sendDiagnostics(uri);
      }
    })
  );

  // Register preview command
  context.subscriptions.push(
    commands.registerCommand('ach.openPreview', () => {
      const editor = window.activeTextEditor;
      if (editor?.document.languageId === 'ach') {
        AchPreviewPanel.createOrShow(context.extensionUri, editor.document);
      }
    })
  );

  // Register inlay hints toggle command
  context.subscriptions.push(
    commands.registerCommand('ach.toggleInlayHints', () => {
      const config = workspace.getConfiguration('editor.inlayHints', { languageId: 'ach' });
      const current = config.inspect<string>('enabled');
      const effective =
        current?.workspaceFolderLanguageValue ??
        current?.workspaceLanguageValue ??
        current?.globalLanguageValue ??
        current?.defaultLanguageValue ??
        current?.workspaceFolderValue ??
        current?.workspaceValue ??
        current?.globalValue ??
        'on';
      const next = effective === 'off' ? 'on' : 'off';
      config.update('enabled', next, undefined, true);
    })
  );

  await client.start();

  // Client-side inlay hints provider (cursor-aware, multi-cursor)
  const inlayHintsEmitter = new EventEmitter<void>();
  context.subscriptions.push(
    languages.registerInlayHintsProvider(
      { language: 'ach' },
      {
        onDidChangeInlayHints: inlayHintsEmitter.event,
        async provideInlayHints(document) {
          const editor = window.visibleTextEditors.find(e => e.document === document);
          if (!editor || !client) return [];
          const cursors = editor.selections.map(s => ({ line: s.active.line, character: s.active.character }));
          try {
            const hints: { position: { line: number; character: number }; label: string; kind: number }[] =
              await client.sendRequest('ach/getInlayHints', {
                uri: document.uri.toString(),
                cursors,
              });
            return hints.map(h => {
              const hint = new InlayHint(
                new Position(h.position.line, h.position.character),
                h.label,
                InlayHintKind.Type
              );
              hint.paddingRight = true;
              return hint;
            });
          } catch {
            return [];
          }
        },
      }
    ),
    inlayHintsEmitter
  );

  // Refresh inlay hints on cursor move
  context.subscriptions.push(
    window.onDidChangeTextEditorSelection((e) => {
      if (e.textEditor.document.languageId === 'ach') {
        inlayHintsEmitter.fire();
      }
    })
  );

  // Activate field separator decorations
  activateFieldDecorations(client, context);

  // Activate field-aware word navigation (Ctrl+Left/Right)
  activateFieldNavigation(client, context);

  // Activate status bar
  activateStatusBar(context);

  // Activate context menu commands (select field, copy field value)
  activateContextCommands(client, context);

  // Activate advanced commands (validate all, export, import, new file)
  activateAdvancedCommands(client, context);

  // Register toggle field separators command
  context.subscriptions.push(
    commands.registerCommand('ach.toggleFieldSeparators', () => {
      const config = workspace.getConfiguration('ach');
      const current = config.get<boolean>('fieldSeparators', true);
      config.update('fieldSeparators', !current, undefined, true);
    })
  );

  // Auto-open preview when an ACH file is opened
  context.subscriptions.push(
    workspace.onDidOpenTextDocument((document) => {
      if (document.languageId === 'ach' && workspace.getConfiguration('ach').get<boolean>('autoOpenPreview', false)) {
        setTimeout(() => {
          AchPreviewPanel.createOrShow(context.extensionUri, document);
        }, 100);
      }
    })
  );

  // Initial tree view refresh if an ACH file is already open
  if (window.activeTextEditor?.document.languageId === 'ach') {
    treeProvider.refresh(window.activeTextEditor.document.uri);
    if (workspace.getConfiguration('ach').get<boolean>('autoOpenPreview', false)) {
      AchPreviewPanel.createOrShow(context.extensionUri, window.activeTextEditor.document);
    }
  }
}

export async function deactivate() {
  await client?.dispose();
  client = undefined;
}
