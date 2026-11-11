export type PineLintSeverity = 'error' | 'warning' | 'info';

/** One source-level finding, independent of the host editor. */
export interface PineLintFinding {
  /** Stable rule id for tests and host filtering. */
  code: string;
  /** One-based line. */
  line: number;
  /** Zero-based column, like the validator. */
  column: number;
  length: number;
  message: string;
  severity: PineLintSeverity;
}

function add(
  out: PineLintFinding[],
  code: string,
  line: number,
  column: number,
  length: number,
  message: string,
  severity: PineLintSeverity,
): void {
  out.push({ code, line, column, length: Math.max(1, length), message, severity });
}

/** Strip a // comment while keeping string contents intact. */
function stripComments(line: string): string {
  let quote: string | null = null;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;
    if (quote) {
      if (char === '\\') i += 1;
      else if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === '/' && line[i + 1] === '/') return line.slice(0, i);
  }
  return line;
}

/** Replace string contents with spaces so rules cannot match inside them. */
function maskCode(line: string): string {
  const code = stripComments(line);
  const chars = code.split('');
  let quote: string | null = null;
  for (let i = 0; i < chars.length; i += 1) {
    const char = chars[i]!;
    if (quote) {
      chars[i] = ' ';
      if (char === '\\') {
        if (i + 1 < chars.length) chars[i + 1] = ' ';
        i += 1;
      } else if (char === quote) {
        quote = null;
      }
      continue;
    }
    if (char === '"' || char === "'") {
      chars[i] = ' ';
      quote = char;
    }
  }
  return chars.join('');
}

function hasCode(source: string): boolean {
  return source
    .split('\n')
    .some((line) => maskCode(line).trim().length > 0);
}

function declarationFinding(source: string, out: PineLintFinding[]): void {
  if (!hasCode(source)) return;
  const code = source
    .split('\n')
    .map((line) => maskCode(line))
    .join('\n');
  if (/\b(indicator|strategy|library)\s*\(/.test(code)) return;
  add(
    out,
    'v6-declaration',
    1,
    0,
    1,
    'Missing declaration: indicator(), strategy() or library()',
    'warning',
  );
}

function lineRules(source: string, out: PineLintFinding[]): void {
  const lines = source.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const text = stripComments(lines[i]!);
    const code = maskCode(lines[i]!);
    if (!code.trim()) continue;

    const when = /\bstrategy\.(entry|order|exit|close|cancel|cancel_all|close_all)\b[^\n]*\bwhen\s*=/.exec(code);
    if (when) {
      add(
        out,
        'v6-when',
        i + 1,
        when.index,
        when[0].length,
        'Parameter "when" was removed in v6. Use an if statement instead',
        'error',
      );
    }

    const period = /\btimeframe\.period\s*==\s*(["'])([DWMH])\1/.exec(text);
    if (period) {
      add(
        out,
        'v6-timeframe-period',
        i + 1,
        period.index,
        period[0].length,
        `timeframe.period includes the multiplier in v6. Compare with "1${period[2]}" instead`,
        'warning',
      );
    }

    const literalHistory = /(?:^|[^A-Za-z0-9_.])(true|false|na|\d+(?:\.\d+)?)\s*\[/.exec(code);
    if (literalHistory) {
      const start = literalHistory.index + literalHistory[0].length - literalHistory[1]!.length;
      add(
        out,
        'v6-literal-history',
        i + 1,
        start,
        literalHistory[1]!.length + 1,
        'History [] cannot be applied to a literal or constant',
        'error',
      );
    }
  }
}

/**
 * High-signal v6 checks the reference validator does not own: a missing
 * declaration, the removed `when` argument, short timeframe comparisons and
 * history on literals. Findings are source-only so the host can test or
 * filter them without an editor.
 */
export function lintPineSource(source: string): PineLintFinding[] {
  const out: PineLintFinding[] = [];
  declarationFinding(source, out);
  lineRules(source, out);
  return out.sort((left, right) => left.line - right.line || left.column - right.column);
}
