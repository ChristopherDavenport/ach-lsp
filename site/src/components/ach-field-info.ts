import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { getFormattedValue } from '../utils/field-enrichment.js';

interface FieldInfo {
  name: string;
  label: string;
  description: string;
  format?: string;
  value: string;
  start: number;
  end: number;
  contextual: string | null;
}

@customElement('ach-field-info')
export class AchFieldInfo extends LitElement {
  @property({ type: Object }) field: FieldInfo | null = null;

  static styles = css`
    :host { display: block; }
    .info {
      padding: 1.25rem;
      font-size: 0.85rem;
      line-height: 1.6;
    }
    .field-name {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-text-bright);
      margin-bottom: 0.75rem;
    }
    .camel-name {
      font-family: var(--font-mono);
      font-size: 0.75rem;
      color: var(--color-text-muted);
      font-weight: 400;
      display: block;
      margin-top: 0.2rem;
    }
    .row {
      margin-bottom: 0.6rem;
    }
    .label {
      color: var(--color-text-muted);
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.15rem;
    }
    .value {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      background: var(--color-bg);
      padding: 0.25rem 0.5rem;
      border-radius: 3px;
      display: inline-block;
      word-break: break-all;
    }
    .description {
      color: var(--color-text);
    }
    .contextual {
      margin-top: 0.75rem;
      padding: 0.6rem 0.75rem;
      background: var(--color-bg);
      border-radius: 6px;
      border-left: 3px solid var(--color-accent);
      font-size: 0.82rem;
    }
    .columns {
      color: var(--color-text-muted);
      font-family: var(--font-mono);
      font-size: 0.78rem;
    }
    .formatted {
      font-size: 1.1rem;
      font-weight: 600;
      color: var(--color-accent);
      padding: 0.3rem 0;
    }
  `;

  render() {
    const f = this.field;
    if (!f) return nothing;

    return html`
      <div class="info">
        <div class="field-name">
          ${f.label}
          <span class="camel-name">${f.name}</span>
        </div>

        <div class="row">
          <div class="label">Description</div>
          <div class="description">${f.description}</div>
        </div>

        ${f.format ? html`
          <div class="row">
            <div class="label">Format</div>
            <div class="value">${f.format}</div>
          </div>
        ` : nothing}

        <div class="row">
          <div class="label">Value</div>
          <div class="value">${f.value}</div>
          ${(() => { const fmt = getFormattedValue(f.name, f.value, f.format); return fmt ? html`<div class="formatted">${fmt}</div>` : nothing; })()}
        </div>

        <div class="row">
          <div class="label">Columns</div>
          <div class="columns">${f.start}–${f.end - 1}</div>
        </div>

        ${f.contextual ? html`
          <div class="contextual">${f.contextual}</div>
        ` : nothing}
      </div>
    `;
  }
}
