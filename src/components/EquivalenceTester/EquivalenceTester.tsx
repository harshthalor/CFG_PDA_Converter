/**
 * EquivalenceTester - Dual simulation component for PDA and CFG
 * 
 * Provides an interactive interface to:
 * 1. Enter a test string
 * 2. Run it through both PDA and generated CFG
 * 3. Step through both simulations synchronously
 * 4. Visualize the accepting path and derivation tree
 */

import { useState, useCallback } from 'react';
import type { PDA, CFG, PDASimulationResult, CFGDerivationResult } from '../../types';
import { simulatePDA, formatConfiguration, describeStep } from '../../logic/pdaSimulator';
import { deriveCFG, formatDerivation, describeDerivationStep } from '../../logic/cfgDerivation';
import { DerivationTreeView } from './DerivationTreeView';

interface EquivalenceTesterProps {
  pda: PDA;
  cfg: CFG;
}

export function EquivalenceTester({ pda, cfg }: EquivalenceTesterProps) {
  const [testString, setTestString] = useState('');
  const [pdaResult, setPdaResult] = useState<PDASimulationResult | null>(null);
  const [cfgResult, setCfgResult] = useState<CFGDerivationResult | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isSimulating, setIsSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runSimulation = useCallback(() => {
    setError(null);
    setIsSimulating(true);
    setCurrentStep(0);

    try {
      // Run PDA simulation
      const pdaSim = simulatePDA(pda, testString);
      setPdaResult(pdaSim);

      // Run CFG derivation
      const cfgDeriv = deriveCFG(cfg, testString);
      setCfgResult(cfgDeriv);

      // Check for mismatches (shouldn't happen if conversion is correct)
      if (pdaSim.accepted !== cfgDeriv.success) {
        setError(
          `Warning: PDA ${pdaSim.accepted ? 'accepts' : 'rejects'} but CFG ${cfgDeriv.success ? 'derives' : 'cannot derive'} the string. This may indicate a conversion error.`
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Simulation failed');
      setPdaResult(null);
      setCfgResult(null);
    } finally {
      setIsSimulating(false);
    }
  }, [pda, cfg, testString]);

  const maxSteps = Math.max(
    pdaResult?.steps.length ?? 0,
    cfgResult?.steps.length ?? 0
  );

  const stepForward = useCallback(() => {
    setCurrentStep(prev => Math.min(prev + 1, maxSteps - 1));
  }, [maxSteps]);

  const stepBackward = useCallback(() => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const reset = useCallback(() => {
    setPdaResult(null);
    setCfgResult(null);
    setCurrentStep(0);
    setError(null);
  }, []);

  const hasResults = pdaResult !== null || cfgResult !== null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Equivalence Tester
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Verify that the PDA and CFG accept the same language by testing strings
        </p>
      </div>

      {/* Input Section */}
      <div className="p-6 border-b border-gray-100">
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="test-string" className="block text-sm font-medium text-gray-700 mb-1">
              Test String
            </label>
            <input
              id="test-string"
              type="text"
              value={testString}
              onChange={(e) => setTestString(e.target.value)}
              placeholder="Enter a string to test (e.g., aabb)"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-mono"
              onKeyDown={(e) => e.key === 'Enter' && runSimulation()}
            />
            <p className="text-xs text-gray-500 mt-1">
              Press Enter or click Simulate to test. Leave empty to test ε (empty string).
            </p>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={runSimulation}
              disabled={isSimulating}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isSimulating ? 'Simulating...' : 'Simulate'}
            </button>
            {hasResults && (
              <button
                onClick={reset}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">{error}</p>
        </div>
      )}

      {/* Results Section */}
      {hasResults && (
        <div className="p-6">
          {/* Result Summary */}
          <div className="flex gap-4 mb-6">
            {/* PDA Result */}
            <div className={`flex-1 p-4 rounded-lg border ${
              pdaResult?.accepted 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {pdaResult?.accepted ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={`font-medium ${pdaResult?.accepted ? 'text-green-800' : 'text-red-800'}`}>
                  PDA: {pdaResult?.accepted ? 'Accepted' : 'Rejected'}
                </span>
              </div>
              <p className="text-sm mt-1 text-gray-600">
                {pdaResult?.steps.length} computation steps
              </p>
            </div>

            {/* CFG Result */}
            <div className={`flex-1 p-4 rounded-lg border ${
              cfgResult?.success 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {cfgResult?.success ? (
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
                <span className={`font-medium ${cfgResult?.success ? 'text-green-800' : 'text-red-800'}`}>
                  CFG: {cfgResult?.success ? 'Derivable' : 'Not Derivable'}
                </span>
              </div>
              <p className="text-sm mt-1 text-gray-600">
                {cfgResult?.steps.length} derivation steps
              </p>
            </div>
          </div>

          {/* Step Controls */}
          <div className="flex items-center justify-center gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
            <button
              onClick={stepBackward}
              disabled={currentStep === 0}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Previous Step"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep + 1} of {maxSteps}
              </span>
              <input
                type="range"
                min={0}
                max={maxSteps - 1}
                value={currentStep}
                onChange={(e) => setCurrentStep(parseInt(e.target.value))}
                className="w-32"
              />
            </div>

            <button
              onClick={stepForward}
              disabled={currentStep >= maxSteps - 1}
              className="p-2 rounded-lg hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              title="Next Step"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Dual View */}
          <div className="grid grid-cols-2 gap-6">
            {/* PDA Execution View */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-indigo-50 border-b border-gray-200">
                <h4 className="font-medium text-indigo-900">PDA Execution Trace</h4>
              </div>
              <div className="p-4 space-y-3 max-h-80 overflow-y-auto">
                {pdaResult?.steps.slice(0, currentStep + 1).map((step, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-lg text-sm font-mono ${
                      idx === currentStep 
                        ? 'bg-indigo-100 border-2 border-indigo-300' 
                        : 'bg-gray-50'
                    }`}
                  >
                    <div className="text-xs text-gray-500 mb-1">Step {step.stepNumber}</div>
                    {step.transition && (
                      <div className="text-indigo-700 mb-1">{describeStep(step)}</div>
                    )}
                    <div className="text-gray-700">
                      Config: {formatConfiguration(step.after)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* CFG Derivation View */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 bg-purple-50 border-b border-gray-200">
                <h4 className="font-medium text-purple-900">CFG Derivation</h4>
              </div>
              <div className="p-4">
                {/* Derivation Steps */}
                <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                  {cfgResult?.steps.slice(0, currentStep + 1).map((step, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded text-sm ${
                        idx === currentStep 
                          ? 'bg-purple-100 border-2 border-purple-300' 
                          : 'bg-gray-50'
                      }`}
                    >
                      <span className="text-xs text-gray-500 mr-2">#{step.stepNumber}</span>
                      {step.ruleApplied && (
                        <span className="text-purple-700 mr-2">
                          {describeDerivationStep(step)}:
                        </span>
                      )}
                      <span className="font-mono">{step.currentSententialForm || 'S'}</span>
                    </div>
                  ))}
                </div>

                {/* Derivation Tree */}
                {cfgResult && cfgResult.steps[currentStep] && (
                  <DerivationTreeView 
                    tree={cfgResult.steps[Math.min(currentStep, cfgResult.steps.length - 1)].tree} 
                  />
                )}
              </div>
            </div>
          </div>

          {/* Full Derivation Display */}
          {cfgResult?.success && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <h5 className="text-sm font-medium text-gray-700 mb-2">Complete Derivation:</h5>
              <p className="font-mono text-sm text-gray-600 break-all">
                {formatDerivation(cfgResult.steps)}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
