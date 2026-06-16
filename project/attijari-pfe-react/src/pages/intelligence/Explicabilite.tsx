import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import FeatureImportanceChart from '@/components/intelligence/FeatureImportanceChart';
import RiskScoreBadge from '@/components/intelligence/RiskScoreBadge';
import InsightCard from '@/components/ui/InsightCard';
import KPICard from '@/components/ui/KPICard';
import Badge from '@/components/ui/Badge';
import { usePageTitle } from '@/hooks/usePageTitle';
import { intelligenceService } from '@/services/intelligenceService';

export default function Explicabilite() {
  usePageTitle('Explicabilite');

  const {
    data: features = [],
    isLoading: isLoadingFeatures,
    error: featuresError,
  } = useQuery({
    queryKey: ['portfolio-feature-importance'],
    queryFn: () => intelligenceService.getPortfolioFeatureImportance(),
  });

  const {
    data: clientPage,
    isLoading: isLoadingClients,
    error: clientsError,
  } = useQuery({
    queryKey: ['explicability-clients-top'],
    queryFn: () =>
      intelligenceService.getRiskClientsPage({
        page: 0,
        size: 3,
        sortBy: 'probabiliteChurn',
        direction: 'desc',
      }),
  });

  const isLoading = isLoadingFeatures || isLoadingClients;
  const topDriver = features[0]?.feature ?? 'En attente des donnees live';
  const examples = useMemo(() => clientPage?.content ?? [], [clientPage?.content]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Model transparency
        </p>
        <h1 className="page-title mt-2">Explicabilite du modele</h1>
        <p className="page-subtitle mt-2 max-w-3xl">
          Lecture interpretable des facteurs churn, des explications locales et des
          principes de gouvernance utilises pour la restitution au metier.
        </p>
        <p className="mt-3 max-w-3xl rounded-card border border-border bg-page px-4 py-3 text-sm text-muted">
          Cette section explique les variables qui influencent le plus le risque de churn.
          Elle permet de comprendre pourquoi un client est considere a risque et quelles
          actions peuvent reduire ce risque. Le graphique est global au modele, et les
          exemples ci-dessous montrent la lecture sur des clients reels.
        </p>
      </div>

      {featuresError ? (
        <div className="rounded-card border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {featuresError instanceof Error
            ? featuresError.message
            : "L'explicabilite live n'a pas pu etre chargee."}
        </div>
      ) : null}

      {clientsError ? (
        <div className="rounded-card border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {clientsError instanceof Error
            ? clientsError.message
            : "Les exemples clients n'ont pas pu etre charges."}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <KPICard
          label="Precision metier"
          value="87%"
          change="Stabilisee sur 3 derniers cycles"
          helperText="Score de precision de demonstration"
          icon={ShieldCheck}
          accentColor="success"
          trend="up"
          loading={isLoading}
        />
        <KPICard
          label="Top driver"
          value={topDriver}
          change="Variable la plus contributive"
          helperText="Mesuree sur le portefeuille global"
          icon={Layers3}
          accentColor="primary"
          trend="neutral"
          loading={isLoading}
        />
        <KPICard
          label="Refresh"
          value="Quotidien"
          change="Dernier recalcul a 06:00"
          helperText="Pipeline decisionnel standard"
          icon={Sparkles}
          accentColor="gold"
          trend="neutral"
          loading={isLoading}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <FeatureImportanceChart data={features} height={360} />

        <div className="space-y-4">
          <InsightCard
            title="Lecture SHAP metier"
            description="Les facteurs positifs poussent le risque churn a la hausse alors que les facteurs negatifs jouent un role protecteur dans la relation client."
          />
          <InsightCard
            title="Cadre de gouvernance"
            description="Le score est expose avec ses principales raisons pour favoriser l adoption par les equipes marketing, reseau et service client."
          />
          <div className="panel-padding">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-navy">Version modele</h2>
              <Badge tone="primary">v2.4 live SQL</Badge>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              Le modele live expose ses variables les plus contributives pour relier le
              score churn a des facteurs metier lisibles.
            </p>
          </div>
        </div>
      </div>

      <div className="panel-padding">
        <div className="mb-5">
          <h2 className="text-xl font-semibold text-navy">Exemples locaux</h2>
          <p className="text-sm text-muted">
            Illustration de la logique explicative sur trois clients prioritaires.
          </p>
        </div>

        {isLoading ? (
          <div className="rounded-card border border-border bg-page p-6 text-sm text-muted">
            Chargement des exemples clients live...
          </div>
        ) : examples.length === 0 ? (
          <div className="rounded-card border border-border bg-page p-6 text-sm text-muted">
            Aucun exemple explicatif n&apos;est disponible pour le moment.
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {examples.map((client) => (
              <article key={client.id} className="rounded-card border border-border bg-page p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-navy">{client.fullName}</p>
                    <p className="text-sm text-muted">
                      {client.segment} - {client.gouvernorat}
                    </p>
                  </div>
                  <RiskScoreBadge score={client.score} />
                </div>
                <div className="mt-4 space-y-2">
                  {client.topFeatures.map((feature) => (
                    <div
                      key={`${client.id}-${feature}`}
                      className="rounded-brand border border-border bg-white px-3 py-2 text-sm text-muted"
                    >
                      {feature}
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
