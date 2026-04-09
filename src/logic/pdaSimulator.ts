/**
 * PDA Simulator - Executes a string through a PDA and tracks the path
 * 
 * This module implements a non-deterministic PDA simulator that:
 * 1. Explores all possible computation paths
 * 2. Returns an accepting path if one exists
 * 3. Tracks state, stack, and input position at each step
 */

import type { 
  PDA, 
  PDATransition, 
  PDAExecutionState, 
  PDASimulationStep, 
  PDASimulationResult 
} from '../types';

/**
 * Create the initial execution state for a PDA
 */
function createInitialState(pda: PDA, inputString: string): PDAExecutionState {
  return {
    currentState: pda.startState,
    stack: [pda.startStackSymbol],
    inputPosition: 0,
    inputString,
    isAccepted: null
  };
}

/**
 * Clone an execution state
 */
function cloneState(state: PDAExecutionState): PDAExecutionState {
  return {
    ...state,
    stack: [...state.stack]
  };
}

/**
 * Check if a transition can be taken from the current state
 */
function canTakeTransition(
  transition: PDATransition,
  state: PDAExecutionState
): boolean {
  // Check if we're in the correct state
  if (transition.currentState !== state.currentState) {
    return false;
  }
  
  // Check stack precondition
  const pop = transition.poppedSymbol;
  const isEpsilonPop = pop === '' || pop === 'ε';
  if (!isEpsilonPop) {
    // Non-epsilon pop requires matching stack top
    if (state.stack.length === 0 || state.stack[0] !== pop) {
      return false;
    }
  }
  
  // Check input symbol
  const inputSymbol = transition.inputSymbol;
  
  if (inputSymbol === '' || inputSymbol === 'ε') {
    // ε-transition: can always be taken (don't consume input)
    return true;
  }
  
  // Regular transition: check if current input matches
  const currentInputChar = state.inputString[state.inputPosition];
  return currentInputChar === inputSymbol;
}

/**
 * Apply a transition to a state, returning the new state
 */
function applyTransition(
  pda: PDA,
  transition: PDATransition,
  state: PDAExecutionState
): PDAExecutionState {
  const newState = cloneState(state);
  
  // Pop only for non-epsilon pop transitions
  if (transition.poppedSymbol && transition.poppedSymbol !== 'ε') {
    newState.stack.shift();
  }
  
  // Push new symbols (if any)
  // Note: pushedSymbols string is pushed left-to-right, so first char ends up on top
  const pushed = transition.pushedSymbols;
  if (pushed && pushed !== '' && pushed !== 'ε') {
    // Tokenize using the PDA's stack alphabet (supports symbols like "Z0")
    const symbols = tokenizePushedSymbols(pushed, pda.stackAlphabet);
    // Push in reverse order so first symbol ends up on top
    for (let i = symbols.length - 1; i >= 0; i--) {
      newState.stack.unshift(symbols[i]);
    }
  }
  
  // Update state
  newState.currentState = transition.nextState;
  
  // Consume input if not ε-transition
  if (transition.inputSymbol && transition.inputSymbol !== '' && transition.inputSymbol !== 'ε') {
    newState.inputPosition++;
  }
  
  return newState;
}

/**
 * Tokenize pushed symbols using greedy longest-match on stack alphabet.
 */
function tokenizePushedSymbols(pushed: string, stackAlphabet: string[]): string[] {
  const trimmed = pushed.trim();
  if (!trimmed || trimmed === 'ε') return [];

  const tokens: string[] = [];
  let remaining = trimmed;
  const sortedAlphabet = [...stackAlphabet]
    .filter(symbol => symbol && symbol !== 'ε')
    .sort((a, b) => b.length - a.length);

  while (remaining.length > 0) {
    const match = sortedAlphabet.find(symbol => remaining.startsWith(symbol));
    if (match) {
      tokens.push(match);
      remaining = remaining.slice(match.length);
    } else {
      // Keep fallback for malformed input; validation should flag this upstream.
      tokens.push(remaining[0]);
      remaining = remaining.slice(1);
    }
  }

  return tokens;
}

/**
 * Check if the PDA is in an accepting configuration
 */
function isAcceptingConfiguration(
  pda: PDA,
  state: PDAExecutionState
): boolean {
  // Must have consumed all input
  if (state.inputPosition < state.inputString.length) {
    return false;
  }
  
  // Must be in an accept state
  return pda.acceptStates.includes(state.currentState);
}

/**
 * Represents a node in the search tree
 */
interface SearchNode {
  state: PDAExecutionState;
  path: PDASimulationStep[];
  depth: number;
}

/**
 * Simulate running an input string through a PDA
 * Uses BFS to find the shortest accepting path
 */
export function simulatePDA(pda: PDA, inputString: string): PDASimulationResult {
  const initialState = createInitialState(pda, inputString);
  
  // BFS queue
  const queue: SearchNode[] = [{
    state: initialState,
    path: [{
      stepNumber: 0,
      before: initialState,
      transition: null,
      after: initialState
    }],
    depth: 0
  }];
  
  // Track visited configurations to avoid infinite loops
  // Configuration = (state, stack contents, input position)
  const visited = new Set<string>();
  const configKey = (s: PDAExecutionState) => 
    `${s.currentState}|${s.stack.join(',')}|${s.inputPosition}`;
  
  visited.add(configKey(initialState));
  
  // Maximum depth to prevent infinite loops (ε-transitions can loop)
  const maxDepth = 1000;
  
  while (queue.length > 0) {
    const current = queue.shift()!;
    
    // Check if we've reached an accepting configuration
    if (isAcceptingConfiguration(pda, current.state)) {
      const finalState = { ...current.state, isAccepted: true };
      return {
        accepted: true,
        steps: current.path,
        finalState
      };
    }
    
    // Depth limit check
    if (current.depth >= maxDepth) {
      continue;
    }
    
    // Try all possible transitions
    for (const transition of pda.transitions) {
      if (canTakeTransition(transition, current.state)) {
        const newState = applyTransition(pda, transition, current.state);
        const key = configKey(newState);
        
        if (!visited.has(key)) {
          visited.add(key);
          
          const newStep: PDASimulationStep = {
            stepNumber: current.path.length,
            before: cloneState(current.state),
            transition,
            after: cloneState(newState)
          };
          
          queue.push({
            state: newState,
            path: [...current.path, newStep],
            depth: current.depth + 1
          });
        }
      }
    }
  }
  
  // No accepting path found
  const finalState = cloneState(initialState);
  finalState.isAccepted = false;
  
  return {
    accepted: false,
    steps: [{
      stepNumber: 0,
      before: initialState,
      transition: null,
      after: initialState
    }],
    finalState,
    errorMessage: `No accepting computation path found for input "${inputString}"`
  };
}

/**
 * Get a human-readable description of a simulation step
 */
export function describeStep(step: PDASimulationStep): string {
  if (!step.transition) {
    return `Initial configuration: state=${step.after.currentState}, stack=[${step.after.stack.join(',')}]`;
  }
  
  const t = step.transition;
  const input = t.inputSymbol || 'ε';
  const pushed = t.pushedSymbols || 'ε';
  
  return `δ(${t.currentState}, ${input}, ${t.poppedSymbol}) = (${t.nextState}, ${pushed})`;
}

/**
 * Format the current configuration for display
 */
export function formatConfiguration(state: PDAExecutionState): string {
  const remaining = state.inputString.slice(state.inputPosition) || 'ε';
  const stack = state.stack.length > 0 ? state.stack.join('') : 'ε';
  return `(${state.currentState}, ${remaining}, ${stack})`;
}
