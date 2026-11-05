import { StreamLanguage } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import type { Extension } from '@codemirror/state';

/** Control flow, declarations and modifiers that read as keywords. */
const KEYWORDS = new Set([
  'and',
  'break',
  'by',
  'continue',
  'else',
  'enum',
  'export',
  'for',
  'if',
  'import',
  'in',
  'method',
  'not',
  'or',
  'return',
  'switch',
  'to',
  'type',
  'var',
  'varip',
  'while',
]);

const LITERALS = new Set(['true', 'false', 'na']);

const TYPE_NAMES = new Set([
  'array',
  'bool',
  'box',
  'chart.point',
  'color',
  'const',
  'float',
  'input',
  'int',
  'label',
  'line',
  'linefill',
  'map',
  'matrix',
  'polyline',
  'series',
  'simple',
  'string',
  'table',
]);

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*/;
const NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/;
const HEX_COLOR = /^#[0-9a-fA-F]{6,8}\b/;

/** Namespaces that only read differently when a member follows the dot. */
const NAMESPACES = new Set([
  'alert',
  'array',
  'barmerge',
  'barstate',
  'box',
  'chart',
  'color',
  'currency',
  'display',
  'format',
  'input',
  'label',
  'line',
  'linefill',
  'log',
  'map',
  'math',
  'matrix',
  'plot',
  'polyline',
  'request',
  'runtime',
  'scale',
  'session',
  'shape',
  'str',
  'strategy',
  'syminfo',
  'table',
  'ta',
  'text',
  'ticker',
  'timeframe',
]);

export interface PineToken {
  type: string | null;
  text: string;
}

/**
 * Tokenize one Pine line. Exported so the tokenizer can be tested without a
 * CodeMirror editor; the stream parser below is a thin wrapper around it.
 */
export function pineTokens(line: string, start = 0): PineToken[] {
  const tokens: PineToken[] = [];
  let position = start;

  const push = (type: string | null, text: string) => {
    if (text) tokens.push({ type, text });
    position += text.length;
  };

  while (position < line.length) {
    const rest = line.slice(position);
    const char = rest[0]!;

    if (/\s/.test(char)) {
      const match = /^\s+/.exec(rest)!;
      push(null, match[0]);
      continue;
    }

    if (rest.startsWith('//')) {
      push('comment', rest);
      continue;
    }

    if (char === '"' || char === "'") {
      const match = new RegExp(`^${char}(?:\\\\.|[^${char}\\\\])*${char}?`).exec(rest)!;
      push('string', match[0]);
      continue;
    }

    if (char === '#') {
      const match = HEX_COLOR.exec(rest);
      if (match) {
        push('color', match[0]);
        continue;
      }
    }

    if (/[0-9]/.test(char) || (char === '.' && /[0-9]/.test(rest[1] ?? ''))) {
      push('number', NUMBER.exec(rest)![0]);
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      const text = IDENTIFIER.exec(rest)![0];
      const after = line.slice(position + text.length);
      if (LITERALS.has(text)) push('bool', text);
      else if (KEYWORDS.has(text)) push('keyword', text);
      else if (NAMESPACES.has(text) && /^\s*\./.test(after)) push('namespace', text);
      else if (TYPE_NAMES.has(text)) push('typeName', text);
      else if (/^\s*\(/.test(after)) push('function', text);
      else if (/^[A-Z][A-Z0-9_]*$/.test(text)) push('constant', text);
      else push('variableName', text);
      continue;
    }

    if (/[+\-*/%=<>!?:&|^~]/.test(char)) {
      push('operator', /^[+\-*/%=<>!?:&|^~]+/.exec(rest)![0]);
      continue;
    }

    if (/[()[\]{},.;]/.test(char)) {
      push('punctuation', char);
      continue;
    }

    push(null, char);
  }

  return tokens;
}

const TOKEN_TABLE = {
  keyword: tags.keyword,
  bool: tags.bool,
  string: tags.string,
  number: tags.number,
  color: tags.color,
  comment: tags.lineComment,
  function: tags.function(tags.variableName),
  variableName: tags.variableName,
  namespace: tags.namespace,
  constant: tags.constant(tags.variableName),
  typeName: tags.typeName,
  operator: tags.operator,
  punctuation: tags.punctuation,
};

export const pineStreamParser = {
  name: 'pine',
  token(stream: { string: string; pos: number; start: number; next: () => void }) {
    const rest = stream.string.slice(stream.pos);

    if (/^\s+/.test(rest)) {
      const match = /^\s+/.exec(rest)![0];
      for (let index = 0; index < match.length; index += 1) stream.next();
      return null;
    }

    if (rest.startsWith('//')) {
      while (stream.pos < stream.string.length) stream.next();
      return 'comment';
    }

    const tokens = pineTokens(stream.string, stream.pos);
    const first = tokens[0];
    if (!first) {
      stream.next();
      return null;
    }
    for (let index = 0; index < first.text.length; index += 1) stream.next();
    return first.type;
  },
  tokenTable: TOKEN_TABLE,
  languageData: {
    commentTokens: { line: '//' },
    closeBrackets: { brackets: ['(', '[', '{', '"', "'"] },
    indentOnInput: /^\s*(?:else|for|while|if)\b/,
  },
};

/** The Pine v6 language for CodeMirror. */
export function pineLanguage(): Extension {
  return StreamLanguage.define(pineStreamParser as Parameters<typeof StreamLanguage.define>[0]);
}
