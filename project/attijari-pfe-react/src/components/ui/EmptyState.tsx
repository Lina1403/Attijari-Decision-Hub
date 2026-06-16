import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon: Icon = Inbox,
  title = 'Aucun résultat',
  description = 'Essayez d\'ajuster vos filtres ou critères de recherche.',
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-white/50 px-6 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-page">
        <Icon className="h-7 w-7 text-muted" aria-hidden="true" />
      </div>
      <h3 className="mt-4 text-base font-semibold text-navy">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-muted">{description}</p>

      {(action || secondaryAction) ? (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {secondaryAction ? (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="rounded-brand border border-border px-4 py-2 text-sm font-medium text-muted transition hover:border-primary/30 hover:text-primary"
            >
              {secondaryAction.label}
            </button>
          ) : null}
          {action ? (
            <button
              type="button"
              onClick={action.onClick}
              className="rounded-brand bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a01024]"
            >
              {action.label}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
