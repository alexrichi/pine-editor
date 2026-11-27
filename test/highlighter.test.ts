import { describe, expect, it } from 'vitest';
import { enclosingCall } from '../src/vendor/pine-highlighter/core/call-resolver';
import { buildModel } from '../src/vendor/pine-highlighter/core/document-model';
import { formatDocument } from '../src/vendor/pine-highlighter/core/formatter';
import { loadReference } from '../src/vendor/pine-highlighter/core/reference';
import { semanticTokens } from '../src/vendor/pine-highlighter/core/semantic';
import { resolveSymbolAt } from '../src/vendor/pine-highlighter/core/symbols';
import { tokenize } from '../src/vendor/pine-highlighter/core/tokenizer';

function source(text: string) {
  return { model: buildModel(text), tokens: tokenize(text) };
}

describe('vendored Pine highlighter core', () => {
  it('formats a Pine document with four-space indentation', () => {
    expect(formatDocument('//@version=6\nif close > open\n  x = 1\n')).toBe(
      '//@version=6\nif close > open\n    x = 1\n',
    );
  });

  it('builds the document model and resolves a declared variable', () => {
    const text = '//@version=6\nindicator("test")\nbase = close\nvalue = base * 2\n';
    const model = buildModel(text);
    expect(model.scriptKind).toBe('indicator');
    expect(model.variables.map((variable) => variable.name)).toEqual(['base', 'value']);

    const target = resolveSymbolAt(source(text), 3, 'value = '.length);
    expect(target).toMatchObject({ kind: 'variable', name: 'base' });
  });

  it('finds the enclosing call for signature help', () => {
    const text = 'plot(ta.sma(close, ';
    const lines = text.split('\n');
    const call = enclosingCall(tokenize(text), lines.length - 1, lines.at(-1)!.length);
    expect(call).toMatchObject({ name: 'ta.sma', argIndex: 1 });
  });

  it('marks user symbols for semantic highlighting', () => {
    const text = '//@version=6\nindicator("test")\nfast = ta.sma(close, 9)\nplot(fast)\n';
    const tokens = semanticTokens(source(text));
    expect(tokens).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ line: 2, kind: 'variable', isDeclaration: true }),
        expect.objectContaining({ line: 3, kind: 'variable', isDeclaration: false }),
      ]),
    );
  });

  it('loads the vendored v6 reference for hover', () => {
    const reference = loadReference();
    const sma = reference.get('ta.sma');
    expect(sma?.kind).toBe('function');
    expect(sma?.overloads[0]?.params.map((param) => param.name)).toEqual(['source', 'length']);
    expect(reference.members('ta').some((entry) => entry.name === 'ta.ema')).toBe(true);
  });
});
