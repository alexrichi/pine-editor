import { describe, expect, it } from 'vitest';
import {
  PINE_INITIAL_STATE,
  pineTokens,
  tokenizePineLine,
} from '../src/language';

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

describe('Pine annotations', () => {
  it('splits a compiler annotation out of the comment', () => {
    expect(pineTokens('//@version=6').map((token) => [token.type, token.text])).toEqual([
      ['comment', '//'],
      ['annotation', '@version'],
      ['comment', '=6'],
    ]);
  });

  it('leaves an ordinary comment whole', () => {
    expect(textOf('// real comment', 'comment')).toEqual(['// real comment']);
  });
});

describe('tokenizePineLine', () => {
  it('keeps a triple-quoted double string open across lines', () => {
    const first = tokenizePineLine('x = """hello', PINE_INITIAL_STATE);
    expect(first.tokens.map((token) => token.text).join('')).toBe('x = """hello');
    expect(first.tokens.find((token) => token.type === 'string')?.text).toBe('"""hello');
    expect(first.state.triple).toBe('"""');

    const second = tokenizePineLine('world""" + b', first.state);
    expect(second.tokens.map((token) => token.text).join('')).toBe('world""" + b');
    expect(second.tokens[0]).toEqual({ type: 'string', text: 'world"""' });
    expect(second.state.triple).toBeNull();
  });

  it('closes a single-line triple-quoted string and keeps the code after it', () => {
    const result = tokenizePineLine('a = """x""" // note', PINE_INITIAL_STATE);
    expect(result.tokens.map((token) => token.text).join('')).toBe('a = """x""" // note');
    expect(result.tokens.find((token) => token.type === 'string')?.text).toBe('"""x"""');
    expect(textOf('a = """x""" // note', 'comment')).toEqual(['// note']);
    expect(result.state.triple).toBeNull();
  });

  it('handles the single-quoted triple form', () => {
    const first = tokenizePineLine("s = '''line", PINE_INITIAL_STATE);
    expect(first.state.triple).toBe("'''");
    const second = tokenizePineLine("two'''", first.state);
    expect(second.tokens).toEqual([{ type: 'string', text: "two'''" }]);
    expect(second.state.triple).toBeNull();
  });
});
