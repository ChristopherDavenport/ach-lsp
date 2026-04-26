import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Task } from '@lit/task';
import { Reader } from 'ach-ts/dist/reader.js';
import { Writer } from 'ach-ts/dist/writer.js';
import { newBatchHeader } from 'ach-ts/dist/batchHeader.js';
import { newBatch } from 'ach-ts/dist/batch.js';
import { newEntryDetail } from 'ach-ts/dist/entryDetail.js';
import { newAddenda05 } from 'ach-ts/dist/addenda/addenda05.js';
import type { File as ACHFile } from 'ach-ts';
import {
  FIELD_DESCRIPTIONS,
  TRANSACTION_CODE_DESCRIPTIONS,
  SEC_CODE_DESCRIPTIONS,
  SERVICE_CLASS_DESCRIPTIONS,
} from '../../../shared/src/achConstants.js';
import { formatAmount, formatDate, validateRoutingNumber } from './field-enrichment.js';

interface FieldRow {
  label: string;
  value: string;
  enriched?: string;
  muted?: boolean;
  /** Property key used to identify this field for double-click-to-edit */
  fieldKey?: string;
}

interface DiagnosticInfo {
  line: number;
  message: string;
  severity: number;
}

/** A field definition for editable form rendering */
interface EditableField {
  label: string;
  value: string;
  /** Property key on the ach-ts record object */
  property: string;
  /** 'text' | 'number' | 'select' | 'textarea' */
  inputType?: string;
  /** Options for select fields: [value, label] pairs */
  options?: [string, string][];
  /** Max character length for the field */
  maxLength?: number;
  /** Whether the field is read-only (e.g. computed fields) */
  readOnly?: boolean;
  /** Enriched display text */
  enriched?: string;
  /** Whether to parse value as number when setting on the record */
  numeric?: boolean;
}

function descLabel(key: string): string {
  return FIELD_DESCRIPTIONS[key]?.label ?? key;
}

function fmtAmount(cents: number): string {
  return formatAmount(String(cents)) ?? String(cents);
}

function fmtDate(yymmdd: string): string | undefined {
  const d = formatDate(yymmdd.trim());
  return d?.replace('📅 ', '') ?? undefined;
}

function fmtRouting(value: string): string | undefined {
  const r = validateRoutingNumber(value.trim());
  return r ? (r.valid ? '✅' : '⚠️') : undefined;
}

