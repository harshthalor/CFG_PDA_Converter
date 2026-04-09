/**
 * CFG to PDA Conversion Logic
 * 
 * This module implements the conversion from Context-Free Grammar (CFG)
 * to Pushdown Automaton (PDA) with step-by-step explanations.
 * 
 * The algorithm follows these main phases:
 * 1. Normalize the CFG (eliminate ε-productions, unit productions, useless symbols)
 * 2. Convert to Greibach Normal Form (GNF)
 * 3. Construct the equivalent PDA
 */

import type { CFG, PDA, PDATransition, ProductionRule, ConversionStep, ConversionResult } from '../types';

// Helper to generate unique IDs
const generateId = (): string => Math.random().toString(36).substring(2, 9);

// Deep clone helper
function cloneCFG(cfg: CFG): CFG {
  return {
    variables: [...cfg.variables],
    terminals: [...cfg.terminals],
    startSymbol: cfg.startSymbol,
    productionRules: cfg.productionRules.map(r => ({ ...r, id: generateId() }))
  };
}

// Format production rules for display
function formatRules(rules: ProductionRule[]): string {
  const grouped = new Map<string, string[]>();
  rules.forEach(r => {
    const existing = grouped.get(r.variable) || [];
    existing.push(r.production || 'ε');
    grouped.set(r.variable, existing);
  });
  
  return Array.from(grouped.entries())
    .map(([v, prods]) => `${v} → ${prods.join(' | ')}`)
    .join('\n');
}

/**
 * Step 1: Find nullable variables (those that can derive ε)
 */
function findNullableVariables(cfg: CFG): Set<string> {
  const nullable = new Set<string>();
  let changed = true;
  
  while (changed) {
    changed = false;
    for (const rule of cfg.productionRules) {
      if (nullable.has(rule.variable)) continue;
      
      // Rule produces ε directly
      if (rule.production === 'ε' || rule.production === '') {
        nullable.add(rule.variable);
        changed = true;
        continue;
      }
      
      // Check if all symbols in production are nullable
      const allNullable = [...rule.production].every(
        sym => nullable.has(sym)
      );
      
      if (allNullable) {
        nullable.add(rule.variable);
        changed = true;
      }
    }
  }
  
  return nullable;
}

/**
 * Step 2: Eliminate ε-productions
 */
function eliminateEpsilonProductions(cfg: CFG): { cfg: CFG; nullable: Set<string> } {
  const nullable = findNullableVariables(cfg);
  const newRules: ProductionRule[] = [];
  
  for (const rule of cfg.productionRules) {
    // Skip direct ε-productions
    if (rule.production === 'ε' || rule.production === '') {
      continue;
    }
    
    // Generate all combinations with nullable symbols present/absent
    const production = rule.production;
    const nullablePositions: number[] = [];
    
    for (let i = 0; i < production.length; i++) {
      if (nullable.has(production[i])) {
        nullablePositions.push(i);
      }
    }
    
    // Generate 2^n combinations
    const numCombinations = 1 << nullablePositions.length;
    const seenProductions = new Set<string>();
    
    for (let mask = 0; mask < numCombinations; mask++) {
      let newProd = '';
      let skipIndex = 0;
      
      for (let i = 0; i < production.length; i++) {
        if (nullablePositions.includes(i)) {
          // Include this symbol only if the corresponding bit is NOT set
          if (!((mask >> skipIndex) & 1)) {
            newProd += production[i];
          }
          skipIndex++;
        } else {
          newProd += production[i];
        }
      }
      
      // Don't add empty productions (unless it's the start symbol)
      if (newProd && !seenProductions.has(newProd)) {
        seenProductions.add(newProd);
        newRules.push({
          id: generateId(),
          variable: rule.variable,
          production: newProd
        });
      }
    }
  }
  
  // If start symbol is nullable, add S' -> S | ε
  let newStartSymbol = cfg.startSymbol;
  let newVariables = [...cfg.variables];
  
  if (nullable.has(cfg.startSymbol)) {
    // Add new start symbol
    newStartSymbol = cfg.startSymbol + "'";
    while (cfg.variables.includes(newStartSymbol)) {
      newStartSymbol += "'";
    }
    newVariables = [newStartSymbol, ...cfg.variables];
    
    // Add S' -> S and S' -> ε
    newRules.unshift(
      { id: generateId(), variable: newStartSymbol, production: cfg.startSymbol },
      { id: generateId(), variable: newStartSymbol, production: 'ε' }
    );
  }
  
  return {
    cfg: {
      variables: newVariables,
      terminals: cfg.terminals,
      startSymbol: newStartSymbol,
      productionRules: newRules
    },
    nullable
  };
}

