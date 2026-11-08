import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  type = 'button',
  ...props
}) => {
  const baseStyles =
    'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-50 disabled:pointer-events-none whitespace-nowrap shrink-0 cursor-pointer';

  const variantStyles: Record<NonNullable<ButtonProps['variant']>, string> = {
    primary: 'bg-slate-900 text-white hover:bg-slate-800 active:bg-slate-950',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200 active:bg-slate-300',
    outline:
      'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900',
    ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
  };

  const sizeStyles: Record<NonNullable<ButtonProps['size']>, string> = {
    sm: 'px-3 py-1.5 text-xs min-h-[34px]',
    md: 'px-4 py-2 text-sm min-h-[40px]',
    lg: 'px-5 py-2.5 text-sm min-h-[44px]',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};
