import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext: string;
  delta?: string;
  deltaTone?: 'positive' | 'neutral' | 'warning';
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  delta,
  deltaTone = 'neutral',
}) => {
  const toneColors = {
    positive: 'text-emerald-700',
    neutral: 'text-slate-500',
    warning: 'text-amber-700',
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 overflow-hidden">
      <div className="flex items-baseline justify-between gap-2 min-w-0">
        <span className="text-xs font-medium text-slate-500 whitespace-nowrap truncate">
          {label}
        </span>
        {delta && (
          <span
            className={`text-xs font-mono tabular-nums whitespace-nowrap shrink-0 max-w-[130px] truncate ${toneColors[deltaTone]}`}
          >
            {delta}
          </span>
        )}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums truncate">
        {value}
      </div>
      <p className="mt-1 text-xs text-slate-500 truncate">{subtext}</p>
    </div>
  );
};
