import { CheckCircle2 } from 'lucide-react';
import type { InputHTMLAttributes, ReactNode } from 'react';
import { forwardRef } from 'react';
import { cn } from '@/utils/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  success?: boolean;
  leftIcon?: ReactNode;
  rightElement?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { className, label, required, error, hint, success, leftIcon, rightElement, id, ...props },
    ref,
  ) => {
    const inputId = id ?? props.name;
    const hasError = Boolean(error);
    const hasSuccess = success && !hasError;

    return (
      <div className="space-y-1.5">
        {label ? (
          <label htmlFor={inputId} className="block text-sm font-semibold text-navy">
            {label}
            {required ? <span className="ml-1 text-danger">*</span> : null}
          </label>
        ) : null}

        <div
          className={cn(
            'flex h-11 items-center gap-3 rounded-brand border bg-white px-3 transition duration-150',
            hasError
              ? 'border-danger focus-within:ring-2 focus-within:ring-danger/20'
              : hasSuccess
              ? 'border-success focus-within:ring-2 focus-within:ring-success/20'
              : 'border-border focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15',
          )}
        >
          {leftIcon ? (
            <span className={cn('flex-shrink-0', hasError ? 'text-danger' : 'text-muted')}>
              {leftIcon}
            </span>
          ) : null}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              'h-full w-full border-0 bg-transparent px-0 text-sm text-navy outline-none placeholder:text-muted/60',
              className,
            )}
            {...props}
          />

          {hasSuccess ? (
            <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-success" aria-hidden="true" />
          ) : (
            rightElement
          )}
        </div>

        {hasError ? (
          <p className="text-xs font-medium text-danger">{error}</p>
        ) : hint ? (
          <p className="text-xs text-muted">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
export default Input;
