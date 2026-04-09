import { useState, useCallback, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import type { ConversionMode, CFG, PDA, ConversionStep, ValidationResult } from './types';
import { CFGInputBuilder } from './components/CFGInput';
import { PDAInputBuilder } from './components/PDAInput';
import { ResultsPanel } from './components/ResultsPanel';
import { PDAGraphWithExport, CFGVisualizer } from './components/Visualization';
import { EquivalenceTester } from './components/EquivalenceTester';
import { validateCFG, validatePDA } from './hooks/useValidation';
import { convertCFGtoPDA } from './logic/cfgToPda';
import { convertPDAtoCFG } from './logic/pdaToCfg';

const defaultCFG: CFG = {
  variables: ['S', 'B'],
  terminals: ['0', '1'],
  startSymbol: 'S',
  productionRules: [
    { id: 'default-1', variable: 'S', production: '0B' },
    { id: 'default-2', variable: 'B', production: '0S' },
    { id: 'default-3', variable: 'B', production: '1S' },
    { id: 'default-4', variable: 'B', production: '0' }
  ]
};

const defaultPDA: PDA = {
  states: ['q0', 'q1', 'q2'],
  inputAlphabet: ['a', 'b'],
  stackAlphabet: ['Z', 'A'],
  startState: 'q0',
  startStackSymbol: 'Z',
  acceptStates: ['q2'],
  transitions: [
    { id: 'default-pda-1', currentState: 'q0', inputSymbol: 'a', poppedSymbol: 'Z', nextState: 'q0', pushedSymbols: 'AZ' },
    { id: 'default-pda-2', currentState: 'q0', inputSymbol: 'a', poppedSymbol: 'A', nextState: 'q0', pushedSymbols: 'AA' },
    { id: 'default-pda-3', currentState: 'q0', inputSymbol: 'b', poppedSymbol: 'A', nextState: 'q1', pushedSymbols: '' },
    { id: 'default-pda-4', currentState: 'q1', inputSymbol: 'b', poppedSymbol: 'A', nextState: 'q1', pushedSymbols: '' },
    { id: 'default-pda-5', currentState: 'q1', inputSymbol: '', poppedSymbol: 'Z', nextState: 'q2', pushedSymbols: 'Z' }
  ]
};

// Example CFGs
const cfgExamples: { name: string; description: string; cfg: CFG }[] = [
  {
    name: '0B / 0S / 1S / 0',
    description: 'Default linear binary grammar',
    cfg: defaultCFG
  },
  {
    name: 'aⁿbⁿ',
    description: 'Equal number of a\'s followed by b\'s',
    cfg: {
      variables: ['S'],
      terminals: ['a', 'b'],
      startSymbol: 'S',
      productionRules: [
        { id: '1', variable: 'S', production: 'aSb' },
        { id: '2', variable: 'S', production: 'ab' }
      ]
    }
  },
  {
    name: 'Balanced Parentheses',
    description: 'Properly nested parentheses',
    cfg: {
      variables: ['S'],
      terminals: ['(', ')'],
      startSymbol: 'S',
      productionRules: [
        { id: '1', variable: 'S', production: '(S)' },
        { id: '2', variable: 'S', production: 'SS' },
        { id: '3', variable: 'S', production: 'ε' }
      ]
    }
  },
  {
    name: 'Palindromes',
    description: 'Strings that read same forwards and backwards',
    cfg: {
      variables: ['S'],
      terminals: ['a', 'b'],
      startSymbol: 'S',
      productionRules: [
        { id: '1', variable: 'S', production: 'aSa' },
        { id: '2', variable: 'S', production: 'bSb' },
        { id: '3', variable: 'S', production: 'a' },
        { id: '4', variable: 'S', production: 'b' },
        { id: '5', variable: 'S', production: 'ε' }
      ]
    }
  },
  {
    name: 'Arithmetic Expressions',
    description: 'Simple arithmetic with +, *, and parentheses',
    cfg: {
      variables: ['E', 'T', 'F'],
      terminals: ['a', '+', '*', '(', ')'],
      startSymbol: 'E',
      productionRules: [
        { id: '1', variable: 'E', production: 'E+T' },
        { id: '2', variable: 'E', production: 'T' },
        { id: '3', variable: 'T', production: 'T*F' },
        { id: '4', variable: 'T', production: 'F' },
        { id: '5', variable: 'F', production: '(E)' },
        { id: '6', variable: 'F', production: 'a' }
      ]
    }
  },
  {
    name: 'aⁿbⁿcⁿ (partial)',
    description: 'Equal a\'s and b\'s (note: full aⁿbⁿcⁿ is not context-free)',
    cfg: {
      variables: ['S', 'A', 'B'],
      terminals: ['a', 'b', 'c'],
      startSymbol: 'S',
      productionRules: [
        { id: '1', variable: 'S', production: 'AB' },
        { id: '2', variable: 'A', production: 'aAb' },
        { id: '3', variable: 'A', production: 'ε' },
        { id: '4', variable: 'B', production: 'cB' },
        { id: '5', variable: 'B', production: 'ε' }
      ]
    }
  },
  {
    name: 'ww^R',
    description: 'String followed by its reverse',
    cfg: {
      variables: ['S'],
      terminals: ['0', '1'],
      startSymbol: 'S',
      productionRules: [
        { id: '1', variable: 'S', production: '0S0' },
        { id: '2', variable: 'S', production: '1S1' },
        { id: '3', variable: 'S', production: 'ε' }
      ]
    }
  }
];

// Example PDAs
const pdaExamples: { name: string; description: string; pda: PDA }[] = [
  {
    name: 'Default PDA',
    description: 'Prefilled PDA example',
    pda: defaultPDA
  },
  {
    name: 'aⁿbⁿ',
    description: 'Equal number of a\'s followed by b\'s',
    pda: {
      states: ['q0', 'q1', 'q2'],
      inputAlphabet: ['a', 'b'],
      stackAlphabet: ['Z', 'A'],
      startState: 'q0',
      startStackSymbol: 'Z',
      acceptStates: ['q2'],
      transitions: [
        { id: '1', currentState: 'q0', inputSymbol: 'a', poppedSymbol: 'Z', nextState: 'q0', pushedSymbols: 'AZ' },
        { id: '2', currentState: 'q0', inputSymbol: 'a', poppedSymbol: 'A', nextState: 'q0', pushedSymbols: 'AA' },
        { id: '3', currentState: 'q0', inputSymbol: 'b', poppedSymbol: 'A', nextState: 'q1', pushedSymbols: '' },
        { id: '4', currentState: 'q1', inputSymbol: 'b', poppedSymbol: 'A', nextState: 'q1', pushedSymbols: '' },
        { id: '5', currentState: 'q1', inputSymbol: '', poppedSymbol: 'Z', nextState: 'q2', pushedSymbols: 'Z' }
      ]
    }
  },
  {
    name: 'Balanced Parentheses',
    description: 'Single-state PDA for nested parentheses',
    pda: {
      states: ['q0'],
      inputAlphabet: ['(', ')'],
      stackAlphabet: ['Z', 'X'],
      startState: 'q0',
      startStackSymbol: 'Z',
      acceptStates: ['q0'],
      transitions: [
        { id: '1', currentState: 'q0', inputSymbol: '(', poppedSymbol: 'Z', nextState: 'q0', pushedSymbols: 'XZ' },
        { id: '2', currentState: 'q0', inputSymbol: '(', poppedSymbol: 'X', nextState: 'q0', pushedSymbols: 'XX' },
        { id: '3', currentState: 'q0', inputSymbol: ')', poppedSymbol: 'X', nextState: 'q0', pushedSymbols: '' }
      ]
    }
  },
  {
    name: 'Palindromes (odd length)',
    description: 'Odd-length palindromes over {0, 1}',
    pda: {
      states: ['q0', 'q1', 'q2', 'q3'],
      inputAlphabet: ['0', '1'],
      stackAlphabet: ['Z', 'A', 'B'],
      startState: 'q0',
      startStackSymbol: 'Z',
      acceptStates: ['q3'],
      transitions: [
        { id: '1', currentState: 'q0', inputSymbol: '0', poppedSymbol: 'Z', nextState: 'q0', pushedSymbols: 'AZ' },
        { id: '2', currentState: 'q0', inputSymbol: '1', poppedSymbol: 'Z', nextState: 'q0', pushedSymbols: 'BZ' },
        { id: '3', currentState: 'q0', inputSymbol: '0', poppedSymbol: 'A', nextState: 'q0', pushedSymbols: 'AA' },
        { id: '4', currentState: 'q0', inputSymbol: '0', poppedSymbol: 'B', nextState: 'q0', pushedSymbols: 'AB' },
        { id: '5', currentState: 'q0', inputSymbol: '1', poppedSymbol: 'A', nextState: 'q0', pushedSymbols: 'BA' },
        { id: '6', currentState: 'q0', inputSymbol: '1', poppedSymbol: 'B', nextState: 'q0', pushedSymbols: 'BB' },
        { id: '7', currentState: 'q0', inputSymbol: '0', poppedSymbol: 'A', nextState: 'q1', pushedSymbols: 'A' },
        { id: '8', currentState: 'q0', inputSymbol: '1', poppedSymbol: 'B', nextState: 'q1', pushedSymbols: 'B' },
        { id: '9', currentState: 'q1', inputSymbol: '0', poppedSymbol: 'A', nextState: 'q1', pushedSymbols: '' },
        { id: '10', currentState: 'q1', inputSymbol: '1', poppedSymbol: 'B', nextState: 'q1', pushedSymbols: '' },
        { id: '11', currentState: 'q1', inputSymbol: '', poppedSymbol: 'Z', nextState: 'q3', pushedSymbols: '' }
      ]
    }
  },
  {
    name: 'a^i b^j (i ≤ j)',
    description: 'More or equal b\'s than a\'s',
    pda: {
      states: ['q0', 'q1', 'q2'],
      inputAlphabet: ['a', 'b'],
      stackAlphabet: ['Z', 'A'],
      startState: 'q0',
      startStackSymbol: 'Z',
      acceptStates: ['q2'],
      transitions: [
        { id: '1', currentState: 'q0', inputSymbol: 'a', poppedSymbol: 'Z', nextState: 'q0', pushedSymbols: 'AZ' },
        { id: '2', currentState: 'q0', inputSymbol: 'a', poppedSymbol: 'A', nextState: 'q0', pushedSymbols: 'AA' },
        { id: '3', currentState: 'q0', inputSymbol: 'b', poppedSymbol: 'A', nextState: 'q1', pushedSymbols: '' },
        { id: '4', currentState: 'q0', inputSymbol: 'b', poppedSymbol: 'Z', nextState: 'q2', pushedSymbols: 'Z' },
        { id: '5', currentState: 'q1', inputSymbol: 'b', poppedSymbol: 'A', nextState: 'q1', pushedSymbols: '' },
        { id: '6', currentState: 'q1', inputSymbol: 'b', poppedSymbol: 'Z', nextState: 'q2', pushedSymbols: 'Z' },
        { id: '7', currentState: 'q1', inputSymbol: '', poppedSymbol: 'Z', nextState: 'q2', pushedSymbols: '' },
        { id: '8', currentState: 'q2', inputSymbol: 'b', poppedSymbol: 'Z', nextState: 'q2', pushedSymbols: 'Z' }
      ]
    }
  },
  {
    name: 'Single State PDA',
    description: 'Accepts {wcw^R | w ∈ {a,b}*} using single state',
    pda: {
      states: ['q'],
      inputAlphabet: ['a', 'b', 'c'],
      stackAlphabet: ['Z', 'A', 'B'],
      startState: 'q',
      startStackSymbol: 'Z',
      acceptStates: ['q'],
      transitions: [
        { id: '1', currentState: 'q', inputSymbol: 'a', poppedSymbol: 'Z', nextState: 'q', pushedSymbols: 'AZ' },
        { id: '2', currentState: 'q', inputSymbol: 'b', poppedSymbol: 'Z', nextState: 'q', pushedSymbols: 'BZ' },
        { id: '3', currentState: 'q', inputSymbol: 'a', poppedSymbol: 'A', nextState: 'q', pushedSymbols: 'AA' },
        { id: '4', currentState: 'q', inputSymbol: 'a', poppedSymbol: 'B', nextState: 'q', pushedSymbols: 'AB' },
        { id: '5', currentState: 'q', inputSymbol: 'b', poppedSymbol: 'A', nextState: 'q', pushedSymbols: 'BA' },
        { id: '6', currentState: 'q', inputSymbol: 'b', poppedSymbol: 'B', nextState: 'q', pushedSymbols: 'BB' },
        { id: '7', currentState: 'q', inputSymbol: 'c', poppedSymbol: 'A', nextState: 'q', pushedSymbols: 'A' },
        { id: '8', currentState: 'q', inputSymbol: 'c', poppedSymbol: 'B', nextState: 'q', pushedSymbols: 'B' },
        { id: '9', currentState: 'q', inputSymbol: 'c', poppedSymbol: 'Z', nextState: 'q', pushedSymbols: 'Z' },
        { id: '10', currentState: 'q', inputSymbol: 'a', poppedSymbol: 'A', nextState: 'q', pushedSymbols: '' },
        { id: '11', currentState: 'q', inputSymbol: 'b', poppedSymbol: 'B', nextState: 'q', pushedSymbols: '' },
        { id: '12', currentState: 'q', inputSymbol: '', poppedSymbol: 'Z', nextState: 'q', pushedSymbols: '' }
      ]
    }
  }
];

function App() {
  // Core state
  const [mode, setMode] = useState<ConversionMode>('cfg-to-pda');
  const [cfg, setCfg] = useState<CFG>(defaultCFG);
  const [pda, setPda] = useState<PDA>(defaultPDA);
  const [showExamples, setShowExamples] = useState(false);

  // Conversion state
  const [steps, setSteps] = useState<ConversionStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [result, setResult] = useState<CFG | PDA | null>(null);
  const [isConverting, setIsConverting] = useState(false);

  // Origin Tracker: shared hover state for linking CFG rules and PDA transitions
  const [hoveredOriginId, setHoveredOriginId] = useState<string | null>(null);
  
  // Debug: Log when hoveredOriginId changes
  useEffect(() => {
    if (hoveredOriginId) {
      console.log('[App] hoveredOriginId changed to:', hoveredOriginId);
    }
  }, [hoveredOriginId]);

  // Validation
  const cfgValidation: ValidationResult = validateCFG(cfg);
  const pdaValidation: ValidationResult = validatePDA(pda);

  const hasInput = mode === 'cfg-to-pda' 
    ? cfg.variables.length > 0 || cfg.terminals.length > 0
    : pda.states.length > 0;

  const canConvert = mode === 'cfg-to-pda' 
    ? cfgValidation.isValid 
    : pdaValidation.isValid;

  const handleModeChange = (newMode: ConversionMode) => {
    if (newMode === 'pda-to-cfg') {
      toast('PDA → CFG conversion is under active improvement. Results are educational and may occasionally need manual verification.', {
        icon: 'ℹ️',
        duration: 4500,
      });
    }
    setMode(newMode);
    setSteps([]);
    setCurrentStepIndex(0);
    setResult(null);
    setShowExamples(false);
  };

  const handleConvert = useCallback(async () => {
    setIsConverting(true);
    setSteps([]);
    setResult(null);

    // Simulate async processing
    await new Promise(resolve => setTimeout(resolve, 300));

    try {
      if (mode === 'cfg-to-pda') {
        const conversionResult = convertCFGtoPDA(cfg);
        if (conversionResult.success) {
          setSteps(conversionResult.steps);
          setResult(conversionResult.result);
          toast.success(`Successfully converted CFG to PDA with ${conversionResult.steps.length} steps!`, {
            duration: 3000,
            icon: '🎉',
          });
        } else {
          toast.error(conversionResult.errorMessage || 'Conversion failed', {
            duration: 4000,
          });
        }
      } else {
        // PDA to CFG conversion
        const conversionResult = convertPDAtoCFG(pda);
        if (conversionResult.success) {
          setSteps(conversionResult.steps);
          setResult(conversionResult.result);
          toast.success(`Successfully converted PDA to CFG with ${conversionResult.steps.length} steps!`, {
            duration: 3000,
            icon: '🎉',
          });
        } else {
          toast.error(conversionResult.errorMessage || 'Conversion failed', {
            duration: 4000,
          });
        }
      }
    } catch (error) {
      toast.error(`Conversion error: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        duration: 4000,
      });
    }

    setCurrentStepIndex(0);
    setIsConverting(false);
  }, [mode, cfg, pda]);

  const handleReset = () => {
    if (mode === 'cfg-to-pda') {
      setCfg(defaultCFG);
    } else {
      setPda(defaultPDA);
    }
    setSteps([]);
    setCurrentStepIndex(0);
    setResult(null);
    toast('Reset complete', { icon: '🔄', duration: 1500 });
  };

  const loadExample = (index: number) => {
    const exampleName = mode === 'cfg-to-pda' ? cfgExamples[index].name : pdaExamples[index].name;
    if (mode === 'cfg-to-pda') {
      setCfg(cfgExamples[index].cfg);
    } else {
      setPda(pdaExamples[index].pda);
    }
    setSteps([]);
    setCurrentStepIndex(0);
    setResult(null);
    setShowExamples(false);
    toast.success(`Loaded "${exampleName}" example`, { duration: 2000, icon: '📄' });
  };

  const examples = mode === 'cfg-to-pda' ? cfgExamples : pdaExamples;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Toast Container */}
      <Toaster 
        position="top-right"
        toastOptions={{
          className: '',
          style: {
            borderRadius: '10px',
            background: '#333',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10b981',
            },
          },
          error: {
            style: {
              background: '#ef4444',
            },
          },
        }}
      />
      
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4 py-3 lg:h-16 lg:py-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">CFG ↔ PDA Converter</h1>
                <p className="text-xs text-gray-500 hidden sm:block">Interactive Automata Theory Tool</p>
              </div>
            </div>

            {/* Mode Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1 order-3 lg:order-none w-full lg:w-auto justify-center">
              <button
                onClick={() => handleModeChange('cfg-to-pda')}
                className={`flex-1 lg:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  mode === 'cfg-to-pda'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                CFG → PDA
              </button>
              <button
                onClick={() => handleModeChange('pda-to-cfg')}
                className={`flex-1 lg:flex-none px-4 py-2 text-sm font-medium rounded-md transition-all ${
                  mode === 'pda-to-cfg'
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                PDA → CFG
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setShowExamples(!showExamples)}
                  className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 
                    hover:bg-gray-100 rounded-lg transition-colors flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  <span className="hidden sm:inline">Examples</span>
                  <svg className={`w-4 h-4 transition-transform ${showExamples ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {/* Examples Dropdown */}
                {showExamples && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-50">
                    <div className="px-3 py-2 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        {mode === 'cfg-to-pda' ? 'CFG Examples' : 'PDA Examples'}
                      </p>
                    </div>
                    <div className="max-h-80 overflow-auto">
                      {examples.map((example, idx) => (
                        <button
                          key={idx}
                          onClick={() => loadExample(idx)}
                          className="w-full px-3 py-2.5 text-left hover:bg-indigo-50 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{example.name}</p>
                              <p className="text-xs text-gray-500">{example.description}</p>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={handleReset}
                className="px-3 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 
                  hover:bg-gray-100 rounded-lg transition-colors"
              >
                Reset
              </button>
              <button
                onClick={handleConvert}
                disabled={!canConvert || isConverting}
                className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all
                  ${canConvert && !isConverting
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {isConverting ? 'Converting...' : 'Convert'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Click outside to close dropdown */}
      {showExamples && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowExamples(false)}
        />
      )}

      {/* Main Content */}
      <main className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Input Panel - 3 cols */}
          <div className="lg:col-span-3 space-y-6">
            {mode === 'cfg-to-pda' ? (
              <CFGInputBuilder 
                cfg={cfg} 
                onChange={setCfg} 
                validation={cfgValidation}
                hoveredOriginId={hoveredOriginId}
                onHoverOriginChange={setHoveredOriginId}
              />
            ) : (
              <PDAInputBuilder 
                pda={pda} 
                onChange={setPda}
                validation={pdaValidation}
                hoveredOriginId={hoveredOriginId}
                onHoverOriginChange={setHoveredOriginId}
              />
            )}

            {/* Convert Button - Sticky at bottom */}
            <div className="sticky bottom-0 z-10 bg-white/90 backdrop-blur-sm border-t border-gray-200 pt-4 -mx-0 mt-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleConvert}
                  disabled={!canConvert || isConverting}
                  className={`flex-1 py-3 px-6 text-base font-semibold rounded-xl shadow-sm
                    transition-all duration-200 flex items-center justify-center gap-2
                    ${canConvert && !isConverting
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 hover:shadow-md'
                      : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    }`}
                >
                  {isConverting ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Converting...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      Convert
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Validation Errors Summary */}
            {(mode === 'cfg-to-pda' ? !cfgValidation.isValid : !pdaValidation.isValid) && hasInput && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <h4 className="text-sm font-medium text-red-800">Please fix the following errors:</h4>
                    <ul className="mt-2 text-sm text-red-700 list-disc list-inside space-y-1">
                      {(mode === 'cfg-to-pda' ? cfgValidation.errors : pdaValidation.errors)
                        .slice(0, 5)
                        .map((err, idx) => (
                          <li key={idx}>{err.message}</li>
                        ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results Panel - 4 cols */}
          <div className="lg:col-span-4">
            <ResultsPanel
              mode={mode}
              steps={steps}
              currentStepIndex={currentStepIndex}
              onStepChange={setCurrentStepIndex}
              result={result}
              isConverting={isConverting}
              hasInput={hasInput}
            />
          </div>

          {/* Visualization Panel - 5 cols */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden h-[500px] lg:h-[700px]">
              <div className="px-3 py-2 lg:px-4 lg:py-3 bg-gradient-to-r from-slate-50 to-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                      <svg className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800">Visualization</h3>
                      <p className="text-xs text-gray-500 hidden sm:block">
                        {mode === 'cfg-to-pda' ? 'PDA Graph' : 'CFG Rules'}
                      </p>
                    </div>
                  </div>
                  
                  {/* Legend - hide on small screens */}
                  <div className="hidden md:flex items-center gap-4 text-xs text-gray-500">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-indigo-400"></div>
                      <span>Start</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                      <span>Accept</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                      <span>Highlighted</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="h-[calc(100%-52px)] lg:h-[calc(100%-60px)]">
                {mode === 'cfg-to-pda' ? (
                  <PDAGraphWithExport 
                    pda={
                      // Show intermediate PDA during stepping, or final result
                      steps[currentStepIndex]?.intermediatePda || (result as PDA | null)
                    }
                    highlightedStates={steps[currentStepIndex]?.highlightedElements?.filter(e => {
                      const pdaToCheck = steps[currentStepIndex]?.intermediatePda || (result as PDA);
                      return pdaToCheck?.states?.includes(e);
                    }) || []}
                    highlightedTransitions={steps[currentStepIndex]?.highlightedElements?.filter(e => {
                      const pdaToCheck = steps[currentStepIndex]?.intermediatePda || (result as PDA);
                      return pdaToCheck?.transitions?.some(t => t.id === e);
                    }) || []}
                    hoveredOriginId={hoveredOriginId}
                    onHoverOriginChange={setHoveredOriginId}
                    inputCfg={cfg}
                  />
                ) : (
                  <CFGVisualizer 
                    cfg={
                      // Show intermediate CFG during stepping, or final result
                      steps[currentStepIndex]?.intermediateCfg || (result as CFG | null)
                    }
                    highlightedRules={steps[currentStepIndex]?.highlightedElements || []}
                    highlightedVariables={steps[currentStepIndex]?.highlightedElements?.filter(e => {
                      const cfgToCheck = steps[currentStepIndex]?.intermediateCfg || (result as CFG);
                      return cfgToCheck?.variables?.includes(e);
                    }) || []}
                    hoveredOriginId={hoveredOriginId}
                    onHoverOriginChange={setHoveredOriginId}
                    inputPda={pda}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Equivalence Tester - Only shown after successful PDA-to-CFG conversion */}
        {mode === 'pda-to-cfg' && result && (
          <div className="mt-8">
            <EquivalenceTester 
              pda={pda} 
              cfg={result as CFG} 
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            CFG ↔ PDA Converter — An educational tool for Theory of Automata and Formal Languages
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
