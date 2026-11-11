/** Control flow, declarations and modifiers that read as keywords. */
const KEYWORDS = new Set([
  'and',
  'as',
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
  'once',
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
  'footprint',
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
  'volume_row',
]);

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*/;
const NUMBER = /^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/;
const HEX_COLOR = /^#[0-9a-fA-F]{6,8}\b/;

/** Compiler annotations that read as metadata inside a line comment. */
const ANNOTATIONS = new Set([
  '@description',
  '@enum',
  '@field',
  '@function',
  '@param',
  '@returns',
  '@strategy_alert_message',
  '@type',
  '@variable',
  '@version',
]);

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
 * Tokenize one Pine line. Exported so the tokenizer can be tested without an
 * editor and mapped onto any host's token names.
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
      for (const token of commentTokens(rest)) push(token.type, token.text);
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

function commentTokens(comment: string): PineToken[] {
  const match = /^(\/\/)(@[A-Za-z_]+)/.exec(comment);
  if (!match || !ANNOTATIONS.has(match[2]!)) return [{ type: 'comment', text: comment }];
  const tokens: PineToken[] = [
    { type: 'comment', text: match[1]! },
    { type: 'annotation', text: match[2]! },
  ];
  if (comment.length > match[0].length) {
    tokens.push({ type: 'comment', text: comment.slice(match[0].length) });
  }
  return tokens;
}

const TRIPLE_QUOTES = ['"""', "'''"] as const;
export type PineTripleQuote = (typeof TRIPLE_QUOTES)[number];

export interface PineTokenState {
  triple: PineTripleQuote | null;
}

export const PINE_INITIAL_STATE: PineTokenState = { triple: null };

/** Find a triple-quoted string start outside a normal string or comment. */
function findTripleStart(line: string): { index: number; quote: PineTripleQuote } | null {
  let index = 0;
  while (index < line.length) {
    const rest = line.slice(index);
    if (rest.startsWith('//')) return null;
    const char = line[index];
    if (char === '"' || char === "'") {
      if (line.slice(index, index + 3) === char.repeat(3)) {
        return { index, quote: char.repeat(3) as PineTripleQuote };
      }
      index += 1;
      while (index < line.length) {
        if (line[index] === '\\') {
          index += 2;
          continue;
        }
        if (line[index] === char) {
          index += 1;
          break;
        }
        index += 1;
      }
      continue;
    }
    index += 1;
  }
  return null;
}

/**
 * Tokenize one line with the line state Pine needs for triple-quoted strings.
 * `pineTokens` stays a pure single-line tokenizer for tests and short snippets.
 */
export function tokenizePineLine(
  line: string,
  state: PineTokenState,
): { tokens: PineToken[]; state: PineTokenState } {
  if (state.triple) {
    const close = line.indexOf(state.triple);
    if (close === -1) {
      return { tokens: line ? [{ type: 'string', text: line }] : [], state };
    }
    const end = close + state.triple.length;
    return {
      tokens: [{ type: 'string', text: line.slice(0, end) }, ...pineTokens(line, end)],
      state: PINE_INITIAL_STATE,
    };
  }

  const triple = findTripleStart(line);
  if (!triple) {
    return { tokens: pineTokens(line), state: PINE_INITIAL_STATE };
  }

  const { index, quote } = triple;
  const close = line.indexOf(quote, index + quote.length);
  if (close === -1) {
    return {
      tokens: [
        ...pineTokens(line.slice(0, index)),
        { type: 'string', text: line.slice(index) },
      ],
      state: { triple: quote },
    };
  }

  const end = close + quote.length;
  return {
    tokens: [
      ...pineTokens(line.slice(0, index)),
      { type: 'string', text: line.slice(index, end) },
      ...pineTokens(line, end),
    ],
    state: PINE_INITIAL_STATE,
  };
}
