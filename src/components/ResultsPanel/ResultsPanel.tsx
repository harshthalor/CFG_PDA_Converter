import 'katex/dist/katex.min.css';
import { InlineMath } from 'react-katex';
import type { ConversionStep, CFG, PDA, ConversionMode } from '../../types';
import { Stepper } from './Stepper';
import { formatSet } from '../../utils/mathFormatting';

interface ResultsPanelProps {
  mode: ConversionMode;
  steps: ConversionStep[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  result: CFG | PDA | null;
  isConverting: boolean;
  hasInput: boolean;
}

export function ResultsPanel({
  mode,
  steps,
  currentStepIndex,
  onStepChange,
  result,
  isConverting,
  hasInput
}: ResultsPanelProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 h-full flex flex-col min-h-[600px]">
      <div className="flex items-center gap-3 mb-6">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
          mode === 'cfg-to-pda' ? 'bg-purple-100' : 'bg-amber-100'
        }`}>
          <svg 
            className={`w-5 h-5 ${mode === 'cfg-to-pda' ? 'text-purple-600' : 'text-amber-600'}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
          </svg>
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Results & Explanation</h2>
          <p className="text-sm text-gray-500">
            {mode === 'cfg-to-pda' ? (
              <span>CFG <InlineMath math="\rightarrow" /> PDA Conversion</span>
            ) : (
              <span>PDA <InlineMath math="\rightarrow" /> CFG Conversion</span>
            )}
          </p>
        </div>
      </div>

      {!hasInput ? (
        <EmptyState mode={mode} />
      ) : isConverting ? (
        <LoadingState />
      ) : steps.length === 0 ? (
        <PlaceholderState mode={mode} />
      ) : (
        <div className="flex-1 flex flex-col min-h-0">
          <Stepper
            steps={steps}
            currentStepIndex={currentStepIndex}
            onStepChange={onStepChange}
          />

          {/* Final Result Summary (shown on last step) */}
          {currentStepIndex === steps.length - 1 && result && (
            <div className="mt-6 pt-6 border-t border-gray-100 shrink-0">
              <ResultSummary result={result} mode={mode} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmptyState({ mode }: { mode: ConversionMode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">No Input Yet</h3>
      <p className="text-sm text-gray-500 max-w-xs">
        Start by entering your {mode === 'cfg-to-pda' ? 'Context-Free Grammar' : 'Pushdown Automaton'} 
        {' '}in the input panel, then click Convert.
      </p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
      <div className="w-16 h-16 mb-4 relative">
        <div className="absolute inset-0 border-4 border-indigo-200 rounded-full"></div>
        <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">Converting...</h3>
      <p className="text-sm text-gray-500">Please wait while we process your input.</p>
    </div>
  );
}

function PlaceholderState({ mode }: { mode: ConversionMode }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center py-12">
      <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-4">
        <svg className="w-8 h-8 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-1">Ready to Convert</h3>
      <p className="text-sm text-gray-500 max-w-xs">
        Your {mode === 'cfg-to-pda' ? 'CFG' : 'PDA'} is defined. Click the "Convert" button to see 
        the step-by-step conversion process.
      </p>
    </div>
  );
}

function ResultSummary({ result, mode }: { result: CFG | PDA; mode: ConversionMode }) {
  if (mode === 'cfg-to-pda') {
    const pda = result as PDA;
    return (
      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-emerald-800 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Resulting PDA
        </h4>
        <div className="space-y-2 text-sm text-emerald-900 font-mono">
          <p>Q = {`{${pda.states.join(', ')}}`}</p>
          <p>Σ = {`{${pda.inputAlphabet.join(', ')}}`}</p>
          <p>Γ = {`{${pda.stackAlphabet.join(', ')}}`}</p>
          <p>q₀ = {pda.startState}</p>
          <p>F = {`{${pda.acceptStates.join(', ')}}`}</p>
          <p>|δ| = {pda.transitions.length}</p>
        </div>
      </div>
    );
  } else {
    const cfg = result as CFG;
    return (
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
        <h4 className="text-sm font-semibold text-indigo-800 mb-3 flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Resulting CFG
        </h4>
        <div className="space-y-2 text-sm text-indigo-900 font-mono">
          <p>V = {cfg.variables.length <= 8 ? `{${cfg.variables.join(', ')}}` : `${formatSet(cfg.variables.slice(0, 8))} ...`}</p>
          <p>Σ = {`{${cfg.terminals.join(', ')}}`}</p>
          <p>S = {cfg.startSymbol}</p>
          <p>|P| = {cfg.productionRules.length}</p>
        </div>
      </div>
    );
  }
}
