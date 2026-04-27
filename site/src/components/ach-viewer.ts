import { LitElement, html, css, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import {
  recordTypeToFieldSpecs, type FieldSpec,
  addenda02Fields, addenda05Fields,
  addenda10Fields, addenda11Fields, addenda12Fields,
  addenda13Fields, addenda14Fields, addenda15Fields,
  addenda16Fields, addenda17Fields, addenda18Fields,
  addenda98Fields, addenda99Fields,
  Reader,
} from 'ach-ts';
import { FIELD_DESCRIPTIONS, getSecCodeForLine, TOKEN_TYPES, getTokenType } from '../data/ach-data.js';

const addendaFieldsByTypeCode: Record<string, FieldSpec[]> = {
  '02': addenda02Fields, '05': addenda05Fields,
  '10': addenda10Fields, '11': addenda11Fields, '12': addenda12Fields,
  '13': addenda13Fields, '14': addenda14Fields, '15': addenda15Fields,
  '16': addenda16Fields, '17': addenda17Fields, '18': addenda18Fields,
  '98': addenda98Fields, '99': addenda99Fields,
};
import { getContextualInfo } from '../utils/field-enrichment.js';
import { SAMPLE_ACH_FILE, SAMPLE_IAT_FILE } from '../data/sample-ach.js';
import './ach-field-info.js';

const TOKEN_CLASSES = TOKEN_TYPES.map(t => `tok-${t}`);

const SAMPLES: { label: string; content: string }[] = [
  { label: 'Standard (PPD/CCD)', content: SAMPLE_ACH_FILE },
  { label: 'International (IAT)', content: SAMPLE_IAT_FILE },
];

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
  @state() private _sampleIndex = 0;
  @state() private _editing = false;
  @state() private _customContent = '';
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
    .tab-bar {
      display: flex;
      align-items: center;
      gap: 0;
      background: var(--color-bg);
      border-bottom: 1px solid var(--color-border);
      font-size: 0.8rem;
      padding: 0 0.5rem;
    }
    .tab {
      padding: 0.5rem 1rem;
      cursor: pointer;
      color: var(--color-text-muted);
      border-bottom: 2px solid transparent;
      transition: color 0.15s, border-color 0.15s;
      user-select: none;
      background: none;
      border-top: none;
      border-left: none;
      border-right: none;
      font: inherit;
      font-size: 0.8rem;
      display: inline-flex;
      align-items: center;
      gap: 0.4rem;
    }
    .tab:hover { color: var(--color-text); }
    .tab.active {
      color: var(--color-accent);
      border-bottom-color: var(--color-accent);
    }
    .tab .edit-icon {
      font-size: 0.75rem;
      opacity: 0.6;
      transition: opacity 0.15s;
    }
    .tab:hover .edit-icon, .tab.active .edit-icon { opacity: 1; }
    .tab-bar .spacer { flex: 1; }
    .tab-bar .meta {
      color: var(--color-text-muted);
      font-size: 0.75rem;
      padding-right: 0.5rem;
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

  private _selectTab(idx: number) {
    this._sampleIndex = idx;
    if (idx < SAMPLES.length) {
      this._content = SAMPLES[idx].content;
      this._editing = false;
      this._errors = [];
    } else {
      // Custom tab
      this._content = this._customContent;
      this._editing = !this._customContent;
      if (this._customContent) this._parseAndValidate();
    }
    this._selectedField = null;
  }

  private _toggleEdit() {
    if (this._editing) {
      // Leaving edit mode → show syntax view
      this._customContent = this._content;
      this._editing = false;
      this._parseAndValidate();
    } else {
      this._editing = true;
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

    let fields: FieldSpec[] | undefined;
    if (recordType === '7') {
      const typeCode = line.substring(1, 3);
      fields = addendaFieldsByTypeCode[typeCode];
    } else {
      fields = recordTypeToFieldSpecs(recordType, {
        secCode,
        isADV: secCode === 'ADV',
      });
    }

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
        <div class="tab-bar">
          ${SAMPLES.map((s, i) => html`
            <button class="tab ${this._sampleIndex === i ? 'active' : ''}" @click=${() => this._selectTab(i)}>${s.label}</button>
          `)}
          <button class="tab ${this._sampleIndex >= SAMPLES.length ? 'active' : ''}" @click=${() => this._selectTab(SAMPLES.length)}>Custom${this._sampleIndex >= SAMPLES.length ? html`<span class="edit-icon" @click=${(e: Event) => { e.stopPropagation(); this._toggleEdit(); }} title=${this._editing ? 'View syntax' : 'Edit'}>${this._editing ? '✕' : '✎'}</span>` : nothing}</button>
          <span class="spacer"></span>
          <span class="meta">${lines.length} lines, 94 chars/line</span>
        </div>

        ${this._editing ? html`
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