/**
 * Step 3: Find unit pairs (A, B) where A =>* B using only unit productions
 */
function findUnitPairs(cfg: CFG): Map<string, Set<string>> {
  const unitPairs = new Map<string, Set<string>>();
  
  // Initialize: each variable derives itself
  for (const v of cfg.variables) {
    unitPairs.set(v, new Set([v]));
  }
  
  // Find direct unit productions
  const directUnit = new Map<string, Set<string>>();
  for (const rule of cfg.productionRules) {
    if (rule.production.length === 1 && cfg.variables.includes(rule.production)) {
      const existing = directUnit.get(rule.variable) || new Set();
      existing.add(rule.production);
      directUnit.set(rule.variable, existing);
    }
  }
  
  // Compute transitive closure
  let changed = true;
  while (changed) {
    changed = false;
    for (const [, aDerivesSet] of unitPairs) {
      for (const b of Array.from(aDerivesSet)) {
        const bDirectUnit = directUnit.get(b);
        if (bDirectUnit) {
          for (const c of bDirectUnit) {
            if (!aDerivesSet.has(c)) {
              aDerivesSet.add(c);
              changed = true;
            }
          }
        }
      }
    }
  }
  
  return unitPairs;
}

/**
 * Step 4: Eliminate unit productions
 */
function eliminateUnitProductions(cfg: CFG): CFG {
  const unitPairs = findUnitPairs(cfg);
  const newRules: ProductionRule[] = [];
  const seenRules = new Set<string>();
  
  for (const [a, derivesSet] of unitPairs) {
    for (const b of derivesSet) {
      // Find all non-unit productions of B
      for (const rule of cfg.productionRules) {
        if (rule.variable !== b) continue;
        
        // Skip unit productions
        if (rule.production.length === 1 && cfg.variables.includes(rule.production)) {
          continue;
        }
        
        // Skip ε-productions
        if (rule.production === 'ε' || rule.production === '') {
          continue;
        }
        
        const ruleKey = `${a}->${rule.production}`;
        if (!seenRules.has(ruleKey)) {
          seenRules.add(ruleKey);
          newRules.push({
            id: generateId(),
            variable: a,
            production: rule.production
          });
        }
      }
    }
  }
  
  // Keep ε-production for start symbol if it existed
  const hasStartEpsilon = cfg.productionRules.some(
    r => r.variable === cfg.startSymbol && (r.production === 'ε' || r.production === '')
  );
  if (hasStartEpsilon) {
    newRules.push({
      id: generateId(),
      variable: cfg.startSymbol,
      production: 'ε'
    });
  }
  
  return {
    ...cfg,
    productionRules: newRules
  };
}

/**
 * Step 5: Find reachable and generating symbols (eliminate useless symbols)
 */
