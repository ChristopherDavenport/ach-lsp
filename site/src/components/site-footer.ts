import { LitElement, html, css } from 'lit';
import { customElement } from 'lit/decorators.js';

@customElement('site-footer')
export class SiteFooter extends LitElement {
  static styles = css`
    :host { display: block; }
    footer {
      text-align: center;
      padding: 2rem 1.5rem;
      border-top: 1px solid var(--color-border);
      color: var(--color-text-muted);
      font-size: 0.85rem;
    }
    a { color: var(--color-accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
  `;

  render() {
    return html`
      <footer>
        <p>ACH Language Support — MIT License</p>
        <p><a href="https://github.com/christopherdavenport/ach-lsp" target="_blank" rel="noopener">GitHub</a></p>
      </footer>
    `;
  }
}
