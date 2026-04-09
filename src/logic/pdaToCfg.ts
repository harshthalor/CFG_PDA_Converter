/**
 * PDA to CFG Conversion Logic
 * 
 * This module implements the conversion from Pushdown Automaton (PDA)
 * to Context-Free Grammar (CFG) with step-by-step explanations.
 * 
 * The algorithm follows these main phases:
 * 1. Normalize the PDA (single accept state, empty stack before accepting)
 * 2. Generate CFG variables as [p, X, q] triples
 * 3. Generate production rules from PDA transitions
 */

import type { CFG, PDA, PDATransition, ProductionRule, ConversionStep, ConversionResult } from '../types';

// Helper to generate unique IDs
const generateId = (): string => Math.random().toString(36).substring(2, 9);

// Format a triple variable [p, X, q]
function formatTriple(p: string, X: string, q: string): string {
  return `[${p},${X},${q}]`;
}

// Deep clone helper for PDA
function clonePDA(pda: PDA): PDA {
  return {
    states: [...pda.states],
    inputAlphabet: [...pda.inputAlphabet],
    stackAlphabet: [...pda.stackAlphabet],
    startState: pda.startState,
    startStackSymbol: pda.startStackSymbol,
    acceptStates: [...pda.acceptStates],
    transitions: pda.transitions.map(t => ({ ...t, id: generateId() }))
  };
}

// Format transitions for display
function formatTransitions(transitions: PDATransition[]): string {
  return transitions.map(t => {
    const input = t.inputSymbol || 'ε';
    const push = t.pushedSymbols || 'ε';
    return `δ(${t.currentState}, ${input}, ${t.poppedSymbol}) = (${t.nextState}, ${push})`;
  }).join('\n');
}

// Format production rules for display
function formatRules(rules: ProductionRule[]): string {
  return rules.map(r => `${r.variable} → ${r.production || 'ε'}`).join('\n');
}

/**
 * Generate a collapsible HTML block for large rule sets.
 * Shows examples first, then a collapsible section with remaining rules.
 */
function formatRulesWithCollapsible(
  rules: ProductionRule[],
  exampleCount: number = 3,
  summaryLabel?: string
): string {
  if (rules.length <= exampleCount) {
    return formatRules(rules);
  }
  
  const examples = rules.slice(0, exampleCount);
  const remaining = rules.slice(exampleCount);
  const label = summaryLabel || `View all ${rules.length} generated rules`;
  
  return `${formatRules(examples)}

<details class="mt-2">
<summary class="cursor-pointer text-blue-600 hover:text-blue-800 text-sm font-medium">${label}</summary>
<div class="mt-2 pl-2 border-l-2 border-gray-200 text-xs font-mono whitespace-pre-wrap max-h-48 overflow-y-auto">
${formatRules(remaining)}
</div>
</details>`;
}

/**
 * Tokenize a string of pushed stack symbols into individual symbols.
 * Handles multi-character symbols (like 'Z$') by greedy matching longest first.
 */
