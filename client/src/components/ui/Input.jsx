import React from 'react';
import { cn } from '../../lib/utils';

export function Input({ className, label, error, icon: Icon, ...props }) {
  const inputClass = cn(
    'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500',
    'outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-colors',
    Icon && 'pl-8',
    error && 'border-red-500',
    className,
  );

  if (label || Icon) {
    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label className="text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">
            {label}
          </label>
        )}
        <div className="relative">
          {Icon && (
            <Icon size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          )}
          <input className={inputClass} {...props} />
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    );
  }

  return <input className={inputClass} {...props} />;
}

export function Select({ className, label, error, children, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        className={cn(
          'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200',
          'outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-colors',
          'appearance-none',
          error && 'border-red-500',
          className,
        )}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2371717a' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 10px center',
          paddingRight: '2rem',
        }}
        {...props}
      >
        {children}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function Textarea({ className, label, error, ...props }) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-[0.7rem] font-semibold text-zinc-500 uppercase tracking-wider">
          {label}
        </label>
      )}
      <textarea
        className={cn(
          'w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-500',
          'outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-colors resize-vertical',
          'leading-relaxed',
          error && 'border-red-500',
          className,
        )}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
