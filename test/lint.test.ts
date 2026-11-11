import { describe, expect, it } from 'vitest';
import { lintPineScript, validateFindings } from '../src/lint';

describe('validateFindings', () => {
  it('maps validator severities onto the shared finding shape', () => {
    expect(
      validateFindings([
        { line: 3, column: 2, length: 4, message: 'bad', severity: 0 },
        { line: 5, column: 0, length: 1, message: 'hint', severity: 3 },
      ]),
    ).toEqual([
      { code: 'validator', line: 3, column: 2, length: 4, message: 'bad', severity: 'error' },
      { code: 'validator', line: 5, column: 0, length: 1, message: 'hint', severity: 'info' },
    ]);
  });
});

describe('lintPineScript', () => {
  it('merges validator and migration findings without duplicates', async () => {
    const findings = await lintPineScript(`//@version=6
strategy("x")
strategy.entry("Long", strategy.long, when = close > open)
`);
    expect(findings.some((finding) => finding.code === 'validator')).toBe(true);
    expect(findings.some((finding) => finding.code === 'v6-when')).toBe(true);
    const keys = findings.map((finding) => `${finding.line}:${finding.column}:${finding.message}`);
    expect(new Set(keys).size).toBe(keys.length);
  });
});
