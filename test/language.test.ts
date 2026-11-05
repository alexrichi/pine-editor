import { describe, expect, it } from 'vitest';
import { pineTokens } from '../src/language';

function typesOf(line: string): Array<string | null> {
  return pineTokens(line).map((token) => token.type);
}

function textOf(line: string, type: string): string[] {
  return pineTokens(line)
    .filter((token) => token.type === type)
    .map((token) => token.text);
}

describe('pineTokens', () => {
  it('marks keywords, built-in calls and price sources', () => {
    const line = 'rsi = ta.rsi(close, 14)';
    expect(textOf(line, 'keyword')).toEqual([]);
    expect(textOf(line, 'function')).toEqual(['rsi']);
    expect(textOf(line, 'namespace')).toEqual(['ta']);
    expect(textOf(line, 'variableName')).toEqual(['rsi', 'close']);
    expect(textOf(line, 'number')).toEqual(['14']);
  });

  it('treats control flow and literals as keywords', () => {
    expect(textOf('if close > open', 'keyword')).toEqual(['if']);
    expect(textOf('flag = true', 'bool')).toEqual(['true']);
    expect(textOf('missing = na', 'bool')).toEqual(['na']);
  });

  it('keeps comments and strings intact', () => {
    const line = 'plot(close, "Close // not a comment") // real comment';
    expect(textOf(line, 'string')).toEqual(['"Close // not a comment"']);
    expect(textOf(line, 'comment')).toEqual(['// real comment']);
  });

  it('recognizes hex colors and type names', () => {
    expect(textOf('c = #ff8800', 'color')).toEqual(['#ff8800']);
    expect(textOf('float x = 1.5', 'typeName')).toEqual(['float']);
  });

  it('does not lose characters', () => {
    const line = 'plot(ta.sma(close, 20), color=color.red, linewidth=2)';
    expect(pineTokens(line).map((token) => token.text).join('')).toBe(line);
  });
});
