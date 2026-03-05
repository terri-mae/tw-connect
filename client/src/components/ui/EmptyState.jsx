import React from 'react';

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-4">
          <Icon size={22} className="text-zinc-500" />
        </div>
      )}
      <p className="text-sm font-medium text-zinc-300 mb-1">{title}</p>
      {description && <p className="text-xs text-zinc-500 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
