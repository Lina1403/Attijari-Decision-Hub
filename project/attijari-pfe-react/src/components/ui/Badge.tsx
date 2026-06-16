import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

type BadgeTone =
  | 'default'
  | 'primary'
  | 'success'
  | 'danger'
  | 'gold'
  | 'muted'
  | 'priorityHigh'
  | 'priorityMedium'
  | 'priorityLow';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

const toneClasses: Record<BadgeTone, string> = {
  default: 'bg-navy-soft text-navy',
  primary: 'bg-primary-soft text-primary',
  success: 'bg-success/10 text-success',
  danger: 'bg-danger/10 text-danger',
  gold: 'bg-gold-soft text-gold',
  muted: 'bg-navy-soft text-muted',
  priorityHigh: 'bg-danger/10 text-danger',
  priorityMedium: 'bg-gold-soft text-gold',
  priorityLow: 'bg-success/10 text-success',
};

export default function Badge({ className, tone = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  );
}
