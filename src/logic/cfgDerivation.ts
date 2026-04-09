/**
 * CFG Derivation Engine - Builds derivation trees for strings
 * 
 * This module implements a leftmost derivation builder that:
 * 1. Attempts to derive a target string from the start symbol
 * 2. Builds a derivation tree showing each rule application
 * 3. Returns step-by-step derivation for visualization
 */

import type { 
  CFG, 
  ProductionRule,
  DerivationNode, 
  CFGDerivationStep, 
  CFGDerivationResult 
} from '../types';

let nodeIdCounter = 0;

/**
 * Generate a unique node ID
 */
function generateNodeId(): string {
  return `node_${nodeIdCounter++}`;
}

/**
 * Create a leaf node (terminal or variable not yet expanded)
 */
function createNode(symbol: string, isTerminal: boolean, depth: number): DerivationNode {
  return {
    id: generateNodeId(),
    symbol,
    isTerminal,
    children: [],
    depth
  };
}

/**
 * Deep clone a derivation tree
 */
function cloneTree(node: DerivationNode): DerivationNode {
  return {
    ...node,
    children: node.children.map(cloneTree)
  };
}

/**
 * Get the current sentential form (yield) from a derivation tree
 */
function getSententialForm(node: DerivationNode): string {
  if (node.children.length === 0) {
    return node.symbol === 'ε' ? '' : node.symbol;
  }
  return node.children.map(getSententialForm).join('');
}

/**
 * Check if a symbol is a variable (non-terminal)
 * Variables are typically uppercase letters or [p,X,q] triples
 */
function isVariable(symbol: string, cfg: CFG): boolean {
  if (cfg.variables.includes(symbol)) return true;
  // Also check for triple variables like [p,X,q]
  return symbol.startsWith('[') && symbol.endsWith(']');
}

/**
 * Parse a production string into individual symbols
 */
function parseProduction(production: string, cfg: CFG): string[] {
  if (!production || production === 'ε') return [];
  
  const symbols: string[] = [];
  const parts = production.split(/\s+/);
  
  for (const part of parts) {
    if (!part) continue;
    
    // Check if it's a triple variable [p,X,q]
    if (part.startsWith('[') && part.endsWith(']')) {
      symbols.push(part);
    } else {
      // Check if it's a known variable
      if (cfg.variables.includes(part)) {
        symbols.push(part);
      } else {
        // Split into individual characters (terminals)
        for (const char of part) {
          symbols.push(char);
        }
      }
    }
  }
  
  return symbols;
}

/**
 * Find the leftmost variable in a tree that hasn't been expanded
 */
function findLeftmostVariable(node: DerivationNode, cfg: CFG): DerivationNode | null {
  // If this node is a variable and has no children, it's unexpanded
  if (!node.isTerminal && isVariable(node.symbol, cfg) && node.children.length === 0) {
    return node;
  }
  
  // Otherwise, search children left to right
  for (const child of node.children) {
    const found = findLeftmostVariable(child, cfg);
    if (found) return found;
  }
  
  return null;
}

/**
 * Expand a node with a production rule
 */
function expandNode(node: DerivationNode, rule: ProductionRule, cfg: CFG): void {
  const symbols = parseProduction(rule.production, cfg);
  
  if (symbols.length === 0) {
    // ε-production
    node.children = [createNode('ε', true, node.depth + 1)];
  } else {
    node.children = symbols.map(sym => 
      createNode(sym, !isVariable(sym, cfg), node.depth + 1)
    );
  }
  
  node.ruleUsed = rule;
}

/**
 * Get all terminals (leaves) from a tree in order
 */
function getTerminals(node: DerivationNode): string[] {
  if (node.children.length === 0) {
    if (node.isTerminal && node.symbol !== 'ε') {
      return [node.symbol];
    }
    return [];
  }
  return node.children.flatMap(getTerminals);
}

/**
 * Check if the current sentential form can possibly derive the target
 * This is a simple prefix check for early termination
 */
function canPossiblyDerive(tree: DerivationNode, target: string, _cfg: CFG): boolean {
  void _cfg; // Reserved for future heuristics
  const terminals = getTerminals(tree);
  const terminalPrefix = terminals.join('');
  
  // If we have more terminals than target, impossible
  if (terminalPrefix.length > target.length) {
    return false;
  }
  
  // Check if our terminal prefix matches the target prefix
  if (!target.startsWith(terminalPrefix)) {
    return false;
  }
  
  return true;
}

/**
 * Search state for backtracking
 */
interface SearchState {
  tree: DerivationNode;
  steps: CFGDerivationStep[];
  depth: number;
}

