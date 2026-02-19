/**
 * Reusable Button component
 */

import { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
  className?: string;
}

export default function Button({
  children,
  variant = 'primary',
  type = 'button',
  disabled = false,
  className = '',
  ...props
}: ButtonProps) {
  // Base styles
  const baseStyles =
    'px-4 py-2 rounded-2xl font-medium transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

  // Variant styles
  const variantStyles = {
    primary:
      'bg-brand-600 hover:bg-brand-700 text-white focus:ring-brand-500',
    secondary:
      'bg-white border-2 border-brand-600 text-brand-700 hover:bg-brand-50 focus:ring-brand-500',
    danger: 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-500',
  };

  // Disabled styles
  const disabledStyles = disabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer';

  // Combine all styles
  const combinedStyles = `${baseStyles} ${variantStyles[variant]} ${disabledStyles} ${className}`;

  return (
    <button type={type} disabled={disabled} className={combinedStyles} {...props}>
      {children}
    </button>
  );
}
