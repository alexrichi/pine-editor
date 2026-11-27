# Vendored Pine syntax highlighter core

MIT-licensed code copied from
[`pine-script-syntax-highlighter`](https://github.com/yankikucuk/pine-script-syntax-highlighter)
version 3.4.0, commit `4b4f372`. The original `LICENSE` sits next to this file.

Only the editor-agnostic core the Monaco bindings use is vendored:

- `core/tokenizer.ts`
- `core/document-model.ts`
- `core/formatter.ts`
- `core/semantic.ts`
- `core/call-resolver.ts`
- `core/symbols.ts`
- `core/reference.ts`
- `data/reference.json` (the lazy hover reference)

The files are copied verbatim except for one import path: `core/reference.ts`
loads `../data/reference.json` instead of the upstream `../../data/reference.json`.
To update, copy the same files from the upstream `src/extension/core` and
`src/data/reference.json`, then reapply that path.