@customElement('ach-structured-viewer')
export class AchStructuredViewer extends LitElement {
  @state() private _content = '';
  @state() private _fileName = '';
  @state() private _diagnostics: DiagnosticInfo[] = [];
  @state() private _editMode = false;
  @state() private _editFile: ACHFile | null = null;
  @state() private _searchQuery = '';
  private _originalContent = '';
  private _focusField: string | null = null;

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('message', this._onMessage);
    (window as any).__vscode?.postMessage({ type: 'ready' });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('message', this._onMessage);
  }

  private _onMessage = (event: MessageEvent) => {
    const msg = event.data;
    if (msg.type === 'update') {
      this._content = msg.content;
      this._fileName = msg.fileName ?? '';
    } else if (msg.type === 'diagnostics') {
      this._diagnostics = (msg.diagnostics ?? []) as DiagnosticInfo[];
    }
  };

  private _parseTask = new Task(this, {
    args: () => [this._content] as const,
    task: ([content]) => {
      if (!content) return null;
      const reader = new Reader(content);
      // Use permissive validation — the preview is for display, not validation.
      // The LSP handles real diagnostics with user-configured validation options.
      reader.setValidation({
        allowZeroBatches: true,
        customTraceNumbers: true,
        bypassOriginValidation: true,
        bypassDestinationValidation: true,
        allowMissingFileHeader: true,
        allowMissingFileControl: true,
        bypassCompanyIdentificationMatch: true,
        customReturnCodes: true,
        unequalServiceClassCode: true,
        allowUnorderedBatchNumbers: true,
        allowInvalidCheckDigit: true,
        unequalAddendaCounts: true,
        preserveSpaces: true,
        allowInvalidAmounts: true,
        allowZeroEntryAmount: true,
        allowSpecialCharacters: true,
        allowEmptyIndividualName: true,
        bypassBatchValidation: true,
      });
      const result = reader.readWithErrors();
      if (result.file) {
        result.file.annotateLineNumbers();
      }
      return {
        file: result.file,
      };
    },
  });

  static styles = css`
    :host {
      display: block;
      height: 100vh;
      overflow-y: auto;
      background: var(--color-bg);
      color: var(--color-text);
    }

    .header-bar {
      position: sticky;
      top: 0;
      z-index: 10;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.6rem 1rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }

    .content {
      padding: 0.75rem 1rem 2rem;
      max-width: 960px;
    }

    .section {
      margin-bottom: 1rem;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      overflow: hidden;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 0.75rem;
      background: var(--color-surface);
      font-weight: 600;
      font-size: 0.82rem;
      color: var(--color-text-bright);
      cursor: pointer;
      user-select: none;
    }
    .section-header:hover {
      background: var(--color-hover);
    }

    .section-header .toggle,
    .entry-summary .toggle {
      font-size: 0.7rem;
      transition: transform 0.15s;
      color: var(--color-text-muted);
    }
    .section-header .toggle.collapsed,
    .entry-summary .toggle.collapsed {
      transform: rotate(-90deg);
    }

    .section-tag {
      font-size: 0.7rem;
      padding: 0.1rem 0.4rem;
      border-radius: 3px;
      font-weight: 500;
      font-family: var(--font-mono);
    }
    .tag-file { background: var(--color-keyword); color: #fff; }
    .tag-batch { background: var(--color-type); color: #fff; }
    .tag-entry { background: var(--color-number); color: #1e1e1e; }
    .tag-addenda { background: var(--color-parameter); color: #1e1e1e; }
    .tag-control { background: var(--color-enum); color: #1e1e1e; }

    .section-body {
      border-top: 1px solid var(--color-border);
    }

    .field-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.8rem;
    }
    .field-table tr {
      border-bottom: 1px solid var(--color-border);
    }
    .field-table tr:last-child {
      border-bottom: none;
    }
    .field-table td {
      padding: 0.3rem 0.75rem;
      vertical-align: top;
    }
    .field-label {
      color: var(--color-text-muted);
      white-space: nowrap;
      width: 1%;
      font-size: 0.78rem;
    }
    .field-value {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      word-break: break-all;
    }
    .field-enriched {
      color: var(--color-text-muted);
      font-size: 0.75rem;
      margin-left: 0.5rem;
    }
    .field-muted .field-value {
      color: var(--color-text-muted);
    }
    .field-clickable {
      cursor: pointer;
    }
    .field-clickable:hover {
      background: var(--color-hover, rgba(128,128,128,0.08));
    }

    .entries-container {
      padding: 0;
    }

    .entry-card {
      border-bottom: 1px solid var(--color-border);
    }
    .entry-card:last-child {
      border-bottom: none;
    }

    .entry-summary {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.4rem 0.75rem;
      font-size: 0.8rem;
      cursor: pointer;
      user-select: none;
    }
    .entry-summary:hover {
      background: var(--color-hover);
    }
    .entry-name {
      flex: 1;
      font-weight: 500;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .entry-amount {
      font-family: var(--font-mono);
      font-weight: 600;
      white-space: nowrap;
    }
    .entry-amount.credit { color: var(--color-type); }
    .entry-amount.debit { color: var(--color-string); }
    .entry-type {
      font-size: 0.7rem;
      color: var(--color-text-muted);
      font-family: var(--font-mono);
      white-space: nowrap;
    }

    .entry-detail {
      padding: 0 0.75rem 0.5rem 1.5rem;
      border-top: 1px solid var(--color-border);
    }

    .addenda-block {
      margin-top: 0.25rem;
      margin-bottom: 0.25rem;
      padding-left: 0.5rem;
      border-left: 2px solid var(--color-parameter);
    }
    .addenda-label {
      font-size: 0.72rem;
      color: var(--color-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
      padding: 0.25rem 0;
    }

    .errors {
      margin-bottom: 0.75rem;
      padding: 0.6rem 0.75rem;
      background: rgba(244, 71, 71, 0.08);
      border: 1px solid var(--color-border);
      border-radius: 6px;
    }
    .error-item {
      color: var(--color-error, #f44747);
      font-size: 0.78rem;
      font-family: var(--font-mono);
      padding: 0.1rem 0;
    }

    .summary-bar {
      display: flex;
      gap: 1.25rem;
      flex-wrap: wrap;
      padding: 0.4rem 0.75rem;
      font-size: 0.78rem;
      color: var(--color-text-muted);
      border-top: 1px solid var(--color-border);
    }
    .summary-item {
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .summary-value {
      font-family: var(--font-mono);
      color: var(--color-text-bright);
      font-weight: 500;
    }

    .no-content {
      padding: 2rem;
      color: var(--color-text-muted);
      text-align: center;
      font-size: 0.9rem;
    }

    .inline-diag {
      display: flex;
      align-items: flex-start;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem;
      font-size: 0.78rem;
      font-family: var(--font-mono);
      color: var(--color-error, #f44747);
      background: rgba(244, 71, 71, 0.06);
      border-bottom: 1px solid var(--color-border);
    }
    .inline-diag.warning {
      color: var(--color-warning, #cca700);
      background: rgba(204, 167, 0, 0.06);
    }
    .inline-diag-icon {
      flex-shrink: 0;
    }

    .diag-badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.1rem;
      height: 1.1rem;
      border-radius: 50%;
      font-size: 0.65rem;
      font-weight: 600;
      background: var(--color-error, #f44747);
      color: #fff;
      margin-left: auto;
    }
    .diag-badge.warning {
      background: var(--color-warning, #cca700);
    }

    /* Edit mode styles */
    .edit-toggle {
      margin-left: auto;
      padding: 0.25rem 0.6rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: transparent;
      color: var(--color-text);
      font-size: 0.75rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    .edit-toggle:hover {
      background: var(--color-hover, rgba(128,128,128,0.1));
    }
    .edit-toggle.active {
      background: var(--color-accent, #007acc);
      color: #fff;
      border-color: var(--color-accent, #007acc);
    }

    .edit-input {
      width: 100%;
      box-sizing: border-box;
      padding: 0.25rem 0.4rem;
      border: 1px solid var(--color-border);
      border-radius: 3px;
      background: var(--color-bg);
      color: var(--color-text);
      font-family: var(--font-mono);
      font-size: 0.8rem;
    }
    .edit-input:focus {
      outline: 1px solid var(--color-accent, #007acc);
      border-color: var(--color-accent, #007acc);
    }
    .edit-input[readonly] {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .edit-select {
      width: 100%;
      box-sizing: border-box;
      padding: 0.25rem 0.4rem;
      border: 1px solid var(--color-border);
      border-radius: 3px;
      background: var(--color-bg);
      color: var(--color-text);
      font-family: var(--font-mono);
      font-size: 0.8rem;
    }
    .edit-select:focus {
      outline: 1px solid var(--color-accent, #007acc);
      border-color: var(--color-accent, #007acc);
    }

    .edit-textarea {
      width: 100%;
      box-sizing: border-box;
      padding: 0.25rem 0.4rem;
      border: 1px solid var(--color-border);
      border-radius: 3px;
      background: var(--color-bg);
      color: var(--color-text);
      font-family: var(--font-mono);
      font-size: 0.8rem;
      resize: vertical;
      min-height: 2.5rem;
    }
    .edit-textarea:focus {
      outline: 1px solid var(--color-accent, #007acc);
      border-color: var(--color-accent, #007acc);
    }

    .header-stats {
      display: inline-flex;
      gap: 0.75rem;
      margin-left: auto;
      font-weight: 400;
      font-size: 0.75rem;
      color: var(--color-text-muted);
    }
    .header-stats .stat-value {
      font-family: var(--font-mono);
      color: var(--color-text-bright);
      font-weight: 500;
    }

    .computed-label {
      font-size: 0.68rem;
      color: var(--color-text-muted);
      font-style: italic;
      margin-left: 0.3rem;
    }

    .crud-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.3rem;
      padding: 0.3rem 0.7rem;
      margin: 0.4rem 0.75rem;
      border: 1px dashed var(--color-border);
      border-radius: 4px;
      background: transparent;
      color: var(--color-text-muted);
      font-size: 0.75rem;
      cursor: pointer;
    }
    .crud-btn:hover {
      border-color: var(--color-accent, #007acc);
      color: var(--color-text);
      background: rgba(128,128,128,0.06);
    }

    .remove-btn {
      padding: 0.15rem 0.4rem;
      border: none;
      border-radius: 3px;
      background: transparent;
      color: var(--color-text-muted);
      font-size: 0.75rem;
      cursor: pointer;
      margin-left: auto;
    }
    .remove-btn:hover {
      background: rgba(244, 71, 71, 0.15);
      color: var(--color-error, #f44747);
    }

    .diff-panel {
      margin-bottom: 1rem;
      border: 1px solid var(--color-border);
      border-radius: 6px;
      overflow: hidden;
    }
    .diff-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.4rem 0.75rem;
      background: var(--color-surface);
      font-size: 0.78rem;
      font-weight: 600;
      color: var(--color-text-bright);
      cursor: pointer;
      user-select: none;
    }
    .diff-header:hover {
      background: var(--color-hover);
    }
    .diff-body {
      border-top: 1px solid var(--color-border);
      padding: 0.4rem 0;
      max-height: 300px;
      overflow-y: auto;
      font-family: var(--font-mono);
      font-size: 0.75rem;
      line-height: 1.5;
    }
    .diff-line {
      padding: 0 0.75rem;
      white-space: pre;
    }
    .diff-line.added {
      background: rgba(77, 185, 96, 0.12);
      color: var(--color-type, #4ec9b0);
    }
    .diff-line.added::before {
      content: '+ ';
    }
    .diff-line.removed {
      background: rgba(244, 71, 71, 0.12);
      color: var(--color-error, #f44747);
    }
    .diff-line.removed::before {
      content: '- ';
    }
    .diff-line.context {
      color: var(--color-text-muted);
    }
    .diff-line.context::before {
      content: '  ';
    }
    .diff-empty {
      padding: 0.5rem 0.75rem;
      color: var(--color-text-muted);
      font-style: italic;
      font-size: 0.78rem;
    }
    .diff-stats {
      font-size: 0.7rem;
      font-weight: 400;
      color: var(--color-text-muted);
      margin-left: auto;
    }
    .diff-stats .added-count { color: var(--color-type, #4ec9b0); }
    .diff-stats .removed-count { color: var(--color-error, #f44747); }

    .search-box {
      display: flex;
      align-items: center;
      gap: 0.4rem;
      margin-left: auto;
    }
    .search-input {
      padding: 0.2rem 0.5rem;
      border: 1px solid var(--color-border);
      border-radius: 4px;
      background: var(--color-bg);
      color: var(--color-text);
      font-size: 0.75rem;
      font-family: inherit;
      width: 180px;
      outline: none;
    }
    .search-input:focus {
      border-color: var(--color-accent, #007acc);
    }
    .search-input::placeholder {
      color: var(--color-text-muted);
    }
    .search-clear {
      background: none;
      border: none;
      color: var(--color-text-muted);
      cursor: pointer;
      font-size: 0.8rem;
      padding: 0.1rem 0.3rem;
      border-radius: 3px;
    }
    .search-clear:hover {
      color: var(--color-text);
      background: var(--color-hover, rgba(128,128,128,0.1));
    }
    .search-count {
      font-size: 0.7rem;
      color: var(--color-text-muted);
      white-space: nowrap;
    }
    .search-highlight {
      background: rgba(255, 213, 0, 0.25);
      border-radius: 2px;
      padding: 0 1px;
    }
    .search-no-results {
      padding: 1.5rem;
      text-align: center;
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }
  `;

  private static _permissiveOpts = {
    allowZeroBatches: true, customTraceNumbers: true, bypassOriginValidation: true,
    bypassDestinationValidation: true, allowMissingFileHeader: true,
    allowMissingFileControl: true, bypassCompanyIdentificationMatch: true,
    customReturnCodes: true, unequalServiceClassCode: true,
    allowUnorderedBatchNumbers: true, allowInvalidCheckDigit: true,
    unequalAddendaCounts: true, preserveSpaces: true, allowInvalidAmounts: true,
    allowZeroEntryAmount: true, allowSpecialCharacters: true,
    allowEmptyIndividualName: true, bypassBatchValidation: true,
    skipAll: true, skipBatchHeaderCompanyValidation: true,
  };

  private _collapsedSections = new Set<string>();

  /** Check whether a string matches the current search query (case-insensitive substring) */
  private _matchesSearch(text: string): boolean {
    if (!this._searchQuery) return true;
    return text.toLowerCase().includes(this._searchQuery.toLowerCase());
  }

  /** Collect all searchable text from an entry record */
  private _entryMatchesSearch(entry: any): boolean {
    if (!this._searchQuery) return true;
    const q = this._searchQuery.toLowerCase();
    const texts: string[] = [
      String(entry.transactionCode ?? ''),
      TRANSACTION_CODE_DESCRIPTIONS[entry.transactionCode] ?? '',
      entry.rdfiIdentification ?? '',
      entry.dfiAccountNumber ?? '',
      fmtAmount(entry.amount) ?? String(entry.amount),
      String(entry.amount ?? ''),
      entry.individualName ?? '',
      entry.identificationNumber ?? '',
      entry.traceNumber ?? '',
    ];
    // Addenda text
    if (entry.addenda05?.length) {
      for (const a of entry.addenda05) {
        texts.push(a.paymentRelatedInformation ?? '');
      }
    }
    if (entry.addenda02) {
      texts.push(entry.addenda02.terminalIdentificationCode ?? '', entry.addenda02.terminalLocation ?? '', entry.addenda02.terminalCity ?? '');
    }
    if (entry.addenda98) {
      texts.push(entry.addenda98.changeCode ?? '', entry.addenda98.correctedData ?? '');
    }
    if (entry.addenda99) {
      texts.push(entry.addenda99.returnCode ?? '', entry.addenda99.addendaInformation ?? '');
    }
    return texts.some(t => t.toLowerCase().includes(q));
  }

  /** Collect all searchable text from a batch */
  private _batchMatchesSearch(batch: any, kind: 'regular' | 'iat'): boolean {
    if (!this._searchQuery) return true;
    const q = this._searchQuery.toLowerCase();
    const bh = kind === 'regular' ? batch.getHeader() : batch.header;
    const entries = kind === 'regular' ? batch.getEntries() : batch.entries;
    // Check batch header fields
    const headerTexts: string[] = [
      bh.companyName ?? '',
      bh.standardEntryClassCode ?? '',
      SEC_CODE_DESCRIPTIONS[bh.standardEntryClassCode?.trim()] ?? '',
      bh.companyEntryDescription ?? '',
      bh.companyIdentification ?? '',
      bh.odfiIdentification ?? '',
      String(bh.serviceClassCode ?? ''),
      SERVICE_CLASS_DESCRIPTIONS[bh.serviceClassCode] ?? '',
    ];
    if (headerTexts.some(t => t.toLowerCase().includes(q))) return true;
    // Check entries
    return (entries ?? []).some((e: any) => this._entryMatchesSearch(e));
  }

  /** Check if file header matches search */
  private _fileHeaderMatchesSearch(file: ACHFile): boolean {
    if (!this._searchQuery) return true;
    const q = this._searchQuery.toLowerCase();
    const h = file.header;
    return [
      h.immediateDestination, h.immediateDestinationName,
      h.immediateOrigin, h.immediateOriginName,
      h.fileCreationDate, h.referenceCode,
    ].some(t => (t ?? '').toLowerCase().includes(q));
  }

  /** Count total matching entries across all batches */
  private _countMatches(allBatches: { kind: 'regular' | 'iat'; batch: any }[]): number {
    if (!this._searchQuery) return 0;
    let count = 0;
    for (const { kind, batch } of allBatches) {
      const entries = kind === 'regular' ? batch.getEntries() : batch.entries;
      for (const entry of entries ?? []) {
        if (this._entryMatchesSearch(entry)) count++;
      }
    }
    return count;
  }

  private _renderSearchBox(allBatches?: { kind: 'regular' | 'iat'; batch: any }[]): TemplateResult {
    const matchCount = allBatches && this._searchQuery ? this._countMatches(allBatches) : 0;
    return html`
      <span class="search-box">
        <input class="search-input"
          type="text"
          placeholder="Search entries..."
          .value=${this._searchQuery}
          @input=${(e: Event) => { this._searchQuery = (e.target as HTMLInputElement).value; }}
          @keydown=${(e: KeyboardEvent) => { if (e.key === 'Escape') { this._searchQuery = ''; } }}
        >
        ${this._searchQuery ? html`
          <span class="search-count">${matchCount} match${matchCount !== 1 ? 'es' : ''}</span>
          <button class="search-clear" @click=${() => { this._searchQuery = ''; }} title="Clear search">✕</button>
        ` : nothing}
      </span>
    `;
  }

  private _toggleSection(id: string) {
    if (this._collapsedSections.has(id)) {
      this._collapsedSections.delete(id);
    } else {
      this._collapsedSections.add(id);
    }
    this.requestUpdate();
  }

  private _expandedEntries = new Set<string>();

  private _toggleEntry(id: string) {
    if (this._expandedEntries.has(id)) {
      this._expandedEntries.delete(id);
    } else {
      this._expandedEntries.add(id);
    }
    this.requestUpdate();
  }

  private _toggleEditMode() {
    this._editMode = !this._editMode;
    if (this._editMode) {
      // Parse a fresh mutable copy for editing
      const opts = AchStructuredViewer._permissiveOpts;
      const reader = new Reader(this._content);
      reader.setValidation(opts);
      const result = reader.readWithErrors();
      this._editFile = result.file ?? null;
      this._originalContent = this._content;
      if (this._editFile) {
        this._editFile.annotateLineNumbers();
        this._editFile.setValidation(opts);
        // Propagate permissive validation to all batches
        for (const batch of this._editFile.batches) {
          batch.setValidation(opts);
        }
        for (const iatBatch of this._editFile.iatBatches) {
          iatBatch.setValidation(opts);
        }
      }
    } else {
      this._editFile = null;
      this._originalContent = '';
    }
  }

  private _applyEdit() {
    if (!this._editFile) return;
    try {
      const opts = AchStructuredViewer._permissiveOpts;
      // Rebuild each batch's control records before file-level create
      for (const batch of this._editFile.batches) {
        batch.setValidation(opts);
        const err = batch.create();
        if (err) {
          // batch.create() can fail due to header validation even with permissive opts.
          // Manually recompute the essential control fields from entries.
          this._rebuildBatchControl(batch);
        }
      }
      for (const iatBatch of this._editFile.iatBatches) {
        iatBatch.setValidation(opts);
        const err = iatBatch.create();
        if (err) {
          this._rebuildIATBatchControl(iatBatch);
        }
      }
      this._editFile.create();
      this._editFile.annotateLineNumbers();
      const writer = new Writer({ lineEnding: '\n' });
      writer.bypassValidation = true;
      const content = writer.write(this._editFile);
      this._content = content;
      (window as any).__vscode?.postMessage({ type: 'edit', content });
      // Trigger re-render since _editFile was mutated in-place
      this.requestUpdate();
    } catch (e) {
      console.error('[ACH Edit] _applyEdit failed:', e);
    }
  }

  /** Manually recompute batch control values when batch.create() fails validation */
  private _rebuildBatchControl(batch: any) {
    const entries = batch.getEntries() ?? [];
    const bc = batch.getControl();
    const bh = batch.getHeader();
    if (!bc) return;

    let entryAddendaCount = 0;
    let entryHash = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      entryAddendaCount += 1 + (entry.addendaCount?.() ?? 0);
      const rdfi = parseInt(entry.rdfiIdentification ?? '0', 10) || 0;
      entryHash += rdfi;
      const amount = entry.amount ?? 0;
      if (entry.creditOrDebit?.() === 'C') {
        totalCredit += amount;
      } else {
        totalDebit += amount;
      }
    }

    bc.entryAddendaCount = entryAddendaCount;
    bc.entryHash = entryHash % 10000000000; // least significant 10 digits
    bc.totalDebitEntryDollarAmount = totalDebit;
    bc.totalCreditEntryDollarAmount = totalCredit;
    bc.serviceClassCode = bh.serviceClassCode;
    bc.companyIdentification = bh.companyIdentification;
    bc.odfiIdentification = bh.odfiIdentification;
    bc.batchNumber = bh.batchNumber;
  }

  /** Manually recompute IAT batch control values */
  private _rebuildIATBatchControl(iatBatch: any) {
    const entries = iatBatch.entries ?? [];
    const bc = iatBatch.control;
    const bh = iatBatch.header;
    if (!bc) return;

    let entryAddendaCount = 0;
    let entryHash = 0;
    let totalDebit = 0;
    let totalCredit = 0;

    for (const entry of entries) {
      entryAddendaCount += 1 + (entry.addendaCount?.() ?? 0);
      const rdfi = parseInt(entry.rdfiIdentification ?? '0', 10) || 0;
      entryHash += rdfi;
      const amount = entry.amount ?? 0;
      if (entry.creditOrDebit?.() === 'C') {
        totalCredit += amount;
      } else {
        totalDebit += amount;
      }
    }

    bc.entryAddendaCount = entryAddendaCount;
    bc.entryHash = entryHash % 10000000000;
    bc.totalDebitEntryDollarAmount = totalDebit;
    bc.totalCreditEntryDollarAmount = totalCredit;
    bc.serviceClassCode = bh.serviceClassCode;
    bc.odfiIdentification = bh.odfiIdentification;
    bc.batchNumber = bh.batchNumber;
  }

  private _handleFieldChange(record: any, property: string, value: string, numeric?: boolean) {
    if (numeric) {
      record[property] = Number(value) || 0;
    } else {
      record[property] = value;
    }
    this._applyEdit();
  }

  private _renderEditableFieldTable(record: any, fields: EditableField[]): TemplateResult {
    return html`
      <table class="field-table">
        ${fields.map(f => html`
          <tr>
            <td class="field-label">
              ${f.label}
              ${f.readOnly ? html`<span class="computed-label">(auto)</span>` : nothing}
            </td>
            <td class="field-value">
              ${f.readOnly
                ? html`${f.value.trim() || '—'}${f.enriched ? html`<span class="field-enriched">${f.enriched}</span>` : nothing}`
                : f.inputType === 'select'
                  ? html`<select class="edit-select" data-field=${f.property}
                      .value=${f.value}
                      @change=${(e: Event) => this._handleFieldChange(record, f.property, (e.target as HTMLSelectElement).value, f.numeric)}>
                      ${(f.options ?? []).map(([val, label]) => html`<option value=${val} ?selected=${String(f.value).trim() === val}>${val} — ${label}</option>`)}
                    </select>`
                  : f.inputType === 'textarea'
                    ? html`<textarea class="edit-textarea" data-field=${f.property}
                        maxlength=${f.maxLength ?? 80}
                        .value=${f.value}
                        @change=${(e: Event) => this._handleFieldChange(record, f.property, (e.target as HTMLTextAreaElement).value, f.numeric)}></textarea>`
                    : html`<input class="edit-input" data-field=${f.property}
                        type=${f.inputType === 'number' ? 'number' : 'text'}
                        maxlength=${f.maxLength ?? 94}
                        .value=${f.value}
                        @change=${(e: Event) => this._handleFieldChange(record, f.property, (e.target as HTMLInputElement).value, f.numeric)}
                      >${f.enriched ? html`<span class="field-enriched">${f.enriched}</span>` : nothing}`
              }
            </td>
          </tr>
        `)}
      </table>
    `;
  }

  protected override updated() {
    if (this._focusField) {
      const el = this.renderRoot.querySelector(`[data-field="${this._focusField}"]`) as HTMLElement | null;
      if (el) {
        el.focus();
        if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
          el.select();
        }
      }
      this._focusField = null;
    }
  }

  private _enterEditOnField(fieldKey: string) {
    if (this._editMode) return;
    this._focusField = fieldKey;
    this._toggleEditMode();
  }

  private _renderFieldTable(fields: FieldRow[]): TemplateResult {
    return html`
      <table class="field-table">
        ${fields.filter(f => !f.muted || f.value.trim()).map(f => html`
          <tr class="${f.muted ? 'field-muted' : ''} ${f.fieldKey ? 'field-clickable' : ''}"
              @dblclick=${f.fieldKey ? () => this._enterEditOnField(f.fieldKey!) : nothing}>
            <td class="field-label">${f.label}</td>
            <td class="field-value">
              ${f.value.trim() || '—'}${f.enriched ? html`<span class="field-enriched">${f.enriched}</span>` : nothing}
            </td>
          </tr>
        `)}
      </table>
    `;
  }

  /** Get diagnostics whose line falls within [startLine, endLine] (0-based) */
  private _getDiagsForRange(startLine: number, endLine: number): DiagnosticInfo[] {
    return this._diagnostics.filter(d => d.line >= startLine && d.line <= endLine);
  }

  private _renderInlineDiags(diags: DiagnosticInfo[]): TemplateResult {
    if (diags.length === 0) return html``;
    return html`${diags.map(d => html`
      <div class="inline-diag ${d.severity === 1 ? 'warning' : ''}">
        <span class="inline-diag-icon">${d.severity === 1 ? '⚠' : '⊘'}</span>
        ${d.message}
      </div>
    `)}`;
  }

  private _diagBadge(diags: DiagnosticInfo[]): TemplateResult {
    if (diags.length === 0) return html``;
    const hasError = diags.some(d => d.severity === 0);
    return html`<span class="diag-badge ${hasError ? '' : 'warning'}">${diags.length}</span>`;
  }

  private _renderFileHeader(file: ACHFile): TemplateResult {
    const h = file.header;
    const collapsed = this._collapsedSections.has('fh');
    const diags = this._getDiagsForRange(h.lineNumber, h.lineNumber);

    if (this._editMode && this._editFile) {
      const eh = this._editFile.header;
      const editFields: EditableField[] = [
        { label: descLabel('immediateDestination'), value: eh.immediateDestination, property: 'immediateDestination', maxLength: 10, enriched: fmtRouting(eh.immediateDestination) },
        { label: descLabel('immediateDestinationName'), value: eh.immediateDestinationName, property: 'immediateDestinationName', maxLength: 23 },
        { label: descLabel('immediateOrigin'), value: eh.immediateOrigin, property: 'immediateOrigin', maxLength: 10, enriched: fmtRouting(eh.immediateOrigin) },
        { label: descLabel('immediateOriginName'), value: eh.immediateOriginName, property: 'immediateOriginName', maxLength: 23 },
        { label: descLabel('fileCreationDate'), value: eh.fileCreationDate, property: 'fileCreationDate', maxLength: 6 },
        { label: descLabel('fileCreationTime'), value: eh.fileCreationTime, property: 'fileCreationTime', maxLength: 4 },
        { label: descLabel('fileIDModifier'), value: eh.fileIDModifier, property: 'fileIDModifier', maxLength: 1 },
        { label: descLabel('referenceCode'), value: eh.referenceCode, property: 'referenceCode', maxLength: 8 },
      ];
      return html`
        <div class="section">
          <div class="section-header" @click=${() => this._toggleSection('fh')}>
            <span class="toggle ${collapsed ? 'collapsed' : ''}">▼</span>
            <span class="section-tag tag-file">1</span>
            File Header
            ${this._diagBadge(diags)}
          </div>
          ${collapsed ? nothing : html`<div class="section-body">
            ${this._renderInlineDiags(diags)}
            ${this._renderEditableFieldTable(eh, editFields)}
          </div>`}
        </div>
      `;
    }

    const fields: FieldRow[] = [
      { label: descLabel('immediateDestination'), value: h.immediateDestination, enriched: fmtRouting(h.immediateDestination), fieldKey: 'immediateDestination' },
      { label: descLabel('immediateDestinationName'), value: h.immediateDestinationName, fieldKey: 'immediateDestinationName' },
      { label: descLabel('immediateOrigin'), value: h.immediateOrigin, enriched: fmtRouting(h.immediateOrigin), fieldKey: 'immediateOrigin' },
      { label: descLabel('immediateOriginName'), value: h.immediateOriginName, fieldKey: 'immediateOriginName' },
      { label: descLabel('fileCreationDate'), value: h.fileCreationDate, enriched: fmtDate(h.fileCreationDate), fieldKey: 'fileCreationDate' },
      { label: descLabel('fileCreationTime'), value: h.fileCreationTime, fieldKey: 'fileCreationTime' },
      { label: descLabel('fileIDModifier'), value: h.fileIDModifier, muted: true, fieldKey: 'fileIDModifier' },
      { label: descLabel('referenceCode'), value: h.referenceCode, muted: true, fieldKey: 'referenceCode' },
    ];
    return html`
      <div class="section">
        <div class="section-header" @click=${() => this._toggleSection('fh')}>
          <span class="toggle ${collapsed ? 'collapsed' : ''}">▼</span>
          <span class="section-tag tag-file">1</span>
          File Header
          ${this._diagBadge(diags)}
        </div>
        ${collapsed ? nothing : html`<div class="section-body">
          ${this._renderInlineDiags(diags)}
          ${this._renderFieldTable(fields)}
        </div>`}
      </div>
    `;
  }

  private _renderBatch(batch: any, kind: 'regular' | 'iat', batchIdx: number): TemplateResult {
    const bh = kind === 'regular' ? batch.getHeader() : batch.header;
    const bc = kind === 'regular' ? batch.getControl() : batch.control;
    const entries = kind === 'regular' ? batch.getEntries() : batch.entries;
    const secCode = bh.standardEntryClassCode?.trim() ?? '';
    const secDesc = SEC_CODE_DESCRIPTIONS[secCode] ?? '';
    const svcDesc = SERVICE_CLASS_DESCRIPTIONS[bh.serviceClassCode] ?? '';
    const batchId = `b${batchIdx}`;
    const collapsed = !this._collapsedSections.has(batchId);

    // Compute line range for the whole batch (header through control)
    const batchStartLine = bh.lineNumber ?? 0;
    const batchEndLine = bc?.lineNumber ?? batchStartLine;
    const allBatchDiags = this._getDiagsForRange(batchStartLine, batchEndLine);
    const headerDiags = this._getDiagsForRange(bh.lineNumber, bh.lineNumber);

    const companyName = (bh.companyName ?? '').trim();

    // Build SEC code options for dropdown
    const secOptions: [string, string][] = Object.entries(SEC_CODE_DESCRIPTIONS).map(([code, desc]) => [code, desc]);
    const svcOptions: [string, string][] = Object.entries(SERVICE_CLASS_DESCRIPTIONS).map(([code, desc]) => [String(code), desc]);

    const editHeaderFields: EditableField[] | null = this._editMode ? [
      { label: descLabel('companyName'), value: bh.companyName ?? '', property: 'companyName', maxLength: 16 },
      { label: descLabel('standardEntryClassCode'), value: secCode, property: 'standardEntryClassCode', inputType: 'select', options: secOptions },
      { label: descLabel('companyEntryDescription'), value: bh.companyEntryDescription ?? '', property: 'companyEntryDescription', maxLength: 10 },
      { label: descLabel('serviceClassCode'), value: String(bh.serviceClassCode), property: 'serviceClassCode', inputType: 'select', options: svcOptions, numeric: true },
      { label: descLabel('companyIdentification'), value: bh.companyIdentification ?? '', property: 'companyIdentification', maxLength: 10 },
      { label: descLabel('effectiveEntryDate'), value: bh.effectiveEntryDate ?? '', property: 'effectiveEntryDate', maxLength: 6 },
      { label: descLabel('odfiIdentification'), value: bh.odfiIdentification ?? '', property: 'odfiIdentification', maxLength: 8 },
      { label: descLabel('batchNumber'), value: String(bh.batchNumber ?? ''), property: 'batchNumber', numeric: true, maxLength: 7 },
    ] : null;

    const headerFields: FieldRow[] = [
      { label: descLabel('companyName'), value: bh.companyName ?? '', fieldKey: 'companyName' },
      { label: descLabel('standardEntryClassCode'), value: secCode, enriched: secDesc, fieldKey: 'standardEntryClassCode' },
      { label: descLabel('companyEntryDescription'), value: bh.companyEntryDescription ?? '', fieldKey: 'companyEntryDescription' },
      { label: descLabel('serviceClassCode'), value: String(bh.serviceClassCode), enriched: svcDesc, fieldKey: 'serviceClassCode' },
      { label: descLabel('companyIdentification'), value: bh.companyIdentification ?? '', fieldKey: 'companyIdentification' },
      { label: descLabel('effectiveEntryDate'), value: bh.effectiveEntryDate ?? '', enriched: fmtDate(bh.effectiveEntryDate ?? ''), fieldKey: 'effectiveEntryDate' },
      { label: descLabel('odfiIdentification'), value: bh.odfiIdentification ?? '', fieldKey: 'odfiIdentification' },
      { label: descLabel('batchNumber'), value: String(bh.batchNumber ?? ''), muted: true, fieldKey: 'batchNumber' },
    ];

    if (kind === 'iat') {
      headerFields.splice(1, 0,
        { label: descLabel('foreignExchangeIndicator'), value: bh.foreignExchangeIndicator ?? '' },
        { label: descLabel('isoDestinationCountryCode'), value: bh.isoDestinationCountryCode ?? '' },
        { label: descLabel('isoOriginatingCurrencyCode'), value: bh.isoOriginatingCurrencyCode ?? '' },
        { label: descLabel('isoDestinationCurrencyCode'), value: bh.isoDestinationCurrencyCode ?? '' },
      );
    }

    return html`
      <div class="section">
        <div class="section-header" @click=${() => this._toggleSection(batchId)}>
          <span class="toggle ${collapsed ? 'collapsed' : ''}">▼</span>
          <span class="section-tag tag-batch">5</span>
          Batch ${batchIdx + 1}${companyName ? html` — ${companyName}` : nothing}
          ${secCode ? html` <span class="entry-type">${secCode}</span>` : nothing}
          ${this._diagBadge(allBatchDiags)}
          ${this._editMode ? html`<button class="remove-btn" @click=${(e: Event) => { e.stopPropagation(); this._removeBatch(batch, kind); }} title="Remove batch">✕</button>` : nothing}
          ${bc ? html`
            <span class="header-stats">
              <span>Entries: <span class="stat-value">${bc.entryAddendaCount ?? 0}</span></span>
              <span>Debits: <span class="stat-value">${fmtAmount(bc.totalDebitEntryDollarAmount ?? 0)}</span></span>
              <span>Credits: <span class="stat-value">${fmtAmount(bc.totalCreditEntryDollarAmount ?? 0)}</span></span>
            </span>
          ` : nothing}
        </div>
        ${collapsed ? nothing : html`
          <div class="section-body">
            ${this._renderInlineDiags(headerDiags)}
            ${this._editMode && editHeaderFields
              ? this._renderEditableFieldTable(bh, editHeaderFields)
              : this._renderFieldTable(headerFields)}
            <div class="entries-container">
              ${(entries ?? []).map((entry: any, i: number) => {
                if (this._searchQuery && !this._entryMatchesSearch(entry)) return nothing;
                return this._renderEntry(entry, kind, batchIdx, i, secCode);
              })}
            </div>
            ${this._editMode ? html`<button class="crud-btn" @click=${() => this._addEntry(batch, kind)}>+ Add Entry</button>` : nothing}
            ${this._renderBatchControl(bc, batchIdx)}
          </div>
        `}
      </div>
    `;
  }

  private _renderEntry(entry: any, kind: string, batchIdx: number, entryIdx: number, secCode: string): TemplateResult {
    const entryId = `b${batchIdx}e${entryIdx}`;
    const expanded = this._searchQuery ? true : this._expandedEntries.has(entryId);
    const txCode = entry.transactionCode;
    const txDesc = TRANSACTION_CODE_DESCRIPTIONS[txCode] ?? '';
    const isCredit = [22, 23, 24, 32, 33, 34, 42, 43, 44, 52, 53, 54].includes(txCode);
    const amountStr = fmtAmount(entry.amount);
    const name = (entry.individualName ?? '').trim();

    // Collect diagnostics for this entry's line and any addenda lines
    const entryLine = entry.lineNumber ?? -1;
    const entryDiags = this._getDiagsForRange(entryLine, entryLine);
    // Also collect addenda diagnostics
    const addendaLines: number[] = [];
    for (const key of ['addenda02', 'addenda98', 'addenda98Refused', 'addenda99', 'addenda99Contested', 'addenda99Dishonored']) {
      if (entry[key]?.lineNumber != null) addendaLines.push(entry[key].lineNumber);
    }
    for (const key of ['addenda05', 'addenda17', 'addenda18']) {
      if (entry[key]?.length) {
        for (const a of entry[key]) {
          if (a.lineNumber != null) addendaLines.push(a.lineNumber);
        }
      }
    }
    for (let i = 10; i <= 16; i++) {
      if (entry[`addenda${i}`]?.lineNumber != null) addendaLines.push(entry[`addenda${i}`].lineNumber);
    }
    const allEntryDiags = [...entryDiags];
    for (const ln of addendaLines) {
      allEntryDiags.push(...this._getDiagsForRange(ln, ln));
    }

    // Build transaction code options for dropdown
    const txOptions: [string, string][] = Object.entries(TRANSACTION_CODE_DESCRIPTIONS).map(([code, desc]) => [code, desc]);

    const editDetailFields: EditableField[] | null = this._editMode ? [
      { label: descLabel('transactionCode'), value: String(txCode), property: 'transactionCode', inputType: 'select', options: txOptions, numeric: true },
      { label: descLabel('rdfiIdentification'), value: entry.rdfiIdentification ?? '', property: 'rdfiIdentification', maxLength: 8, enriched: fmtRouting(entry.rdfiIdentification ?? '') },
      { label: descLabel('checkDigit'), value: entry.checkDigit ?? '', property: 'checkDigit', maxLength: 1 },
      { label: descLabel('dfiAccountNumber'), value: entry.dfiAccountNumber ?? '', property: 'dfiAccountNumber', maxLength: 17 },
      { label: descLabel('amount'), value: String(entry.amount), property: 'amount', inputType: 'number', numeric: true },
      { label: descLabel('individualName'), value: entry.individualName ?? '', property: 'individualName', maxLength: 22 },
      { label: descLabel('identificationNumber'), value: entry.identificationNumber ?? '', property: 'identificationNumber', maxLength: 15 },
      { label: descLabel('traceNumber'), value: entry.traceNumber ?? '', property: 'traceNumber', maxLength: 15 },
    ] : null;

    const detailFields: FieldRow[] = [
      { label: descLabel('transactionCode'), value: String(txCode), enriched: txDesc, fieldKey: 'transactionCode' },
      { label: descLabel('rdfiIdentification'), value: entry.rdfiIdentification ?? '', enriched: fmtRouting(entry.rdfiIdentification ?? ''), fieldKey: 'rdfiIdentification' },
      { label: descLabel('checkDigit'), value: entry.checkDigit ?? '', muted: true, fieldKey: 'checkDigit' },
      { label: descLabel('dfiAccountNumber'), value: entry.dfiAccountNumber ?? '', fieldKey: 'dfiAccountNumber' },
      { label: descLabel('amount'), value: amountStr, fieldKey: 'amount' },
      { label: descLabel('individualName'), value: name, fieldKey: 'individualName' },
      { label: descLabel('identificationNumber'), value: (entry.identificationNumber ?? '').trim(), muted: true, fieldKey: 'identificationNumber' },
      { label: descLabel('traceNumber'), value: entry.traceNumber ?? '', muted: true, fieldKey: 'traceNumber' },
    ];

    if (kind === 'iat') {
      detailFields.splice(5, 2,
        { label: descLabel('addendaRecords'), value: String(entry.addendaRecords ?? 0), muted: true },
      );
      if (editDetailFields) {
        editDetailFields.splice(5, 2,
          { label: descLabel('addendaRecords'), value: String(entry.addendaRecords ?? 0), property: 'addendaRecords', readOnly: true },
        );
      }
    }

    // Collect addenda records
    const addendaBlocks: TemplateResult[] = [];
    if (entry.addenda05?.length) {
      for (let i = 0; i < entry.addenda05.length; i++) {
        addendaBlocks.push(this._renderAddenda05(entry.addenda05[i], entry, i));
      }
    }
    if (entry.addenda02) {
      addendaBlocks.push(this._renderAddendaGeneric('Addenda 02 — Terminal Info', entry.addenda02, [
        { label: descLabel('terminalIdentificationCode'), value: entry.addenda02.terminalIdentificationCode ?? '', property: 'terminalIdentificationCode', maxLength: 6 },
        { label: descLabel('terminalLocation'), value: entry.addenda02.terminalLocation ?? '', property: 'terminalLocation', maxLength: 27 },
        { label: descLabel('terminalCity'), value: entry.addenda02.terminalCity ?? '', property: 'terminalCity', maxLength: 15 },
        { label: descLabel('terminalState'), value: entry.addenda02.terminalState ?? '', property: 'terminalState', maxLength: 2 },
        { label: descLabel('transactionDate'), value: entry.addenda02.transactionDate ?? '', property: 'transactionDate', maxLength: 4 },
      ]));
    }
    if (entry.addenda98) {
      addendaBlocks.push(this._renderAddendaGeneric('Addenda 98 — Notification of Change', entry.addenda98, [
        { label: descLabel('changeCode'), value: entry.addenda98.changeCode ?? '', property: 'changeCode', maxLength: 3 },
        { label: descLabel('originalTrace'), value: entry.addenda98.originalTrace ?? '', property: 'originalTrace', maxLength: 15 },
        { label: descLabel('originalDFI'), value: entry.addenda98.originalDFI ?? '', property: 'originalDFI', maxLength: 8 },
        { label: descLabel('correctedData'), value: entry.addenda98.correctedData ?? '', property: 'correctedData', maxLength: 29 },
      ]));
    }
    if (entry.addenda99) {
      addendaBlocks.push(this._renderAddendaGeneric('Addenda 99 — Return', entry.addenda99, [
        { label: descLabel('returnCode'), value: entry.addenda99.returnCode ?? '', property: 'returnCode', maxLength: 3 },
        { label: descLabel('originalTrace'), value: entry.addenda99.originalTrace ?? '', property: 'originalTrace', maxLength: 15 },
        { label: descLabel('originalDFI'), value: entry.addenda99.originalDFI ?? '', property: 'originalDFI', maxLength: 8 },
        { label: descLabel('addendaInformation'), value: entry.addenda99.addendaInformation ?? '', property: 'addendaInformation', maxLength: 44 },
      ]));
    }
    // IAT addenda 10-18
    for (const num of [10, 11, 12, 13, 14, 15, 16]) {
      const a = entry[`addenda${num}`];
      if (a) {
        addendaBlocks.push(this._renderIATAddenda(num, a));
      }
    }
    for (const num of [17, 18]) {
      const arr = entry[`addenda${num}`];
      if (arr?.length) {
        for (const a of arr) {
          addendaBlocks.push(this._renderIATAddenda(num, a));
        }
      }
    }

    return html`
      <div class="entry-card">
        <div class="entry-summary" @click=${() => this._toggleEntry(entryId)}>
          <span class="toggle ${expanded ? '' : 'collapsed'}">▼</span>
          <span class="section-tag tag-entry">6</span>
          <span class="entry-name">${name || 'Entry ' + (entryIdx + 1)}</span>
          <span class="entry-type">${txDesc.split('—')[0]?.trim() ?? ''}</span>
          <span class="entry-amount ${isCredit ? 'credit' : 'debit'}">${isCredit ? '+' : '-'}${amountStr}</span>
          ${this._diagBadge(allEntryDiags)}
          ${this._editMode ? html`<button class="remove-btn" @click=${(e: Event) => { e.stopPropagation(); this._removeEntry(batchIdx, entryIdx); }} title="Remove entry">✕</button>` : nothing}
        </div>
        ${expanded ? html`
          <div class="entry-detail">
            ${this._renderInlineDiags(entryDiags)}
            ${this._editMode && editDetailFields
              ? this._renderEditableFieldTable(entry, editDetailFields)
              : this._renderFieldTable(detailFields)}
            ${addendaBlocks}
            ${this._editMode ? html`<button class="crud-btn" @click=${() => this._addAddenda05(entry)}>+ Add Addenda</button>` : nothing}
          </div>
        ` : nothing}
      </div>
    `;
  }

  private _renderAddenda05(a: any, entry: any, addendaIdx: number): TemplateResult {
    if (this._editMode) {
      const editFields: EditableField[] = [
        { label: descLabel('paymentRelatedInformation'), value: (a.paymentRelatedInformation ?? '').trim(), property: 'paymentRelatedInformation', inputType: 'textarea', maxLength: 80 },
        { label: descLabel('sequenceNumber'), value: String(a.sequenceNumber ?? ''), property: 'sequenceNumber', readOnly: true },
      ];
      return html`
        <div class="addenda-block">
          <div class="addenda-label">
            Addenda 05 — Payment Info
            <button class="remove-btn" @click=${() => this._removeAddenda05(entry, addendaIdx)} title="Remove addenda">✕</button>
          </div>
          ${this._renderEditableFieldTable(a, editFields)}
        </div>
      `;
    }
    return html`
      <div class="addenda-block">
        <div class="addenda-label">Addenda 05 — Payment Info</div>
        ${this._renderFieldTable([
          { label: descLabel('paymentRelatedInformation'), value: (a.paymentRelatedInformation ?? '').trim() },
          { label: descLabel('sequenceNumber'), value: String(a.sequenceNumber ?? ''), muted: true },
        ])}
      </div>
    `;
  }

  private _renderAddendaGeneric(title: string, record: any, fields: EditableField[]): TemplateResult {
    if (this._editMode) {
      return html`
        <div class="addenda-block">
          <div class="addenda-label">${title}</div>
          ${this._renderEditableFieldTable(record, fields)}
        </div>
      `;
    }
    const viewFields: FieldRow[] = fields.map(f => ({ label: f.label, value: f.value }));
    return html`
      <div class="addenda-block">
        <div class="addenda-label">${title}</div>
        ${this._renderFieldTable(viewFields)}
      </div>
    `;
  }

  private _renderIATAddenda(num: number, a: any): TemplateResult {
    if (this._editMode) {
      const editFields: EditableField[] = [];
      for (const [key, val] of Object.entries(a)) {
        if (key === 'lineNumber' || key === 'typeCode' || key === 'reserved' || key === 'validateOpts' || key === 'id' || key === 'category') continue;
        if (typeof val === 'function' || typeof val === 'object') continue;
        const v = typeof val === 'number' ? String(val) : (val as string ?? '');
        if (!v.trim()) continue;
        editFields.push({ label: descLabel(key), value: v, property: key, numeric: typeof val === 'number' });
      }
      return html`
        <div class="addenda-block">
          <div class="addenda-label">Addenda ${num}</div>
          ${this._renderEditableFieldTable(a, editFields)}
        </div>
      `;
    }
    const fields: FieldRow[] = [];
    for (const [key, val] of Object.entries(a)) {
      if (key === 'lineNumber' || key === 'typeCode' || key === 'reserved' || key === 'validateOpts' || key === 'id' || key === 'category') continue;
      if (typeof val === 'function' || typeof val === 'object') continue;
      const v = typeof val === 'number' ? String(val) : (val as string ?? '');
      if (!v.trim()) continue;
      fields.push({ label: descLabel(key), value: v });
    }
    return html`
      <div class="addenda-block">
        <div class="addenda-label">Addenda ${num}</div>
        ${this._renderFieldTable(fields)}
      </div>
    `;
  }

  private _renderBatchControl(bc: any, batchIdx: number): TemplateResult {
    if (!bc) return html``;
    const diags = this._getDiagsForRange(bc.lineNumber ?? -1, bc.lineNumber ?? -1);
    return html`
      ${this._renderInlineDiags(diags)}
      <div class="summary-bar">
        ${this._editMode ? html`<span class="computed-label">auto-computed</span>` : nothing}
        <span class="summary-item">Entries: <span class="summary-value">${bc.entryAddendaCount ?? 0}</span></span>
        <span class="summary-item">Debits: <span class="summary-value">${fmtAmount(bc.totalDebitEntryDollarAmount ?? 0)}</span></span>
        <span class="summary-item">Credits: <span class="summary-value">${fmtAmount(bc.totalCreditEntryDollarAmount ?? 0)}</span></span>
        <span class="summary-item">Hash: <span class="summary-value">${bc.entryHash ?? 0}</span></span>
      </div>
    `;
  }

  private _renderFileControl(file: ACHFile): TemplateResult {
    const fc = file.control;
    if (!fc) return html``;
    const collapsed = this._collapsedSections.has('fc');
    const diags = this._getDiagsForRange(fc.lineNumber, fc.lineNumber);
    const fields: FieldRow[] = [
      { label: descLabel('batchCount'), value: String(fc.batchCount) },
      { label: descLabel('blockCount'), value: String(fc.blockCount) },
      { label: descLabel('entryAddendaCount'), value: String(fc.entryAddendaCount) },
      { label: descLabel('entryHash'), value: String(fc.entryHash) },
      { label: 'Total Debits', value: fmtAmount(fc.totalDebitEntryDollarAmountInFile) },
      { label: 'Total Credits', value: fmtAmount(fc.totalCreditEntryDollarAmountInFile) },
    ];
    return html`
      <div class="section">
        <div class="section-header" @click=${() => this._toggleSection('fc')}>
          <span class="toggle ${collapsed ? 'collapsed' : ''}">▼</span>
          <span class="section-tag tag-control">9</span>
          File Control
          ${this._editMode ? html`<span class="computed-label">(auto-computed)</span>` : nothing}
          ${this._diagBadge(diags)}
          <span class="header-stats">
            <span>Batches: <span class="stat-value">${fc.batchCount}</span></span>
            <span>Entries: <span class="stat-value">${fc.entryAddendaCount}</span></span>
            <span>Debits: <span class="stat-value">${fmtAmount(fc.totalDebitEntryDollarAmountInFile)}</span></span>
            <span>Credits: <span class="stat-value">${fmtAmount(fc.totalCreditEntryDollarAmountInFile)}</span></span>
          </span>
        </div>
        ${collapsed ? nothing : html`<div class="section-body">
          ${this._renderInlineDiags(diags)}
          ${this._renderFieldTable(fields)}
        </div>`}
      </div>
    `;
  }

  // --- CRUD operations ---

  private _addBatch() {
    if (!this._editFile) return;
    const bh = newBatchHeader();
    bh.serviceClassCode = 200;
    bh.standardEntryClassCode = 'PPD';
    bh.companyName = 'New Company';
    bh.companyEntryDescription = 'ENTRY';
    bh.companyIdentification = '0000000000';
    bh.odfiIdentification = '00000000';
    const [batch, err] = newBatch(bh);
    if (batch) {
      batch.setValidation(AchStructuredViewer._permissiveOpts);
      this._editFile.addBatch(batch);
      this._applyEdit();
    }
  }

  private _removeBatch(batch: any, kind: 'regular' | 'iat') {
    if (!this._editFile) return;
    if (kind === 'regular') {
      this._editFile.removeBatch(batch);
    } else {
      const idx = this._editFile.iatBatches.indexOf(batch);
      if (idx >= 0) this._editFile.iatBatches.splice(idx, 1);
    }
    this._applyEdit();
  }

  private _addEntry(batch: any, kind: 'regular' | 'iat') {
    if (!this._editFile) return;
    const entry = newEntryDetail();
    entry.transactionCode = 22;
    entry.rdfiIdentification = '00000000';
    entry.checkDigit = '0';
    entry.dfiAccountNumber = '';
    entry.amount = 0;
    entry.individualName = 'New Entry';
    if (kind === 'regular') {
      batch.addEntry(entry);
    } else {
      batch.entries.push(entry);
    }
    this._applyEdit();
  }

  private _removeEntry(batchIdx: number, entryIdx: number) {
    if (!this._editFile) return;
    const allBatches = this._getSortedBatches(this._editFile);
    const item = allBatches[batchIdx];
    if (!item) return;
    if (item.kind === 'regular') {
      const entries = item.batch.getEntries();
      entries.splice(entryIdx, 1);
    } else {
      item.batch.entries.splice(entryIdx, 1);
    }
    this._applyEdit();
  }

  private _addAddenda05(entry: any) {
    if (!this._editFile) return;
    const addenda = newAddenda05();
    addenda.paymentRelatedInformation = '';
    entry.addAddenda05(addenda);
    entry.addendaRecordIndicator = 1;
    this._applyEdit();
  }

  private _removeAddenda05(entry: any, idx: number) {
    if (!this._editFile) return;
    if (entry.addenda05?.length > idx) {
      entry.addenda05.splice(idx, 1);
      if (!entry.addenda05.length) {
        entry.addendaRecordIndicator = 0;
      }
    }
    this._applyEdit();
  }

  private _getSortedBatches(file: ACHFile): { kind: 'regular' | 'iat'; batch: any }[] {
    const allBatches: { kind: 'regular' | 'iat'; batch: any }[] = [
      ...file.batches.map((b: any) => ({ kind: 'regular' as const, batch: b })),
      ...file.iatBatches.map((b: any) => ({ kind: 'iat' as const, batch: b })),
    ];
    allBatches.sort((a, b) => {
      const aLine = a.kind === 'regular' ? a.batch.getHeader().lineNumber : a.batch.header.lineNumber;
      const bLine = b.kind === 'regular' ? b.batch.getHeader().lineNumber : b.batch.header.lineNumber;
      return aLine - bLine;
    });
    return allBatches;
  }

  private _diffCollapsed = true;

  private _computeDiff(): { added: number; removed: number; lines: { type: 'added' | 'removed' | 'context'; text: string }[] } {
    if (!this._originalContent || !this._content) return { added: 0, removed: 0, lines: [] };

    const oldLines = this._originalContent.replace(/\n$/, '').split('\n');
    const newLines = this._content.replace(/\n$/, '').split('\n');

    // Simple line-by-line diff with context
    const result: { type: 'added' | 'removed' | 'context'; text: string }[] = [];
    let added = 0;
    let removed = 0;
    const maxLen = Math.max(oldLines.length, newLines.length);

    // Use a basic LCS-style approach: find matching and changed lines
    // For ACH files (fixed-width, line-oriented), a simple per-line comparison works well
    const oldSet = new Map<string, number[]>();
    oldLines.forEach((line, i) => {
      const arr = oldSet.get(line) ?? [];
      arr.push(i);
      oldSet.set(line, arr);
    });

    // Track which old lines were matched
    const oldMatched = new Set<number>();
    const newMatched = new Set<number>();

    // First pass: find exact line matches in order
    let oldIdx = 0;
    for (let newIdx = 0; newIdx < newLines.length; newIdx++) {
      const candidates = oldSet.get(newLines[newIdx]);
      if (candidates) {
        const match = candidates.find(i => i >= oldIdx && !oldMatched.has(i));
        if (match !== undefined) {
          // Emit removed lines between oldIdx and match
          for (let i = oldIdx; i < match; i++) {
            if (!oldMatched.has(i)) {
              result.push({ type: 'removed', text: oldLines[i] });
              removed++;
              oldMatched.add(i);
            }
          }
          result.push({ type: 'context', text: newLines[newIdx] });
          oldMatched.add(match);
          newMatched.add(newIdx);
          oldIdx = match + 1;
        }
      }
    }

    // Emit remaining old lines as removed
    for (let i = oldIdx; i < oldLines.length; i++) {
      if (!oldMatched.has(i)) {
        result.push({ type: 'removed', text: oldLines[i] });
        removed++;
      }
    }

    // Second pass: insert unmatched new lines as added
    const finalResult: typeof result = [];
    let resultIdx = 0;
    for (let newIdx = 0; newIdx < newLines.length; newIdx++) {
      if (newMatched.has(newIdx)) {
        // Find this context line in result
        while (resultIdx < result.length && result[resultIdx].type === 'removed') {
          finalResult.push(result[resultIdx]);
          resultIdx++;
        }
        if (resultIdx < result.length) {
          finalResult.push(result[resultIdx]);
          resultIdx++;
        }
      } else {
        finalResult.push({ type: 'added', text: newLines[newIdx] });
        added++;
      }
    }
    // Remaining removed lines
    while (resultIdx < result.length) {
      finalResult.push(result[resultIdx]);
      resultIdx++;
    }

    // Filter to only show changed lines + surrounding context
    const changedLines: typeof finalResult = [];
    const changeIndices = new Set<number>();
    finalResult.forEach((line, i) => {
      if (line.type !== 'context') changeIndices.add(i);
    });
    const CONTEXT_LINES = 1;
    const includedIndices = new Set<number>();
    for (const idx of changeIndices) {
      for (let i = Math.max(0, idx - CONTEXT_LINES); i <= Math.min(finalResult.length - 1, idx + CONTEXT_LINES); i++) {
        includedIndices.add(i);
      }
    }
    let lastIncluded = -2;
    for (let i = 0; i < finalResult.length; i++) {
      if (includedIndices.has(i)) {
        if (lastIncluded < i - 1 && changedLines.length > 0) {
          changedLines.push({ type: 'context', text: '···' });
        }
        changedLines.push(finalResult[i]);
        lastIncluded = i;
      }
    }

    return { added, removed, lines: changedLines };
  }

  private _renderDiff(): TemplateResult {
    const diff = this._computeDiff();
    if (diff.added === 0 && diff.removed === 0) {
      return html``;
    }
    return html`
      <div class="diff-panel">
        <div class="diff-header" @click=${() => { this._diffCollapsed = !this._diffCollapsed; this.requestUpdate(); }}>
          <span class="toggle ${this._diffCollapsed ? 'collapsed' : ''}">▼</span>
          Changes
          <span class="diff-stats">
            <span class="added-count">+${diff.added}</span>
            <span class="removed-count"> -${diff.removed}</span>
          </span>
        </div>
        ${this._diffCollapsed ? nothing : html`
          <div class="diff-body">
            ${diff.lines.length
              ? diff.lines.map(l => html`<div class="diff-line ${l.type}">${l.text}</div>`)
              : html`<div class="diff-empty">No changes</div>`}
          </div>
        `}
      </div>
    `;
  }

  render() {
    if (!this._content) {
      return html`<div class="no-content">Open an ACH file to see the preview</div>`;
    }

    // In edit mode, render from the mutable _editFile
    if (this._editMode && this._editFile) {
      const file = this._editFile;
      const allBatches = this._getSortedBatches(file);
      const totalEntries = allBatches.reduce((sum, item) => {
        const entries = item.kind === 'regular' ? item.batch.getEntries() : item.batch.entries;
        return sum + (entries?.length ?? 0);
      }, 0);

      return html`
        <div class="header-bar">
          <strong>${this._fileName || 'ACH Preview'}</strong>
          <span>·</span>
          <span>${allBatches.length} batch${allBatches.length !== 1 ? 'es' : ''}</span>
          <span>·</span>
          <span>${totalEntries} entr${totalEntries !== 1 ? 'ies' : 'y'}</span>
          <button class="edit-toggle active" @click=${() => this._toggleEditMode()}>✎ Editing</button>
          ${this._renderSearchBox(allBatches)}
        </div>
        <div class="content">
          ${this._renderDiff()}
          ${!this._searchQuery || this._fileHeaderMatchesSearch(file) ? this._renderFileHeader(file) : nothing}
          ${allBatches.map((item, i) => {
            if (this._searchQuery && !this._batchMatchesSearch(item.batch, item.kind)) return nothing;
            return this._renderBatch(item.batch, item.kind, i);
          })}
          ${this._searchQuery && allBatches.every(item => !this._batchMatchesSearch(item.batch, item.kind)) && !this._fileHeaderMatchesSearch(file)
            ? html`<div class="search-no-results">No results for "${this._searchQuery}"</div>`
            : nothing}
          <button class="crud-btn" @click=${() => this._addBatch()}>+ Add Batch</button>
          ${this._renderFileControl(file)}
        </div>
      `;
    }

    return this._parseTask.render({
      pending: () => html`<div class="no-content">Parsing...</div>`,
      error: (e) => html`<div class="no-content">Parse error: ${(e as Error).message}</div>`,
      complete: (result) => {
        if (!result) return html`<div class="no-content">No data</div>`;
        const { file } = result;

        // Merge regular + IAT batches in file order
        const allBatches = this._getSortedBatches(file);

        const totalEntries = allBatches.reduce((sum, item) => {
          const entries = item.kind === 'regular' ? item.batch.getEntries() : item.batch.entries;
          return sum + (entries?.length ?? 0);
        }, 0);

        return html`
          <div class="header-bar">
            <strong>${this._fileName || 'ACH Preview'}</strong>
            <span>·</span>
            <span>${allBatches.length} batch${allBatches.length !== 1 ? 'es' : ''}</span>
            <span>·</span>
            <span>${totalEntries} entr${totalEntries !== 1 ? 'ies' : 'y'}</span>
            <button class="edit-toggle" @click=${() => this._toggleEditMode()}>✎ Edit</button>
            ${this._renderSearchBox(allBatches)}
          </div>
          <div class="content">
            ${!this._searchQuery || this._fileHeaderMatchesSearch(file) ? this._renderFileHeader(file) : nothing}
            ${allBatches.map((item, i) => {
              if (this._searchQuery && !this._batchMatchesSearch(item.batch, item.kind)) return nothing;
              return this._renderBatch(item.batch, item.kind, i);
            })}
            ${this._searchQuery && allBatches.every(item => !this._batchMatchesSearch(item.batch, item.kind)) && !this._fileHeaderMatchesSearch(file)
              ? html`<div class="search-no-results">No results for "${this._searchQuery}"</div>`
              : nothing}
            ${this._renderFileControl(file)}
          </div>
        `;
      },
    });
  }
}
