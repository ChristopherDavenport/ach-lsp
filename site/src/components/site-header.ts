import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { BASE_PATH } from '../base-path.js';

@customElement('site-header')
export class SiteHeader extends LitElement {
  @property({ type: String }) currentPath = '/';

  static styles = css`
    :host { display: block; }
    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0.75rem 1.5rem;
      background: var(--color-surface);
      border-bottom: 1px solid var(--color-border);
      position: sticky;
      top: 0;
      z-index: 100;
    }
    .logo {
      font-size: 1.1rem;
      font-weight: 700;
      color: var(--color-accent);
      text-decoration: none;
    }
    .logo span { color: var(--color-text-muted); font-weight: 400; }
    nav { display: flex; gap: 0.25rem; align-items: center; }
    a {
      color: var(--color-text);
      text-decoration: none;
      padding: 0.4rem 0.75rem;
      border-radius: 4px;
      font-size: 0.875rem;
      transition: background 0.15s;
    }
    a:hover { background: var(--color-surface-hover); color: var(--color-text-bright); }
    a[data-active] { color: var(--color-accent); background: var(--color-surface-hover); }
    .hamburger {
      display: none;
      background: none;
      border: 1px solid var(--color-border);
      color: var(--color-text);
      cursor: pointer;
      padding: 0.3rem 0.6rem;
      border-radius: 4px;
      font-size: 1.2rem;
    }
    @media (max-width: 768px) {
      .hamburger { display: block; }
      nav { display: none; flex-direction: column; position: absolute; top: 100%; left: 0; right: 0; background: var(--color-surface); border-bottom: 1px solid var(--color-border); padding: 0.5rem; }
      nav.open { display: flex; }
      nav a { padding: 0.6rem 1rem; }
    }
  `;

  private _menuOpen = false;

  private _toggleMenu() {
    this._menuOpen = !this._menuOpen;
    this.requestUpdate();
  }

  private _isActive(path: string): boolean {
    if (path === '/') return this.currentPath === '/' || this.currentPath === '';
    return this.currentPath.startsWith(path);
  }

  render() {
    return html`
      <header>
        <a class="logo" href="${BASE_PATH}">ACH <span>Language Support</span></a>
        <button class="hamburger" @click=${this._toggleMenu}>☰</button>
        <nav class=${this._menuOpen ? 'open' : ''}>
          <a href="${BASE_PATH}" ?data-active=${this._isActive('/')} @click=${() => this._menuOpen = false}>Home</a>
          <a href="${BASE_PATH}features" ?data-active=${this._isActive('/features')} @click=${() => this._menuOpen = false}>Features</a>
          <a href="${BASE_PATH}format" ?data-active=${this._isActive('/format')} @click=${() => this._menuOpen = false}>ACH Format</a>
          <a href="${BASE_PATH}codes" ?data-active=${this._isActive('/codes')} @click=${() => this._menuOpen = false}>Codes</a>
          <a href="${BASE_PATH}config" ?data-active=${this._isActive('/config')} @click=${() => this._menuOpen = false}>Config</a>
        </nav>
      </header>
    `;
  }
}
