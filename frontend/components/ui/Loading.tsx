/**
 * Reusable Loading spinner component
 */

interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function Loading({ size = 'md', className = '' }: LoadingProps) {
  // Size styles
  const sizeStyles = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
  };

  const spinnerStyles = `animate-spin rounded-full border-b-2 border-brand-600 ${sizeStyles[size]} ${className}`;

  return (
    <div className="flex items-center justify-center">
      <div className={spinnerStyles}></div>
    </div>
  );
}
