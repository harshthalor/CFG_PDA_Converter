import React from 'react';

interface TagInputProps {
  label: string;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  placeholder?: string;
  validator?: (value: string) => boolean;
  validationHint?: string;
  disabled?: boolean;
}

export function TagInput({
  label,
  tags,
  onTagsChange,
  placeholder = 'Type and press Enter',
  validator,
  validationHint,
  disabled = false
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    } else if (e.key === 'Backspace' && inputValue === '' && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  };

  const addTag = () => {
    const value = inputValue.trim();
    if (!value) return;

    if (tags.includes(value)) {
      setError('This value already exists');
      return;
    }

    if (validator && !validator(value)) {
      setError(validationHint || 'Invalid value');
      return;
    }

    setError(null);
    onTagsChange([...tags, value]);
    setInputValue('');
  };

  const removeTag = (index: number) => {
    const newTags = tags.filter((_, i) => i !== index);
    onTagsChange(newTags);
  };

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <div 
        className={`min-h-[42px] flex flex-wrap gap-1.5 p-2 border rounded-lg bg-white
          ${error ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'}
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500'}`}
      >
        {tags.map((tag, index) => (
          <span
            key={index}
            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-100 text-indigo-800 rounded-md text-sm font-medium"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="text-indigo-600 hover:text-indigo-800 focus:outline-none"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </span>
        ))}
        <input
          type="text"
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value);
            setError(null);
          }}
          onKeyDown={handleKeyDown}
          onBlur={addTag}
          placeholder={tags.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 min-w-[120px] outline-none text-sm disabled:bg-transparent"
        />
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {validationHint && !error && (
        <p className="mt-1 text-xs text-gray-500">{validationHint}</p>
      )}
    </div>
  );
}
