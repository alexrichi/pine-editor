import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags as t } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

/**
 * Colors for the Pine grammar. The caller passes the app palette so the editor
 * follows the same tokens as the rest of the UI instead of importing them.
 */
export interface PinePalette {
  keyword: string;
  string: string;
  number: string;
  comment: string;
  function: string;
  variable: string;
  type: string;
  constant: string;
  operator: string;
  punctuation: string;
  invalid: string;
}

export function pineHighlightStyle(palette: PinePalette): HighlightStyle {
  return HighlightStyle.define([
    { tag: t.keyword, color: palette.keyword, fontWeight: '600' },
    { tag: t.bool, color: palette.constant },
    { tag: t.string, color: palette.string },
    { tag: t.number, color: palette.number },
    { tag: t.color, color: palette.number },
    { tag: t.lineComment, color: palette.comment, fontStyle: 'italic' },
    { tag: t.function(t.variableName), color: palette.function },
    { tag: t.namespace, color: palette.type },
    { tag: t.variableName, color: palette.variable },
    { tag: t.typeName, color: palette.type },
    { tag: t.constant(t.variableName), color: palette.constant },
    { tag: t.operator, color: palette.operator },
    { tag: t.punctuation, color: palette.punctuation },
    { tag: t.invalid, color: palette.invalid },
  ]);
}

export function pineHighlighting(palette: PinePalette): Extension {
  return syntaxHighlighting(pineHighlightStyle(palette));
}
