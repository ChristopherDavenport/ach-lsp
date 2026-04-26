import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import { VALIDATION_SETTINGS } from '../data/settings-data.js';

@customElement('page-config')
export class PageConfig extends LitElement {
  static styles = css`
    :host { display: block; max-width: var(--max-width); margin: 0 auto; padding: 2rem 1.5rem; }
    h1 { color: var(--color-text-bright); margin-bottom: 0.5rem; }
    .subtitle { color: var(--color-text-muted); margin-bottom: 2rem; }
    h2 { color: var(--color-text-bright); margin-top: 2rem; margin-bottom: 0.75rem; font-size: 1.3rem; }
    p { color: var(--color-text); line-height: 1.6; margin-bottom: 1rem; }
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
      white-space: nowrap;
    }
    td {
      padding: 0.5rem 0.75rem;
      border-bottom: 1px solid var(--color-border);
      color: var(--color-text);
      vertical-align: top;
    }
    tr:hover td { background: var(--color-surface-hover); }
    .key {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: var(--color-variable);
      white-space: nowrap;
    }
    .type { color: var(--color-type); font-family: var(--font-mono); font-size: 0.8rem; }
    .default { font-family: var(--font-mono); color: var(--color-number); font-size: 0.8rem; }
    pre {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1rem 1.25rem;
      font-family: var(--font-mono);
      font-size: 0.82rem;
      line-height: 1.6;
      overflow-x: auto;
      color: var(--color-text);
    }
    code { font-family: var(--font-mono); background: var(--color-surface); padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.85em; }
  `;

  render() {
    return html`
      <h1>Configuration Reference</h1>
      <p class="subtitle">All settings available for the ACH Language Support extension. Configure in VS Code's <code>settings.json</code>.</p>

      <h2>All Settings</h2>
      <table>
        <thead>
          <tr><th>Setting</th><th>Type</th><th>Default</th><th>Description</th></tr>
        </thead>
        <tbody>
          ${VALIDATION_SETTINGS.map(s => html`
            <tr>
              <td class="key">${s.key}</td>
              <td class="type">${s.type}</td>
              <td class="default">${String(s.default)}</td>
              <td>${s.description}</td>
            </tr>
          `)}
        </tbody>
      </table>

      <h2>Example Configuration</h2>
      <p>Add to your <code>settings.json</code>:</p>
      <pre>{
  // Allow files with non-standard trace numbers
  "ach.validation.customTraceNumbers": true,

  // Skip routing number check digit validation
  "ach.validation.allowInvalidCheckDigit": true,

  // Limit diagnostics
  "ach.maxNumberOfProblems": 500
}</pre>

      <h2>Workspace vs User Settings</h2>
      <p>All <code>ach.validation.*</code> settings use <strong>resource scope</strong>, meaning they can be set per-workspace or per-folder. The <code>ach.trace.server</code> setting uses <strong>window scope</strong> and applies globally.</p>
    `;
  }
}
