// Vite injects `import.meta.env.BASE_URL` at build time from the `base` config.
// In dev it's '/ach-lsp/', in prod it matches the configured base path.
// Ensure it always ends with '/'.
export const BASE_PATH = import.meta.env.BASE_URL.endsWith('/')
  ? import.meta.env.BASE_URL
  : import.meta.env.BASE_URL + '/';

/** Strip the base path prefix from a full pathname, returning the app-relative path (e.g. '/features') */
export function stripBase(pathname: string): string {
  if (pathname.startsWith(BASE_PATH)) {
    const rel = pathname.slice(BASE_PATH.length - 1); // keep leading '/'
    return rel || '/';
  }
  return pathname;
}
