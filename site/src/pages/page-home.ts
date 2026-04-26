import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';
import '../components/feature-card.js';
import '../components/ach-viewer.js';

@customElement('page-home')
export class PageHome extends LitElement {
  static styles = css`
    :host { display: block; }
    .hero {
      text-align: center;
      padding: 3rem 1.5rem 2rem;
      max-width: var(--max-width);
      margin: 0 auto;
    }
    h1 {
      font-size: 2.5rem;
      color: var(--color-text-bright);
      margin-bottom: 0.75rem;
    }
    h1 span { color: var(--color-accent); }
    .tagline {
      font-size: 1.15rem;
      color: var(--color-text-muted);
      margin-bottom: 2rem;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }
    .install-badge {
      display: inline-block;
      background: var(--color-accent);
      color: #fff;
      padding: 0.6rem 1.5rem;
      border-radius: 6px;
      text-decoration: none;
      font-weight: 600;
      font-size: 0.95rem;
      transition: opacity 0.15s;
    }
    .install-badge:hover { opacity: 0.9; }
    .viewer-section {
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 0 1.5rem 3rem;
    }
    .viewer-section h2 {
      text-align: center;
      color: var(--color-text-bright);
      margin-bottom: 0.5rem;
    }
    .viewer-subtitle {
      text-align: center;
      color: var(--color-text-muted);
      font-size: 0.9rem;
      margin-bottom: 1.5rem;
    }
    .features-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
      max-width: var(--max-width);
      margin: 0 auto;
      padding: 0 1.5rem 3rem;
    }
    .features-heading {
      text-align: center;
      color: var(--color-text-bright);
      margin: 2rem 0 1.5rem;
      font-size: 1.5rem;
    }
  `;

  render() {
    return html`
      <section class="hero">
        <h1><span>ACH</span> Language Support</h1>
        <p class="tagline">IDE-like intelligence for NACHA ACH files. Real-time validation, smart completions, hover documentation, formatting, and more.</p>
        <a class="install-badge" href="https://marketplace.visualstudio.com/" target="_blank" rel="noopener">Install from VS Code Marketplace</a>
      </section>

      <section class="viewer-section">
        <h2>Interactive ACH Viewer</h2>
        <p class="viewer-subtitle">Click any field to see its documentation. Try pasting your own ACH file.</p>
        <ach-viewer></ach-viewer>
      </section>

      <h2 class="features-heading">Features</h2>
      <div class="features-grid">
        <feature-card icon="🔍" heading="Real-time Validation" description="Validates check digits, entry hashes, debit/credit totals, record counts, and field formats as you type."></feature-card>
        <feature-card icon="💡" heading="Smart Completions" description="Context-aware suggestions for record templates, SEC codes, transaction codes, service class codes, and addenda types."></feature-card>
        <feature-card icon="📖" heading="Hover Documentation" description="Hover over any field to see its name, description, format, and contextual info like formatted amounts and routing validation."></feature-card>
        <feature-card icon="📐" heading="Formatting" description="Format entire ACH files to standard 94-character width with proper field alignment."></feature-card>
        <feature-card icon="🔧" heading="Code Actions" description="Quick fixes: correct check digits, pad lines to 94 characters, and set record size fields."></feature-card>
        <feature-card icon="📁" heading="Code Folding" description="Collapse batches and entry+addenda groups for easier navigation of large files."></feature-card>
        <feature-card icon="🎨" heading="Semantic Highlighting" description="8 distinct token types color-code record types, amounts, names, routing numbers, dates, and codes."></feature-card>
        <feature-card icon="🗂️" heading="Document Symbols" description="Hierarchical outline showing file structure with batches, entries, and addenda."></feature-card>
        <feature-card icon="🌲" heading="ACH Explorer" description="Sidebar tree view for navigating file structure with click-to-jump."></feature-card>
      </div>
    `;
  }
}
