# pine-editor

Pine Script v6 language data and the Monaco editor that renders it.

The base entry is editor-agnostic: a line tokenizer, completions and
diagnostics. Hosts map tokens to their own scopes, completions to their own
suggestion list and findings to their own markers.

```ts
import {
  pineTokens,
  pineCompletionOptions,
  lintPineScript,
  lintPineSource,
} from '@screener/pine-editor';

const tokens = pineTokens('rsi = ta.rsi(close, 14)');
const completions = await pineCompletionOptions();
const findings = await lintPineScript(source); // MIT validator + local v6 rules
const localOnly = lintPineSource(source);
```

`@screener/pine-editor/monaco` registers the language, theme, worker, lint and
editor features (hover, definition, formatter, signature help, semantic tokens
and outline) on Monaco. `@screener/pine-editor/monaco/react` is the ready-made
`PineEditor` component. It keeps one Monaco model per tab, so each tab has its
own undo stack, cursor and scroll. It takes `value`, `tabId`, `tabIds`, `theme:
'dark' | 'light'` and change, save and command callbacks.

```tsx
import { PineEditor } from '@screener/pine-editor/monaco/react';

<PineEditor
  value={source}
  tabId={activeTabId}
  tabIds={tabs.map((tab) => tab.id)}
  theme="dark"
  onChange={setSource}
  onSave={save}
/>;
```

`monaco-editor` and `react` are optional peers: the base entry never imports
either, and the Monaco entries load lazily with the host's editor chunk.

## Data source

Completions and diagnostics come from
[`pinescript-v6-validator`](https://www.npmjs.com/package/pinescript-v6-validator)
(MIT): 475 built-in signatures plus a v6 validator. Only names and signatures
reach the UI; the dataset's prose descriptions are not shown.

The validator and signature table load on first use through a dynamic import, so
opening the app does not pay for them.

## Why a line tokenizer

Pine is line-oriented (statements may wrap inside brackets, strings are
single-line), so a line tokenizer covers the language and stays a few hundred
lines.

## Tests

```bash
npm install
npm run typecheck
npm test
```

## License

MIT. See `LICENSE`.
