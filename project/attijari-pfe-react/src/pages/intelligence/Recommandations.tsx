import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Sparkles, Target } from 'lucide-react';
import RecommendationCard from '@/components/intelligence/RecommendationCard';
import KPICard from '@/components/ui/KPICard';
import { usePageTitle } from '@/hooks/usePageTitle';
import { intelligenceService } from '@/services/intelligenceService';

export default function Recommandations() {
  usePageTitle('Recommandations');

  const { data = [], isLoading, error } = useQuery({
    queryKey: ['strategic-recommendations'],
    queryFn: () => intelligenceService.getRecommendations(),
  });

  const averageImpact = useMemo(
    () =>
      data.reduce((sum, recommendation) => sum + recommendation.impact, 0) /
      Math.max(data.length, 1),
    [data],
  );

  const highPriorityCount = data.filter((recommendation) => recommendation.priority === 'Haute').length;

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Moteur ML
        </p>
        <h1 className="page-title mt-2">Recommandations de retention</h1>
        <p className="page-subtitle mt-2 max-w-3xl">
          Recommandations live construites a partir du modele ML et agregees
          par segment prioritaire du portefeuille actif.
        </p>
      </div>

      {error ? (
        <div className="rounded-card border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error instanceof Error
            ? error.message
            : 'Les recommandations live ne peuvent pas etre chargees.'}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KPICard
          label="Actions prioritaires"
          value={`${data.length}`}
          change="Catalogue de recommandations disponible"
          helperText="Backlog decisionnel du jour"
          icon={Sparkles}
          accentColor="primary"
          trend="neutral"
          loading={isLoading}
        />
        <KPICard
          label="Impact moyen"
          value={averageImpact.toFixed(0)}
          change="Score d impact moyen du portefeuille"
          helperText="Estimation agregree sur 100"
          icon={Target}
          accentColor="gold"
          trend="up"
          loading={isLoading}
        />
        <KPICard
          label="Priorite haute"
          value={`${highPriorityCount}`}
          change="Actions a enclencher en premier"
          helperText="Retenues pour execution rapide"
          icon={CheckCircle2}
          accentColor="success"
          trend="up"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {data.map((recommendation) => (
          <RecommendationCard
            key={recommendation.id}
            recommendation={recommendation}
          />
        ))}
      </div>
    </section>
  );
}
