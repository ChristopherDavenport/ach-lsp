import {
  commands,
  ExtensionContext,
  languages,
  OutputChannel,
  ProgressLocation,
  window,
  workspace,
} from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';

let outputChannel: OutputChannel | undefined;
let lspClient: LanguageClient | undefined;

export function activateAdvancedCommands(
  client: LanguageClient,
  context: ExtensionContext
): void {
  lspClient = client;
  context.subscriptions.push(
    commands.registerCommand('ach.validateAll', () => validateAllFiles()),
    commands.registerCommand('ach.exportJson', () => exportJson()),
    commands.registerCommand('ach.importJson', () => importJson()),
    commands.registerCommand('ach.mergeFiles', () => mergeAchFiles()),
    commands.registerCommand('ach.newFile', () => createNewFile()),
    commands.registerCommand('ach.splitFile', () => splitAchFile()),
    commands.registerCommand('ach.splitFileByGroup', () => splitAchFileByGroup())
  );
}

// ---------------------------------------------------------------------------
// Validate all ACH files in workspace
// ---------------------------------------------------------------------------
async function validateAllFiles(): Promise<void> {
  const files = await workspace.findFiles('**/*.ach', undefined, 500);
  if (files.length === 0) {
    window.showInformationMessage('No .ach files found in workspace.');
    return;
  }

  if (!outputChannel) {
    outputChannel = window.createOutputChannel('ACH Validation');
  }
  outputChannel.clear();
  outputChannel.show(true);

  await window.withProgress(
    { location: ProgressLocation.Notification, title: 'Validating ACH files…', cancellable: true },
    async (progress, token) => {
      let totalErrors = 0;
      let totalWarnings = 0;
      let filesWithErrors = 0;

      for (let i = 0; i < files.length; i++) {
        if (token.isCancellationRequested) break;
        const uri = files[i];
        const rel = workspace.asRelativePath(uri);
        progress.report({ message: `${rel} (${i + 1}/${files.length})`, increment: 100 / files.length });

        // Open and let the LSP server validate
        const doc = await workspace.openTextDocument(uri);
        // Give the server a moment to compute diagnostics
        await new Promise(r => setTimeout(r, 200));
        const diags = languages.getDiagnostics(uri);

        const errors = diags.filter(d => d.severity === 0).length;
        const warnings = diags.filter(d => d.severity === 1).length;

        if (errors > 0 || warnings > 0) {
          filesWithErrors++;
          totalErrors += errors;
          totalWarnings += warnings;
          outputChannel!.appendLine(`\n${rel}: ${errors} error(s), ${warnings} warning(s)`);
          for (const d of diags) {
            const sev = d.severity === 0 ? 'ERROR' : d.severity === 1 ? 'WARN' : 'INFO';
            outputChannel!.appendLine(`  [${sev}] Line ${d.range.start.line + 1}: ${d.message}`);
          }
        }
      }

      outputChannel!.appendLine(`\n${'─'.repeat(60)}`);
      outputChannel!.appendLine(
        `Validated ${files.length} file(s): ${totalErrors} error(s), ${totalWarnings} warning(s) in ${filesWithErrors} file(s).`
      );

      if (totalErrors === 0 && totalWarnings === 0) {
        window.showInformationMessage(`All ${files.length} ACH file(s) are valid.`);
      } else {
        window.showWarningMessage(
          `Found ${totalErrors} error(s) and ${totalWarnings} warning(s) across ${filesWithErrors} file(s). See Output → ACH Validation.`
        );
      }
    }
  );
}

