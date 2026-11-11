const KEYWORDS = [
  'and',
  'as',
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
  'once',
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
  requiredParams?: string[];
  optionalParams?: string[];
}

export interface PineCompletion {
  label: string;
  type: 'keyword' | 'function';
  detail?: string;
  /** Parameter names in call order, when the reference data provides them. */
  params?: string[];
}

let cached: PineCompletion[] | null = null;

/**
 * Completion list built from the MIT reference dataset. Only names and
 * signatures are used: the prose descriptions in the dataset come from the
 * public Pine reference and are not ours to redistribute.
 */
export async function pineCompletionOptions(): Promise<PineCompletion[]> {
  if (cached) return cached;
  const module = await import('pinescript-v6-validator');
  const functions = module.PINE_FUNCTIONS_MERGED as Record<string, FunctionEntry>;
  const options: PineCompletion[] = KEYWORDS.map((keyword) => ({
    label: keyword,
    type: 'keyword',
  }));
  for (const [key, entry] of Object.entries(functions)) {
    const params = [
      ...(entry.requiredParams ?? []),
      ...(entry.optionalParams ?? []),
    ];
    options.push({
      label: entry.name ?? key,
      type: 'function',
      detail: entry.signature ?? entry.syntax,
      params: params.length > 0 ? params : undefined,
    });
  }
  cached = options;
  return options;
}
