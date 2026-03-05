import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export function Pagination({ page, pages, total, limit, onPage }) {
  if (pages <= 1) return null;

  const start = (page - 1) * limit + 1;
  const end   = Math.min(page * limit, total);

  // Show at most 5 page buttons
  const range = [];
  let lo = Math.max(1, page - 2);
  let hi = Math.min(pages, lo + 4);
  if (hi - lo < 4) lo = Math.max(1, hi - 4);
  for (let i = lo; i <= hi; i++) range.push(i);

  const btnBase = 'w-8 h-8 flex items-center justify-center rounded-lg text-xs font-medium transition-colors';

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-zinc-800">
      <p className="text-xs text-zinc-500">
        {start}–{end} of {total}
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPage(page - 1)}
          disabled={page === 1}
          className={`${btnBase} text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none`}
        >
          <ChevronLeft size={14} />
        </button>
        {range.map(n => (
          <button
            key={n}
            onClick={() => onPage(n)}
            className={`${btnBase} ${
              n === page
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
            }`}
          >
            {n}
          </button>
        ))}
        <button
          onClick={() => onPage(page + 1)}
          disabled={page === pages}
          className={`${btnBase} text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 disabled:opacity-30 disabled:pointer-events-none`}
        >
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
