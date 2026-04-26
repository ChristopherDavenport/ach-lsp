# Open an ACH File

ACH (Automated Clearing House) files use a fixed-width format where every line is exactly **94 characters**.

Open any `.ach` file and the extension activates automatically — you'll see:

- **Syntax highlighting** for record types, fields, and padding
- **Diagnostics** flagging validation errors
- **Field separators** with alternating background colors
- **Inlay hints** showing field names at your cursor position

Files starting with `101` on the first line are also auto-detected as ACH.
