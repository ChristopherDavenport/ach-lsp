import {
  TreeDataProvider,
  TreeItem,
  TreeItemCollapsibleState,
  EventEmitter,
  Event,
  Uri,
  ThemeIcon,
  Range,
  Position,
  Location,
} from 'vscode';
import { LanguageClient } from 'vscode-languageclient/node';
import type { TreeNode } from '../../shared/src/types';

export class ACHTreeDataProvider implements TreeDataProvider<ACHTreeItem> {
  private _onDidChangeTreeData = new EventEmitter<ACHTreeItem | undefined | void>();
  readonly onDidChangeTreeData: Event<ACHTreeItem | undefined | void> = this._onDidChangeTreeData.event;

  private nodes: TreeNode[] = [];
  private currentUri: Uri | undefined;
  private debounceTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(private client: LanguageClient) {}

  refresh(uri: Uri): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    this.debounceTimer = setTimeout(async () => {
      this.currentUri = uri;
      try {
        const result = await this.client.sendRequest('ach/getFileStructure', {
          uri: uri.toString(),
        });
        this.nodes = (result as TreeNode[]) || [];
      } catch {
        this.nodes = [];
      }
      this._onDidChangeTreeData.fire();
    }, 300);
  }

  clear(): void {
    this.nodes = [];
    this.currentUri = undefined;
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: ACHTreeItem): TreeItem {
    return element;
  }

  getChildren(element?: ACHTreeItem): ACHTreeItem[] {
    if (!element) {
      return this.nodes.map((node) => this.nodeToTreeItem(node));
    }
    return (element.node.children || []).map((child) =>
      this.nodeToTreeItem(child)
    );
  }

  private nodeToTreeItem(node: TreeNode): ACHTreeItem {
    const hasChildren = node.children && node.children.length > 0;
    const collapsible = hasChildren
      ? node.type === 'batch'
        ? TreeItemCollapsibleState.Collapsed
        : TreeItemCollapsibleState.Expanded
      : TreeItemCollapsibleState.None;

    const item = new ACHTreeItem(node, collapsible);
    item.description = node.detail;
    item.iconPath = this.getIcon(node.type);

    if (this.currentUri) {
      item.command = {
        command: 'revealLine',
        title: 'Go to Line',
        arguments: [
          {
            lineNumber: node.line + 1,
            at: 'center',
          },
        ],
      };
    }

    return item;
  }

  private getIcon(type: TreeNode['type']): ThemeIcon {
    switch (type) {
      case 'fileHeader':
        return new ThemeIcon('file');
      case 'batch':
        return new ThemeIcon('folder');
      case 'batchHeader':
        return new ThemeIcon('symbol-property');
      case 'entry':
        return new ThemeIcon('person');
      case 'addenda':
        return new ThemeIcon('note');
      case 'batchControl':
        return new ThemeIcon('symbol-property');
      case 'fileControl':
        return new ThemeIcon('file');
      default:
        return new ThemeIcon('circle-outline');
    }
  }
}

class ACHTreeItem extends TreeItem {
  constructor(
    public readonly node: TreeNode,
    collapsibleState: TreeItemCollapsibleState
  ) {
    super(node.label, collapsibleState);
  }
}
