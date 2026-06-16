import { useQuery } from '@tanstack/react-query';
import { ArrowRight, BellRing } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import Badge from '@/components/ui/Badge';
import InsightCard from '@/components/ui/InsightCard';
import KPICard from '@/components/ui/KPICard';
import { usePageTitle } from '@/hooks/usePageTitle';
import { dashboardService } from '@/services/dashboardService';
import { useAuthStore } from '@/stores/authStore';
import { formatLongDate, formatRelativeTime } from '@/utils/date';
import { iconMap } from '@/utils/icons';
import { getRecommendationActionPath } from '@/utils/recommendations';

function getSeverityTone(severity: string) {
  if (severity === 'Critique') {
    return 'danger';
  }

  if (severity === 'Elevee') {
    return 'gold';
  }

  if (severity === 'Moderee') {
    return 'primary';
  }

  return 'muted';
}

export default function Home() {
  usePageTitle('Accueil');

  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data, isError, isLoading } = useQuery({
    queryKey: ['home-snapshot'],
    queryFn: () => dashboardService.getHomeSnapshot(),
    retry: 1,
  });
  const alertCount = data?.alerts.length ?? 0;

  return (
    <section className="space-y-6">
      {/* Welcome header */}
      <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="h-1 w-full bg-gradient-to-r from-primary to-[#FF4C6C]" />
        <div className="flex flex-col gap-4 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">
              Cockpit décisionnel
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">
              Bonjour, {user?.firstName} 👋
            </h1>
            <p className="mt-1 text-sm text-muted">
              {formatLongDate()} — Suivi de la performance bancaire, churn et opportunités de rétention.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-page px-4 py-3 text-sm">
            {isLoading ? (
              <span className="text-muted">Chargement du radar live…</span>
            ) : (
              <>
                <span
                  className={`inline-flex h-2.5 w-2.5 rounded-full ${
                    alertCount > 0 ? 'bg-danger' : 'bg-success'
                  }`}
                />
                <span className="font-medium text-navy">
                  {alertCount > 0
                    ? `${alertCount} alerte${alertCount > 1 ? 's' : ''} prioritaire${alertCount > 1 ? 's' : ''}`
                    : 'Aucune alerte active'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {isError ? (
        <div className="flex items-center gap-3 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          <span className="font-semibold">Données indisponibles</span> — Le serveur SQL Server ne répond pas. Les données affichées sont des estimations.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }, (_, index) => (
              <KPICard
                key={index}
                label=""
                value=""
                change=""
                icon={iconMap.users}
                accentColor="primary"
                trend="neutral"
                loading
              />
            ))
          : data?.kpis.map((item) => {
              const Icon = iconMap[item.icon];
              return (
                <KPICard
                  key={item.id}
                  label={item.label}
                  value={item.value}
                  change={item.change}
                  helperText={item.helperText}
                  icon={Icon}
                  accentColor={item.accentColor}
                  trend={item.trend}
                />
              );
            })}
      </div>

      <div className="page-section">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-navy">Dashboards principaux</h2>
            <p className="text-sm text-muted">
              Acces rapide aux six espaces analytiques Power BI de la plateforme.
            </p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {data?.shortcuts.map((shortcut) => {
            const Icon = iconMap[shortcut.icon];

            return (
              <Link
                key={shortcut.id}
                to={shortcut.path}
                className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-3">
                      <Badge tone="primary">{shortcut.tag}</Badge>
                      <div>
                        <h3 className="text-base font-semibold text-navy">{shortcut.title}</h3>
                        <p className="mt-1.5 text-sm leading-6 text-muted">
                          {shortcut.description}
                        </p>
                      </div>
                    </div>
                    <span className="inline-flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-brand bg-primary/8 text-primary transition group-hover:bg-primary group-hover:text-white">
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-primary transition group-hover:gap-2.5">
                    Ouvrir le dashboard
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div id="home-alerts" className="panel-padding">
          <div className="mb-5 flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-brand bg-primary-soft text-primary">
              <BellRing className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-xl font-semibold text-navy">Activite recente</h2>
              <p className="text-sm text-muted">
                Les cinq derniers signaux critiques remontes par la plateforme.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {data?.alerts.map((alert) => (
              <article
                key={alert.id}
                className="group flex items-start gap-4 rounded-xl border border-border bg-page p-4 transition hover:border-primary/20 hover:bg-white"
              >
                <span
                  className={`mt-0.5 h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                    alert.severity === 'Critique'
                      ? 'bg-danger'
                      : alert.severity === 'Elevee'
                      ? 'bg-gold'
                      : 'bg-primary'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-navy">{alert.title}</p>
                    <Badge tone={getSeverityTone(alert.severity)}>{alert.severity}</Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">{alert.description}</p>
                </div>
                <span className="flex-shrink-0 text-xs text-muted">
                  {formatRelativeTime(alert.timestamp)}
                </span>
              </article>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold text-navy">Recommandations ML</h2>
            <p className="text-sm text-muted">
              Les trois recommandations prioritaires calculees sur le portefeuille actif.
            </p>
          </div>

          {data?.recommendations.map((recommendation) => (
            <InsightCard
              key={recommendation.id}
              title={recommendation.title}
              description={recommendation.description}
              actionLabel={recommendation.actionLabel}
              onAction={() => navigate(getRecommendationActionPath(recommendation))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
