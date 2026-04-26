import * as path from 'path';
import {
  ExtensionContext,
  Range,
  TextDocument,
  Uri,
  ViewColumn,
  WebviewPanel,
  WorkspaceEdit,
  languages,
  window,
  workspace,
} from 'vscode';

export class AchPreviewPanel {
  public static readonly viewType = 'achPreview';
  private static _instance: AchPreviewPanel | undefined;

  private readonly _panel: WebviewPanel;
  private readonly _extensionUri: Uri;
  private _document: TextDocument | undefined;
  private _debounceTimer: ReturnType<typeof setTimeout> | undefined;
  private _suppressNextUpdate = false;

  public static createOrShow(extensionUri: Uri, document: TextDocument) {
    const column = ViewColumn.Beside;

    if (AchPreviewPanel._instance) {
      AchPreviewPanel._instance._document = document;
      AchPreviewPanel._instance._panel.reveal(column, true);
      AchPreviewPanel._instance._update();
      return;
    }

    const panel = window.createWebviewPanel(
      AchPreviewPanel.viewType,
      'ACH Preview',
      { viewColumn: column, preserveFocus: true },
      {
        enableScripts: true,
        localResourceRoots: [Uri.joinPath(extensionUri, 'client', 'out')],
        retainContextWhenHidden: true,
      }
    );

    AchPreviewPanel._instance = new AchPreviewPanel(panel, extensionUri, document);
  }

  public static updateIfActive(document: TextDocument) {
    if (AchPreviewPanel._instance && AchPreviewPanel._instance._document?.uri.toString() === document.uri.toString()) {
      AchPreviewPanel._instance._scheduleUpdate();
    }
  }

  public static sendDiagnostics(uri: Uri) {
    if (!AchPreviewPanel._instance) return;
    if (AchPreviewPanel._instance._document?.uri.toString() !== uri.toString()) return;
    const diags = languages.getDiagnostics(uri);
    AchPreviewPanel._instance._panel.webview.postMessage({
      type: 'diagnostics',
      diagnostics: diags.map(d => ({
        line: d.range.start.line,
        message: d.message,
        severity: d.severity,
      })),
    });
  }

  public static followEditor(document: TextDocument) {
    if (AchPreviewPanel._instance) {
      AchPreviewPanel._instance._document = document;
      AchPreviewPanel._instance._update();
    }
  }

  private constructor(panel: WebviewPanel, extensionUri: Uri, document: TextDocument) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._document = document;

    this._panel.webview.html = this._getHtmlForWebview();

    // Wait for the webview to signal it's ready before sending content
    this._panel.webview.onDidReceiveMessage(async (msg) => {
      if (msg.type === 'ready') {
        this._update();
      } else if (msg.type === 'edit') {
        await this._applyEditFromWebview(msg.content);
      }
    });

    this._panel.onDidDispose(() => {
      clearTimeout(this._debounceTimer);
      AchPreviewPanel._instance = undefined;
    });
  }

  private _scheduleUpdate() {
    if (this._suppressNextUpdate) {
      this._suppressNextUpdate = false;
      return;
    }
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => this._update(), 200);
  }

  private async _applyEditFromWebview(content: string) {
    if (!this._document) return;
    const doc = this._document;
    const fullRange = new Range(
      doc.positionAt(0),
      doc.positionAt(doc.getText().length)
    );
    const edit = new WorkspaceEdit();
    edit.replace(doc.uri, fullRange, content);
    this._suppressNextUpdate = true;
    await workspace.applyEdit(edit);
  }

  private _update() {
    if (!this._document) return;
    this._panel.webview.postMessage({
      type: 'update',
      content: this._document.getText(),
      fileName: path.basename(this._document.fileName),
    });
  }

  private _getHtmlForWebview(): string {
    const webview = this._panel.webview;
    const scriptUri = webview.asWebviewUri(
      Uri.joinPath(this._extensionUri, 'client', 'out', 'webview.js')
    );

    const nonce = getNonce();

    return /*html*/ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'nonce-${nonce}'; style-src 'unsafe-inline';">
  <title>ACH Preview</title>
  <style>
    :root {
      --color-bg: var(--vscode-editor-background);
      --color-surface: var(--vscode-sideBar-background, var(--vscode-editor-background));
      --color-border: var(--vscode-panel-border, var(--vscode-editorGroup-border));
      --color-text: var(--vscode-editor-foreground);
      --color-text-bright: var(--vscode-foreground);
      --color-text-muted: var(--vscode-descriptionForeground);
      --color-accent: var(--vscode-focusBorder);
      --color-error: var(--vscode-errorForeground);
      --font-mono: var(--vscode-editor-font-family, 'Consolas', 'Courier New', monospace);

      /* Semantic token colors mapped to VS Code theme */
      --color-keyword: var(--vscode-symbolIcon-keywordForeground, #569cd6);
      --color-number: var(--vscode-symbolIcon-numberForeground, #b5cea8);
      --color-string: var(--vscode-symbolIcon-stringForeground, #ce9178);
      --color-type: var(--vscode-symbolIcon-typeParameterForeground, #4ec9b0);
      --color-variable: var(--vscode-symbolIcon-variableForeground, #9cdcfe);
      --color-comment: var(--vscode-symbolIcon-nullForeground, #6a9955);
      --color-parameter: var(--vscode-symbolIcon-parameterForeground, #e8c990);
      --color-enum: var(--vscode-symbolIcon-enumeratorForeground, #d4d4d4);
    }
    body {
      margin: 0;
      padding: 0;
      background: var(--color-bg);
      color: var(--color-text);
      font-family: var(--vscode-font-family);
      overflow: hidden;
    }
  </style>
</head>
<body>
  <ach-structured-viewer></ach-structured-viewer>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    window.__vscode = vscode;
  </script>
  <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }
}

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
