import { LoaderCircle } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'microsoft';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  isLoading?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-white shadow-sm shadow-primary/20 hover:bg-[#a01024] focus-visible:ring-primary/30 disabled:bg-primary/60',
  secondary:
    'border border-border bg-white text-navy shadow-sm hover:border-primary/40 hover:bg-page hover:text-primary',
  outline:
    'border border-primary bg-transparent text-primary hover:bg-primary/8 focus-visible:ring-primary/30',
  ghost:
    'bg-transparent text-muted hover:bg-page hover:text-navy',
  danger:
    'bg-danger text-white shadow-sm shadow-danger/20 hover:bg-danger/90 focus-visible:ring-danger/30',
  microsoft:
    'border border-border bg-white text-navy shadow-sm hover:border-navy/25 hover:bg-page',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-5 text-[15px] gap-2',
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = 'primary',
      size = 'md',
      leftIcon,
      rightIcon,
      isLoading = false,
      disabled,
      type = 'button',
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          'focus-ring inline-flex items-center justify-center rounded-brand font-semibold transition duration-150 ease-attijari-out',
          'active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className,
        )}
        disabled={disabled || isLoading}
        {...props}
      >
        {isLoading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          leftIcon
        )}
        <span>{children}</span>
        {!isLoading ? rightIcon : null}
      </button>
    );
  },
);

Button.displayName = 'Button';
export default Button;
