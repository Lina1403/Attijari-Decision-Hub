import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  CheckCircle2,
  LineChart,
  Megaphone,
  MousePointerClick,
  RefreshCw,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePageTitle } from '@/hooks/usePageTitle';
import { marketingInsightsService } from '@/services/marketingInsightsService';
import type {
  MarketingInsightCard,
  MarketingMetricUnit,
  MarketingRecommendation,
} from '@/types/marketingInsights';
import { formatNumber, formatPercent } from '@/utils/format';

const INSUFFICIENT_DATA_MESSAGE =
  'Données insuffisantes pour générer une recommandation fiable.';

function formatMetricValue(value: number | string, unit: MarketingMetricUnit) {
  if (unit === 'text') return String(value);

  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return 'Aucune donnée disponible';
  if (unit === 'pct') return formatPercent(numericValue);
  if (unit === 'usd') return `${formatNumber(numericValue)} USD`;
  return formatNumber(numericValue);
}

function EmptyPanel({ message = INSUFFICIENT_DATA_MESSAGE }: { message?: string }) {
  return (
    <div className="rounded-card border border-dashed border-border bg-white px-5 py-6 text-sm text-muted">
      {message}
    </div>
  );
}

function InsightCard({
  insight,
  icon: Icon,
}: {
  insight: MarketingInsightCard;
  icon: LucideIcon;
}) {
  const isAvailable = insight.status === 'available';

  return (
    <article className="rounded-card border border-border bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
            {insight.title}
          </p>
          <h2 className="mt-2 text-lg font-semibold text-navy">{insight.label}</h2>
        </div>
        <span className="rounded-brand bg-primary-soft p-2 text-primary">
          <Icon className="h-5 w-5" />
        </span>
      </div>

      <p className={`mt-5 text-2xl font-bold ${isAvailable ? 'text-navy' : 'text-muted'}`}>
        {insight.value}
      </p>
      <p className="mt-3 text-sm leading-6 text-muted">{insight.explanation}</p>

      {insight.evidence.length ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {insight.evidence.map((metric) => (
            <div key={`${insight.title}-${metric.label}`} className="rounded-brand bg-page p-3">
              <p className="text-xs text-muted">{metric.label}</p>
              <p className="mt-1 text-sm font-semibold text-navy">
                {formatMetricValue(metric.value, metric.unit)}
              </p>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  );
}

function RecommendationCard({ recommendation }: { recommendation: MarketingRecommendation }) {
  return (
    <article className="rounded-card border border-border bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-1 rounded-full bg-success/10 p-1 text-success">
          <CheckCircle2 className="h-4 w-4" />
        </span>
        <div>
          <h3 className="text-base font-semibold text-navy">{recommendation.title}</h3>
          <p className="mt-2 text-sm leading-6 text-muted">{recommendation.recommendation}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            Confiance : {recommendation.confidence}
          </p>
        </div>
      </div>
    </article>
  );
}

export default function MarketingInsights() {
  usePageTitle('Intelligence Marketing');

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['marketing-insights'],
    queryFn: () => marketingInsightsService.getInsights(),
  });

  const insights = data?.insights;

  return (
    <section className="page-section">
      <div className="dashboard-hero">
        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <p className="section-label">Direction Marketing</p>
            <h1 className="dashboard-page-heading">Intelligence Marketing</h1>
            <p className="dashboard-page-copy">
              Lecture décisionnelle des campagnes, canaux d’acquisition et réseaux sociaux,
              construite uniquement à partir des données marketing disponibles.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              className="inline-flex items-center gap-2 rounded-brand border border-border bg-white px-4 py-2 text-sm font-semibold text-navy shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-32 animate-pulse rounded-card bg-white" />
          ))}
        </div>
      ) : null}

      {error ? (
        <EmptyPanel message="Aucune donnée disponible pour générer une lecture marketing fiable." />
      ) : null}

      {!isLoading && data && !data.dataAvailable ? (
        <EmptyPanel message={data.message || 'Aucune donnée disponible'} />
      ) : null}

      {!isLoading && data ? (
        <>
          {insights ? (
            <div className="space-y-4">
              <InsightCard insight={insights.bestCampaign} icon={Megaphone} />
              <InsightCard insight={insights.bestChannel} icon={MousePointerClick} />
              <InsightCard insight={insights.socialPerformance} icon={BarChart3} />
            </div>
          ) : null}

          <section className="rounded-card border border-border bg-white p-5 shadow-sm">
            <div className="flex items-center gap-3">
              <LineChart className="h-5 w-5 text-primary" />
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Recommandations marketing
                </p>
                <h2 className="mt-1 text-lg font-semibold text-navy">
                  Décisions proposées à partir des données réelles
                </h2>
              </div>
            </div>

            <div className="mt-5 grid gap-4">
              {data.recommendations.length ? (
                data.recommendations.map((recommendation) => (
                  <RecommendationCard
                    key={`${recommendation.title}-${recommendation.confidence}`}
                    recommendation={recommendation}
                  />
                ))
              ) : (
                <EmptyPanel />
              )}
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
