import {
  Disposable,
  ExtensionContext,
  StatusBarAlignment,
  StatusBarItem,
  TextDocument,
  languages,
  window,
  workspace,
} from 'vscode';

let item: StatusBarItem | undefined;
let disposables: Disposable[] = [];

export function activateStatusBar(context: ExtensionContext): void {
  item = window.createStatusBarItem(StatusBarAlignment.Right, 100);
  item.name = 'ACH File Info';
  context.subscriptions.push(item);

  const update = () => {
    const editor = window.activeTextEditor;
    if (!editor || editor.document.languageId !== 'ach') {
      item!.hide();
      return;
    }
    updateStatusBar(editor.document);
  };

  disposables.push(
    window.onDidChangeActiveTextEditor(update),
    workspace.onDidChangeTextDocument((e) => {
      if (
        e.document.languageId === 'ach' &&
        window.activeTextEditor?.document === e.document
      ) {
        updateStatusBar(e.document);
      }
    }),
    languages.onDidChangeDiagnostics(() => update())
  );
  context.subscriptions.push(...disposables);

  // Initial update
  update();
}

function updateStatusBar(document: TextDocument): void {
  if (!item) return;

  const lines = document.getText().split('\n');
  let batches = 0;
  let entries = 0;
  let totalDebit = 0;
  let totalCredit = 0;

  for (const line of lines) {
    if (line.length < 1) continue;
    const rt = line.charAt(0);
    if (rt === '5') batches++;
    if (rt === '6') {
      entries++;
      const txCode = line.substring(1, 3);
      const amount = parseInt(line.substring(29, 39), 10) || 0;
      if (isDebit(txCode)) {
        totalDebit += amount;
      } else {
        totalCredit += amount;
      }
    }
  }

  const diagnostics = languages.getDiagnostics(document.uri);
  const errors = diagnostics.filter(d => d.severity === 0).length;
  const warnings = diagnostics.filter(d => d.severity === 1).length;

  const parts: string[] = [];
  parts.push(`$(layers) ${batches} batch${batches !== 1 ? 'es' : ''}`);
  parts.push(`${entries} entr${entries !== 1 ? 'ies' : 'y'}`);

  if (totalDebit > 0 || totalCredit > 0) {
    parts.push(`$(arrow-up) $${formatAmount(totalDebit)}`);
    parts.push(`$(arrow-down) $${formatAmount(totalCredit)}`);
  }

  if (errors > 0 || warnings > 0) {
    const problemParts: string[] = [];
    if (errors > 0) problemParts.push(`$(error) ${errors}`);
    if (warnings > 0) problemParts.push(`$(warning) ${warnings}`);
    parts.push(problemParts.join(' '));
  }

  item.text = parts.join('  ');
  item.tooltip = `ACH: ${batches} batches, ${entries} entries\nDebits: $${formatAmount(totalDebit)}\nCredits: $${formatAmount(totalCredit)}\n${errors} errors, ${warnings} warnings`;
  item.show();
}

function isDebit(txCode: string): boolean {
  const code = parseInt(txCode, 10);
  // 27, 28, 37, 38 are debit transaction codes
  return code === 27 || code === 28 || code === 37 || code === 38;
}

function formatAmount(cents: number): string {
  return (cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
