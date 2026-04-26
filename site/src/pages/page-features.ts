import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import '../components/screenshot-placeholder.js';

@customElement('page-features')
export class PageFeatures extends LitElement {
  static styles = css`
    :host { display: block; max-width: var(--max-width); margin: 0 auto; padding: 2rem 1.5rem; }
    h1 { color: var(--color-text-bright); margin-bottom: 0.5rem; }
    .subtitle { color: var(--color-text-muted); margin-bottom: 2.5rem; }
    section { margin-bottom: 3rem; }
    h2 { color: var(--color-text-bright); margin-bottom: 0.5rem; font-size: 1.3rem; }
    h2 .icon { margin-right: 0.5rem; }
    p { color: var(--color-text); margin-bottom: 1rem; line-height: 1.6; }
    ul { padding-left: 1.5rem; margin-bottom: 1rem; color: var(--color-text); }
    li { margin-bottom: 0.3rem; line-height: 1.5; }
    code { font-family: var(--font-mono); background: var(--color-surface); padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.85em; }
    .screenshot { margin-top: 1rem; }
  `;

  render() {
    return html`
      <h1>Features</h1>
      <p class="subtitle">Everything the ACH Language Support extension provides for working with NACHA ACH files.</p>

      <section>
        <h2><span class="icon">🔍</span>Real-time Validation (Diagnostics)</h2>
        <p>As you edit, the extension validates your ACH file against NACHA standards and reports errors inline. Validation covers:</p>
        <ul>
          <li>Record type codes and field formats</li>
          <li>Routing number check digit verification</li>
          <li>Entry hash calculations (sum of RDFI routing numbers)</li>
          <li>Debit/credit amount reconciliation across batches and file control</li>
          <li>Entry/addenda count verification</li>
          <li>Batch sequencing and nesting</li>
        </ul>
        <p>All validation rules are configurable — see the <a href="/config">Configuration</a> page for available toggles.</p>
        <div class="screenshot"><screenshot-placeholder label="Diagnostics: inline error squiggles and Problems panel"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">💡</span>Smart Completions</h2>
        <p>Context-aware code completion based on cursor position and record type:</p>
        <ul>
          <li><strong>Record templates</strong> — full-line templates for types 1, 5, 6, 7, 8, 9</li>
          <li><strong>SEC codes</strong> — all 22 Standard Entry Class codes (PPD, CCD, WEB, IAT, etc.)</li>
          <li><strong>Transaction codes</strong> — checking (22-29), savings (32-39), GL (42-49), loan (52-56)</li>
          <li><strong>Service class codes</strong> — 200 (mixed), 220 (credits), 225 (debits)</li>
          <li><strong>Addenda types</strong> — 02, 05, 10-18, 98, 99</li>
          <li><strong>File ID modifiers</strong> — A-Z or 0-9</li>
        </ul>
        <div class="screenshot"><screenshot-placeholder label="Completion: SEC code suggestions with descriptions"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">📖</span>Hover Documentation</h2>
        <p>Hover over any field to see comprehensive documentation:</p>
        <ul>
          <li>Field name and description</li>
          <li>Expected format (NN, YYMMDD, etc.)</li>
          <li>Current value and column range</li>
          <li>Amount fields: formatted as dollars ($1,234.56)</li>
          <li>Routing numbers: check digit validation (✅ valid / ⚠️ invalid)</li>
          <li>Date fields: formatted as 2026-04-25</li>
          <li>Code fields: SEC, transaction, service class, and addenda type meanings</li>
        </ul>
        <div class="screenshot"><screenshot-placeholder label="Hover: field documentation popup with amount formatting"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">📐</span>Formatting</h2>
        <p>Format entire ACH files to proper 94-character fixed-width format using the <code>ach-ts</code> Writer. Only formats files that parse without errors to prevent data corruption.</p>
        <div class="screenshot"><screenshot-placeholder label="Format Document: before and after" aspect="4/3"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">🔧</span>Code Actions (Quick Fixes)</h2>
        <p>Three quick fixes available via the lightbulb menu:</p>
        <ul>
          <li><strong>Fix check digit</strong> — calculates the correct check digit for routing numbers</li>
          <li><strong>Pad line to 94 characters</strong> — right-pads short records with spaces</li>
          <li><strong>Set record size</strong> — corrects the record size field in file headers to "094"</li>
        </ul>
        <div class="screenshot"><screenshot-placeholder label="Code Actions: fix check digit lightbulb" aspect="4/3"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">📁</span>Code Folding</h2>
        <p>Collapse regions for easier navigation:</p>
        <ul>
          <li><strong>Batches</strong> — fold from batch header (type 5) through batch control (type 8)</li>
          <li><strong>Entries with addenda</strong> — fold from entry detail (type 6) through last addenda (type 7)</li>
        </ul>
        <div class="screenshot"><screenshot-placeholder label="Folding: collapsed batches in a multi-batch file" aspect="4/3"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">🎨</span>Semantic Highlighting</h2>
        <p>8 distinct token types provide rich coloring beyond basic syntax highlighting:</p>
        <ul>
          <li><strong>Keyword</strong> — record type codes</li>
          <li><strong>Number</strong> — amounts, counts, trace numbers</li>
          <li><strong>String</strong> — names, descriptions, text fields</li>
          <li><strong>Type</strong> — SEC codes, addenda types</li>
          <li><strong>Variable</strong> — routing numbers, account numbers</li>
          <li><strong>Comment</strong> — padding lines (all 9s)</li>
          <li><strong>Parameter</strong> — dates, times</li>
          <li><strong>Enum</strong> — transaction codes, service class codes</li>
        </ul>
        <div class="screenshot"><screenshot-placeholder label="Semantic Highlighting: color-coded ACH file"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">🗂️</span>Document Symbols (Outline)</h2>
        <p>Hierarchical outline in VS Code's Outline panel showing:</p>
        <ul>
          <li>File Header with origin/destination and date</li>
          <li>Batches with SEC code and company name</li>
          <li>Entries with amount, transaction type, and individual name</li>
          <li>Addenda records by type</li>
          <li>Batch and File Control records with totals</li>
        </ul>
        <div class="screenshot"><screenshot-placeholder label="Outline: hierarchical file structure" aspect="4/3"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">🌲</span>ACH Explorer Tree View</h2>
        <p>Dedicated sidebar view that displays the full ACH file structure as a tree. Click any node to jump to that line in the editor. Automatically refreshes when the file changes.</p>
        <div class="screenshot"><screenshot-placeholder label="ACH Explorer: sidebar tree with batch/entry/addenda nodes" aspect="4/3"></screenshot-placeholder></div>
      </section>
    `;
  }
}