function eliminateUselessSymbols(cfg: CFG): CFG {
  // Step 5a: Find generating symbols (can derive a terminal string)
  const generating = new Set<string>(cfg.terminals);
  let changed = true;
  
  while (changed) {
    changed = false;
    for (const rule of cfg.productionRules) {
      if (generating.has(rule.variable)) continue;
      
      if (rule.production === 'ε' || rule.production === '') {
        generating.add(rule.variable);
        changed = true;
        continue;
      }
      
      const allGenerating = [...rule.production].every(sym => generating.has(sym));
      if (allGenerating) {
        generating.add(rule.variable);
        changed = true;
      }
    }
  }
  
  // Remove non-generating productions
  let rules = cfg.productionRules.filter(rule => {
    if (!generating.has(rule.variable)) return false;
    if (rule.production === 'ε' || rule.production === '') return true;
    return [...rule.production].every(sym => generating.has(sym));
  });
  
  // Step 5b: Find reachable symbols from start
  const reachable = new Set<string>([cfg.startSymbol]);
  changed = true;
  
  while (changed) {
    changed = false;
    for (const rule of rules) {
      if (!reachable.has(rule.variable)) continue;
      
      for (const sym of rule.production) {
        if (!reachable.has(sym) && sym !== 'ε') {
          reachable.add(sym);
          changed = true;
        }
      }
    }
  }
  
  // Keep only reachable symbols
  rules = rules.filter(rule => reachable.has(rule.variable));
  
  const newVariables = cfg.variables.filter(v => reachable.has(v) && generating.has(v));
  const newTerminals = cfg.terminals.filter(t => reachable.has(t));
  
  return {
    variables: newVariables,
    terminals: newTerminals,
    startSymbol: cfg.startSymbol,
    productionRules: rules
  };
}

/**
 * Step 6: Convert to Chomsky Normal Form (intermediate step for GNF)
 * Note: This function is provided for completeness but not used in the current
 * simplified conversion. It can be enabled for a more thorough GNF conversion.
 */
export function toChomskyNormalForm(cfg: CFG): CFG {
  const newRules: ProductionRule[] = [];
  const terminalVars = new Map<string, string>(); // terminal -> new variable
  let varCounter = 0;
  
  // Create variables for terminals
  for (const t of cfg.terminals) {
    const newVar = `T${t.toUpperCase()}`;
    terminalVars.set(t, newVar);
  }
  
  for (const rule of cfg.productionRules) {
    // Keep ε-productions for start symbol
    if (rule.production === 'ε' || rule.production === '') {
      newRules.push({ ...rule, id: generateId() });
      continue;
    }
    
    // Single terminal - convert to A -> T_a
    if (rule.production.length === 1 && cfg.terminals.includes(rule.production)) {
      newRules.push({
        id: generateId(),
        variable: rule.variable,
        production: terminalVars.get(rule.production)!
      });
      continue;
    }
    
    // Single variable - keep as is
    if (rule.production.length === 1 && cfg.variables.includes(rule.production)) {
      newRules.push({ ...rule, id: generateId() });
      continue;
    }
    
    // Replace terminals with their variables in longer productions
    let workingProd = '';
    for (const sym of rule.production) {
      if (cfg.terminals.includes(sym)) {
        workingProd += terminalVars.get(sym);
      } else {
        workingProd += sym;
      }
    }
    
    // Break down into binary productions
    if (workingProd.length === 2) {
      newRules.push({
        id: generateId(),
        variable: rule.variable,
        production: workingProd
      });
    } else {
      // Create chain of binary productions
      let currentVar = rule.variable;
      const symbols = parseSymbols(workingProd, [...cfg.variables, ...Array.from(terminalVars.values())]);
      
      for (let i = 0; i < symbols.length - 2; i++) {
        const newVar = `X${varCounter++}`;
        newRules.push({
          id: generateId(),
          variable: currentVar,
          production: symbols[i] + newVar
        });
        currentVar = newVar;
      }
      
      // Last binary production
      newRules.push({
        id: generateId(),
        variable: currentVar,
        production: symbols[symbols.length - 2] + symbols[symbols.length - 1]
      });
    }
  }
  
  // Add terminal variable productions
  for (const [t, v] of terminalVars) {
    newRules.push({
      id: generateId(),
      variable: v,
      production: t
    });
  }
  
  // Collect all new variables
  const newVariables = new Set(cfg.variables);
  for (const v of terminalVars.values()) {
    newVariables.add(v);
  }
  for (const rule of newRules) {
    newVariables.add(rule.variable);
    // Parse production for variables
    for (const sym of parseSymbols(rule.production, Array.from(newVariables))) {
      if (sym.length > 1 || (sym.length === 1 && /[A-Z]/.test(sym))) {
        newVariables.add(sym);
      }
    }
  }
  
  return {
    variables: Array.from(newVariables),
    terminals: cfg.terminals,
    startSymbol: cfg.startSymbol,
    productionRules: newRules
  };
}

