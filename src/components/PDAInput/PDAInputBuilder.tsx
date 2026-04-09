import { useRef } from 'react';
import type { PDA, PDATransition, ValidationResult } from '../../types';
import { TagInput, SelectInput } from '../common';

// Helper to insert text at cursor position in an input
function insertAtCursor(input: HTMLInputElement, text: string): string {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const before = input.value.substring(0, start);
  const after = input.value.substring(end);
  return before + text + after;
}

interface PDAInputBuilderProps {
  pda: PDA;
  onChange: (pda: PDA) => void;
  validation: ValidationResult;
  // Origin Tracker props for linking PDA transitions to CFG rules
  hoveredOriginId?: string | null;
  onHoverOriginChange?: (id: string | null) => void;
}

export function PDAInputBuilder({ pda, onChange, validation, hoveredOriginId, onHoverOriginChange }: PDAInputBuilderProps) {
  const getFieldError = (field: string): string | undefined => {
    return validation.errors.find(e => e.field === field)?.message;
  };

  const handleStatesChange = (states: string[]) => {
    // Clear start/accept states if they're removed
    const newStartState = states.includes(pda.startState) ? pda.startState : '';
    const newAcceptStates = pda.acceptStates.filter(s => states.includes(s));
    onChange({ ...pda, states, startState: newStartState, acceptStates: newAcceptStates });
  };

  const handleInputAlphabetChange = (inputAlphabet: string[]) => {
    onChange({ ...pda, inputAlphabet });
  };

  const handleStackAlphabetChange = (stackAlphabet: string[]) => {
    const newStartStackSymbol = stackAlphabet.includes(pda.startStackSymbol) 
      ? pda.startStackSymbol 
      : '';
    onChange({ ...pda, stackAlphabet, startStackSymbol: newStartStackSymbol });
  };

  const handleAcceptStatesChange = (acceptStates: string[]) => {
    onChange({ ...pda, acceptStates });
  };

  const addTransition = () => {
    const newTransition: PDATransition = {
      id: crypto.randomUUID(),
      currentState: pda.states[0] || '',
      inputSymbol: '',
      poppedSymbol: '',
      nextState: pda.states[0] || '',
      pushedSymbols: ''
    };
    onChange({ ...pda, transitions: [...pda.transitions, newTransition] });
  };

  const updateTransition = (id: string, updates: Partial<PDATransition>) => {
    const newTransitions = pda.transitions.map(t =>
      t.id === id ? { ...t, ...updates } : t
    );
    onChange({ ...pda, transitions: newTransitions });
  };

  const removeTransition = (id: string) => {
    const newTransitions = pda.transitions.filter(t => t.id !== id);
    onChange({ ...pda, transitions: newTransitions });
  };

  const isValidStateName = (str: string) => /^[a-zA-Z][a-zA-Z0-9_]*$/.test(str);
  const isValidInputSymbol = (str: string) => /^[a-z0-9()[\]+\-*/=,]$/.test(str);
  const isValidStackSymbol = (str: string) => /^[A-Za-z0-9]$/.test(str);
  const isValidAcceptState = (str: string) => pda.states.includes(str);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Pushdown Automaton</h2>
          <p className="text-sm text-gray-500">Define your PDA components</p>
        </div>
      </div>

      <div className="space-y-1">
        {/* States */}
        <TagInput
          label="States (Q)"
          tags={pda.states}
          onTagsChange={handleStatesChange}
          placeholder="e.g., q0, q1, qf"
          validator={isValidStateName}
          validationHint="Start with letter, use letters/numbers/underscores"
        />
        {getFieldError('states') && (
          <p className="text-sm text-red-600 -mt-3 mb-4">{getFieldError('states')}</p>
        )}

        {/* Input Alphabet */}
        <TagInput
          label="Input Alphabet (Σ)"
          tags={pda.inputAlphabet}
          onTagsChange={handleInputAlphabetChange}
          placeholder="e.g., a, b, (, ), +"
          validator={isValidInputSymbol}
          validationHint="Single letters, digits, or symbols (e.g., (, ), +, -)"
        />
        {getFieldError('inputAlphabet') && (
          <p className="text-sm text-red-600 -mt-3 mb-4">{getFieldError('inputAlphabet')}</p>
        )}

        {/* Stack Alphabet */}
        <TagInput
          label="Stack Alphabet (Γ)"
          tags={pda.stackAlphabet}
          onTagsChange={handleStackAlphabetChange}
          placeholder="e.g., Z, A, B (any letter/digit)"
          validator={isValidStackSymbol}
          validationHint="Single letters (A-Z, a-z) or digits"
        />
        {getFieldError('stackAlphabet') && (
          <p className="text-sm text-red-600 -mt-3 mb-4">{getFieldError('stackAlphabet')}</p>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Start State */}
          <SelectInput
            label="Start State (q₀)"
            value={pda.startState}
            options={pda.states}
            onChange={(startState) => onChange({ ...pda, startState })}
            placeholder="Select start state"
            error={getFieldError('startState')}
          />

          {/* Start Stack Symbol */}
          <SelectInput
            label="Start Stack Symbol (Z₀)"
            value={pda.startStackSymbol}
            options={pda.stackAlphabet}
            onChange={(startStackSymbol) => onChange({ ...pda, startStackSymbol })}
            placeholder="Select stack symbol"
            error={getFieldError('startStackSymbol')}
          />
        </div>

        {/* Accept States */}
        <TagInput
          label="Accept States (F)"
          tags={pda.acceptStates}
          onTagsChange={handleAcceptStatesChange}
          placeholder="Select from defined states"
          validator={isValidAcceptState}
          validationHint="Must be one of the defined states"
        />
        {getFieldError('acceptStates') && (
          <p className="text-sm text-red-600 -mt-3 mb-4">{getFieldError('acceptStates')}</p>
        )}

        {/* Transitions */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Transitions (δ)
            </label>
            <button
              type="button"
              onClick={addTransition}
              disabled={pda.states.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-emerald-600 
                bg-emerald-50 rounded-lg hover:bg-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Transition
            </button>
          </div>

          {pda.transitions.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <svg className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-sm text-gray-500">No transitions defined</p>
              <p className="text-xs text-gray-400 mt-1">Click "Add Transition" to create one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pda.transitions.map((transition, index) => (
                <TransitionRow
                  key={transition.id}
                  transition={transition}
                  index={index}
                  states={pda.states}
                  inputAlphabet={pda.inputAlphabet}
                  stackAlphabet={pda.stackAlphabet}
                  onUpdate={(updates) => updateTransition(transition.id, updates)}
                  onRemove={() => removeTransition(transition.id)}
                  error={getFieldError(`transition-${index}`)}
                  isHovered={hoveredOriginId !== null && hoveredOriginId === transition.id}
                  onHoverEnter={() => {
                    console.log('[PDA Input] Hovering transition:', transition.id);
                    onHoverOriginChange?.(transition.id);
                  }}
                  onHoverLeave={() => onHoverOriginChange?.(null)}
                />
              ))}
            </div>
          )}
          {getFieldError('transitions') && (
            <p className="text-sm text-red-600 mt-2">{getFieldError('transitions')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface TransitionRowProps {
  transition: PDATransition;
  index: number;
  states: string[];
  inputAlphabet: string[];
  stackAlphabet: string[];
  onUpdate: (updates: Partial<PDATransition>) => void;
  onRemove: () => void;
  error?: string;
  // Origin tracking
  isHovered?: boolean;
  onHoverEnter?: () => void;
  onHoverLeave?: () => void;
}

function TransitionRow({ 
  transition, 
  index, 
  states, 
  inputAlphabet, 
  stackAlphabet, 
  onUpdate, 
  onRemove,
  error,
  isHovered,
  onHoverEnter,
  onHoverLeave
}: TransitionRowProps) {
  const pushedInputRef = useRef<HTMLInputElement>(null);
  
  const handleInsertEpsilon = () => {
    if (pushedInputRef.current) {
      const newValue = insertAtCursor(pushedInputRef.current, 'ε');
      onUpdate({ pushedSymbols: newValue });
      setTimeout(() => pushedInputRef.current?.focus(), 0);
    }
  };
  
  return (
    <div 
      className={`p-3 bg-gray-50 rounded-lg transition-all duration-200 cursor-pointer
        ${error ? 'ring-1 ring-red-300' : ''}
        ${isHovered ? 'ring-2 ring-blue-500 bg-blue-50 shadow-md' : 'hover:bg-gray-100'}`}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-gray-400 w-6">{index + 1}.</span>
        
        <span className="text-xs text-gray-500">δ(</span>
        
        {/* Current State */}
        <select
          value={transition.currentState}
          onChange={(e) => onUpdate({ currentState: e.target.value })}
          className="px-2 py-1.5 border border-gray-300 rounded bg-white text-sm
            focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          title="Current State"
        >
          {states.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <span className="text-gray-400">,</span>

        {/* Input Symbol */}
        <select
          value={transition.inputSymbol}
          onChange={(e) => onUpdate({ inputSymbol: e.target.value })}
          className="px-2 py-1.5 border border-gray-300 rounded bg-white text-sm
            focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          title="Input Symbol (ε for epsilon)"
        >
          <option value="">ε</option>
          {inputAlphabet.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <span className="text-gray-400">,</span>

        {/* Popped Symbol */}
        <select
          value={transition.poppedSymbol}
          onChange={(e) => onUpdate({ poppedSymbol: e.target.value })}
          className="px-2 py-1.5 border border-gray-300 rounded bg-white text-sm
            focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          title="Stack Symbol to Pop"
        >
          <option value="">ε</option>
          {stackAlphabet.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <span className="text-xs text-gray-500">)</span>
        <span className="text-gray-400 font-mono text-lg">=</span>
        <span className="text-xs text-gray-500">(</span>

        {/* Next State */}
        <select
          value={transition.nextState}
          onChange={(e) => onUpdate({ nextState: e.target.value })}
          className="px-2 py-1.5 border border-gray-300 rounded bg-white text-sm
            focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
          title="Next State"
        >
          {states.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <span className="text-gray-400">,</span>

        {/* Pushed Symbols with epsilon button */}
        <div className="relative">
          <input
            ref={pushedInputRef}
            type="text"
            value={transition.pushedSymbols}
            onChange={(e) => onUpdate({ pushedSymbols: e.target.value })}
            placeholder="ε"
            className="w-24 px-2 py-1.5 pr-7 border border-gray-300 rounded text-sm font-mono
              focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none"
            title="Symbols to Push (e.g., AB pushes A then B, or ε for nothing)"
          />
          <button
            type="button"
            onClick={handleInsertEpsilon}
            className="absolute right-1 top-1/2 -translate-y-1/2 px-1 py-0.5 text-sm font-medium
              text-emerald-600 hover:bg-emerald-50 rounded transition-colors"
            title="Insert ε (epsilon)"
          >
            ε
          </button>
        </div>

        <span className="text-xs text-gray-500">)</span>

        <button
          type="button"
          onClick={onRemove}
          className="ml-auto p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Remove transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-600 mt-2 ml-6">{error}</p>
      )}
    </div>
  );
}
