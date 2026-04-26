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
  ADDENDA_10_FIELDS,
  ADDENDA_11_FIELDS,
  ADDENDA_12_FIELDS,
  ADDENDA_13_FIELDS,
  ADDENDA_14_FIELDS,
  ADDENDA_15_FIELDS,
  ADDENDA_16_FIELDS,
  ADDENDA_17_FIELDS,
  ADDENDA_18_FIELDS,
  ADDENDA_98_FIELDS,
  ADDENDA_99_FIELDS,
  ADV_ENTRY_DETAIL_FIELDS,
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

const IAT_ADDENDA_TYPES: { code: string; label: string; fields: FieldDef[] }[] = [
  { code: '10', label: 'Transaction Info', fields: ADDENDA_10_FIELDS },
  { code: '11', label: 'Originator Name/Address', fields: ADDENDA_11_FIELDS },
  { code: '12', label: 'Originator City/Country', fields: ADDENDA_12_FIELDS },
  { code: '13', label: 'ODFI Information', fields: ADDENDA_13_FIELDS },
  { code: '14', label: 'RDFI Information', fields: ADDENDA_14_FIELDS },
  { code: '15', label: 'Receiver Identification', fields: ADDENDA_15_FIELDS },
  { code: '16', label: 'Receiver Address', fields: ADDENDA_16_FIELDS },
  { code: '17', label: 'Remittance Information', fields: ADDENDA_17_FIELDS },
  { code: '18', label: 'Foreign Correspondent Bank', fields: ADDENDA_18_FIELDS },
];

const SPECIAL_ADDENDA_TYPES: { code: string; label: string; fields: FieldDef[] }[] = [
  { code: '98', label: 'Notification of Change', fields: ADDENDA_98_FIELDS },
  { code: '99', label: 'Return', fields: ADDENDA_99_FIELDS },
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
    h3 {
      color: var(--color-text-bright);
      margin-top: 1.5rem;
      margin-bottom: 0.5rem;
      font-size: 1.1rem;
    }
    .addenda-code {
      display: inline-block;
      background: var(--color-type);
      color: #fff;
      padding: 0.1rem 0.4rem;
      border-radius: 3px;
      font-weight: 700;
      font-family: var(--font-mono);
      margin-right: 0.5rem;
      font-size: 0.8rem;
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

  private _renderAddendaTable(at: { code: string; label: string; fields: FieldDef[] }) {
    return html`
      <h3><span class="addenda-code">${at.code}</span>${at.label}</h3>
      ${this._renderRuler()}
      <table>
        <thead><tr><th>Position</th><th>Field Name</th><th>Format</th><th>Description</th></tr></thead>
        <tbody>
          ${at.fields.map(f => html`
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

      <h2>IAT Addenda Records (Types 10–18)</h2>
      <p>International ACH Transactions (IAT) use specialized addenda records to carry originator, receiver, and bank information required for cross-border payments. Each IAT entry requires addenda types 10–16, with optional types 17 and 18.</p>
      ${IAT_ADDENDA_TYPES.map(at => this._renderAddendaTable(at))}

      <h2>Special Addenda Records</h2>
      <p>These addenda types are used for Notifications of Change (NOC) and Returns, applicable to all SEC codes including IAT.</p>
      ${SPECIAL_ADDENDA_TYPES.map(at => this._renderAddendaTable(at))}

      <h2>ADV Entry Detail (SEC=ADV)</h2>
      <p>Automated Accounting Advice entries use a different field layout than standard entry details. ADV entries carry advisory (non-monetary) accounting information with transaction codes 81–88.</p>
      ${this._renderRuler()}
      <table>
        <thead><tr><th>Position</th><th>Field Name</th><th>Format</th><th>Description</th></tr></thead>
        <tbody>
          ${ADV_ENTRY_DETAIL_FIELDS.map(f => html`
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
}