// Parse a string into symbols (variables can be multi-character)
function parseSymbols(str: string, variables: string[]): string[] {
  const symbols: string[] = [];
  let i = 0;
  
  // Sort variables by length (longest first) for greedy matching
  const sortedVars = [...variables].sort((a, b) => b.length - a.length);
  
  while (i < str.length) {
    let matched = false;
    
    for (const v of sortedVars) {
      if (str.substring(i, i + v.length) === v) {
        symbols.push(v);
        i += v.length;
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      symbols.push(str[i]);
      i++;
    }
  }
  
  return symbols;
}

/**
 * Step 7: Convert to Greibach Normal Form (simplified approach)
 * GNF: A -> aα where a is terminal and α is string of variables
 * 
 * For educational purposes, we use a simplified conversion that works
 * for most common grammars. A full GNF conversion is quite complex.
 * Note: This function is provided for completeness but not used in the current
 * simplified conversion.
 */
export function toGreibachNormalForm(cfg: CFG): CFG {
  // For simplicity, we'll work with the existing rules and ensure they start with terminals
  // This is a simplified approach - full GNF conversion requires more complex transformations
  
  const newRules: ProductionRule[] = [];
  const terminalRules = new Map<string, string[]>(); // variable -> terminals it can produce
  
  // First pass: identify which variables can directly produce terminals
  for (const rule of cfg.productionRules) {
    if (rule.production.length >= 1 && cfg.terminals.includes(rule.production[0])) {
      const existing = terminalRules.get(rule.variable) || [];
      existing.push(rule.production);
      terminalRules.set(rule.variable, existing);
      newRules.push({ ...rule, id: generateId() });
    }
  }
  
  // Second pass: for rules starting with variables, substitute
  let changed = true;
  let iterations = 0;
  const maxIterations = 100; // Prevent infinite loops
  
  let workingRules = cfg.productionRules.filter(
    r => r.production.length >= 1 && cfg.variables.includes(r.production[0])
  );
  
  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;
    const newWorkingRules: ProductionRule[] = [];
    
    for (const rule of workingRules) {
      const firstSym = parseSymbols(rule.production, cfg.variables)[0];
      
      if (cfg.terminals.includes(firstSym)) {
        // Already in GNF form
        if (!newRules.some(r => r.variable === rule.variable && r.production === rule.production)) {
          newRules.push({ ...rule, id: generateId() });
        }
        continue;
      }
      
      // Find productions for the first variable
      const substitutions = cfg.productionRules.filter(r => r.variable === firstSym);
      const rest = rule.production.substring(firstSym.length);
      
      for (const sub of substitutions) {
        if (sub.production === 'ε' || sub.production === '') {
          if (rest) {
            newWorkingRules.push({
              id: generateId(),
              variable: rule.variable,
              production: rest
            });
            changed = true;
          }
        } else {
          const newProd = sub.production + rest;
          newWorkingRules.push({
            id: generateId(),
            variable: rule.variable,
            production: newProd
          });
          changed = true;
        }
      }
    }
    
    workingRules = newWorkingRules;
  }
  
  // Add remaining working rules that are now in GNF
  for (const rule of workingRules) {
    const firstSym = rule.production[0];
    if (cfg.terminals.includes(firstSym)) {
      if (!newRules.some(r => r.variable === rule.variable && r.production === rule.production)) {
        newRules.push(rule);
      }
    }
  }
  
  // Add ε-production for start if needed
  const hasStartEpsilon = cfg.productionRules.some(
    r => r.variable === cfg.startSymbol && (r.production === 'ε' || r.production === '')
  );
  if (hasStartEpsilon) {
    newRules.push({
      id: generateId(),
      variable: cfg.startSymbol,
      production: 'ε'
    });
  }
  
  return {
    ...cfg,
    productionRules: newRules
  };
}

