import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { recordTypeToFieldSpecs, type FieldSpec } from 'ach-ts/dist/fieldPositions.js';
import { Reader } from 'ach-ts/dist/reader.js';
import { FIELD_DESCRIPTIONS, getSecCodeForLine } from '../data/ach-data.js';
import { getContextualInfo } from '../utils/field-enrichment.js';
import { SAMPLE_ACH_FILE } from '../data/sample-ach.js';
import './ach-field-info.js';

// Same 8 token types as the LSP semantic tokens
const TOKEN_CLASSES = [
  'tok-keyword',   // 0 - record type codes
  'tok-number',    // 1 - amounts, counts, hashes
  'tok-string',    // 2 - names, descriptions
  'tok-type',      // 3 - SEC codes, addenda types
  'tok-variable',  // 4 - routing numbers, account numbers
  'tok-comment',   // 5 - padding lines
  'tok-parameter', // 6 - dates, times
  'tok-enum',      // 7 - transaction codes, service class codes
];

function getTokenType(fieldName: string): number {
  if (fieldName === 'recordType') return 0;
  if (fieldName === 'immediateOrigin') return 3;
  if (fieldName === 'immediateOriginName') return 6;
  if (fieldName === 'batchCount') return 1;
  if (fieldName === 'blockCount') return 7;
  if (fieldName === 'entryAddendaCount' || fieldName === 'addendaRecords') return 6;
  if (fieldName.includes('Hash') || fieldName.includes('hash')) return 4;
  if (fieldName.includes('Debit') && fieldName.includes('Amount')) return 1;
  if (fieldName.includes('Credit') && fieldName.includes('Amount')) return 3;
  if (fieldName === 'amount') return 1;
  if (fieldName.includes('Count') || fieldName.includes('count')) return 7;
  if (fieldName.includes('Name') || fieldName.includes('name') ||
      fieldName.includes('Description') || fieldName.includes('description') ||
      fieldName.includes('Discretionary') || fieldName.includes('discretionary') ||
      fieldName.includes('Information') || fieldName.includes('information') ||
      fieldName.includes('Reserved') || fieldName.includes('reserved') ||
      fieldName.includes('Reference') || fieldName.includes('reference') ||
      fieldName.includes('Message') || fieldName.includes('message') ||
      fieldName === 'paymentRelatedInformation') return 2;
  if (fieldName === 'standardEntryClassCode' || fieldName === 'typeCode' ||
      fieldName === 'addendaTypeCode') return 3;
  if (fieldName.includes('Destination') || fieldName.includes('destination') ||
      fieldName.includes('Origin') || fieldName.includes('origin') ||
      fieldName === 'rdfiIdentification' || fieldName === 'odfiIdentification' ||
      fieldName === 'dfiAccountNumber' || fieldName === 'checkDigit' ||
      fieldName === 'companyIdentification' || fieldName === 'originatorIdentification' ||
      fieldName === 'immediateDestination' || fieldName === 'immediateOrigin') return 4;
  if (fieldName.includes('Date') || fieldName.includes('date') ||
      fieldName.includes('Time') || fieldName.includes('time')) return 6;
  if (fieldName === 'transactionCode' || fieldName === 'serviceClassCode' ||
      fieldName === 'priorityCode' || fieldName === 'formatCode' ||
      fieldName === 'addendaRecordIndicator' || fieldName === 'fileIDModifier' ||
      fieldName === 'originatorStatusCode' || fieldName === 'recordSize' ||
      fieldName === 'blockingFactor') return 7;
  if (fieldName.includes('Trace') || fieldName.includes('trace') ||
      fieldName.includes('Sequence') || fieldName.includes('sequence') ||
      fieldName.includes('batchNumber') || fieldName === 'entryDetailSequenceNumber') return 1;
  return 2;
}

interface FieldInfo {
  name: string;
  label: string;
  description: string;
  format?: string;
  value: string;
  start: number;
  end: number;
  contextual: string | null;
}

