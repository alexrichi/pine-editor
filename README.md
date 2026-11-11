# pine-editor

Pine Script v6 language data: a line tokenizer, completions and diagnostics,
independent of any editor.

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

Hosts map tokens to their own scopes, completions to their own suggestion list
and findings to their own markers. The app does this in
`src/lib/monaco/pine.ts`.

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
