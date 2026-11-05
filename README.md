# pine-editor

Pine Script v6 language support for CodeMirror 6: highlighting, completions and
diagnostics.

```ts
import { pineLanguage, pineHighlighting, pineCompletions, pineLinter } from '@screener/pine-editor';

const extensions = [
  pineLanguage(),
  pineHighlighting(palette),
  autocompletion({ override: [pineCompletions] }),
  pineLinter(),
];
```

`pineHighlighting` takes a palette so the editor follows the host app's theme
instead of importing its tokens.

## Data source

Completions and diagnostics come from
[`pinescript-v6-validator`](https://www.npmjs.com/package/pinescript-v6-validator)
(MIT): 475 built-in signatures plus a v6 validator. Only names and signatures
reach the UI; the dataset's prose descriptions are not shown.

The validator and signature table load on first use through a dynamic import, so
opening the app does not pay for them.

## Why a stream parser

TextMate grammars need a regex engine that CodeMirror does not ship. Pine is
line-oriented (statements may wrap inside brackets, strings are single-line), so
a stream tokenizer covers the language and stays a few hundred lines.

## Tests

```bash
npm install
npm run typecheck
npm test
```

## License

MIT. See `LICENSE`.
