import { linter, type Diagnostic } from '@codemirror/lint';
import type { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { lintPineSource, type PineLintFinding } from './lint-rules';

interface ValidationError {
  line: number;
  column: number;
  length: number;
  message: string;
  /** 0 error, 1 warning, 2 information, 3 hint. */
  severity: number;
}

const SEVERITY: Record<number, Diagnostic['severity']> = {
  0: 'error',
  1: 'warning',
  2: 'info',
  3: 'info',
};

/**
 * Runs the MIT Pine v6 validator and maps its findings onto CodeMirror
 * diagnostics. The validator reports one-based lines; a stale line number is
 * clamped to the document so a mid-typing run cannot throw.
 */
export function toDiagnostics(errors: readonly ValidationError[], view: EditorView): Diagnostic[] {
  const doc = view.state.doc;
  const diagnostics: Diagnostic[] = [];
  for (const error of errors) {
    const lineNumber = Math.min(Math.max(error.line, 1), doc.lines);
    const line = doc.line(lineNumber);
    const from = Math.min(line.from + Math.max(error.column, 0), line.to);
    const to = Math.min(from + Math.max(error.length, 1), line.to);
    diagnostics.push({
      from,
      to: Math.max(to, from),
      severity: SEVERITY[error.severity] ?? 'warning',
      message: error.message,
    });
  }
  return diagnostics;
}

export function pineLinter(delay = 400): Extension {
  return linter(
    async (view) => {
      const { validatePineScript } = await import('pinescript-v6-validator');
      const source = view.state.doc.toString();
      const findings = [
        ...toDiagnostics(validatePineScript(source), view),
        ...findingsToDiagnostics(lintPineSource(source), view),
      ];
      const seen = new Set<string>();
      return findings.filter((finding) => {
        const key = `${finding.from}:${finding.to}:${finding.message}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
    },
    { delay },
  );
}

/** Map the source-only v6 rules onto CodeMirror diagnostics. */
export function findingsToDiagnostics(
  findings: readonly PineLintFinding[],
  view: EditorView,
): Diagnostic[] {
  const doc = view.state.doc;
  const diagnostics: Diagnostic[] = [];
  for (const finding of findings) {
    const lineNumber = Math.min(Math.max(finding.line, 1), doc.lines);
    const line = doc.line(lineNumber);
    const from = Math.min(line.from + Math.max(finding.column, 0), line.to);
    const to = Math.min(from + Math.max(finding.length, 1), line.to);
    diagnostics.push({
      from,
      to: Math.max(to, from),
      severity: finding.severity,
      message: finding.message,
    });
  }
  return diagnostics;
}
