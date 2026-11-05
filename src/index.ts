/**
 * Pine v6 language support for CodeMirror: highlighting, completions and
 * diagnostics.
 *
 * The theme reads the host's `--pine-*` custom properties, so switching themes
 * needs no editor rebuild. Pass a palette to `pineThemeExtensions` when the host
 * has no such tokens.
 */
export { pineLanguage, pineTokens, pineStreamParser, type PineToken } from './language';
export {
  pineHighlightStyle,
  pineEditorTheme,
  pineThemeExtensions,
  type PinePalette,
} from './highlight';
export { pineCompletions, pineCompletionOptions } from './complete';
export { pineLinter, toDiagnostics } from './lint';
