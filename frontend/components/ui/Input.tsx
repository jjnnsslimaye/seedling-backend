/**
 * Reusable Input component with label and error handling
 */

import { InputHTMLAttributes } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

export default function Input({
  label,
  error,
  required = false,
  disabled = false,
  className = '',
  ...props
}: InputProps) {
  // Input styles
  const baseInputStyles =
    'block w-full px-4 py-3 border rounded-2xl shadow-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 sm:text-sm';

  // Error styles
  const errorStyles = error
    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
    : 'border-gray-300';

  // Disabled styles
  const disabledStyles = disabled
    ? 'bg-gray-100 cursor-not-allowed'
    : 'bg-white';

  const inputStyles = `${baseInputStyles} ${errorStyles} ${disabledStyles} ${className}`;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        required={required}
        disabled={disabled}
        className={inputStyles}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
