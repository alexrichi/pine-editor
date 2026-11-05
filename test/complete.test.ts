import { describe, expect, it } from 'vitest';
import { pineCompletionOptions } from '../src/complete';
import { validatePineScript } from 'pinescript-v6-validator';

const VALID = `//@version=6
indicator("RSI", overlay=false)
length = input.int(14, "Length")
rsi = ta.rsi(close, length)
plot(rsi, "RSI")
`;

describe('pineCompletionOptions', () => {
  it('lists namespaced built-ins and keywords', async () => {
    const options = await pineCompletionOptions();
    const labels = new Set(options.map((option) => option.label));
    expect(labels.has('ta.sma')).toBe(true);
    expect(labels.has('request.security')).toBe(true);
    expect(labels.has('if')).toBe(true);
  });

  it('carries the signature as detail', async () => {
    const options = await pineCompletionOptions();
    const sma = options.find((option) => option.label === 'ta.sma');
    expect(sma?.detail).toContain('sma');
  });
});

describe('pine validator contract', () => {
  it('accepts a valid script', () => {
    expect(validatePineScript(VALID)).toEqual([]);
  });

  it('reports an unknown function on a one-based line', () => {
    const errors = validatePineScript(`//@version=6
indicator("X")
plot(close)
nope()
`);
    expect(errors.length).toBeGreaterThan(0);
    const error = errors[0]!;
    expect(error.line).toBe(4);
    expect(error.column).toBeGreaterThanOrEqual(0);
  });
});
