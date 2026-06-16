import type { LucideIcon } from 'lucide-react';
import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react';
import { memo } from 'react';
import type { AccentColor, Trend } from '@/types';
import { cn } from '@/utils/cn';

interface KPICardProps {
  label: string;
  value: string;
  change: string;
  helperText?: string;
  icon: LucideIcon;
  accentColor: AccentColor;
  trend: Trend;
  loading?: boolean;
}

const accentClassMap: Record<AccentColor, { bar: string; icon: string; iconBg: string }> = {
  primary: {
    bar: 'bg-primary',
    icon: 'text-primary',
    iconBg: 'bg-primary/10',
  },
  gold: {
    bar: 'bg-gold',
    icon: 'text-gold',
    iconBg: 'bg-gold/10',
  },
  navy: {
    bar: 'bg-navy',
    icon: 'text-navy',
    iconBg: 'bg-navy/10',
  },
  success: {
    bar: 'bg-success',
    icon: 'text-success',
    iconBg: 'bg-success/10',
  },
  danger: {
    bar: 'bg-danger',
    icon: 'text-danger',
    iconBg: 'bg-danger/10',
  },
};

const trendConfig: Record<Trend, { icon: LucideIcon; className: string }> = {
  up: { icon: ArrowUpRight, className: 'text-success' },
  down: { icon: ArrowDownRight, className: 'text-danger' },
  neutral: { icon: ArrowRight, className: 'text-muted' },
};

function KPICardSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="h-1 w-full animate-pulse bg-border" />
      <div className="space-y-4 p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2">
            <div className="h-3.5 w-24 animate-pulse rounded bg-navy/8" />
            <div className="h-8 w-32 animate-pulse rounded bg-navy/8" />
          </div>
          <div className="h-11 w-11 animate-pulse rounded-brand bg-navy/8" />
        </div>
        <div className="h-3.5 w-40 animate-pulse rounded bg-navy/8" />
      </div>
    </div>
  );
}

function KPICardComponent({
  label,
  value,
  change,
  helperText,
  icon: Icon,
  accentColor,
  trend,
  loading = false,
}: KPICardProps) {
  if (loading) return <KPICardSkeleton />;

  const accent = accentClassMap[accentColor];
  const trendCfg = trendConfig[trend];
  const TrendIcon = trendCfg.icon;

  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className={cn('h-1 w-full', accent.bar)} />
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted">{label}</p>
            <p className="mt-2 text-[28px] font-bold leading-none tracking-tight text-navy">
              {value}
            </p>
          </div>
          <span
            className={cn(
              'inline-flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-brand transition',
              accent.iconBg,
              accent.icon,
            )}
            aria-hidden="true"
          >
            <Icon className="h-5 w-5" />
          </span>
        </div>

        <div className="mt-4 flex items-center gap-1.5">
          <span
            className={cn(
              'inline-flex items-center gap-1 text-sm font-semibold',
              trendCfg.className,
            )}
          >
            <TrendIcon className="h-4 w-4" aria-hidden="true" />
            {change}
          </span>
          {helperText ? (
            <span className="text-xs text-muted">{helperText}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const KPICard = memo(KPICardComponent);
export default KPICard;
