/**
 * Reusable Card component
 */

import { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: string;
  className?: string;
}

export default function Card({ children, title, className = '' }: CardProps) {
  const baseStyles = 'bg-white rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-200 border border-slate-200 p-6';
  const combinedStyles = `${baseStyles} ${className}`;

  return (
    <div className={combinedStyles}>
      {title && (
        <h3 className="text-xl font-bold text-gray-900 mb-4">{title}</h3>
      )}
      {children}
    </div>
  );
}
