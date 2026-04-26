import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('screenshot-placeholder')
export class ScreenshotPlaceholder extends LitElement {
  @property() label = 'Screenshot coming soon';
  @property() aspect = '16/9';

  static styles = css`
    :host { display: block; }
    .placeholder {
      aspect-ratio: var(--aspect);
      background: var(--color-surface);
      border: 2px dashed var(--color-border);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-direction: column;
      gap: 0.5rem;
      color: var(--color-text-muted);
      font-size: 0.9rem;
      padding: 1.5rem;
      text-align: center;
    }
    .icon { font-size: 2rem; }
  `;

  render() {
    return html`
      <div class="placeholder" style="--aspect: ${this.aspect}">
        <span class="icon">📸</span>
        <span>${this.label}</span>
      </div>
    `;
  }
}
