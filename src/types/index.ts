// Type definitions for CFG and PDA structures

export type ConversionMode = 'cfg-to-pda' | 'pda-to-cfg';

// CFG Types
export interface ProductionRule {
  id: string;
  variable: string;
  production: string;
  originId?: string; // ID of the PDA transition that generated this rule (for origin tracking)
}

export interface CFG {
  variables: string[];
  terminals: string[];
  startSymbol: string;
  productionRules: ProductionRule[];
}

// PDA Types
export interface PDATransition {
  id: string;
  currentState: string;
  inputSymbol: string;      // ε represented as 'ε' or empty string
  poppedSymbol: string;
  nextState: string;
  pushedSymbols: string;    // Multiple symbols as a string (e.g., "AB" pushes A then B)
  originId?: string;        // ID of the CFG rule that generated this transition (for origin tracking)
}

export interface PDA {
  states: string[];
  inputAlphabet: string[];
  stackAlphabet: string[];
  startState: string;
  startStackSymbol: string;
  acceptStates: string[];
  transitions: PDATransition[];
}

// Validation Types
export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// Conversion Step Types (for step-by-step explanation)
export interface ConversionStep {
  stepNumber: number;
  title: string;
  description: string;
  highlightedElements?: string[];
  // Intermediate state for progressive visualization
  intermediatePda?: PDA;
  intermediateCfg?: CFG;
}

export interface ConversionResult {
  success: boolean;
  result: CFG | PDA | null;
  steps: ConversionStep[];
  errorMessage?: string;
}

// ============================================
// Simulation Types (for equivalence testing)
// ============================================

/**
 * State of PDA execution at a single point in time
 */
export interface PDAExecutionState {
  currentState: string;
  stack: string[];           // Top of stack is index 0
  inputPosition: number;     // Current position in input string
  inputString: string;       // The full input string being processed
  isAccepted: boolean | null; // null = still running, true = accepted, false = rejected
}

/**
 * A single step in PDA execution history
 */
export interface PDASimulationStep {
  stepNumber: number;
  before: PDAExecutionState;
  transition: PDATransition | null; // null for initial state
  after: PDAExecutionState;
}

/**
 * Result of running a string through a PDA
 */
export interface PDASimulationResult {
  accepted: boolean;
  steps: PDASimulationStep[];
  finalState: PDAExecutionState;
  errorMessage?: string; // If simulation failed (e.g., no valid path)
}

/**
 * Node in a CFG derivation tree
 */
export interface DerivationNode {
  id: string;
  symbol: string;           // Variable or terminal
  isTerminal: boolean;
  children: DerivationNode[];
  ruleUsed?: ProductionRule; // The rule used to expand this node (if not terminal)
  depth: number;
}

/**
 * A single step in CFG derivation
 */
export interface CFGDerivationStep {
  stepNumber: number;
  currentSententialForm: string; // The string of symbols (variables + terminals) at this step
  ruleApplied: ProductionRule | null; // null for initial state
  variableExpanded: string | null; // Which variable was expanded
  tree: DerivationNode; // Full tree state at this step
}

/**
 * Result of deriving a string from a CFG
 */
export interface CFGDerivationResult {
  success: boolean;
  targetString: string;
  steps: CFGDerivationStep[];
  finalTree: DerivationNode | null;
  errorMessage?: string; // If derivation failed
}

/**
 * Combined state for dual simulation
 */
export interface DualSimulationState {
  testString: string;
  currentStepIndex: number;
  pdaResult: PDASimulationResult | null;
  cfgResult: CFGDerivationResult | null;
  isRunning: boolean;
}
