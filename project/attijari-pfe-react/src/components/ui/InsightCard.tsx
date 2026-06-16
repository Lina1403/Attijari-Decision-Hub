import { Sparkles } from 'lucide-react';
import type { ReactNode } from 'react';
import Button from '@/components/ui/Button';

interface InsightCardProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  footer?: ReactNode;
}

export default function InsightCard({
  title,
  description,
  actionLabel,
  onAction,
  footer,
}: InsightCardProps) {
  return (
    <article className="rounded-card border border-gold/35 bg-surface p-4">
      <div className="flex items-start gap-3 border-l-4 border-gold pl-4">
        <span className="mt-0.5 inline-flex h-10 w-10 items-center justify-center rounded-brand bg-white text-gold">
          <Sparkles className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1 space-y-2">
          <h3 className="text-base font-semibold text-navy">{title}</h3>
          <p className="text-sm leading-6 text-muted">{description}</p>
          {actionLabel && onAction ? (
            <Button size="sm" variant="secondary" onClick={onAction}>
              {actionLabel}
            </Button>
          ) : null}
          {footer}
        </div>
      </div>
    </article>
  );
}
