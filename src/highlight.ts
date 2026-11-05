import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { EditorView } from '@codemirror/view';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

/**
 * Colors for the Pine grammar. Defaults read the host's `--pine-*` custom
 * properties, so a theme switch needs no re-render; pass explicit colors when
 * the host has no such tokens.
 */
export interface PinePalette {
  keyword: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  variable: string;
  type: string;
  namespace: string;
  constant: string;
  operator: string;
  punctuation: string;
  invalid: string;
}

const DEFAULT_PALETTE: PinePalette = {
  keyword: 'var(--pine-keyword, #7592ff)',
  string: 'var(--pine-string, #34d399)',
  number: 'var(--pine-number, #f0b90b)',
  comment: 'var(--pine-comment, #6b7280)',
  function: 'var(--pine-function, #c2d6ff)',
  variable: 'var(--pine-variable, #f3f4f6)',
  type: 'var(--pine-atom, #c2d6ff)',
  namespace: 'var(--pine-namespace, #9cb9ff)',
  constant: 'var(--pine-atom, #c2d6ff)',
  operator: 'var(--pine-operator, #9ca3af)',
  punctuation: 'var(--pine-punctuation, #9ca3af)',
  invalid: 'var(--pine-invalid, #f23645)',
};

export function pineHighlightStyle(palette: Partial<PinePalette> = {}): HighlightStyle {
  const colors = { ...DEFAULT_PALETTE, ...palette };
  return HighlightStyle.define([
    { tag: t.keyword, color: colors.keyword },
    { tag: [t.bool, t.null], color: colors.constant },
    { tag: t.string, color: colors.string },
    { tag: [t.number, t.color], color: colors.number },
    { tag: t.lineComment, color: colors.comment, fontStyle: 'italic' },
    { tag: t.function(t.variableName), color: colors.function },
    { tag: t.namespace, color: colors.namespace },
    { tag: t.variableName, color: colors.variable },
    { tag: t.typeName, color: colors.type },
    { tag: t.constant(t.variableName), color: colors.constant },
    { tag: t.operator, color: colors.operator },
    { tag: t.punctuation, color: colors.punctuation },
    { tag: t.invalid, color: colors.invalid },
  ]);
}

/** Editor chrome: background, gutter, caret, selection and tooltips. */
export const pineEditorTheme = EditorView.theme({
  '&': {
    height: '100%',
    color: 'var(--pine-fg, #f3f4f6)',
    backgroundColor: 'var(--pine-bg, #030712)',
    fontSize: '12px',
  },
  '.cm-scroller': {
    fontFamily: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
    lineHeight: '1.55',
    overflow: 'auto',
  },
  '.cm-content': {
    padding: '8px 0',
    caretColor: 'var(--pine-caret, #465fff)',
  },
  '.cm-gutters': {
    backgroundColor: 'var(--pine-gutter-bg, #0b1220)',
    color: 'var(--pine-gutter, #64748b)',
    border: 'none',
  },
  '.cm-activeLine': {
    backgroundColor: 'var(--pine-active-line, rgba(255, 255, 255, 0.03))',
  },
  '.cm-activeLineGutter': {
    backgroundColor: 'var(--pine-active-line, rgba(255, 255, 255, 0.03))',
    color: 'var(--pine-fg, #f3f4f6)',
  },
  '.cm-selectionBackground, &.cm-focused .cm-selectionBackground': {
    backgroundColor: 'var(--pine-selection, rgba(70, 95, 255, 0.28))',
  },
  '.cm-cursor': {
    borderLeftColor: 'var(--pine-caret, #465fff)',
  },
  '.cm-tooltip': {
    backgroundColor: 'var(--pine-tooltip-bg, #0f172a)',
    border: '1px solid var(--pine-tooltip-border, #1f2937)',
    color: 'var(--pine-fg, #f3f4f6)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--pine-selection, rgba(70, 95, 255, 0.28))',
    color: 'var(--pine-fg, #f3f4f6)',
  },
  '.cm-diagnostic-error': {
    borderLeftColor: 'var(--pine-invalid, #f23645)',
  },
});

/** Chrome plus syntax colors, in one extension list. */
export function pineThemeExtensions(palette?: Partial<PinePalette>): Extension[] {
  return [pineEditorTheme, syntaxHighlighting(pineHighlightStyle(palette))];
}
