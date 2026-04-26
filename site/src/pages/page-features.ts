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
        <h2><span class="icon">🏷️</span>Inlay Hints</h2>
        <p>Cursor-position-aware field labels displayed inline as you navigate the file:</p>
        <ul>
          <li><strong>Multi-cursor support</strong> — all cursors receive hints simultaneously</li>
          <li><strong>Smart conversions</strong> — amounts shown as dollars ($1,234.56), dates formatted (2026-04-25), routing numbers validated (✓/⚠), codes decoded to descriptions</li>
          <li><strong>Compact labels</strong> — abbreviated field names like "Dest RTN", "Amt", "Batch #" keep the editor uncluttered</li>
          <li><strong>Toggle</strong> — Ctrl+Alt+H (Cmd+Alt+H on Mac) to show/hide</li>
        </ul>
        <div class="screenshot"><screenshot-placeholder label="Inlay Hints: field labels at cursor position with amount conversion"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">📐</span>Formatting</h2>
        <p>Format entire ACH files or selected ranges to proper 94-character fixed-width format using the <code>ach-ts</code> Writer. Range formatting pads short lines to 94 characters. Only full-document formatting requires a clean parse to prevent data corruption.</p>
        <div class="screenshot"><screenshot-placeholder label="Format Document: before and after" aspect="4/3"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">🔧</span>Code Actions (Quick Fixes)</h2>
        <p>Extensive quick fixes available via the lightbulb menu, plus a source action for bulk operations:</p>
        <ul>
          <li><strong>Fix check digit</strong> — calculates the correct check digit for routing numbers</li>
          <li><strong>Pad line to 94 characters</strong> — right-pads short records with spaces</li>
          <li><strong>Set record size</strong> — corrects the record size field in file headers to "094"</li>
          <li><strong>Fix batch control totals</strong> — recalculates entry hash, debit/credit totals, and entry/addenda counts</li>
          <li><strong>Fix file control totals</strong> — recalculates batch count, block count, entry hash, and totals across all batches</li>
          <li><strong>Fix service class code</strong> — sets the correct service class code (200/220/225) based on entry types</li>
          <li><strong>Fix dates/times</strong> — updates file creation date/time and effective entry dates to today</li>
          <li><strong>Recalculate All</strong> — source action that recalculates all computed fields in one pass</li>
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
        <p>Adjacency-aware coloring ensures no two neighboring fields share the same color. Over 80 field-specific overrides have been tuned across every record type:</p>
        <ul>
          <li><strong>Standard records</strong> — file header date/time adjacencies, batch header routing streaks, entry detail check digit vs. RDFI coloring</li>
          <li><strong>IAT batches</strong> — foreign exchange indicator fields, originator/receiver names, bank qualifiers, and country codes all get distinct colors</li>
          <li><strong>ADV entries</strong> — advice routing numbers, ACH operator data, and Julian day fields are differentiated</li>
          <li><strong>Addenda records</strong> — per-type overrides for terminal info (02), payment data (05), IAT addenda (10–18), NOC change codes (98), and return codes (99)</li>
        </ul>
        <p>The interactive viewer on the home page uses the same token mapping, so you can see the adjacency-aware coloring in action.</p>
        <div class="screenshot"><screenshot-placeholder label="Semantic Highlighting: color-coded ACH file with adjacency-aware coloring"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">🦓</span>Field Decorations</h2>
        <p>Zebra-striped alternating backgrounds visually separate the fixed-width fields on each line:</p>
        <ul>
          <li>Alternating subtle gray backgrounds highlight field boundaries</li>
          <li>Makes it easy to see where one field ends and the next begins in 94-character lines</li>
          <li>Toggle via the <code>ach.fieldSeparators</code> setting (on by default)</li>
        </ul>
        <div class="screenshot"><screenshot-placeholder label="Field Decorations: zebra-striped field backgrounds" aspect="4/3"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">⌨️</span>Field Navigation</h2>
        <p>8 keyboard shortcuts for semantic navigation through ACH records:</p>
        <ul>
          <li><strong>Field-level</strong> — Ctrl+Left/Right (Alt on Mac) to jump between field boundaries</li>
          <li><strong>Section-level</strong> — Ctrl+Up/Down (Alt on Mac) to jump between batches, entries, and sections</li>
          <li><strong>Selection</strong> — add Shift to extend selection to field or section boundaries</li>
          <li><strong>Multi-cursor</strong> — all commands work with multiple cursors simultaneously</li>
        </ul>
        <div class="screenshot"><screenshot-placeholder label="Field Navigation: jumping between fields with keyboard shortcuts" aspect="4/3"></screenshot-placeholder></div>
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
        <ul>
          <li><strong>IAT batches</strong> — labeled as "Batch N (IAT)" with addenda 10–18, 98, 99 shown as child nodes</li>
          <li><strong>Fallback parsing</strong> — regex-based text parsing ensures the tree works even with partial or malformed files</li>
        </ul>
        <div class="screenshot"><screenshot-placeholder label="ACH Explorer: sidebar tree with batch/entry/addenda nodes" aspect="4/3"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">👁️</span>Structured Preview</h2>
        <p>A side panel that displays a structured, human-readable view of the ACH file:</p>
        <ul>
          <li><strong>Hierarchical view</strong> — file header → batches → entries → addenda with enriched field values</li>
          <li><strong>Bi-directional sync</strong> — edits in the preview apply to the text editor and vice versa</li>
          <li><strong>Inline editing</strong> — double-click any field to edit its value with appropriate input controls</li>
          <li><strong>Search</strong> — query across all parsed fields</li>
          <li><strong>Diff view</strong> — compare original vs. modified content</li>
          <li><strong>Diagnostics overlay</strong> — validation errors from the server shown inline</li>
          <li><strong>Auto-open</strong> — opens automatically when ACH files are opened (configurable via <code>ach.autoOpenPreview</code>), or toggle with Ctrl+Shift+V</li>
        </ul>
        <div class="screenshot"><screenshot-placeholder label="Structured Preview: hierarchical view with field editing"></screenshot-placeholder></div>
      </section>

      <section>
        <h2><span class="icon">🔗</span>Go to Definition &amp; References</h2>
        <p>Navigate ACH file structure with standard IDE shortcuts:</p>
        <ul>
          <li><strong>Go to Definition (F12)</strong> — jump between batch headers and their controls, entries to their batch header, addenda to their entry</li>
          <li><strong>Find All References (Shift+F12)</strong> — find all entries and addenda in a batch, sibling entries, or linked header/control records</li>
        </ul>
      </section>

      <section>
        <h2><span class="icon">🔢</span>CodeLens</h2>
        <p>Inline statistics displayed above key records:</p>
        <ul>
          <li><strong>File header</strong> — total batch count, entry count, debit/credit totals</li>
          <li><strong>Batch headers</strong> — entry count, debit/credit totals for the batch</li>
          <li><strong>Entries with addenda</strong> — addenda count</li>
        </ul>
      </section>

      <section>
        <h2><span class="icon">🌐</span>Document Links</h2>
        <p>Routing numbers in ACH files become clickable links that open the FedACH routing number lookup, letting you quickly verify any institution.</p>
      </section>

      <section>
        <h2><span class="icon">📊</span>Status Bar</h2>
        <p>The status bar shows a summary of the active ACH file: batch count, entry count, debit/credit totals (formatted as currency), and error/warning counts — all updated in real time.</p>
      </section>

      <section>
        <h2><span class="icon">🧩</span>Snippets</h2>
        <p>10 snippet templates to speed up ACH file creation:</p>
        <ul>
          <li><strong>Record templates</strong> — individual records for types 1, 5, 6, 7, 8, 9 with tab stops</li>
          <li><strong>Batch templates</strong> — complete PPD, CCD, and WEB batches (header + entry + control)</li>
          <li><strong>Full file</strong> — complete ACH file with all record types</li>
        </ul>
      </section>

      <section>
        <h2><span class="icon">🔀</span>Merge Files</h2>
        <p>Merge multiple ACH files into as few files as possible using NACHA rules. Select files from a quick pick list, and the extension merges batches while respecting the 10,000-line limit and matching origin/destination routing numbers.</p>
      </section>

      <section>
        <h2><span class="icon">📤</span>Export &amp; Import</h2>
        <p>Round-trip ACH files through JSON format:</p>
        <ul>
          <li><strong>Export to JSON</strong> — serialize the active ACH file using <code>ach-ts</code> structured JSON</li>
          <li><strong>Import from JSON</strong> — convert an <code>ach-ts</code> JSON file back to fixed-width ACH format</li>
        </ul>
      </section>

      <section>
        <h2><span class="icon">✅</span>Validate All</h2>
        <p>Batch-validate every <code>.ach</code> file in the workspace with a progress indicator. Results are written to the "ACH Validation" output channel with per-file error and warning counts.</p>
      </section>
    `;
  }
}