@customElement('ach-viewer')
export class AchViewer extends LitElement {
  @property({ type: Boolean }) editable = false;
  @state() private _content = SAMPLE_ACH_FILE;
  @state() private _tryItMode = false;
  @state() private _selectedField: FieldInfo | null = null;
  @state() private _errors: string[] = [];

  private _debounceTimer?: ReturnType<typeof setTimeout>;

  static styles = css`
    :host { display: block; }
    .viewer-wrapper {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      overflow: hidden;
    }
    .toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.5rem 1rem;
      background: var(--color-bg);
      border-bottom: 1px solid var(--color-border);
      font-size: 0.8rem;
      color: var(--color-text-muted);
    }
    .toolbar button {
      background: var(--color-accent);
      color: #fff;
      border: none;
      padding: 0.3rem 0.75rem;
      border-radius: 4px;
      cursor: pointer;
      font-size: 0.8rem;
    }
    .toolbar button:hover { opacity: 0.9; }
    .toolbar button.active {
      background: var(--color-error);
    }
    .content-area {
      display: flex;
      gap: 0;
    }
    .code-panel {
      flex: 1;
      overflow-x: auto;
      min-width: 0;
    }
    .info-panel {
      width: 320px;
      min-width: 320px;
      border-left: 1px solid var(--color-border);
      overflow-y: auto;
      max-height: 500px;
    }
    @media (max-width: 900px) {
      .content-area { flex-direction: column; }
      .info-panel { width: 100%; min-width: 0; border-left: none; border-top: 1px solid var(--color-border); max-height: 250px; }
    }
    pre {
      margin: 0;
      padding: 1rem;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      line-height: 1.6;
      overflow-x: auto;
      max-height: 500px;
      overflow-y: auto;
      counter-reset: line;
    }
    .line {
      display: block;
      white-space: pre;
    }
    .line::before {
      counter-increment: line;
      content: counter(line);
      display: inline-block;
      width: 2.5ch;
      margin-right: 1.5ch;
      text-align: right;
      color: var(--color-text-muted);
      user-select: none;
      font-size: 0.75rem;
    }
    .field {
      cursor: pointer;
      border-radius: 2px;
      transition: background 0.1s;
    }
    .field:hover { background: rgba(255,255,255,0.08); }
    .field.selected { outline: 1px solid var(--color-accent); outline-offset: 1px; }
    .tok-keyword { color: var(--color-keyword); }
    .tok-number { color: var(--color-number); }
    .tok-string { color: var(--color-string); }
    .tok-type { color: var(--color-type); }
    .tok-variable { color: var(--color-variable); }
    .tok-comment { color: var(--color-comment); font-style: italic; }
    .tok-parameter { color: var(--color-parameter); }
    .tok-enum { color: var(--color-enum); }
    textarea {
      width: 100%;
      min-height: 200px;
      background: var(--color-bg);
      color: var(--color-text);
      border: none;
      border-bottom: 1px solid var(--color-border);
      padding: 1rem;
      font-family: var(--font-mono);
      font-size: 0.8rem;
      line-height: 1.6;
      resize: vertical;
      outline: none;
    }
    .errors {
      padding: 0.75rem 1rem;
      background: rgba(244, 71, 71, 0.08);
      border-bottom: 1px solid var(--color-border);
      font-size: 0.8rem;
      max-height: 150px;
      overflow-y: auto;
    }
    .error-item {
      color: var(--color-error);
      padding: 0.15rem 0;
      font-family: var(--font-mono);
      font-size: 0.75rem;
    }
    .no-selection {
      padding: 1.5rem;
      color: var(--color-text-muted);
      font-size: 0.85rem;
      text-align: center;
    }
  `;

  private _onTryItToggle() {
    this._tryItMode = !this._tryItMode;
    if (!this._tryItMode) {
      this._content = SAMPLE_ACH_FILE;
      this._errors = [];
    }
    this._selectedField = null;
  }

