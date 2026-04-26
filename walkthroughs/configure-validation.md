# Configure Validation

The extension validates your ACH file using the `ach-ts` library and reports errors in the **Problems** panel.

## Validation Settings

Search for `ach.validation` in Settings to see all available toggles. Common settings:

| Setting | Description |
|---------|------------|
| `skipAll` | Disable all validation |
| `allowZeroBatches` | Allow files with no batches |
| `allowInvalidCheckDigit` | Skip routing number check digit validation |
| `unequalServiceClassCode` | Allow mismatched service class codes |
| `preserveSpaces` | Retain trailing whitespace during parsing |
| `bypassBatchValidation` | Skip all batch-level validation |

## Quick Fixes

When the extension detects errors, look for the **lightbulb icon** — quick fixes can automatically:

- Recalculate check digits
- Fix batch and file control totals
- Correct service class codes
- Set dates to today
- Pad short lines to 94 characters
