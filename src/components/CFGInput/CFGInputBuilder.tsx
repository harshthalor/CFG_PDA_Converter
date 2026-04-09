import { useRef } from 'react';
import type { CFG, ProductionRule, ValidationResult } from '../../types';
import { TagInput, SelectInput } from '../common';

// Helper to insert text at cursor position in an input
function insertAtCursor(input: HTMLInputElement, text: string): string {
  const start = input.selectionStart ?? input.value.length;
  const end = input.selectionEnd ?? input.value.length;
  const before = input.value.substring(0, start);
  const after = input.value.substring(end);
  return before + text + after;
}

interface CFGInputBuilderProps {
  cfg: CFG;
  onChange: (cfg: CFG) => void;
  validation: ValidationResult;
  // Origin Tracker props for linking CFG rules to PDA transitions
  hoveredOriginId?: string | null;
  onHoverOriginChange?: (id: string | null) => void;
}

export function CFGInputBuilder({ cfg, onChange, validation, hoveredOriginId, onHoverOriginChange }: CFGInputBuilderProps) {
  const getFieldError = (field: string): string | undefined => {
    return validation.errors.find(e => e.field === field)?.message;
  };

  const handleVariablesChange = (variables: string[]) => {
    // If start symbol is removed from variables, clear it
    const newStartSymbol = variables.includes(cfg.startSymbol) ? cfg.startSymbol : '';
    onChange({ ...cfg, variables, startSymbol: newStartSymbol });
  };

  const handleTerminalsChange = (terminals: string[]) => {
    onChange({ ...cfg, terminals });
  };

  const handleStartSymbolChange = (startSymbol: string) => {
    onChange({ ...cfg, startSymbol });
  };

  const addProductionRule = () => {
    const newRule: ProductionRule = {
      id: crypto.randomUUID(),
      variable: cfg.variables[0] || '',
      production: ''
    };
    onChange({ ...cfg, productionRules: [...cfg.productionRules, newRule] });
  };

  const updateProductionRule = (id: string, updates: Partial<ProductionRule>) => {
    const newRules = cfg.productionRules.map(rule =>
      rule.id === id ? { ...rule, ...updates } : rule
    );
    onChange({ ...cfg, productionRules: newRules });
  };

  const removeProductionRule = (id: string) => {
    const newRules = cfg.productionRules.filter(rule => rule.id !== id);
    onChange({ ...cfg, productionRules: newRules });
  };

  const isUpperCase = (str: string) => /^[A-Z]$/.test(str);
  const isValidTerminal = (str: string) => /^[a-z0-9()[\]+\-*/=,]$/.test(str);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Context-Free Grammar</h2>
          <p className="text-sm text-gray-500">Define your CFG components</p>
        </div>
      </div>

      <div className="space-y-1">
        {/* Variables Input */}
        <TagInput
          label="Variables (V)"
          tags={cfg.variables}
          onTagsChange={handleVariablesChange}
          placeholder="e.g., S, A, B (uppercase letters)"
          validator={isUpperCase}
          validationHint="Enter single uppercase letters (A-Z)"
        />
        {getFieldError('variables') && (
          <p className="text-sm text-red-600 -mt-3 mb-4">{getFieldError('variables')}</p>
        )}

        {/* Terminals Input */}
        <TagInput
          label="Terminals (Σ)"
          tags={cfg.terminals}
          onTagsChange={handleTerminalsChange}
          placeholder="e.g., a, b, (, ), +, -"
          validator={isValidTerminal}
          validationHint="Enter single letters, digits, or symbols (e.g., (, ), +, -)"
        />
        {getFieldError('terminals') && (
          <p className="text-sm text-red-600 -mt-3 mb-4">{getFieldError('terminals')}</p>
        )}

        {/* Start Symbol */}
        <SelectInput
          label="Start Symbol (S)"
          value={cfg.startSymbol}
          options={cfg.variables}
          onChange={handleStartSymbolChange}
          placeholder="Select start symbol"
          error={getFieldError('startSymbol')}
        />

        {/* Production Rules */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <label className="block text-sm font-medium text-gray-700">
              Production Rules (P)
            </label>
            <button
              type="button"
              onClick={addProductionRule}
              disabled={cfg.variables.length === 0}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 
                bg-indigo-50 rounded-lg hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Rule
            </button>
          </div>

          {cfg.productionRules.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
              <svg className="w-10 h-10 mx-auto text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm text-gray-500">No production rules defined</p>
              <p className="text-xs text-gray-400 mt-1">Click "Add Rule" to create one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cfg.productionRules.map((rule, index) => (
                <ProductionRuleRow
                  key={rule.id}
                  rule={rule}
                  index={index}
                  variables={cfg.variables}
                  onUpdate={(updates) => updateProductionRule(rule.id, updates)}
                  onRemove={() => removeProductionRule(rule.id)}
                  error={getFieldError(`rule-${index}`)}
                  isHovered={hoveredOriginId !== null && hoveredOriginId === rule.id}
                  onHoverEnter={() => {
                    console.log('[CFG Input] Hovering rule:', rule.id);
                    onHoverOriginChange?.(rule.id);
                  }}
                  onHoverLeave={() => onHoverOriginChange?.(null)}
                />
              ))}
            </div>
          )}
          {getFieldError('productionRules') && (
            <p className="text-sm text-red-600 mt-2">{getFieldError('productionRules')}</p>
          )}
        </div>
      </div>
    </div>
  );
}

interface ProductionRuleRowProps {
  rule: ProductionRule;
  index: number;
  variables: string[];
  onUpdate: (updates: Partial<ProductionRule>) => void;
  onRemove: () => void;
  error?: string;
  // Origin tracking
  isHovered?: boolean;
  onHoverEnter?: () => void;
  onHoverLeave?: () => void;
}

function ProductionRuleRow({ rule, index, variables, onUpdate, onRemove, error, isHovered, onHoverEnter, onHoverLeave }: ProductionRuleRowProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleInsertEpsilon = () => {
    if (inputRef.current) {
      const newValue = insertAtCursor(inputRef.current, 'ε');
      onUpdate({ production: newValue });
      // Refocus the input after inserting
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };
  
  return (
    <div 
      className={`flex items-start gap-2 p-3 bg-gray-50 rounded-lg transition-all duration-200 cursor-pointer
        ${error ? 'ring-1 ring-red-300' : ''}
        ${isHovered ? 'ring-2 ring-blue-500 bg-blue-50 shadow-md' : 'hover:bg-gray-100'}`}
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
    >
      <span className="text-xs font-medium text-gray-400 pt-2.5 w-6">{index + 1}.</span>
      
      <select
        value={rule.variable}
        onChange={(e) => onUpdate({ variable: e.target.value })}
        className="px-3 py-2 border border-gray-300 rounded-lg bg-white text-sm font-medium
          focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
      >
        {variables.map(v => (
          <option key={v} value={v}>{v}</option>
        ))}
      </select>

      <span className="text-gray-400 font-mono text-lg pt-1.5">→</span>

      <div className="flex-1">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={rule.production}
            onChange={(e) => onUpdate({ production: e.target.value })}
            placeholder="e.g., aAb or ε for epsilon"
            className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm font-mono
              focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none"
          />
          <button
            type="button"
            onClick={handleInsertEpsilon}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-1.5 py-0.5 text-sm font-medium
              text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
            title="Insert ε (epsilon)"
          >
            ε
          </button>
        </div>
        {error && (
          <p className="text-xs text-red-600 mt-1">{error}</p>
        )}
      </div>

      <button
        type="button"
        onClick={onRemove}
        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        title="Remove rule"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
