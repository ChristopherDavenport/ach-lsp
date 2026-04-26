# AGENTS.md

VS Code extension + Language Server for NACHA ACH files (fixed-width, 94-character-per-line format for US electronic banking transactions). Monorepo with 4 packages.

## Architecture

```
client/    VS Code extension client — LSP client, tree view, preview webview, field decorations, field navigation
server/    Language server — hover, completion, diagnostics, formatting, code actions, symbols, folding, semantic tokens, inlay hints
shared/    Shared types (TreeNode, LineBoundaries) and ACH domain constants (SEC codes, transaction codes, field descriptions with column ranges)
site/      Documentation website (Lit + Vite SPA) — not part of the extension bundle
```

## Build & Test

```bash
npm install           # triggers postinstall → installs client/ and server/ deps
npm run compile       # esbuild bundles 3 targets (see Bundling below)
npm run watch         # dev watch mode with source maps
npm test              # vitest in server/ (formatting.test.ts)
npm run lint          # ESLint on client/src and server/src
npm run package       # create .vsix via @vscode/vsce
```

## Key Dependency: `ach-ts`

The `ach-ts` library (in server/package.json) provides the core ACH parsing and writing engine:

- `Reader` — parse ACH text into a `File` object (batches → entries → addenda)
- `Writer` — serialize a `File` back to fixed-width text
- `File`, `Batcher`, `EntryDetail`, `IATBatch` — data model types
- `recordTypeToFieldSpecs` — field position maps for all record types (used by hover, semantic tokens, diagnostics)
- `ValidateOpts` — 20+ validation toggle flags (mapped 1:1 to `ach.validation.*` settings in package.json)
- `CalculateCheckDigit`, `CheckRoutingNumber` — routing number utilities (used by code actions and hover)

## Server Modules (`server/src/`)

| File | Purpose |
|---|---|
| `server.ts` | LSP connection setup, capability registration, handler wiring, configuration sync |
| `achDocument.ts` | Document parse cache with 200ms debounce; `parseDocument()` / `parseDocumentImmediate()` |
| `achFieldUtils.ts` | Maps addenda type codes (02, 05, 10–18, 98, 99) to `ach-ts` field specifications |
| `codeActions.ts` | Quick fixes: recalculate check digits, pad lines to 94 chars, set record size |
| `completion.ts` | Record type templates, SEC codes, transaction codes, service class codes, addenda types |
| `diagnostics.ts` | Converts `ach-ts` parse/validation errors to LSP Diagnostics; narrows ranges to specific fields |
| `documentSymbols.ts` | Hierarchical outline (file header → batches → entries → addenda) with fallback text parsing |
| `fieldBoundaries.ts` | Returns `LineBoundaries[]` (column positions where fields end) for client decorations |
| `fileStructure.ts` | Returns `TreeNode[]` hierarchy for tree view and preview panel; fallback text parsing |
| `folding.ts` | Fold ranges for batches (header→control) and entries with addenda; fallback text parsing |
| `formatting.ts` | Document formatting via `ach-ts` Writer; sets `bypassValidation` on parse errors |
| `hover.ts` | Field metadata markdown: label, description, format, columns, value, contextual info |
| `inlayHints.ts` | Cursor-position-aware field label hints; supports multi-cursor via client request |
| `semanticTokens.ts` | 8 token types with per-field overrides to prevent adjacent same-color streaks |
| `formatting.test.ts` | Vitest tests for formatting (valid files, partial parses, null file, Writer exceptions) |

## Client Modules (`client/src/`)

| File | Purpose |
|---|---|
| `extension.ts` | Extension activation: LSP client (IPC transport, debug port 6009), tree view, preview panel, decorations, navigation commands |
| `achPreview.ts` | Singleton webview panel: sends document content + diagnostics, receives edits; nonce-based CSP |
| `achTreeView.ts` | `TreeDataProvider` for `achExplorer` view; requests `ach/getFileStructure`; click-to-reveal |
| `fieldDecorations.ts` | Zebra-striped field backgrounds; requests `ach/getFieldBoundaries`; 150ms debounce |
| `fieldNavigation.ts` | 8 arrow-key commands for field/section navigation with selection support; per-URI boundary cache |
| `webview/` | Lit web components for the preview panel: `ach-structured-viewer` (view/edit/search/diff), `ach-field-info`, `field-enrichment` |

## Custom LSP Requests

Three non-standard requests beyond the LSP spec, used for UI features:

| Request | Params | Returns | Used by |
|---|---|---|---|
| `ach/getFileStructure` | `{ uri }` | `TreeNode[]` | Tree view, preview panel |
| `ach/getFieldBoundaries` | `{ uri }` | `LineBoundaries[]` | Field decorations |
| `ach/getInlayHints` | `{ uri, cursors[] }` | Inlay hint data | Multi-cursor inlay hints |

## Conventions

- **Fixed-width format** — every ACH record is exactly 94 characters; column positions are absolute
- **Record types** — single-digit code at column 1: `1` file header, `5` batch header, `6` entry detail, `7` addenda, `8` batch control, `9` file control/padding
- **Debouncing** — document parsing: 200ms; field decorations: 150ms
- **Singleton pattern** — `AchPreviewPanel` uses a static instance; only one preview panel at a time
- **Parse cache** — `achDocument.ts` caches parsed results per document URI
- **Fallback text parsing** — document symbols, folding, and file structure all have regex-based fallbacks when `ach-ts` parsing fails (partial/malformed files)
- **Domain constants** — `shared/src/achConstants.ts` contains all SEC codes, transaction codes, service class codes, addenda type codes, record type descriptions, and per-field descriptions with column ranges. This is the source of truth for ACH domain knowledge used across client, server, and site.
- **Shared types** — `shared/src/types.ts` defines `TreeNode` (tree view data) and `LineBoundaries` (field boundary columns)

## Bundling

`esbuild.mjs` produces 3 bundles:

| Bundle | Platform | Format | Entry | Output |
|---|---|---|---|---|
| Client extension | Node | CJS | `client/src/extension.ts` | `client/out/extension.js` |
| Language server | Node | CJS | `server/src/server.ts` | `server/out/server.js` |
| Webview | Browser | IIFE | `client/src/webview/index.ts` | `client/out/webview.js` |

Production builds are minified. Watch mode includes source maps. Target: ES2022.

## Testing

Tests use vitest. The test file is `server/src/formatting.test.ts`. Run with `npm test` from the root (delegates to `cd server && npm test`).
