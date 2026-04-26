import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('feature-card')
export class FeatureCard extends LitElement {
  @property() icon = '';
  @property() heading = '';
  @property() description = '';

  static styles = css`
    :host { display: block; }
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 1.5rem;
      height: 100%;
      transition: border-color 0.15s, transform 0.15s;
    }
    .card:hover {
      border-color: var(--color-accent);
      transform: translateY(-2px);
    }
    .icon { font-size: 1.75rem; margin-bottom: 0.75rem; }
    h3 { color: var(--color-text-bright); margin-bottom: 0.5rem; font-size: 1rem; }
    p { color: var(--color-text-muted); font-size: 0.875rem; line-height: 1.5; }
  `;

  render() {
    return html`
      <div class="card">
        <div class="icon">${this.icon}</div>
        <h3>${this.heading}</h3>
        <p>${this.description}</p>
      </div>
    `;
  }
}
