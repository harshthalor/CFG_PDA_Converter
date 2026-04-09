import type { ConversionStep } from '../../types';

interface StepperProps {
  steps: ConversionStep[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
}

export function Stepper({ steps, currentStepIndex, onStepChange }: StepperProps) {
  const currentStep = steps[currentStepIndex];
  
  if (!currentStep) return null;

  return (
    <div className="flex flex-col h-full">
      {/* Step Navigation */}
      <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-100">
        <button
          onClick={() => onStepChange(currentStepIndex - 1)}
          disabled={currentStepIndex === 0}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
            disabled:opacity-40 disabled:cursor-not-allowed
            text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        <div className="flex items-center gap-1.5">
          {steps.map((_, idx) => (
            <button
              key={idx}
              onClick={() => onStepChange(idx)}
              className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${
                idx === currentStepIndex 
                  ? 'bg-indigo-600 scale-125' 
                  : idx < currentStepIndex 
                    ? 'bg-indigo-300 hover:bg-indigo-400' 
                    : 'bg-gray-200 hover:bg-gray-300'
              }`}
              title={`Step ${idx + 1}: ${steps[idx].title}`}
            />
          ))}
        </div>

        <button
          onClick={() => onStepChange(currentStepIndex + 1)}
          disabled={currentStepIndex === steps.length - 1}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg
            disabled:opacity-40 disabled:cursor-not-allowed
            text-gray-600 hover:bg-gray-100 transition-colors"
        >
          Next
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Step Content */}
      <div className="flex-1 overflow-auto">
        {/* Step Badge */}
        <div className="mb-4">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
            Step {currentStep.stepNumber} of {steps.length}
          </span>
        </div>

        {/* Step Title */}
        <h3 className="text-xl font-semibold text-gray-900 mb-4">
          {currentStep.title}
        </h3>

        {/* Step Description */}
        <div
          className="text-sm leading-relaxed text-gray-600 whitespace-pre-wrap"
          dangerouslySetInnerHTML={{ __html: currentStep.description }}
        />

        {/* Key Elements (simple, readable tags) */}
        {currentStep.highlightedElements && currentStep.highlightedElements.length > 0 && (
          <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <h4 className="text-sm font-medium text-amber-800 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Key Elements
            </h4>
            <div className="flex flex-wrap gap-2">
              {currentStep.highlightedElements.map((elem, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center px-3 py-1.5 bg-amber-100 text-amber-900 rounded-md text-sm font-mono"
                >
                  {elem}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
