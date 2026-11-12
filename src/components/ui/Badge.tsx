import React from 'react';

export type BadgeTone =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'brand';

interface BadgeProps {
  tone?: BadgeTone;
  children: React.ReactNode;
  className?: string;
  withDot?: boolean;
}

/**
 * Professional SaaS metadata badge.
 * Provides clean semantic styling with accessible contrast and optional dot indicator.
 */
export const Badge: React.FC<BadgeProps> = ({
  tone = 'neutral',
  children,
  className = '',
  withDot = false,
}) => {
  const toneStyles: Record<BadgeTone, { badge: string; dot: string }> = {
    neutral: {
      badge: 'bg-slate-100 text-slate-700 border-slate-200/80',
      dot: 'bg-slate-400',
    },
    success: {
      badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      dot: 'bg-emerald-600',
    },
    warning: {
      badge: 'bg-amber-50 text-amber-800 border-amber-200',
      dot: 'bg-amber-600',
    },
    danger: {
      badge: 'bg-rose-50 text-rose-800 border-rose-200',
      dot: 'bg-rose-600',
    },
    info: {
      badge: 'bg-sky-50 text-sky-800 border-sky-200',
      dot: 'bg-sky-600',
    },
    brand: {
      badge: 'bg-slate-900 text-white border-slate-900',
      dot: 'bg-emerald-400',
    },
  };

  const current = toneStyles[tone] || toneStyles.neutral;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium tracking-tight whitespace-nowrap shrink-0 transition-colors ${current.badge} ${className}`}
    >
      {withDot && (
        <span
          aria-hidden="true"
          className={`h-1.5 w-1.5 rounded-full shrink-0 ${current.dot}`}
        />
      )}
      <span>{children}</span>
    </span>
  );
};