/**
 * Attempt to derive a target string from a CFG using backtracking
 * Uses leftmost derivation
 */
export function deriveCFG(cfg: CFG, targetString: string): CFGDerivationResult {
  // Reset node ID counter for consistent IDs
  nodeIdCounter = 0;
  
  // Handle empty string case
  const target = targetString;
  
  // Create initial tree with start symbol
  const initialTree = createNode(cfg.startSymbol, false, 0);
  
  const initialStep: CFGDerivationStep = {
    stepNumber: 0,
    currentSententialForm: cfg.startSymbol,
    ruleApplied: null,
    variableExpanded: null,
    tree: cloneTree(initialTree)
  };
  
  // Stack-based DFS for backtracking
  const stack: SearchState[] = [{
    tree: initialTree,
    steps: [initialStep],
    depth: 0
  }];
  
  // Track visited sentential forms to avoid redundant work
  const visited = new Set<string>();
  visited.add(cfg.startSymbol);
  
  // Depth limit to prevent infinite derivations
  const maxDepth = 100;
  
  while (stack.length > 0) {
    const current = stack.pop()!;
    
    // Check if we've derived the target
    const currentForm = getSententialForm(current.tree);
    if (currentForm === target) {
      return {
        success: true,
        targetString: target,
        steps: current.steps,
        finalTree: cloneTree(current.tree)
      };
    }
    
    // Depth limit check
    if (current.depth >= maxDepth) {
      continue;
    }
    
    // Early termination: check if we can possibly derive target
    if (!canPossiblyDerive(current.tree, target, cfg)) {
      continue;
    }
    
    // Find leftmost variable to expand
    const variable = findLeftmostVariable(current.tree, cfg);
    if (!variable) {
      // No more variables to expand, but didn't match target
      continue;
    }
    
    // Try all applicable production rules
    const applicableRules = cfg.productionRules.filter(r => r.variable === variable.symbol);
    
    // Sort rules to try more promising ones first (heuristic)
    // Prefer rules whose production starts with the next expected terminal
    const nextExpectedTerminal = target[getTerminals(current.tree).join('').length];
    
    const sortedRules = [...applicableRules].sort((a, b) => {
      const aProduction = parseProduction(a.production, cfg);
      const bProduction = parseProduction(b.production, cfg);
      
      const aFirstTerminal = aProduction.find(s => !isVariable(s, cfg));
      const bFirstTerminal = bProduction.find(s => !isVariable(s, cfg));
      
      if (aFirstTerminal === nextExpectedTerminal && bFirstTerminal !== nextExpectedTerminal) return -1;
      if (bFirstTerminal === nextExpectedTerminal && aFirstTerminal !== nextExpectedTerminal) return 1;
      return 0;
    });
    
    // Add all possibilities to stack (in reverse order for DFS)
    for (const rule of sortedRules.reverse()) {
      const newTree = cloneTree(current.tree);
      const nodeToExpand = findLeftmostVariable(newTree, cfg)!;
      expandNode(nodeToExpand, rule, cfg);
      
      const newForm = getSententialForm(newTree);
      
      // Skip if we've seen this sentential form
      if (visited.has(newForm)) {
        continue;
      }
      visited.add(newForm);
      
      const newStep: CFGDerivationStep = {
        stepNumber: current.steps.length,
        currentSententialForm: newForm,
        ruleApplied: rule,
        variableExpanded: variable.symbol,
        tree: cloneTree(newTree)
      };
      
      stack.push({
        tree: newTree,
        steps: [...current.steps, newStep],
        depth: current.depth + 1
      });
    }
  }
  
  // No derivation found
  return {
    success: false,
    targetString: target,
    steps: [{
      stepNumber: 0,
      currentSententialForm: cfg.startSymbol,
      ruleApplied: null,
      variableExpanded: null,
      tree: createNode(cfg.startSymbol, false, 0)
    }],
    finalTree: null,
    errorMessage: `Cannot derive "${target}" from this CFG`
  };
}

/**
 * Get a human-readable description of a derivation step
 */
export function describeDerivationStep(step: CFGDerivationStep): string {
  if (!step.ruleApplied) {
    return `Start: ${step.currentSententialForm}`;
  }
  
  const rule = step.ruleApplied;
  const production = rule.production || 'ε';
  
  return `${rule.variable} → ${production}`;
}

/**
 * Format the derivation as a sequence of sentential forms
 */
export function formatDerivation(steps: CFGDerivationStep[]): string {
  return steps.map(s => s.currentSententialForm).join(' ⇒ ');
}
