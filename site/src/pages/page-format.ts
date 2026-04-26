import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import {
  RECORD_TYPE_DESCRIPTIONS,
  FILE_HEADER_FIELDS,
  BATCH_HEADER_FIELDS,
  ENTRY_DETAIL_FIELDS,
  ADDENDA_FIELDS,
  BATCH_CONTROL_FIELDS,
  FILE_CONTROL_FIELDS,
} from '../data/ach-data.js';

interface FieldDef {
  name: string;
  description: string;
  format?: string;
  start: number;
  end: number;
}

const RECORD_TYPES: { type: string; fields: FieldDef[] }[] = [
  { type: '1', fields: FILE_HEADER_FIELDS },
  { type: '5', fields: BATCH_HEADER_FIELDS },
  { type: '6', fields: ENTRY_DETAIL_FIELDS },
  { type: '7', fields: ADDENDA_FIELDS },
  { type: '8', fields: BATCH_CONTROL_FIELDS },
  { type: '9', fields: FILE_CONTROL_FIELDS },
];

@customElement('page-format')
export class PageFormat extends LitElement {
  static styles = css`
    :host { display: block; max-width: var(--max-width); margin: 0 auto; padding: 2rem 1.5rem; }
    h1 { color: var(--color-text-bright); margin-bottom: 0.5rem; }
    .subtitle { color: var(--color-text-muted); margin-bottom: 2rem; }
    h2 { color: var(--color-text-bright); margin-top: 2.5rem; margin-bottom: 0.75rem; font-size: 1.3rem; }
    p { color: var(--color-text); line-height: 1.6; margin-bottom: 1rem; }
    .hierarchy {
      font-family: var(--font-mono);
      font-size: 0.85rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1.25rem 1.5rem;
      line-height: 1.8;
      color: var(--color-text);
      margin-bottom: 2rem;
      overflow-x: auto;
    }
    .h-keyword { color: var(--color-keyword); font-weight: 600; }
    .h-muted { color: var(--color-text-muted); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.85rem;
      margin-bottom: 2rem;
    }
    th {
      text-align: left;
      padding: 0.6rem 0.75rem;
      background: var(--color-surface);
      border-bottom: 2px solid var(--color-border);
      color: var(--color-text-bright);
      font-weight: 600;
    }
    td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text);
      vertical-align: top;
    }
    tr:hover td { background: var(--color-surface-hover); }
    .pos { font-family: var(--font-mono); color: var(--color-number); white-space: nowrap; }
    .fmt { font-family: var(--font-mono); color: var(--color-type); font-size: 0.8rem; }
    .record-type-badge {
      display: inline-block;
      background: var(--color-accent);
      color: #fff;
      width: 1.6rem;
      height: 1.6rem;
      line-height: 1.6rem;
      text-align: center;
      border-radius: 4px;
      font-weight: 700;
      font-family: var(--font-mono);
      margin-right: 0.5rem;
      font-size: 0.85rem;
    }
    .ruler {
      font-family: var(--font-mono);
      font-size: 0.7rem;
      color: var(--color-text-muted);
      background: var(--color-surface);
      padding: 0.5rem 0.75rem;
      border-radius: 4px;
      overflow-x: auto;
      white-space: pre;
      margin-bottom: 0.75rem;
      letter-spacing: 0;
    }
  `;

  private _renderRuler() {
    let tens = '';
    let ones = '';
    for (let i = 0; i < 94; i++) {
      tens += i % 10 === 0 ? Math.floor(i / 10).toString() : ' ';
      ones += (i % 10).toString();
    }
    return html`<div class="ruler">${tens}\n${ones}</div>`;
  }

  private _renderRecordTable(rt: { type: string; fields: FieldDef[] }) {
    const desc = RECORD_TYPE_DESCRIPTIONS[rt.type] ?? '';
    return html`
      <h2><span class="record-type-badge">${rt.type}</span>${desc.split('—')[0]?.trim()}</h2>
      <p>${desc}</p>
      ${this._renderRuler()}
      <table>
        <thead><tr><th>Position</th><th>Field Name</th><th>Format</th><th>Description</th></tr></thead>
        <tbody>
          ${rt.fields.map(f => html`
            <tr>
              <td class="pos">${f.start}–${f.end - 1}</td>
              <td>${f.name}</td>
              <td class="fmt">${f.format ?? '—'}</td>
              <td>${f.description}</td>
            </tr>
          `)}
        </tbody>
      </table>
    `;
  }

  render() {
    return html`
      <h1>ACH File Format Reference</h1>
      <p class="subtitle">NACHA ACH files are fixed-width text files with 94 characters per line. Each line is a record identified by its first character.</p>

      <h2>What is an ACH File?</h2>
      <p>ACH (Automated Clearing House) files are the standard format for electronic financial transactions in the United States — payroll, bill payments, tax refunds, and B2B transfers. They follow the NACHA Operating Rules and consist of a strict hierarchy of records:</p>

      <div class="hierarchy">
<span class="h-keyword">1</span> File Header<br/>
<span class="h-muted">├──</span> <span class="h-keyword">5</span> Batch Header<br/>
<span class="h-muted">│   ├──</span> <span class="h-keyword">6</span> Entry Detail<br/>
<span class="h-muted">│   │   └──</span> <span class="h-keyword">7</span> Addenda Record(s)<br/>
<span class="h-muted">│   ├──</span> <span class="h-keyword">6</span> Entry Detail<br/>
<span class="h-muted">│   └──</span> <span class="h-keyword">8</span> Batch Control<br/>
<span class="h-muted">├──</span> <span class="h-keyword">5</span> Batch Header<br/>
<span class="h-muted">│   ├──</span> <span class="h-keyword">6</span> Entry Detail<br/>
<span class="h-muted">│   └──</span> <span class="h-keyword">8</span> Batch Control<br/>
<span class="h-keyword">9</span> File Control<br/>
<span class="h-muted">9999...</span> Padding (to fill block of 10 records)
      </div>

      ${RECORD_TYPES.map(rt => this._renderRecordTable(rt))}
    `;
  }
}
