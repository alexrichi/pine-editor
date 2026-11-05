import type { Completion, CompletionResult, CompletionSource } from '@codemirror/autocomplete';

const KEYWORDS = [
  'and',
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
  'or',
  'return',
  'switch',
  'to',
  'type',
  'var',
  'varip',
  'while',
];

interface FunctionEntry {
  name?: string;
  syntax?: string;
  signature?: string;
}

let cached: Completion[] | null = null;

/**
 * Completion list built from the MIT reference dataset. Only names and
 * signatures are used: the prose descriptions in the dataset come from the
 * public Pine reference and are not ours to redistribute.
 */
export async function pineCompletionOptions(): Promise<Completion[]> {
  if (cached) return cached;
  const module = await import('pinescript-v6-validator');
  const functions = module.PINE_FUNCTIONS_MERGED as Record<string, FunctionEntry>;
  const options: Completion[] = KEYWORDS.map((keyword) => ({
    label: keyword,
    type: 'keyword',
  }));
  for (const [key, entry] of Object.entries(functions)) {
    options.push({
      label: entry.name ?? key,
      type: 'function',
      detail: entry.signature ?? entry.syntax,
    });
  }
  cached = options;
  return options;
}

export const pineCompletions: CompletionSource = async (
  context,
): Promise<CompletionResult | null> => {
  const word = context.matchBefore(/[A-Za-z_][\w.]*/);
  if (!word || (word.from === word.to && !context.explicit)) return null;
  return {
    from: word.from,
    options: await pineCompletionOptions(),
    validFor: /^[\w.]*$/,
  };
};
