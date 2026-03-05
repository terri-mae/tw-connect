import React from 'react';
import { cn } from '../../lib/utils';

export function Badge({ children, className, variant = 'default' }) {
  const base = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium';
  const variants = {
    default:     'bg-zinc-700 text-zinc-300',
    indigo:      'bg-indigo-500/15 text-indigo-400',
    emerald:     'bg-emerald-500/15 text-emerald-400',
    amber:       'bg-amber-500/15 text-amber-400',
    red:         'bg-red-500/15 text-red-400',
    blue:        'bg-blue-500/15 text-blue-400',
    purple:      'bg-purple-500/15 text-purple-400',
  };
  return (
    <span className={cn(base, variants[variant] ?? variants.default, className)}>
      {children}
    </span>
  );
}
