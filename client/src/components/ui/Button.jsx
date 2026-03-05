import React from 'react';
import { cn } from '../../lib/utils';

const variants = {
  primary:     'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20',
  secondary:   'bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700',
  ghost:       'hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200',
  destructive: 'bg-red-600 hover:bg-red-500 text-white',
  outline:     'border border-zinc-700 hover:border-zinc-600 text-zinc-300 hover:bg-zinc-800',
};

const sizes = {
  sm: 'px-2.5 py-1 text-xs gap-1.5',
  md: 'px-3.5 py-1.5 text-sm gap-2',
  lg: 'px-5 py-2 text-sm gap-2',
};

export function Button({
  children, variant = 'primary', size = 'md',
  className, disabled, loading, icon: Icon, ...props
}) {
  return (
    <button
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center rounded-lg font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:pointer-events-none',
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      ) : Icon ? <Icon size={14} /> : null}
      {children}
    </button>
  );
}
