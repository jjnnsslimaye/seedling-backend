// Consistent styling tokens across the app
export const designTokens = {
  // Transitions
  transition: {
    fast: 'transition-all duration-150 ease-in-out',
    normal: 'transition-all duration-200 ease-in-out',
    slow: 'transition-all duration-300 ease-in-out',
  },

  // Border radius
  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  },

  // Shadows
  shadow: {
    card: 'shadow-card hover:shadow-card-hover',
    subtle: 'shadow-subtle',
  },

  // Typography
  text: {
    heading: 'font-semibold text-slate-900',
    body: 'text-slate-600',
    muted: 'text-slate-500',
    small: 'text-sm text-slate-600',
  },
};
