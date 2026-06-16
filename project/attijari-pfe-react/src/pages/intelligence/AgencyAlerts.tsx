import { BellRing, Building2, MessageSquareWarning, ShieldAlert } from 'lucide-react';
import { useDashboardAiSummary } from '@/hooks/useDashboardAiSummary';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function AgencyAlerts() {
  usePageTitle('Alertes agences');
  const summary = useDashboardAiSummary({
    dashboardType: 'agencies',
    filters: { scope: 'agency-client-alerts' },
  });

  return (
    <section className="page-section">
      <div className="dashboard-hero">
        <div className="space-y-3">
          <p className="section-label">Reseau et vigilance client</p>
          <h1 className="dashboard-page-heading">Alertes clients et agences</h1>
          <p className="dashboard-page-copy">
            Vue synthetique pour responsables agences: signaux relationnels, reclamations et
            priorites locales sans acces aux outils ML complets.
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {[
          { label: 'Agences sous vigilance', value: '7', icon: Building2 },
          { label: 'Alertes clients', value: '42', icon: BellRing },
          { label: 'Reclamations critiques', value: '18', icon: MessageSquareWarning },
        ].map((item) => (
          <article key={item.label} className="panel-padding">
            <item.icon className="h-6 w-6 text-primary" />
            <p className="mt-4 text-sm text-muted">{item.label}</p>
            <h2 className="mt-1 text-2xl font-bold text-navy">{item.value}</h2>
          </article>
        ))}
      </div>

      <article className="panel-padding">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-1 h-5 w-5 text-danger" />
          <div>
            <h2 className="text-xl font-semibold text-navy">Priorites agence</h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Traiter les reclamations ouvertes, rappeler les clients avec satisfaction faible et
              suivre les agences affichant une hausse combinee du volume incident + risque churn.
            </p>
          </div>
        </div>
      </article>

      <div className="panel-padding">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-navy">Resume AI</h2>
            <p className="text-sm text-muted">Synthese adaptee au role AGENCY.</p>
          </div>
          <button
            type="button"
            className="rounded-brand bg-primary px-4 py-2 text-sm font-semibold text-white"
            disabled={summary.isLoading}
            onClick={() => summary.openAndGenerate({ scope: 'agency-client-alerts' })}
          >
            {summary.isLoading ? 'Generation...' : 'Generer le resume AI'}
          </button>
        </div>
        {summary.error ? <p className="mt-4 text-sm text-danger">{summary.error.message}</p> : null}
        {summary.response ? (
          <p className="mt-4 text-sm leading-6 text-navy">{summary.response.summary.globalSummary}</p>
        ) : null}
      </div>
    </section>
  );
}
