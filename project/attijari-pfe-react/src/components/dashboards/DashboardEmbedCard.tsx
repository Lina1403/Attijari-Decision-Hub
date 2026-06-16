import { LayoutDashboard } from 'lucide-react';
import type { ReactNode } from 'react';

interface DashboardEmbedCardProps {
  title: string;
  description: string;
  toolbar?: ReactNode;
  children: ReactNode;
  eyebrow?: string;
}

export default function DashboardEmbedCard({
  title,
  description,
  toolbar,
  children,
  eyebrow = 'Power BI workspace',
}: DashboardEmbedCardProps) {
  return (
    <div className="dashboard-embed-card">
      <div className="flex flex-col gap-4 border-b border-border/80 px-5 py-5 sm:px-6 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-2">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-navy-soft/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
            <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
            {eyebrow}
          </span>

          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-navy sm:text-xl">{title}</h2>
            <p className="max-w-3xl text-sm leading-6 text-muted">{description}</p>
          </div>
        </div>

        {toolbar ? (
          <div className="flex flex-wrap items-center gap-3 xl:justify-end">
            {toolbar}
          </div>
        ) : null}
      </div>

      <div className="bg-page/70 p-3 sm:p-4 xl:p-5">{children}</div>
    </div>
  );
}
