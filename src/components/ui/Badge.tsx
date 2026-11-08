import React from 'react';

export type BadgeTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
}

/**
 * Clean unboxed semantic metadata indicator adhering to Zero-Pill Discipline.
 * Uses subtle typographic weight and semantic color with explicit text label rather than rounded pill enclosures.
 */
export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  children,
  className = '',
}) => {
  const toneStyles: Record<BadgeTone, string> = {
    neutral: 'text-slate-600',
    success: 'text-emerald-700 font-medium',
    warning: 'text-amber-700 font-medium',
    danger: 'text-red-700 font-medium',
    info: 'text-blue-700 font-medium',
  };

  const prefixSymbols: Record<BadgeTone, string> = {
    neutral: '',
    success: '✓ ',
    warning: '▲ ',
    danger: '! ',
    info: '◆ ',
  };

  return (
    <span
      className={`inline-flex items-center text-xs tracking-tight whitespace-nowrap shrink-0 ${toneStyles[tone]} ${className}`}
    >
      {prefixSymbols[tone] && (
        <span aria-hidden="true" className="mr-1 text-[10px]">
          {prefixSymbols[tone]}
        </span>
      )}
      {children}
    </span>
  );
};
