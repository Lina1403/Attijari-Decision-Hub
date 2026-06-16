import { Brain, LineChart, ShieldAlert, Sparkles } from 'lucide-react';
import { useDashboardAiSummary } from '@/hooks/useDashboardAiSummary';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function MlExecutiveOverview() {
  usePageTitle('Synthese ML Executive');
  const summary = useDashboardAiSummary({
    dashboardType: 'overview',
    filters: { scope: 'executive-ml-global' },
  });

  return (
    <section className="page-section">
      <div className="dashboard-hero">
        <div className="space-y-3">
          <p className="section-label">Intelligence predictive</p>
          <h1 className="dashboard-page-heading">Resume ML global</h1>
          <p className="dashboard-page-copy">
            Vue executive des signaux churn, du niveau de risque portefeuille et des leviers
            prioritaires sans exposer les listes clients detaillees.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { label: 'Risque portefeuille', value: 'Modere', icon: ShieldAlert },
          { label: 'Tendance churn', value: '-3.1%', icon: LineChart },
          { label: 'Priorite IA', value: 'Retention', icon: Brain },
        ].map((item) => (
          <article key={item.label} className="panel-padding">
            <item.icon className="h-6 w-6 text-primary" />
            <p className="mt-4 text-sm text-muted">{item.label}</p>
            <h2 className="mt-1 text-2xl font-bold text-navy">{item.value}</h2>
          </article>
        ))}
      </div>

      <div className="panel-padding">
        <div className="mb-4 flex items-center gap-3">
          <Sparkles className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-navy">Lecture executive</h2>
        </div>
        <p className="text-sm leading-6 text-muted">
          Les pages ML detaillees sont reservees aux equipes commerciales et administrateurs. Cette
          synthese conserve les indicateurs utiles a la decision: exposition churn, dynamique de
          retention et priorites d arbitrage.
        </p>
      </div>

      <div className="panel-padding">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-navy">Resume AI</h2>
            <p className="text-sm text-muted">Synthese adaptee au role EXECUTIVE.</p>
          </div>
          <button
            type="button"
            className="rounded-brand bg-primary px-4 py-2 text-sm font-semibold text-white"
            disabled={summary.isLoading}
            onClick={() => summary.openAndGenerate({ scope: 'executive-ml-global' })}
          >
            {summary.isLoading ? 'Generation...' : 'Generer le resume AI'}
          </button>
        </div>
        {summary.error ? <p className="mt-4 text-sm text-danger">{summary.error.message}</p> : null}
        {summary.response ? (
          <div className="mt-4 space-y-3 text-sm text-muted">
            <p className="text-navy">{summary.response.summary.globalSummary}</p>
            <ul className="list-disc space-y-1 pl-5">
              {summary.response.summary.strengths.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
