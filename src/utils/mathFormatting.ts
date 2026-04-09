/**
 * Math Formatting Utilities
 * 
 * Converts plain text mathematical notation to LaTeX for KaTeX rendering.
 * Handles Greek letters, subscripts, special symbols, and PDA/CFG notation.
 */

// Greek letter mappings
const greekLetters: Record<string, string> = {
  'Σ': '\\Sigma',
  'Γ': '\\Gamma',
  'δ': '\\delta',
  'ε': '\\varepsilon',
  'α': '\\alpha',
  'β': '\\beta',
  'γ': '\\gamma',
  'λ': '\\lambda',
  '→': '\\rightarrow',
  '⇒': '\\Rightarrow',
  '∈': '\\in',
  '∅': '\\emptyset',
  '∪': '\\cup',
  '∩': '\\cap',
  '×': '\\times',
};

// Unicode subscript characters mapping
const subscriptChars: Record<string, string> = {
  '₀': '0', '₁': '1', '₂': '2', '₃': '3', '₄': '4',
  '₅': '5', '₆': '6', '₇': '7', '₈': '8', '₉': '9',
  'ₐ': 'a', 'ₑ': 'e', 'ₕ': 'h', 'ᵢ': 'i', 'ⱼ': 'j',
  'ₖ': 'k', 'ₗ': 'l', 'ₘ': 'm', 'ₙ': 'n', 'ₒ': 'o',
  'ₚ': 'p', 'ᵣ': 'r', 'ₛ': 's', 'ₜ': 't', 'ᵤ': 'u',
  'ᵥ': 'v', 'ₓ': 'x', '₋': '-', '₊': '+', '₌': '=',
  '₍': '(', '₎': ')',
};

/**
 * Convert a string with mathematical notation to LaTeX
 */
export function toLatex(text: string): string {
  let result = text;
  
  // Escape dollar signs which are special in LaTeX (only if not already escaped)
  result = result.replace(/(?<!\\)\$/g, '\\$');
  
  // If already contains LaTeX commands, don't double-escape Greek letters
  if (text.includes('\\')) {
    // Just handle subscripts for state names that aren't already braced
    result = result.replace(/([a-zA-Z])_(\w+)(?![}])/g, (_, letter, sub) => {
      // Don't wrap numbers in \text{}
      if (/^\d+$/.test(sub)) {
        return `${letter}_{${sub}}`;
      }
      return `${letter}_{\\text{${sub}}}`;
    });
    return result;
  }
  
  // Build regex for all subscript characters
  const subscriptPattern = new RegExp(`[${Object.keys(subscriptChars).join('')}]+`, 'g');
  
  // Handle Unicode subscripts by converting to proper LaTeX subscripts
  // This ensures Y₁Y₂ becomes Y_{1}Y_{2} and rₖ₋₁ becomes r_{k-1}
  result = result.replace(new RegExp(`([a-zA-Z])(${subscriptPattern.source})`, 'g'), (_, letter, subs) => {
    const converted = subs.split('').map((s: string) => subscriptChars[s] || s).join('');
    return `${letter}_{${converted}}`;
  });
  
  // Replace remaining Greek letters and symbols
  for (const [symbol, latex] of Object.entries(greekLetters)) {
    result = result.split(symbol).join(latex);
  }
  
  // Handle ASCII subscripts like q_start, q_loop, q_0
  result = result.replace(/([a-zA-Z])_(\d+)(?![}])/g, '$1_{$2}');
  result = result.replace(/([a-zA-Z])_([a-zA-Z]\w*)(?![}])/g, '$1_{\\text{$2}}');
  
  return result;
}

/**
 * Format a set notation {a, b, c}
 */
export function formatSet(items: string[]): string {
  if (items.length === 0) return '\\{\\}';
  return `\\{${items.map(toLatex).join(', ')}\\}`;
}

/**
 * Format a PDA transition: δ(q, a, X) = (q', γ)
 */
export function formatTransition(
  currentState: string,
  inputSymbol: string,
  poppedSymbol: string,
  nextState: string,
  pushedSymbols: string
): string {
  const input = inputSymbol || '\\varepsilon';
  const pushed = pushedSymbols || '\\varepsilon';
  
  return `\\delta(${toLatex(currentState)}, ${input}, ${toLatex(poppedSymbol)}) = (${toLatex(nextState)}, ${toLatex(pushed)})`;
}

/**
 * Format a production rule: A → α
 */
export function formatProduction(variable: string, production: string): string {
  const prod = production === 'ε' || !production ? '\\varepsilon' : toLatex(production);
  return `${toLatex(variable)} \\rightarrow ${prod}`;
}

/**
 * Format a triple variable [p, X, q]
 */
export function formatTriple(p: string, X: string, q: string): string {
  return `[${toLatex(p)}, ${toLatex(X)}, ${toLatex(q)}]`;
}

/**
 * Format a full PDA definition for display
 */
export function formatPDADefinition(
  states: string[],
  inputAlphabet: string[],
  stackAlphabet: string[],
  startState: string,
  startStackSymbol: string,
  acceptStates: string[]
): string {
  return `\\begin{aligned}
Q &= ${formatSet(states)} \\\\
\\Sigma &= ${formatSet(inputAlphabet)} \\\\
\\Gamma &= ${formatSet(stackAlphabet)} \\\\
q_0 &= ${toLatex(startState)} \\\\
Z_0 &= ${toLatex(startStackSymbol)} \\\\
F &= ${formatSet(acceptStates)}
\\end{aligned}`;
}

/**
 * Format a full CFG definition for display
 */
export function formatCFGDefinition(
  variables: string[],
  terminals: string[],
  startSymbol: string,
  ruleCount: number
): string {
  return `\\begin{aligned}
V &= ${formatSet(variables)} \\\\
\\Sigma &= ${formatSet(terminals)} \\\\
S &= ${toLatex(startSymbol)} \\\\
|P| &= ${ruleCount}
\\end{aligned}`;
}
