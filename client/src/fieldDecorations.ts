import { window, workspace, TextEditor, DecorationOptions, Range, Disposable, ExtensionContext } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import type { LineBoundaries } from '../../shared/src/types';

// Alternating background colors for adjacent fields (zebra striping)
const fieldEven = window.createTextEditorDecorationType({
  backgroundColor: 'rgba(128, 128, 128, 0.18)',
});
const fieldOdd = window.createTextEditorDecorationType({
  backgroundColor: 'rgba(128, 128, 128, 0.0)',
});

let debounceTimer: ReturnType<typeof setTimeout> | undefined;

function isEnabled(): boolean {
  return workspace.getConfiguration('ach').get<boolean>('fieldSeparators', true);
}

async function updateDecorations(editor: TextEditor, client: LanguageClient): Promise<void> {
  if (!isEnabled()) {
    editor.setDecorations(fieldEven, []);
    editor.setDecorations(fieldOdd, []);
    return;
  }

  let result: LineBoundaries[];
  try {
    result = await client.sendRequest<LineBoundaries[]>('ach/getFieldBoundaries', {
      uri: editor.document.uri.toString(),
    });
  } catch {
    return;
  }

  if (!result || result.length === 0) {
    editor.setDecorations(fieldEven, []);
    editor.setDecorations(fieldOdd, []);
    return;
  }

  const evenDecorations: DecorationOptions[] = [];
  const oddDecorations: DecorationOptions[] = [];

  for (const entry of result) {
    const lineLen = editor.document.lineAt(entry.line).text.length;
    // Derive field ranges from boundary points
    // boundaries are [end0, end1, ...] — the end column of each field except the last
    const starts = [0, ...entry.boundaries];
    const ends = [...entry.boundaries, lineLen];

    for (let f = 0; f < starts.length; f++) {
      const s = starts[f];
      const e = Math.min(ends[f], lineLen);
      if (e <= s) continue;
      const range = new Range(entry.line, s, entry.line, e);
      if (f % 2 === 1) {
        evenDecorations.push({ range });
      } else {
        oddDecorations.push({ range });
      }
    }
  }

  editor.setDecorations(fieldEven, evenDecorations);
  editor.setDecorations(fieldOdd, oddDecorations);
}

function scheduleUpdate(editor: TextEditor, client: LanguageClient): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => updateDecorations(editor, client), 150);
}

export function activateFieldDecorations(client: LanguageClient, context: ExtensionContext): void {
  context.subscriptions.push(fieldEven, fieldOdd);

  // Update on active editor change
  context.subscriptions.push(
    window.onDidChangeActiveTextEditor((editor) => {
      if (editor?.document.languageId === 'ach') {
        scheduleUpdate(editor, client);
      }
    })
  );

  // Update on text changes
  context.subscriptions.push(
    workspace.onDidChangeTextDocument((e) => {
      const editor = window.activeTextEditor;
      if (
        editor &&
        e.document === editor.document &&
        e.document.languageId === 'ach'
      ) {
        scheduleUpdate(editor, client);
      }
    })
  );

  // React to setting changes
  context.subscriptions.push(
    workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('ach.fieldSeparators')) {
        const editor = window.activeTextEditor;
        if (editor?.document.languageId === 'ach') {
          updateDecorations(editor, client);
        }
      }
    })
  );

  // Clean up debounce timer on deactivation
  context.subscriptions.push(new Disposable(() => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = undefined;
    }
  }));

  // Initial update
  const editor = window.activeTextEditor;
  if (editor?.document.languageId === 'ach') {
    scheduleUpdate(editor, client);
  }
}
