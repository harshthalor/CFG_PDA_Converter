interface SelectInputProps {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
}

export function SelectInput({
  label,
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  disabled = false,
  error
}: SelectInputProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled || options.length === 0}
        className={`w-full px-3 py-2.5 border rounded-lg bg-white text-sm
          ${error ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'}
          ${disabled || options.length === 0 ? 'bg-gray-50 cursor-not-allowed text-gray-400' : 'hover:border-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'}
          outline-none transition-colors`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  hint?: string;
}

export function TextInput({
  label,
  value,
  onChange,
  placeholder = '',
  disabled = false,
  error,
  hint
}: TextInputProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-3 py-2.5 border rounded-lg text-sm
          ${error ? 'border-red-300 ring-1 ring-red-300' : 'border-gray-300'}
          ${disabled ? 'bg-gray-50 cursor-not-allowed' : 'hover:border-gray-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'}
          outline-none transition-colors`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
      {hint && !error && (
        <p className="mt-1 text-xs text-gray-500">{hint}</p>
      )}
    </div>
  );
}
