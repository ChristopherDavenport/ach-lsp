import {
  commands,
  env,
  ExtensionContext,
  Range,
  Selection,
  window,
} from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import { LineBoundaries } from '../../shared/src/types';

export function activateContextCommands(
  client: LanguageClient,
  context: ExtensionContext
): void {
  context.subscriptions.push(
    commands.registerCommand('ach.selectField', () => selectOrCopyField(client, 'select')),
    commands.registerCommand('ach.copyFieldValue', () => selectOrCopyField(client, 'copy'))
  );
}

async function selectOrCopyField(
  client: LanguageClient,
  mode: 'select' | 'copy'
): Promise<void> {
  const editor = window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'ach') return;

  const position = editor.selection.active;
  const line = position.line;
  const col = position.character;

  let boundaries: LineBoundaries[];
  try {
    boundaries = await client.sendRequest<LineBoundaries[]>(
      'ach/getFieldBoundaries',
      { uri: editor.document.uri.toString() }
    );
  } catch {
    return;
  }

  const lineBounds = boundaries[line];
  if (!lineBounds?.boundaries) return;

  // Find the field containing the cursor
  let fieldStart = 0;
  let fieldEnd = lineBounds.boundaries[0] ?? editor.document.lineAt(line).text.length;

  for (let i = 0; i < lineBounds.boundaries.length; i++) {
    const end = lineBounds.boundaries[i];
    if (col < end) {
      fieldEnd = end;
      break;
    }
    fieldStart = end;
    fieldEnd = lineBounds.boundaries[i + 1] ?? editor.document.lineAt(line).text.length;
  }

  const range = new Range(line, fieldStart, line, fieldEnd);

  if (mode === 'select') {
    editor.selection = new Selection(range.start, range.end);
    editor.revealRange(range);
  } else {
    const text = editor.document.getText(range).trim();
    await env.clipboard.writeText(text);
    window.setStatusBarMessage(`Copied: "${text}"`, 2000);
  }
}
