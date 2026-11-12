import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  delta?: string;
  deltaTone?: 'positive' | 'neutral' | 'warning' | 'danger';
  icon?: React.FC<{ className?: string }>;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subtext,
  delta,
  deltaTone = 'neutral',
  icon: Icon,
}) => {
  const toneClasses = {
    positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    neutral: 'bg-slate-100 text-slate-600 border-slate-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  return (
    <div className="card-base card-hover p-5 flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium text-slate-500 truncate">
            {label}
          </span>
          {Icon && (
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-600">
              <Icon className="h-4 w-4" />
            </div>
          )}
        </div>

        <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 font-mono tabular-nums">
          {value}
        </div>
      </div>

      {(delta || subtext) && (
        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
          {subtext && (
            <span className="text-slate-500 truncate">{subtext}</span>
          )}
          {delta && (
            <span
              className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium border font-mono shrink-0 ${toneClasses[deltaTone]}`}
            >
              {delta}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