// ---------------------------------------------------------------------------
// Export active ACH file to JSON (using ach-ts toJSON via server)
// ---------------------------------------------------------------------------
async function exportJson(): Promise<void> {
  const editor = window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'ach') {
    window.showWarningMessage('Open an ACH file first.');
    return;
  }
  if (!lspClient) return;

  const json = await lspClient.sendRequest<object | null>('ach/exportJson', {
    uri: editor.document.uri.toString(),
  });

  if (!json) {
    window.showWarningMessage('Could not parse the ACH file for export.');
    return;
  }

  const defaultUri = editor.document.uri.with({
    path: editor.document.uri.path.replace(/\.ach$/i, '.json'),
  });

  const saveUri = await window.showSaveDialog({
    defaultUri,
    filters: { 'JSON Files': ['json'] },
  });
  if (!saveUri) return;

  const content = JSON.stringify(json, null, 2) + '\n';
  await workspace.fs.writeFile(saveUri, Buffer.from(content, 'utf-8'));
  window.showInformationMessage(`Exported ACH file to ${workspace.asRelativePath(saveUri)}`);
}

// ---------------------------------------------------------------------------
// Import JSON to ACH (using ach-ts fileFromJSON + writeFile via server)
// ---------------------------------------------------------------------------
async function importJson(): Promise<void> {
  if (!lspClient) return;

  const fileUris = await window.showOpenDialog({
    canSelectFiles: true,
    canSelectMany: false,
    filters: { 'JSON Files': ['json'] },
  });
  if (!fileUris || fileUris.length === 0) return;

  const raw = await workspace.fs.readFile(fileUris[0]);
  const jsonStr = Buffer.from(raw).toString('utf-8');

  // Validate it's valid JSON
  try {
    JSON.parse(jsonStr);
  } catch {
    window.showErrorMessage('Invalid JSON file.');
    return;
  }

  const achText = await lspClient.sendRequest<string | null>('ach/importJson', {
    json: jsonStr,
  });

  if (!achText) {
    window.showErrorMessage('Could not convert JSON to ACH. Ensure the JSON matches the ach-ts file format.');
    return;
  }

  const doc = await workspace.openTextDocument({ content: achText, language: 'ach' });
  await window.showTextDocument(doc);
  window.showInformationMessage(`Imported ACH file from ${workspace.asRelativePath(fileUris[0])}`);
}

// ---------------------------------------------------------------------------
// Merge multiple ACH files
// ---------------------------------------------------------------------------
async function mergeAchFiles(): Promise<void> {
  if (!lspClient) return;

  const achFiles = await workspace.findFiles('**/*.ach', undefined, 500);
  if (achFiles.length < 2) {
    window.showWarningMessage('Need at least 2 ACH files in the workspace to merge.');
    return;
  }

  const items = achFiles.map(uri => ({
    label: workspace.asRelativePath(uri),
    uri,
  }));

  const picked = await window.showQuickPick(items, {
    canPickMany: true,
    placeHolder: 'Select ACH files to merge (at least 2)',
    title: 'Merge ACH Files',
  });
  if (!picked || picked.length < 2) {
    window.showWarningMessage('Select at least 2 ACH files to merge.');
    return;
  }

  const contents: string[] = [];
  for (const item of picked) {
    const raw = await workspace.fs.readFile(item.uri);
    contents.push(Buffer.from(raw).toString('utf-8'));
  }

  const result = await lspClient.sendRequest<{ files?: string[]; error?: string }>('ach/mergeFiles', { contents });

  if (result.error || !result.files || result.files.length === 0) {
    window.showErrorMessage(`Merge failed: ${result.error || 'Unknown error'}`);
    return;
  }

  for (const achText of result.files) {
    const doc = await workspace.openTextDocument({ content: achText, language: 'ach' });
    await window.showTextDocument(doc, { preview: false });
  }

  window.showInformationMessage(
    `Merged ${picked.length} files into ${result.files.length} output file${result.files.length > 1 ? 's' : ''}.`
  );
}

