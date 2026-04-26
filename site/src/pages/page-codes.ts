import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import {
  SEC_CODE_DESCRIPTIONS,
  TRANSACTION_CODE_DESCRIPTIONS,
  SERVICE_CLASS_DESCRIPTIONS,
  ADDENDA_TYPE_DESCRIPTIONS,
} from '../data/ach-data.js';

@customElement('page-codes')
export class PageCodes extends LitElement {
  @state() private _filter = '';

  static styles = css`
    :host { display: block; max-width: var(--max-width); margin: 0 auto; padding: 2rem 1.5rem; }
    h1 { color: var(--color-text-bright); margin-bottom: 0.5rem; }
    .subtitle { color: var(--color-text-muted); margin-bottom: 1.5rem; }
    h2 { color: var(--color-text-bright); margin-top: 2.5rem; margin-bottom: 0.75rem; font-size: 1.3rem; }
    .search {
      width: 100%;
      max-width: 400px;
      padding: 0.5rem 0.75rem;
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 6px;
      color: var(--color-text);
      font-size: 0.9rem;
      margin-bottom: 2rem;
      outline: none;
    }
    .search:focus { border-color: var(--color-accent); }
    .search::placeholder { color: var(--color-text-muted); }
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
    }
    tr:hover td { background: var(--color-surface-hover); }
    .code {
      font-family: var(--font-mono);
      font-weight: 600;
      color: var(--color-accent);
    }
    .no-results {
      color: var(--color-text-muted);
      padding: 1rem 0;
      font-style: italic;
    }
  `;

  private _onSearch(e: Event) {
    this._filter = (e.target as HTMLInputElement).value.toLowerCase();
  }

  private _matches(code: string, desc: string): boolean {
    if (!this._filter) return true;
    return code.toLowerCase().includes(this._filter) ||
           desc.toLowerCase().includes(this._filter);
  }

  private _renderTable(title: string, entries: [string, string][]) {
    const filtered = entries.filter(([code, desc]) => this._matches(code, desc));
    return html`
      <h2>${title}</h2>
      <table>
        <thead><tr><th>Code</th><th>Description</th></tr></thead>
        <tbody>
          ${filtered.length > 0
            ? filtered.map(([code, desc]) => html`
                <tr>
                  <td class="code">${code}</td>
                  <td>${desc}</td>
                </tr>
              `)
            : html`<tr><td colspan="2" class="no-results">No matches</td></tr>`}
        </tbody>
      </table>
    `;
  }

  render() {
    const secEntries = Object.entries(SEC_CODE_DESCRIPTIONS);
    const txnEntries = Object.entries(TRANSACTION_CODE_DESCRIPTIONS).map(
      ([k, v]) => [k, v] as [string, string]
    );
    const svcEntries = Object.entries(SERVICE_CLASS_DESCRIPTIONS).map(
      ([k, v]) => [k, v] as [string, string]
    );
    const addEntries = Object.entries(ADDENDA_TYPE_DESCRIPTIONS);

    return html`
      <h1>ACH Codes Reference</h1>
      <p class="subtitle">All standard codes used in NACHA ACH files.</p>
      <input
        class="search"
        type="text"
        placeholder="Filter codes..."
        @input=${this._onSearch}
      />

      ${this._renderTable('SEC Codes (Standard Entry Class)', secEntries)}
      ${this._renderTable('Transaction Codes', txnEntries)}
      ${this._renderTable('Service Class Codes', svcEntries)}
      ${this._renderTable('Addenda Type Codes', addEntries)}
    `;
  }
}
