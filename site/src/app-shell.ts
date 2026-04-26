import { LitElement, html, css } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { Router } from '@lit-labs/router';
import { BASE_PATH, stripBase } from './base-path.js';
import './components/site-header.js';
import './components/site-footer.js';

@customElement('app-shell')
export class AppShell extends LitElement {
  private _router = new Router(this, [
    {
      path: `${BASE_PATH}`,
      render: () => {
        import('./pages/page-home.js');
        return html`<page-home></page-home>`;
      },
    },
    {
      path: `${BASE_PATH}features`,
      render: () => {
        import('./pages/page-features.js');
        return html`<page-features></page-features>`;
      },
    },
    {
      path: `${BASE_PATH}format`,
      render: () => {
        import('./pages/page-format.js');
        return html`<page-format></page-format>`;
      },
    },
    {
      path: `${BASE_PATH}codes`,
      render: () => {
        import('./pages/page-codes.js');
        return html`<page-codes></page-codes>`;
      },
    },
    {
      path: `${BASE_PATH}config`,
      render: () => {
        import('./pages/page-config.js');
        return html`<page-config></page-config>`;
      },
    },
  ]);

  @state() private _currentPath = stripBase(window.location.pathname);

  static styles = css`
    :host { display: block; min-height: 100vh; display: flex; flex-direction: column; }
    main { flex: 1; }
  `;

  connectedCallback() {
    super.connectedCallback();
    // Track navigation
    window.addEventListener('popstate', () => {
      this._currentPath = stripBase(window.location.pathname);
    });
    // Intercept link clicks for SPA navigation
    this.addEventListener('click', (e: Event) => {
      const anchor = (e.target as HTMLElement).closest?.('a');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('http') || href.startsWith('//')) return;
      e.preventDefault();
      const fullHref = href.startsWith(BASE_PATH) ? href : BASE_PATH + href.replace(/^\//, '');
      if (fullHref !== window.location.pathname) {
        window.history.pushState({}, '', fullHref);
        this._currentPath = stripBase(fullHref);
        this._router.goto(fullHref);
        window.scrollTo(0, 0);
      }
    });
  }

  render() {
    return html`
      <site-header .currentPath=${this._currentPath}></site-header>
      <main>${this._router.outlet()}</main>
      <site-footer></site-footer>
    `;
  }
}