/**
 * Main conversion function: CFG to PDA with step tracking
 */
export function convertCFGtoPDA(inputCFG: CFG): ConversionResult {
  const steps: ConversionStep[] = [];
  let stepNum = 1;
  
  // Step 0: Show original CFG
  steps.push({
    stepNumber: stepNum++,
    title: 'Original Context-Free Grammar',
    description: `Starting with the input CFG:\n\nVariables (V): {${inputCFG.variables.join(', ')}}\nTerminals (Σ): {${inputCFG.terminals.join(', ')}}\nStart Symbol: ${inputCFG.startSymbol}\n\nProduction Rules:\n${formatRules(inputCFG.productionRules)}`,
    highlightedElements: [inputCFG.startSymbol]
  });
  
  let cfg = cloneCFG(inputCFG);
  
  // Step 1: Eliminate ε-productions
  const { cfg: cfgNoEpsilon, nullable } = eliminateEpsilonProductions(cfg);
  
  if (nullable.size > 0) {
    steps.push({
      stepNumber: stepNum++,
      title: 'Eliminating ε-Productions',
      description: `Found nullable variables: {${Array.from(nullable).join(', ')}}\n\nFor each production containing nullable variables, we create new productions with all combinations of those variables present or absent.\n\nResulting grammar:\n${formatRules(cfgNoEpsilon.productionRules)}`,
      highlightedElements: Array.from(nullable)
    });
    cfg = cfgNoEpsilon;
  } else {
    steps.push({
      stepNumber: stepNum++,
      title: 'Eliminating ε-Productions',
      description: 'No ε-productions found (except possibly for start symbol). Grammar unchanged.',
      highlightedElements: []
    });
  }
  
  // Step 2: Eliminate unit productions
  const cfgNoUnit = eliminateUnitProductions(cfg);
  const unitCount = cfg.productionRules.filter(
    r => r.production.length === 1 && cfg.variables.includes(r.production)
  ).length;
  
  if (unitCount > 0) {
    steps.push({
      stepNumber: stepNum++,
      title: 'Eliminating Unit Productions',
      description: `Found ${unitCount} unit production(s) (A → B where B is a variable).\n\nFor each unit pair (A, B) where A ⇒* B, we add A → α for every non-unit production B → α.\n\nResulting grammar:\n${formatRules(cfgNoUnit.productionRules)}`,
      highlightedElements: cfgNoUnit.variables
    });
    cfg = cfgNoUnit;
  } else {
    steps.push({
      stepNumber: stepNum++,
      title: 'Eliminating Unit Productions',
      description: 'No unit productions found. Grammar unchanged.',
      highlightedElements: []
    });
  }
  
  // Step 3: Eliminate useless symbols
  const cfgUseful = eliminateUselessSymbols(cfg);
  const removedVars = cfg.variables.filter(v => !cfgUseful.variables.includes(v));
  
  if (removedVars.length > 0) {
    steps.push({
      stepNumber: stepNum++,
      title: 'Eliminating Useless Symbols',
      description: `Removed non-generating or unreachable symbols: {${removedVars.join(', ')}}\n\nResulting grammar:\n${formatRules(cfgUseful.productionRules)}`,
      highlightedElements: removedVars
    });
    cfg = cfgUseful;
  } else {
    steps.push({
      stepNumber: stepNum++,
      title: 'Eliminating Useless Symbols',
      description: 'All symbols are useful (generating and reachable). Grammar unchanged.',
      highlightedElements: []
    });
  }
  
  // Step 4: Note about GNF (we use a simplified direct conversion for the PDA)
  steps.push({
    stepNumber: stepNum++,
    title: 'Preparing for PDA Construction',
    description: `The cleaned CFG is ready for PDA construction.\n\nGrammar:\nV = {${cfg.variables.join(', ')}}\nΣ = {${cfg.terminals.join(', ')}}\nS = ${cfg.startSymbol}\n\nProductions:\n${formatRules(cfg.productionRules)}\n\nWe will now construct an equivalent PDA using the standard 3-state construction.`,
    highlightedElements: cfg.variables
  });
  
  // Step 5: Construct PDA
  const pda = constructPDA(cfg);
  
  steps.push({
    stepNumber: stepNum++,
    title: 'PDA State Structure',
    description: `Creating a 3-state PDA:\n\n• q_start: Initial state\n• q_loop: Main processing state where we simulate derivations\n• q_accept: Final accepting state\n\nStates Q = {${pda.states.join(', ')}}\nInput Alphabet Σ = {${pda.inputAlphabet.join(', ')}}\nStack Alphabet Γ = {${pda.stackAlphabet.join(', ')}}\nStart State: ${pda.startState}\nStart Stack Symbol: ${pda.startStackSymbol}\nAccept States: {${pda.acceptStates.join(', ')}}`,
    highlightedElements: pda.states
  });
  
  // Step 6: Initial transition
  steps.push({
    stepNumber: stepNum++,
    title: 'Initial Transition',
    description: `Add the initial transition to push the start symbol onto the stack:\n\nδ(q_start, ε, Z₀) = (q_loop, ${cfg.startSymbol}Z₀)\n\nThis means: Without reading any input, replace the initial stack symbol Z₀ with the start symbol ${cfg.startSymbol} followed by Z₀, and move to the loop state.`,
    highlightedElements: [`${cfg.startSymbol}Z₀`]
  });
  
  // Step 7: Production transitions
  const prodTransitions = pda.transitions.filter(
    t => t.currentState === 'q_loop' && t.nextState === 'q_loop' && 
    (t.inputSymbol !== '' || cfg.variables.includes(t.poppedSymbol))
  );
  
  const transitionDescriptions = prodTransitions
    .filter(t => cfg.variables.includes(t.poppedSymbol))
    .map(t => {
      const input = t.inputSymbol || 'ε';
      const push = t.pushedSymbols || 'ε';
      return `δ(q_loop, ${input}, ${t.poppedSymbol}) = (q_loop, ${push})`;
    })
    .join('\n');
  
  steps.push({
    stepNumber: stepNum++,
    title: 'Production Rule Transitions',
    description: `For each production rule A → aα (where a is terminal/ε and α is a string of symbols), add:\n\nδ(q_loop, a, A) = (q_loop, α)\n\nGenerated transitions:\n${transitionDescriptions}\n\nThese transitions simulate leftmost derivations by:\n1. Reading the terminal 'a' from input\n2. Popping variable 'A' from stack\n3. Pushing the remaining symbols 'α' onto the stack`,
    highlightedElements: cfg.productionRules.map(r => `${r.variable}→${r.production}`)
  });
  
  // Step 8: Terminal matching transitions
  const terminalTransitions = pda.transitions.filter(
    t => t.currentState === 'q_loop' && cfg.terminals.includes(t.poppedSymbol)
  );
  
  if (terminalTransitions.length > 0) {
    const termTransDesc = terminalTransitions
      .map(t => `δ(q_loop, ${t.inputSymbol}, ${t.poppedSymbol}) = (q_loop, ε)`)
      .join('\n');
    
    steps.push({
      stepNumber: stepNum++,
      title: 'Terminal Matching Transitions',
      description: `For each terminal 'a', add a transition that matches it:\n\nδ(q_loop, a, a) = (q_loop, ε)\n\nGenerated transitions:\n${termTransDesc}\n\nThese transitions match terminals on the stack with input symbols.`,
      highlightedElements: cfg.terminals
    });
  }
  
  // Step 9: Final transition
  steps.push({
    stepNumber: stepNum++,
    title: 'Accepting Transition',
    description: `Add the final accepting transition:\n\nδ(q_loop, ε, Z₀) = (q_accept, ε)\n\nWhen the stack contains only the initial marker Z₀ (meaning all symbols have been processed), we can move to the accept state.\n\nThe PDA accepts by final state - a string is accepted if we can reach q_accept after consuming all input.`,
    highlightedElements: ['q_accept', 'Z₀']
  });
  
  // Final summary
  steps.push({
    stepNumber: stepNum++,
    title: 'Conversion Complete',
    description: `The PDA construction is complete!\n\nPDA Summary:\n• States: {${pda.states.join(', ')}}\n• Input Alphabet: {${pda.inputAlphabet.join(', ')}}\n• Stack Alphabet: {${pda.stackAlphabet.join(', ')}}\n• Start State: ${pda.startState}\n• Start Stack Symbol: ${pda.startStackSymbol}\n• Accept States: {${pda.acceptStates.join(', ')}}\n• Total Transitions: ${pda.transitions.length}\n\nThis PDA accepts exactly the same language as the original CFG.`,
    highlightedElements: []
  });
  
  return {
    success: true,
    result: pda,
    steps
  };
}

