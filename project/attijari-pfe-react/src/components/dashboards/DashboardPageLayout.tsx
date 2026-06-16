import { BarChart3, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import type { BreadcrumbItem } from '@/types';

interface DashboardPageLayoutProps {
  title: string;
  description: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
  eyebrow?: string;
  children: ReactNode;
}

export default function DashboardPageLayout({
  title,
  description,
  breadcrumbs = [],
  actions,
  eyebrow,
  children,
}: DashboardPageLayoutProps) {
  const sectionLabel = eyebrow ?? breadcrumbs[0]?.label ?? 'Dashboard';
  const trail = breadcrumbs.slice(1);

  return (
    <section className="dashboard-page">
      <div className="dashboard-hero">
        <div className="pointer-events-none absolute -left-10 top-10 h-24 w-24 rounded-full bg-gold/10 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 top-0 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="min-w-0 space-y-5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted shadow-sm backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                {sectionLabel}
              </span>

              {trail.length ? (
                trail.map((item) => (
                  <span
                    key={item.path}
                    className="inline-flex items-center gap-2 text-[13px] font-medium text-navy/80"
                  >
                    <ChevronRight className="h-3.5 w-3.5 text-muted/80" />
                    {item.label}
                  </span>
                ))
              ) : (
                <span className="inline-flex items-center gap-2 text-[13px] font-medium text-navy/80">
                  <BarChart3 className="h-3.5 w-3.5 text-primary" />
                  Vue analytique
                </span>
              )}
            </div>

            <div className="space-y-3">
              <h1 className="dashboard-page-heading">{title}</h1>
              <p className="dashboard-page-copy">{description}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <span className="dashboard-meta-pill">Power BI live</span>
              <span className="dashboard-meta-pill">Lecture plein cadre</span>
              <span className="dashboard-meta-pill">Pilotage decisionnel</span>
            </div>
          </div>

          {actions ? (
            <div className="flex flex-wrap items-center gap-3 xl:justify-end">
              {actions}
            </div>
          ) : null}
        </div>
      </div>

      {children}
    </section>
  );
}