// ---------------------------------------------------------------------------
// Create new ACH file
// ---------------------------------------------------------------------------
async function createNewFile(): Promise<void> {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(-2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const dateStr = yy + mm + dd;
  const timeStr = hh + min;

  const lines = [
    '101 000000000 0000000001' + dateStr + timeStr + 'A094101DEST BANK              ORIGIN BANK                    ',
    '5200COMPANY NAME        ' + '                    ' + '0000000000PPDPAYMENT   ' + '      ' + dateStr + '   1000000000000001',
    '62200000000000000000000000000000000               ' + 'INDIVIDUAL NAME         ' + '  0000000000000001',
    '82000000010000000000000000000000000000000000000000000' + '                         000000000000001',
    '9000001000001000000010000000000000000000000000000000000' + '                                       ',
  ];

  const achContent = lines.map(l => l.padEnd(94).substring(0, 94)).join('\n');

  const doc = await workspace.openTextDocument({ content: achContent, language: 'ach' });
  await window.showTextDocument(doc);
}

// ---------------------------------------------------------------------------
// Split active ACH file by size constraints
// ---------------------------------------------------------------------------
async function splitAchFile(): Promise<void> {
  const editor = window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'ach') {
    window.showWarningMessage('Open an ACH file first.');
    return;
  }
  if (!lspClient) return;

  const constraintItems = [
    { label: 'Max Lines', key: 'maxLines' },
    { label: 'Max Entries', key: 'maxEntries' },
    { label: 'Max Batches', key: 'maxBatches' },
    { label: 'Max Dollar Amount (cents)', key: 'maxDollarAmount' },
  ];

  const picked = await window.showQuickPick(constraintItems, {
    placeHolder: 'Select split constraint',
    title: 'Split ACH File',
  });
  if (!picked) return;

  const valueStr = await window.showInputBox({
    prompt: `Enter value for ${picked.label}`,
    validateInput: (v) => {
      const n = Number(v);
      if (!Number.isInteger(n) || n <= 0) return 'Enter a positive integer';
      return undefined;
    },
  });
  if (!valueStr) return;

  const result = await lspClient.sendRequest<{ files?: Record<string, string[]>; error?: string }>(
    'ach/splitFile',
    {
      content: editor.document.getText(),
      mode: 'conditions',
      conditions: { [picked.key]: Number(valueStr) },
    }
  );

  if (result.error || !result.files) {
    window.showErrorMessage(`Split failed: ${result.error || 'Unknown error'}`);
    return;
  }

  const allFiles = Object.values(result.files).flat();
  for (const achText of allFiles) {
    const doc = await workspace.openTextDocument({ content: achText, language: 'ach' });
    await window.showTextDocument(doc, { preview: false });
  }

  window.showInformationMessage(
    `Split into ${allFiles.length} file${allFiles.length > 1 ? 's' : ''}.`
  );
}

// ---------------------------------------------------------------------------
// Split active ACH file by batch grouping
// ---------------------------------------------------------------------------
async function splitAchFileByGroup(): Promise<void> {
  const editor = window.activeTextEditor;
  if (!editor || editor.document.languageId !== 'ach') {
    window.showWarningMessage('Open an ACH file first.');
    return;
  }
  if (!lspClient) return;

  const groupItems = [
    { label: 'Company Identification', mode: 'companyId' },
    { label: 'Company Name', mode: 'companyName' },
    { label: 'SEC Code', mode: 'secCode' },
  ];

  const picked = await window.showQuickPick(groupItems, {
    placeHolder: 'Select grouping field',
    title: 'Split ACH File by Group',
  });
  if (!picked) return;

  const result = await lspClient.sendRequest<{ files?: Record<string, string[]>; error?: string }>(
    'ach/splitFile',
    {
      content: editor.document.getText(),
      mode: picked.mode,
    }
  );

  if (result.error || !result.files) {
    window.showErrorMessage(`Split failed: ${result.error || 'Unknown error'}`);
    return;
  }

  const groups = Object.entries(result.files);
  let totalFiles = 0;
  for (const [, fileList] of groups) {
    for (const achText of fileList) {
      const doc = await workspace.openTextDocument({ content: achText, language: 'ach' });
      await window.showTextDocument(doc, { preview: false });
      totalFiles++;
    }
  }

  const groupSummary = groups.map(([key, files]) => `${key} (${files.length})`).join(', ');
  window.showInformationMessage(
    `Split into ${totalFiles} file${totalFiles > 1 ? 's' : ''} across ${groups.length} group${groups.length > 1 ? 's' : ''}: ${groupSummary}`
  );
}