/**
 * Construct PDA from (cleaned) CFG
 */
function constructPDA(cfg: CFG): PDA {
  const states = ['q_start', 'q_loop', 'q_accept'];
  const stackAlphabet = ['Z0', ...cfg.variables, ...cfg.terminals];
  const transitions: PDATransition[] = [];
  
  // Initial transition: (q_start, ε, Z0) -> (q_loop, S Z0)
  transitions.push({
    id: generateId(),
    currentState: 'q_start',
    inputSymbol: '',
    poppedSymbol: 'Z0',
    nextState: 'q_loop',
    pushedSymbols: cfg.startSymbol + 'Z0'
    // No originId - this is a structural transition, not derived from a specific rule
  });
  
  // For each production A -> α, add transitions
  for (const rule of cfg.productionRules) {
    if (rule.production === 'ε' || rule.production === '') {
      // A -> ε: (q_loop, ε, A) -> (q_loop, ε)
      transitions.push({
        id: generateId(),
        currentState: 'q_loop',
        inputSymbol: '',
        poppedSymbol: rule.variable,
        nextState: 'q_loop',
        pushedSymbols: '',
        originId: rule.id  // Track which CFG rule generated this transition
      });
    } else {
      const firstChar = rule.production[0];
      const rest = rule.production.substring(1);
      
      if (cfg.terminals.includes(firstChar)) {
        // Production starts with terminal: (q_loop, a, A) -> (q_loop, rest)
        transitions.push({
          id: generateId(),
          currentState: 'q_loop',
          inputSymbol: firstChar,
          poppedSymbol: rule.variable,
          nextState: 'q_loop',
          pushedSymbols: rest || '',
          originId: rule.id  // Track which CFG rule generated this transition
        });
      } else {
        // Production starts with variable - push entire production (will be processed by leftmost derivation)
        transitions.push({
          id: generateId(),
          currentState: 'q_loop',
          inputSymbol: '',
          poppedSymbol: rule.variable,
          nextState: 'q_loop',
          pushedSymbols: rule.production,
          originId: rule.id  // Track which CFG rule generated this transition
        });
      }
    }
  }
  
  // Terminal matching transitions: (q_loop, a, a) -> (q_loop, ε)
  for (const t of cfg.terminals) {
    transitions.push({
      id: generateId(),
      currentState: 'q_loop',
      inputSymbol: t,
      poppedSymbol: t,
      nextState: 'q_loop',
      pushedSymbols: ''
      // No originId - terminal matching is structural
    });
  }
  
  // Final transition: (q_loop, ε, Z0) -> (q_accept, ε)
  transitions.push({
    id: generateId(),
    currentState: 'q_loop',
    inputSymbol: '',
    poppedSymbol: 'Z0',
    nextState: 'q_accept',
    pushedSymbols: ''
    // No originId - acceptance is structural
  });
  
  return {
    states,
    inputAlphabet: cfg.terminals,
    stackAlphabet,
    startState: 'q_start',
    startStackSymbol: 'Z0',
    acceptStates: ['q_accept'],
    transitions
  };
}
