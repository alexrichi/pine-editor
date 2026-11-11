import { describe, expect, it } from 'vitest';
import { lintPineSource } from '../src/lint-rules';

const codes = (source: string): string[] => lintPineSource(source).map((finding) => finding.code);

describe('lintPineSource: declaration', () => {
  it('accepts a complete v6 script', () => {
    expect(codes(`//@version=6
indicator("Test")
plot(close)`)).toEqual([]);
  });

  it('does not warn on an empty or comment-only file', () => {
    expect(codes('')).toEqual([]);
    expect(codes('// just a comment')).toEqual([]);
  });

  it('warns about a missing declaration', () => {
    expect(codes(`//@version=6
plot(close)`)).toContain('v6-declaration');
  });

  it('accepts indicator, strategy and library declarations', () => {
    for (const declaration of ['indicator("x")', 'strategy("x")', 'library("x")']) {
      expect(codes(`//@version=6\n${declaration}\nplot(close)`)).toEqual([]);
    }
  });

  it('does not treat a declaration inside a string as real', () => {
    expect(codes(`//@version=6
plot(close)
label.new(bar_index, close, "indicator(\\"x\\")")`)).toContain('v6-declaration');
  });
});

describe('lintPineSource: v6 migration rules', () => {
  it('rejects when on strategy calls', () => {
    expect(codes(`//@version=6
strategy("x")
strategy.entry("Long", strategy.long, when = close > open)`)).toContain('v6-when');
  });

  it('warns about a short timeframe comparison', () => {
    expect(codes(`//@version=6
indicator("x")
isDaily = timeframe.period == "D"`)).toContain('v6-timeframe-period');
  });

  it('rejects history on literals', () => {
    expect(codes(`//@version=6
indicator("x")
plot(close[1])
x = 5[0]`)).toContain('v6-literal-history');
  });

  it('does not treat identifiers as literals', () => {
    expect(codes(`//@version=6
indicator("x")
array<float> values = array.new<float>()
plot(array.get(values, 0)[0])`)).not.toContain('v6-literal-history');
  });

  it('ignores matches inside comments and strings', () => {
    expect(codes(`//@version=6
indicator("x")
// when = true, timeframe.period == "D"
label.new(bar_index, close, "when = 1 timeframe.period == \\"D\\"")`)).toEqual([]);
  });

  it('reports findings in source order', () => {
    const findings = lintPineSource(`//@version=6
indicator("x")
strategy.entry("Long", strategy.long, when = true)
isDaily = timeframe.period == "D"`);
    expect(findings.map((finding) => finding.code)).toEqual(['v6-when', 'v6-timeframe-period']);
  });
});
