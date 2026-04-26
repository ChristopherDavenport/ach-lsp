import { window, workspace, commands, Selection, Position, Range, ExtensionContext, Disposable } from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import type { LineBoundaries, TreeNode } from '../../shared/src/types';

/** Top-level section with its start/end line range. */
interface Section {
  startLine: number;
  endLine: number; // inclusive
}

/** Per-URI boundary cache, kept fresh by listening to editor/document changes. */
const boundaryCache = new Map<string, LineBoundaries[]>();
const structureCache = new Map<string, TreeNode[]>();
let refreshTimer: ReturnType<typeof setTimeout> | undefined;

function refreshBoundaries(uri: string, client: LanguageClient): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  refreshTimer = setTimeout(async () => {
    try {
      const [boundaries, structure] = await Promise.all([
        client.sendRequest<LineBoundaries[]>('ach/getFieldBoundaries', { uri }),
        client.sendRequest<TreeNode[] | null>('ach/getFileStructure', { uri }),
      ]);
      if (boundaries) {
        boundaryCache.set(uri, boundaries);
      }
      if (structure) {
        structureCache.set(uri, structure);
      }
    } catch {
      /* server not ready yet — use stale cache */
    }
  }, 100);
}

/**
 * Returns the column positions that separate fields on a given line.
 * Always includes 0 (line start) and lineLength (line end).
 */
function getFieldEdges(uri: string, line: number, lineLength: number): number[] {
  const all = boundaryCache.get(uri);
  if (!all) return [0, lineLength];
  const entry = all.find((b) => b.line === line);
  if (!entry) return [0, lineLength];
  return [0, ...entry.boundaries, lineLength];
}

function moveCursor(direction: 'left' | 'right', select: boolean): void {
  const editor = window.activeTextEditor;
  if (!editor) return;

  const uri = editor.document.uri.toString();

  const newSelections = editor.selections.map((sel) => {
    const pos = sel.active;
    const lineLen = editor.document.lineAt(pos.line).text.length;
    const edges = getFieldEdges(uri, pos.line, lineLen);
    let target: Position;

    if (direction === 'right') {
      const next = edges.find((e) => e > pos.character);
      if (next !== undefined) {
        target = new Position(pos.line, next);
      } else if (pos.line < editor.document.lineCount - 1) {
        target = new Position(pos.line + 1, 0);
      } else {
        target = new Position(pos.line, lineLen);
      }
    } else {
      let prev: number | undefined;
      for (let i = edges.length - 1; i >= 0; i--) {
        if (edges[i] < pos.character) {
          prev = edges[i];
          break;
        }
      }
      if (prev !== undefined) {
        target = new Position(pos.line, prev);
      } else if (pos.line > 0) {
        const prevLineLen = editor.document.lineAt(pos.line - 1).text.length;
        target = new Position(pos.line - 1, prevLineLen);
      } else {
        target = new Position(0, 0);
      }
    }

    const anchor = select ? sel.anchor : target;
    return new Selection(anchor, target);
  });

  editor.selections = newSelections;
  editor.revealRange(editor.selection);
}

/**
 * Build flat list of top-level sections from the tree structure.
 * Each section spans from the node's start line to its last child's line (or its own line).
 */
function getSections(uri: string): Section[] {
  const nodes = structureCache.get(uri);
  if (!nodes || nodes.length === 0) return [];

  return nodes.map((node) => {
    let endLine = node.line;
    if (node.children && node.children.length > 0) {
      endLine = node.children[node.children.length - 1].line;
    }
    return { startLine: node.line, endLine };
  });
}

function moveSection(direction: 'up' | 'down', select: boolean): void {
  const editor = window.activeTextEditor;
  if (!editor) return;

  const uri = editor.document.uri.toString();
  const sections = getSections(uri);
  if (sections.length === 0) return;

  const curLine = editor.selection.active.line;

  // Find which section the cursor is currently in
  let currentIdx = -1;
  for (let i = sections.length - 1; i >= 0; i--) {
    if (curLine >= sections[i].startLine) {
      currentIdx = i;
      break;
    }
  }
  if (currentIdx === -1) currentIdx = 0;

  let targetIdx: number;
  if (direction === 'down') {
    targetIdx = Math.min(currentIdx + 1, sections.length - 1);
  } else {
    targetIdx = Math.max(currentIdx - 1, 0);
  }

  const section = sections[targetIdx];
  const startPos = new Position(section.startLine, 0);
  const endLineLen = editor.document.lineAt(section.endLine).text.length;
  const endPos = new Position(section.endLine, endLineLen);

  if (select) {
    // Extend selection to cover the target section
    const anchor = editor.selection.anchor;
    editor.selection = new Selection(anchor, direction === 'down' ? endPos : startPos);
  } else {
    // Select the entire section
    editor.selection = new Selection(startPos, endPos);
  }
  editor.revealRange(new Range(startPos, endPos));
}

export function activateFieldNavigation(
  client: LanguageClient,
  context: ExtensionContext
): void {
  // Keep boundary cache warm
  context.subscriptions.push(
    window.onDidChangeActiveTextEditor((editor) => {
      if (editor?.document.languageId === 'ach') {
        refreshBoundaries(editor.document.uri.toString(), client);
      }
    }),
    workspace.onDidChangeTextDocument((e) => {
      const editor = window.activeTextEditor;
      if (
        editor &&
        e.document === editor.document &&
        e.document.languageId === 'ach'
      ) {
        refreshBoundaries(e.document.uri.toString(), client);
      }
    }),
    // Evict caches when documents are closed
    workspace.onDidCloseTextDocument((doc) => {
      const uri = doc.uri.toString();
      boundaryCache.delete(uri);
      structureCache.delete(uri);
    }),
    // Clean up refresh timer on deactivation
    new Disposable(() => {
      if (refreshTimer) {
        clearTimeout(refreshTimer);
        refreshTimer = undefined;
      }
    })
  );

  // Seed cache for currently open editor
  const editor = window.activeTextEditor;
  if (editor?.document.languageId === 'ach') {
    refreshBoundaries(editor.document.uri.toString(), client);
  }

  // Register navigation commands
  context.subscriptions.push(
    commands.registerCommand('ach.cursorFieldRight', () =>
      moveCursor('right', false)
    ),
    commands.registerCommand('ach.cursorFieldLeft', () =>
      moveCursor('left', false)
    ),
    commands.registerCommand('ach.cursorFieldRightSelect', () =>
      moveCursor('right', true)
    ),
    commands.registerCommand('ach.cursorFieldLeftSelect', () =>
      moveCursor('left', true)
    ),
    commands.registerCommand('ach.cursorSectionDown', () =>
      moveSection('down', false)
    ),
    commands.registerCommand('ach.cursorSectionUp', () =>
      moveSection('up', false)
    ),
    commands.registerCommand('ach.cursorSectionDownSelect', () =>
      moveSection('down', true)
    ),
    commands.registerCommand('ach.cursorSectionUpSelect', () =>
      moveSection('up', true)
    )
  );
}