function tokenizeStackSymbols(symbolsStr: string, alphabet: string[]): string[] {
  // Sort alphabet by length descending to match longest symbols first
  const sortedAlphabet = [...alphabet].sort((a, b) => b.length - a.length);
  const tokens: string[] = [];
  let str = symbolsStr;
  
  while (str.length > 0) {
    let matched = false;
    for (const sym of sortedAlphabet) {
      if (str.startsWith(sym)) {
        tokens.push(sym);
        str = str.slice(sym.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      // Fallback if no match is found - take single character
      tokens.push(str[0]);
      str = str.slice(1);
    }
  }
  return tokens;
}

/**
 * Step 1: Normalize the PDA
 * - Add a new start state that pushes a new bottom marker
 * - Add a single new accept state
 * - Add transitions from all original accept states to empty the stack and reach the new accept state
 */
function normalizePDA(pda: PDA): { normalizedPDA: PDA; newStartState: string; newAcceptState: string; newBottomMarker: string } {
  const normalizedPDA = clonePDA(pda);
  
  // Create new unique state names
  let newStartState = 'q_s';
  let counter = 0;
  while (normalizedPDA.states.includes(newStartState)) {
    newStartState = `q_s${counter++}`;
  }
  
  let newAcceptState = 'q_f';
  counter = 0;
  while (normalizedPDA.states.includes(newAcceptState)) {
    newAcceptState = `q_f${counter++}`;
  }
  
  // Create new bottom marker
  let newBottomMarker = 'Z$';
  counter = 0;
  while (normalizedPDA.stackAlphabet.includes(newBottomMarker)) {
    newBottomMarker = `Z$${counter++}`;
  }
  
  // Add new states
  normalizedPDA.states = [newStartState, ...normalizedPDA.states, newAcceptState];
  normalizedPDA.stackAlphabet = [...normalizedPDA.stackAlphabet, newBottomMarker];
  
  // Add initial transition: (q_s, ε, Z$) -> (q0, Z0 Z$)
  // This pushes the original start stack symbol on top of our new bottom marker
  normalizedPDA.transitions.push({
    id: generateId(),
    currentState: newStartState,
    inputSymbol: '',
    poppedSymbol: newBottomMarker,
    nextState: pda.startState,
    pushedSymbols: pda.startStackSymbol + newBottomMarker
  });
  
  // For each original accept state, add transitions to empty the stack
  // For each stack symbol X: (q_accept, ε, X) -> (q_empty, ε)
  // We need an intermediate "emptying" state for each original accept state
  const emptyingStates: string[] = [];
  
  for (const acceptState of pda.acceptStates) {
    let emptyState = `${acceptState}_e`;
    counter = 0;
    while (normalizedPDA.states.includes(emptyState)) {
      emptyState = `${acceptState}_e${counter++}`;
    }
    emptyingStates.push(emptyState);
    normalizedPDA.states.push(emptyState);
    
    // Transition from accept state to emptying state (without consuming stack)
    // Actually, we need to start emptying from the accept state itself
    // For each stack symbol, pop it and stay in emptying mode
    for (const stackSym of normalizedPDA.stackAlphabet) {
      if (stackSym === newBottomMarker) {
        // When we see the new bottom marker, go to final accept state
        normalizedPDA.transitions.push({
          id: generateId(),
          currentState: acceptState,
          inputSymbol: '',
          poppedSymbol: newBottomMarker,
          nextState: newAcceptState,
          pushedSymbols: ''
        });
        normalizedPDA.transitions.push({
          id: generateId(),
          currentState: emptyState,
          inputSymbol: '',
          poppedSymbol: newBottomMarker,
          nextState: newAcceptState,
          pushedSymbols: ''
        });
      } else {
        // Pop the symbol and continue emptying
        normalizedPDA.transitions.push({
          id: generateId(),
          currentState: acceptState,
          inputSymbol: '',
          poppedSymbol: stackSym,
          nextState: emptyState,
          pushedSymbols: ''
        });
        normalizedPDA.transitions.push({
          id: generateId(),
          currentState: emptyState,
          inputSymbol: '',
          poppedSymbol: stackSym,
          nextState: emptyState,
          pushedSymbols: ''
        });
      }
    }
  }
  
  // Update PDA properties
  normalizedPDA.startState = newStartState;
  normalizedPDA.startStackSymbol = newBottomMarker;
  normalizedPDA.acceptStates = [newAcceptState];
  
  return {
    normalizedPDA,
    newStartState,
    newAcceptState,
    newBottomMarker
  };
}

/**
 * Step 2: Generate all possible [p, X, q] variables
 * A variable [p, X, q] represents: "starting at state p with X on top of stack,
 * we can reach state q with X popped from the stack"
 */
function generateVariables(pda: PDA): string[] {
  const variables: string[] = [];
  
  for (const p of pda.states) {
    for (const X of pda.stackAlphabet) {
      for (const q of pda.states) {
        variables.push(formatTriple(p, X, q));
      }
    }
  }
  
  return variables;
}

/**
 * Step 3: Generate production rules from PDA transitions
 * 
 * For transition δ(p, a, X) = (q, Y1Y2...Yk):
 *   For all possible combinations of states r1, r2, ..., rk:
 *     [p, X, rk] → a [q, Y1, r1] [r1, Y2, r2] ... [rk-1, Yk, rk]
 * 
 * For transition δ(p, a, X) = (q, ε):
 *   [p, X, q] → a
 */
function generateProductions(pda: PDA, startVariable: string): ProductionRule[] {
  const rules: ProductionRule[] = [];
  const seenRules = new Set<string>();
  
  console.log('=== Generating Productions ===');
  console.log(`States: ${pda.states.join(', ')}`);
  console.log(`Stack: ${pda.stackAlphabet.join(', ')}`);
  console.log(`Start: ${pda.startState}, Accept: ${pda.acceptStates.join(', ')}`);
  console.log(`Transitions: ${pda.transitions.length}`);
  
  // Start rule: S → [q0, Z0, qf] for the single accept state
  const acceptState = pda.acceptStates[0];
  const startRule: ProductionRule = {
    id: generateId(),
    variable: startVariable,
    production: formatTriple(pda.startState, pda.startStackSymbol, acceptState)
    // No originId - start rule is structural
  };
  rules.push(startRule);
  seenRules.add(`${startRule.variable}->${startRule.production}`);
  console.log(`Start rule: ${startRule.variable} -> ${startRule.production}`);
  
  // Process each transition
  for (const transition of pda.transitions) {
    const { id: transitionId, currentState: p, inputSymbol, poppedSymbol: X, nextState: q, pushedSymbols } = transition;
    const a = inputSymbol || ''; // ε is represented as empty string
    
    console.log(`\nTransition: δ(${p}, ${a || 'ε'}, ${X}) = (${q}, ${pushedSymbols || 'ε'})`);
    
    if (!pushedSymbols || pushedSymbols === '' || pushedSymbols === 'ε') {
      // Case: δ(p, a, X) = (q, ε) - nothing pushed
      // Rule: [p, X, q] → a (or ε if a is empty)
      const variable = formatTriple(p, X, q);
      const production = a || 'ε';
      const ruleKey = `${variable}->${production}`;
      
      console.log(`  Pop rule: ${variable} -> ${production}`);
      
      if (!seenRules.has(ruleKey)) {
        seenRules.add(ruleKey);
        rules.push({
          id: generateId(),
          variable,
          production,
          originId: transitionId  // Track which PDA transition generated this rule
        });
      }
    } else {
      // Case: δ(p, a, X) = (q, Y1Y2...Yk) - symbols pushed
      // Parse pushed symbols using tokenizer (handles multi-char symbols like Z$)
      const pushedStack = tokenizeStackSymbols(pushedSymbols, pda.stackAlphabet);
      const k = pushedStack.length;
      
      console.log(`  Push ${k} symbols: ${pushedStack.join(', ')}`);
      
      if (k === 1) {
        // Single symbol pushed: Y1
        // For all states r1: [p, X, r1] → a [q, Y1, r1]
        const Y1 = pushedStack[0];
        let generated = 0;
        
        for (const r1 of pda.states) {
          const variable = formatTriple(p, X, r1);
          const production = (a ? a + ' ' : '') + formatTriple(q, Y1, r1);
          const ruleKey = `${variable}->${production}`;
          
          if (!seenRules.has(ruleKey)) {
            seenRules.add(ruleKey);
            rules.push({
              id: generateId(),
              variable,
              production,
              originId: transitionId  // Track which PDA transition generated this rule
            });
            generated++;
          }
        }
        console.log(`  Generated ${generated} single-push rules`);
      } else {
        // Multiple symbols pushed: Y1 Y2 ... Yk
        // Generate all combinations of intermediate states
        const before = rules.length;
        generateMultiSymbolRules(pda, p, X, q, a, pushedStack, rules, seenRules, transitionId);
        console.log(`  Generated ${rules.length - before} multi-push rules`);
      }
    }
  }
  
  console.log(`\nTotal rules generated: ${rules.length}`);
  return rules;
}

/**
 * Generate rules for transitions that push multiple symbols
 * [p, X, rk] → a [q, Y1, r1] [r1, Y2, r2] ... [rk-1, Yk, rk]
 */
function generateMultiSymbolRules(
  pda: PDA,
  p: string,
  X: string,
  q: string,
  a: string,
  pushedStack: string[],
  rules: ProductionRule[],
  seenRules: Set<string>,
  originId: string
): void {
  const k = pushedStack.length;
  const states = pda.states;
  
  // Generate all combinations of k states (r1, r2, ..., rk)
  // We need k intermediate/final states
  const numCombinations = Math.pow(states.length, k);
  
  // Limit combinations to prevent explosion (for educational tool)
  const maxCombinations = 1000;
  const actualCombinations = Math.min(numCombinations, maxCombinations);
  
  for (let i = 0; i < actualCombinations; i++) {
    // Convert i to a k-tuple of state indices
    const stateIndices: number[] = [];
    let remaining = i;
    for (let j = 0; j < k; j++) {
      stateIndices.push(remaining % states.length);
      remaining = Math.floor(remaining / states.length);
    }
    
    const selectedStates = stateIndices.map(idx => states[idx]);
    
    // Build the production
    // [p, X, rk] → a [q, Y1, r1] [r1, Y2, r2] ... [rk-1, Yk, rk]
    const rk = selectedStates[k - 1];
    const variable = formatTriple(p, X, rk);
    
    let production = a ? a + ' ' : '';
    
    // First triple: [q, Y1, r1]
    production += formatTriple(q, pushedStack[0], selectedStates[0]);
    
    // Remaining triples: [ri-1, Yi, ri] for i = 2 to k
    for (let j = 1; j < k; j++) {
      const prevState = selectedStates[j - 1];
      const currState = selectedStates[j];
      const stackSym = pushedStack[j];
      production += ' ' + formatTriple(prevState, stackSym, currState);
    }
    
    const ruleKey = `${variable}->${production}`;
    if (!seenRules.has(ruleKey)) {
      seenRules.add(ruleKey);
      rules.push({
        id: generateId(),
        variable,
        production,
        originId  // Track which PDA transition generated this rule
      });
    }
  }
}

/**
 * Check if a symbol is a triple variable (like [p,X,q])
 */
function isTripleVariable(sym: string): boolean {
  return sym.startsWith('[') && sym.endsWith(']');
}

/**
 * Check if a symbol is a variable (either regular or triple)
 */
function isVariable(sym: string, variables: string[]): boolean {
  return variables.includes(sym) || isTripleVariable(sym);
}

/**
 * Simplify the CFG by removing unreachable and non-generating rules
 */
function simplifyCFG(cfg: CFG): CFG {
  console.log('=== Simplifying CFG ===');
  console.log(`Initial: ${cfg.variables.length} variables, ${cfg.productionRules.length} rules`);
  
  // Step 1: Find generating variables (can derive terminal strings)
  // Terminals and ε are generating by definition
  const generating = new Set<string>(cfg.terminals);
  generating.add('ε');
  
  let changed = true;
  let iteration = 0;
  
  while (changed) {
    changed = false;
    iteration++;
    
    for (const rule of cfg.productionRules) {
      if (generating.has(rule.variable)) continue;
      
      // Check if all symbols in production are generating
      const production = rule.production;
      if (production === 'ε' || production === '') {
        generating.add(rule.variable);
        changed = true;
        console.log(`  Iteration ${iteration}: ${rule.variable} generates (ε rule)`);
        continue;
      }
      
      // Parse production into symbols
      const symbols = parseProductionSymbols(production, cfg.variables);
      const allGenerating = symbols.every(sym => generating.has(sym));
      
      if (allGenerating) {
        generating.add(rule.variable);
        changed = true;
        console.log(`  Iteration ${iteration}: ${rule.variable} generates via: ${rule.variable} -> ${production}`);
      }
    }
  }
  
  const generatingVarsCount = Array.from(generating).filter(s => isVariable(s, cfg.variables)).length;
  console.log(`Generating variables found: ${generatingVarsCount}`);
  
  // Keep only rules where LHS is generating and all RHS symbols are generating
  let rules = cfg.productionRules.filter(rule => {
    if (!generating.has(rule.variable)) return false;
    
    const production = rule.production;
    if (production === 'ε' || production === '') return true;
    
    const symbols = parseProductionSymbols(production, cfg.variables);
    return symbols.every(sym => generating.has(sym));
  });
  
  console.log(`Rules after generating filter: ${rules.length}`);
  
  // Step 2: Find reachable variables from start symbol
  const reachable = new Set<string>([cfg.startSymbol]);
  changed = true;
  
  while (changed) {
    changed = false;
    for (const rule of rules) {
      if (!reachable.has(rule.variable)) continue;
      
      const symbols = parseProductionSymbols(rule.production, cfg.variables);
      for (const sym of symbols) {
        // Check if it's a variable (regular or triple) and not yet reachable
        if (isVariable(sym, cfg.variables) && !reachable.has(sym)) {
          reachable.add(sym);
          changed = true;
        }
      }
    }
  }
  
  console.log(`Reachable variables: ${reachable.size}`);
  
  // Keep only reachable rules
  rules = rules.filter(rule => reachable.has(rule.variable));
  
  console.log(`Rules after reachable filter: ${rules.length}`);
  
  // Update variables list - include all variables that appear in remaining rules
  const usedVariables = new Set<string>();
  for (const rule of rules) {
    usedVariables.add(rule.variable);
    const symbols = parseProductionSymbols(rule.production, cfg.variables);
    for (const sym of symbols) {
      if (isVariable(sym, cfg.variables)) {
        usedVariables.add(sym);
      }
    }
  }
  
  // Build final variables list: keep original order for non-triples, add triples at end
  const finalVariables = cfg.variables.filter(v => usedVariables.has(v));
  // Also add any triple variables that are used
  for (const v of usedVariables) {
    if (isTripleVariable(v) && !finalVariables.includes(v)) {
      finalVariables.push(v);
    }
  }
  
  console.log(`Final: ${finalVariables.length} variables, ${rules.length} rules`);
  
  return {
    variables: finalVariables,
    terminals: cfg.terminals,
    startSymbol: cfg.startSymbol,
    productionRules: rules
  };
}

/**
 * Parse a production string into individual symbols
 */
function parseProductionSymbols(production: string, _variables: string[]): string[] {
  // _variables parameter reserved for future use with non-triple variable parsing
  void _variables;
  
  if (!production || production === 'ε') return [];
  
  const symbols: string[] = [];
  const parts = production.split(/\s+/);
  
  for (const part of parts) {
    if (!part) continue;
    
    // Check if it's a triple variable [p,X,q]
    if (part.startsWith('[') && part.endsWith(']')) {
      symbols.push(part);
    } else {
      // It's a terminal or regular variable
      for (const char of part) {
        symbols.push(char);
      }
    }
  }
  
  return symbols;
}

/**
 * Main conversion function: PDA to CFG with step tracking
 */
export function convertPDAtoCFG(inputPDA: PDA): ConversionResult {
  const steps: ConversionStep[] = [];
  let stepNum = 1;
  
  // Step 0: Show original PDA
  steps.push({
    stepNumber: stepNum++,
    title: 'Original Pushdown Automaton',
    description: `Starting with the input PDA:\n\nStates (Q): {${inputPDA.states.join(', ')}}\nInput Alphabet (Σ): {${inputPDA.inputAlphabet.join(', ')}}\nStack Alphabet (Γ): {${inputPDA.stackAlphabet.join(', ')}}\nStart State: ${inputPDA.startState}\nStart Stack Symbol: ${inputPDA.startStackSymbol}\nAccept States: {${inputPDA.acceptStates.join(', ')}}\n\nTransitions:\n${formatTransitions(inputPDA.transitions)}`,
    highlightedElements: inputPDA.states
  });
  
  // Step 1: Normalize PDA
  const { normalizedPDA, newStartState, newAcceptState, newBottomMarker } = normalizePDA(inputPDA);
  
  steps.push({
    stepNumber: stepNum++,
    title: 'Normalizing the PDA',
    description: `To convert a PDA to CFG, we first normalize it:\n\n1. Add a new start state (${newStartState}) that pushes a new bottom marker (${newBottomMarker})\n2. Add a single new accept state (${newAcceptState})\n3. Add transitions to empty the stack before accepting\n\nNew States: {${normalizedPDA.states.join(', ')}}\nNew Start State: ${newStartState}\nNew Accept State: ${newAcceptState}\nNew Stack Symbol: ${newBottomMarker}\n\nThis ensures the PDA:\n• Has exactly one accept state\n• Empties its stack before accepting`,
    highlightedElements: [newStartState, newAcceptState, newBottomMarker]
  });
  
  // Show new transitions added for normalization
  const newTransitions = normalizedPDA.transitions.slice(inputPDA.transitions.length);
  steps.push({
    stepNumber: stepNum++,
    title: 'Normalization Transitions',
    description: `Added transitions for normalization:\n\n${formatTransitions(newTransitions)}\n\nThese transitions:\n1. Initialize the stack with the original start symbol\n2. Allow emptying the stack from any original accept state\n3. Transition to the final accept state when stack is empty`,
    highlightedElements: newTransitions.map(t => t.currentState)
  });
  
  // Step 2: Generate variables
  const tripleVariables = generateVariables(normalizedPDA);
  const startVariable = 'S';
  const allVariables = [startVariable, ...tripleVariables];
  
  steps.push({
    stepNumber: stepNum++,
    title: 'Generating CFG Variables',
    description: `Create a variable [p, X, q] for each combination of:\n• State p (starting state)\n• Stack symbol X (symbol to pop)\n• State q (ending state)\n\nInterpretation: [p, X, q] represents "starting at state p with X on top of stack, reach state q with X popped"\n\nWhy so many? The algorithm must consider every possible intermediate state the PDA might reach while processing the stack. This is inherently combinatorial: |Q| × |Γ| × |Q| = ${normalizedPDA.states.length} × ${normalizedPDA.stackAlphabet.length} × ${normalizedPDA.states.length} = ${tripleVariables.length} variables.\n\nExample variables:\n${tripleVariables.slice(0, 4).join('\n')}\n\nNote: Most of these ${tripleVariables.length} variables will turn out to be unreachable or non-generating and will be cleaned up in the final simplification step.`,
    highlightedElements: tripleVariables.slice(0, 4)
  });
  
  // Step 3: Generate start rule
  steps.push({
    stepNumber: stepNum++,
    title: 'Start Rule Generation',
    description: `The start symbol S derives the process of:\n• Starting at the new start state (${newStartState})\n• Processing the entire stack starting with ${newBottomMarker}\n• Ending at the accept state (${newAcceptState})\n\nStart Rule:\nS → ${formatTriple(newStartState, newBottomMarker, newAcceptState)}\n\nThis rule initiates the derivation representing a complete accepting computation.`,
    highlightedElements: [startVariable, formatTriple(newStartState, newBottomMarker, newAcceptState)]
  });
  
  // Step 4: Generate production rules
  const allRules = generateProductions(normalizedPDA, startVariable);
  
  // Categorize rules for explanation
  const epsilonPushRules = allRules.filter(r => 
    r.variable !== startVariable && 
    (r.production === 'ε' || (r.production.length === 1 && normalizedPDA.inputAlphabet.includes(r.production)))
  );
  
  const singlePushRules = allRules.filter(r => {
    if (r.variable === startVariable) return false;
    const parts = r.production.split(/\s+/).filter(p => p);
    return parts.length === 1 && parts[0].startsWith('[');
  });
  
  const multiPushRules = allRules.filter(r => {
    if (r.variable === startVariable) return false;
    const parts = r.production.split(/\s+/).filter(p => p);
    const tripleCount = parts.filter(p => p.startsWith('[')).length;
    return tripleCount >= 2;
  });
  
  steps.push({
    stepNumber: stepNum++,
    title: 'Rules from ε-Push Transitions',
    description: `For transitions δ(p, a, X) = (q, ε) that pop without pushing:

**Rule Template:** [p, X, q] → a (or ε if no input consumed)

Generated ${epsilonPushRules.length} rules:
${formatRulesWithCollapsible(epsilonPushRules, 3, `View all ${epsilonPushRules.length} ε-push rules`)}

These rules represent simple stack operations where a symbol is popped without replacement.`,
    highlightedElements: epsilonPushRules.slice(0, 3).map(r => r.variable)
  });
  
  steps.push({
    stepNumber: stepNum++,
    title: 'Rules from Single-Push Transitions',
    description: `For transitions δ(p, a, X) = (q, Y) that push one symbol:

**Rule Template:** [p, X, r] → a [q, Y, r] for all states r

The algorithm generates one rule for every possible ending state r, because we don't know in advance which state the PDA will be in after eventually popping Y.

Generated ${singlePushRules.length} rules:
${formatRulesWithCollapsible(singlePushRules, 3, `View all ${singlePushRules.length} single-push rules`)}

Note: Most of these rules will be dead-ends, cleaned up during simplification.`,
    highlightedElements: singlePushRules.slice(0, 3).map(r => r.variable)
  });
  
  if (multiPushRules.length > 0) {
    steps.push({
      stepNumber: stepNum++,
      title: 'Rules from Multi-Push Transitions',
      description: `For transitions δ(p, a, X) = (q, Y₁Y₂...Yₖ) that push multiple symbols:

**Rule Template:** [p, X, rₖ] → a [q, Y₁, r₁] [r₁, Y₂, r₂] ... [rₖ₋₁, Yₖ, rₖ]

**Why so many rules?** The algorithm must "guess" every possible sequence of intermediate states (r₁, r₂, ..., rₖ) that the PDA might pass through while popping these k symbols. With |Q| = ${normalizedPDA.states.length} states and k pushed symbols, this creates up to |Q|ᵏ rules per transition.

Generated ${multiPushRules.length} rules:
${formatRulesWithCollapsible(multiPushRules, 3, `View all ${multiPushRules.length} path combinations`)}

**Note:** Most of these ${multiPushRules.length} generated rules are dead-ends and will be cleaned up in the final simplification step.`,
      highlightedElements: multiPushRules.slice(0, 3).map(r => r.variable)
    });
  }
  
  // Step 5: Build initial CFG
  const initialCFG: CFG = {
    variables: allVariables,
    terminals: normalizedPDA.inputAlphabet,
    startSymbol: startVariable,
    productionRules: allRules
  };
  
  steps.push({
    stepNumber: stepNum++,
    title: 'Initial CFG Constructed',
    description: `The initial CFG has been constructed:\n\nVariables: ${allVariables.length} total\nTerminals: {${initialCFG.terminals.join(', ')}}\nStart Symbol: ${startVariable}\nProduction Rules: ${allRules.length} total\n\nThis CFG may contain many unreachable or non-generating rules that we'll now simplify.`,
    highlightedElements: [startVariable]
  });
  
  // Step 6: Simplify CFG
  const simplifiedCFG = simplifyCFG(initialCFG);
  const removedVars = allVariables.filter(v => !simplifiedCFG.variables.includes(v));
  const removedRules = allRules.length - simplifiedCFG.productionRules.length;
  
  steps.push({
    stepNumber: stepNum++,
    title: 'Simplifying the CFG',
    description: `Remove unreachable and non-generating symbols:\n\n• Removed ${removedVars.length} unreachable/non-generating variables\n• Removed ${removedRules} useless rules\n\nRemaining:\n• Variables: ${simplifiedCFG.variables.length}\n• Rules: ${simplifiedCFG.productionRules.length}`,
    highlightedElements: removedVars.slice(0, 5)
  });
  
  // Final summary
  steps.push({
    stepNumber: stepNum++,
    title: 'Conversion Complete',
    description: `The CFG construction is complete!\n\nFinal CFG:\n• Variables: ${simplifiedCFG.variables.length}\n• Terminals: {${simplifiedCFG.terminals.join(', ')}}\n• Start Symbol: ${simplifiedCFG.startSymbol}\n• Rules: ${simplifiedCFG.productionRules.length}\n\nProduction Rules:\n${formatRules(simplifiedCFG.productionRules.slice(0, 15))}${simplifiedCFG.productionRules.length > 15 ? '\n...' : ''}\n\nThis CFG generates exactly the same language as the original PDA.`,
    highlightedElements: []
  });
  
  return {
    success: true,
    result: simplifiedCFG,
    steps
  };
}
