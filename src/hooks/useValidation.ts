import { useMemo } from 'react';
import type { CFG, PDA, ValidationResult, ValidationError } from '../types';

// Validation helpers
const isUpperCase = (str: string): boolean => /^[A-Z]$/.test(str);

// Allow lowercase letters, digits, and common grammar symbols
const isValidTerminal = (str: string): boolean => /^[a-z0-9()\[\]+\-*/=,]$/.test(str);

// For PDA input alphabet - same as terminals
const isValidInputSymbol = (str: string): boolean => /^[a-z0-9()\[\]+\-*/=,]$/.test(str);

const isValidStateName = (str: string): boolean => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(str);

export function validateCFG(cfg: CFG): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate variables (must be uppercase single letters)
  if (cfg.variables.length === 0) {
    errors.push({ field: 'variables', message: 'At least one variable is required' });
  } else {
    cfg.variables.forEach((v) => {
      if (!isUpperCase(v)) {
        errors.push({ 
          field: 'variables', 
          message: `Variable "${v}" must be a single uppercase letter (A-Z)` 
        });
      }
    });
    
    // Check for duplicates
    const uniqueVars = new Set(cfg.variables);
    if (uniqueVars.size !== cfg.variables.length) {
      errors.push({ field: 'variables', message: 'Duplicate variables are not allowed' });
    }
  }

  // Validate terminals (lowercase letters, digits, or common symbols)
  if (cfg.terminals.length === 0) {
    errors.push({ field: 'terminals', message: 'At least one terminal is required' });
  } else {
    cfg.terminals.forEach((t) => {
      if (!isValidTerminal(t)) {
        errors.push({ 
          field: 'terminals', 
          message: `Terminal "${t}" must be a single character: lowercase letter (a-z), digit (0-9), or symbol ( ) [ ] + - * / = ,` 
        });
      }
    });

    // Check for duplicates
    const uniqueTerms = new Set(cfg.terminals);
    if (uniqueTerms.size !== cfg.terminals.length) {
      errors.push({ field: 'terminals', message: 'Duplicate terminals are not allowed' });
    }
  }

  // Check for overlap between variables and terminals
  const varSet = new Set(cfg.variables);
  cfg.terminals.forEach(t => {
    if (varSet.has(t)) {
      errors.push({ 
        field: 'terminals', 
        message: `"${t}" cannot be both a variable and terminal` 
      });
    }
  });

  // Validate start symbol
  if (!cfg.startSymbol) {
    errors.push({ field: 'startSymbol', message: 'Start symbol is required' });
  } else if (!cfg.variables.includes(cfg.startSymbol)) {
    errors.push({ 
      field: 'startSymbol', 
      message: 'Start symbol must be one of the defined variables' 
    });
  }

  // Validate production rules
  if (cfg.productionRules.length === 0) {
    errors.push({ field: 'productionRules', message: 'At least one production rule is required' });
  } else {
    const allSymbols = new Set([...cfg.variables, ...cfg.terminals, 'ε']);
    
    cfg.productionRules.forEach((rule, index) => {
      if (!cfg.variables.includes(rule.variable)) {
        errors.push({ 
          field: `rule-${index}`, 
          message: `Production rule ${index + 1}: Left side must be a variable` 
        });
      }

      if (!rule.production || rule.production.trim() === '') {
        errors.push({ 
          field: `rule-${index}`, 
          message: `Production rule ${index + 1}: Right side cannot be empty (use ε for epsilon)` 
        });
      } else if (rule.production !== 'ε') {
        // Validate each symbol in production
        for (const char of rule.production) {
          if (!allSymbols.has(char)) {
            errors.push({ 
              field: `rule-${index}`, 
              message: `Production rule ${index + 1}: Unknown symbol "${char}" in production` 
            });
            break;
          }
        }
      }
    });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function validatePDA(pda: PDA): ValidationResult {
  const errors: ValidationError[] = [];

  // Validate states
  if (pda.states.length === 0) {
    errors.push({ field: 'states', message: 'At least one state is required' });
  } else {
    pda.states.forEach((s) => {
      if (!isValidStateName(s)) {
        errors.push({ 
          field: 'states', 
          message: `State "${s}" must start with a letter and contain only letters, numbers, or underscores` 
        });
      }
    });

    const uniqueStates = new Set(pda.states);
    if (uniqueStates.size !== pda.states.length) {
      errors.push({ field: 'states', message: 'Duplicate states are not allowed' });
    }
  }

  // Validate input alphabet
  if (pda.inputAlphabet.length === 0) {
    errors.push({ field: 'inputAlphabet', message: 'At least one input symbol is required' });
  } else {
    pda.inputAlphabet.forEach((s) => {
      if (!isValidInputSymbol(s)) {
        errors.push({ 
          field: 'inputAlphabet', 
          message: `Input symbol "${s}" must be a single character: lowercase letter, digit, or symbol ( ) [ ] + - * / = ,` 
        });
      }
    });
  }

  // Validate stack alphabet
  if (pda.stackAlphabet.length === 0) {
    errors.push({ field: 'stackAlphabet', message: 'At least one stack symbol is required' });
  }

  // Validate start state
  if (!pda.startState) {
    errors.push({ field: 'startState', message: 'Start state is required' });
  } else if (!pda.states.includes(pda.startState)) {
    errors.push({ 
      field: 'startState', 
      message: 'Start state must be one of the defined states' 
    });
  }

  // Validate start stack symbol
  if (!pda.startStackSymbol) {
    errors.push({ field: 'startStackSymbol', message: 'Start stack symbol is required' });
  } else if (!pda.stackAlphabet.includes(pda.startStackSymbol)) {
    errors.push({ 
      field: 'startStackSymbol', 
      message: 'Start stack symbol must be in the stack alphabet' 
    });
  }

  // Validate accept states
  pda.acceptStates.forEach((s) => {
    if (!pda.states.includes(s)) {
      errors.push({ 
        field: 'acceptStates', 
        message: `Accept state "${s}" must be one of the defined states` 
      });
    }
  });

  // Validate transitions
  const validInputSymbols = new Set([...pda.inputAlphabet, 'ε', '']);
  const validStackSymbols = new Set([...pda.stackAlphabet, 'ε', '']);

  pda.transitions.forEach((t, index) => {
    if (!pda.states.includes(t.currentState)) {
      errors.push({ 
        field: `transition-${index}`, 
        message: `Transition ${index + 1}: Current state "${t.currentState}" is not defined` 
      });
    }

    if (t.inputSymbol && !validInputSymbols.has(t.inputSymbol)) {
      errors.push({ 
        field: `transition-${index}`, 
        message: `Transition ${index + 1}: Input symbol "${t.inputSymbol}" is not in input alphabet` 
      });
    }

    if (t.poppedSymbol && !validStackSymbols.has(t.poppedSymbol)) {
      errors.push({ 
        field: `transition-${index}`, 
        message: `Transition ${index + 1}: Popped symbol "${t.poppedSymbol}" is not in stack alphabet` 
      });
    }

    if (!pda.states.includes(t.nextState)) {
      errors.push({ 
        field: `transition-${index}`, 
        message: `Transition ${index + 1}: Next state "${t.nextState}" is not defined` 
      });
    }

    // Validate pushed symbols
    if (t.pushedSymbols && t.pushedSymbols !== 'ε') {
      for (const char of t.pushedSymbols) {
        if (!pda.stackAlphabet.includes(char)) {
          errors.push({ 
            field: `transition-${index}`, 
            message: `Transition ${index + 1}: Pushed symbol "${char}" is not in stack alphabet` 
          });
          break;
        }
      }
    }
  });

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function useCFGValidation(cfg: CFG): ValidationResult {
  return useMemo(() => validateCFG(cfg), [cfg]);
}

export function usePDAValidation(pda: PDA): ValidationResult {
  return useMemo(() => validatePDA(pda), [pda]);
}