  private _onTextInput(e: Event) {
    const textarea = e.target as HTMLTextAreaElement;
    clearTimeout(this._debounceTimer);
    this._debounceTimer = setTimeout(() => {
      this._content = textarea.value;
      this._parseAndValidate();
    }, 300);
  }

  private _parseAndValidate() {
    try {
      const reader = new Reader(this._content);
      const result = reader.readWithErrors();
      this._errors = result.errors?.map((e: Error) => e.message) ?? [];
    } catch (err) {
      this._errors = [(err as Error).message];
    }
  }

  private _onFieldClick(info: FieldInfo) {
    this._selectedField = info;
  }

  private _renderLine(line: string, lineIdx: number, lines: string[]): TemplateResult {
    if (line.length === 0) {
      return html`<span class="line"></span>`;
    }

    // Padding line (all 9s)
    if (/^9{10,}$/.test(line.trim())) {
      return html`<span class="line"><span class="field tok-comment" @click=${() => this._onFieldClick({ name: 'padding', label: 'Padding Line', description: 'Filler line of 9s used to pad the file to a block of 10 records.', value: line, start: 0, end: line.length, contextual: null })}>${line}</span></span>`;
    }

    const recordType = line.charAt(0);
    const secCode = getSecCodeForLine(lines, lineIdx);
    const fields = recordTypeToFieldSpecs(recordType, {
      secCode,
      isADV: secCode === 'ADV',
    });

    if (!fields || fields.length === 0) {
      return html`<span class="line">${line}</span>`;
    }

    const spans: TemplateResult[] = [];
    for (const field of fields) {
      const start = field.start;
      const end = Math.min(field.end, line.length);
      if (end <= start) continue;

      const value = line.substring(start, end);
      const tokenType = getTokenType(field.name);
      const cls = TOKEN_CLASSES[tokenType];
      const desc = FIELD_DESCRIPTIONS[field.name];
      const info: FieldInfo = {
        name: field.name,
        label: desc?.label ?? field.name,
        description: desc?.description ?? '',
        format: desc?.format,
        value,
        start: field.start,
        end: field.end,
        contextual: getContextualInfo(field.name, value.trim()),
      };
      const isSelected = this._selectedField?.name === field.name &&
                         this._selectedField?.start === field.start &&
                         this._selectedField?.value === value;
      spans.push(html`<span
        class="field ${cls} ${isSelected ? 'selected' : ''}"
        title="${info.label}"
        @click=${() => this._onFieldClick(info)}
      >${value}</span>`);
    }

    return html`<span class="line">${spans}</span>`;
  }

  render() {
    const lines = this._content.split('\n');

    return html`
      <div class="viewer-wrapper">
        <div class="toolbar">
          <span>sample.ach — ${lines.length} lines, 94 chars/line</span>
          <button class=${this._tryItMode ? 'active' : ''} @click=${this._onTryItToggle}>
            ${this._tryItMode ? '✕ Close editor' : '✎ Try your own ACH file'}
          </button>
        </div>

        ${this._tryItMode ? html`
          <textarea
            .value=${this._content}
            @input=${this._onTextInput}
            placeholder="Paste your ACH file here..."
            spellcheck="false"
          ></textarea>
        ` : nothing}

        ${this._errors.length > 0 ? html`
          <div class="errors">
            ${this._errors.map(e => html`<div class="error-item">⚠ ${e}</div>`)}
          </div>
        ` : nothing}

        <div class="content-area">
          <div class="code-panel">
            <pre>${lines.map((line, i) => this._renderLine(line, i, lines))}</pre>
          </div>
          <div class="info-panel">
            ${this._selectedField
              ? html`<ach-field-info .field=${this._selectedField}></ach-field-info>`
              : html`<div class="no-selection">Click any field in the ACH file to see details</div>`}
          </div>
        </div>
      </div>
    `;
  }
}
