import { lintPineSource, type PineLintFinding, type PineLintSeverity } from './lint-rules';

interface ValidationError {
  line: number;
  column: number;
  length: number;
  message: string;
  /** 0 error, 1 warning, 2 information, 3 hint. */
  severity: number;
}

const SEVERITY: Record<number, PineLintSeverity> = {
  0: 'error',
  1: 'warning',
  2: 'info',
  3: 'info',
};

/** Map the MIT validator's findings onto the same shape as the local rules. */
export function validateFindings(errors: readonly ValidationError[]): PineLintFinding[] {
  return errors.map((error) => ({
    code: 'validator',
    line: error.line,
    column: error.column,
    length: Math.max(1, error.length),
    message: error.message,
    severity: SEVERITY[error.severity] ?? 'warning',
  }));
}

function dedupe(findings: readonly PineLintFinding[]): PineLintFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.line}:${finding.column}:${finding.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Run the MIT validator and the source-only v6 rules in one pass. The result is
 * editor-agnostic; hosts clamp line and column numbers to their own document.
 */
export async function lintPineScript(source: string): Promise<PineLintFinding[]> {
  const { validatePineScript } = await import('pinescript-v6-validator');
  return dedupe([...validateFindings(validatePineScript(source)), ...lintPineSource(source)]);
}
