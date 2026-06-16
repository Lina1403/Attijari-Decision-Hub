import { forwardRef, useEffect, useState } from 'react';
import { AlertTriangle, BrainCircuit, RefreshCw, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import DashboardAiSummaryCard from '@/components/dashboards/DashboardAiSummaryCard';
import type {
  DashboardAiSummaryConfig,
  DashboardAiSummaryFilters,
  DashboardAiSummaryResponse,
} from '@/types/dashboardAiSummary';
import type { DashboardAiSummaryApiError } from '@/services/dashboardAiSummaryService';
import { buildDashboardAiCssVars } from '@/utils/dashboardAiSummary';

interface DashboardAiSummarySectionProps {
  config: DashboardAiSummaryConfig;
  visible: boolean;
  isLoading: boolean;
  isRefreshing: boolean;
  response: DashboardAiSummaryResponse | null;
  error: DashboardAiSummaryApiError | null;
  filters: DashboardAiSummaryFilters;
  needsRefresh: boolean;
  copyState: 'idle' | 'copied' | 'error';
  onRetry: () => void | Promise<void>;
  onRegenerate: () => void | Promise<void>;
  onCopy: () => void | Promise<void>;
}

function LoadingCard({ config }: { config: DashboardAiSummaryConfig }) {
  return (
    <section
      className="dashboard-ai-summary-panel"
      style={buildDashboardAiCssVars(config.accentTheme)}
    >
      <div className="dashboard-ai-summary-card">
        <div className="dashboard-ai-summary-topbar">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="dashboard-ai-summary-icon">
                <BrainCircuit className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <h2 className="dashboard-ai-summary-title">Resume Decisionnel IA</h2>
                <p className="dashboard-ai-summary-subtitle">
                  Lecture structuree du dashboard...
                  <span className="dashboard-ai-loading-dots" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </span>
                </p>
              </div>
            </div>
            <p className="dashboard-ai-summary-status-copy">
              Extraction des KPI, visuels, filtres, alertes et tendances en cours avant generation IA.
            </p>
          </div>

          <span className="dashboard-ai-summary-badge">
            <Sparkles className="h-3.5 w-3.5" />
            Analyse via Groq
          </span>
        </div>

        <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
          <div className="dashboard-ai-skeleton-card">
            <div className="dashboard-ai-skeleton-line w-24" />
            <div className="dashboard-ai-skeleton-line w-full" />
            <div className="dashboard-ai-skeleton-line w-[92%]" />
            <div className="dashboard-ai-skeleton-line w-[84%]" />
          </div>
          <div className="dashboard-ai-skeleton-card">
            <div className="dashboard-ai-skeleton-line w-32" />
            <div className="dashboard-ai-skeleton-line w-full" />
            <div className="dashboard-ai-skeleton-line w-[88%]" />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="dashboard-ai-skeleton-card">
            <div className="dashboard-ai-skeleton-line w-28" />
            <div className="dashboard-ai-skeleton-line w-full" />
            <div className="dashboard-ai-skeleton-line w-[90%]" />
            <div className="dashboard-ai-skeleton-line w-[86%]" />
          </div>
          <div className="dashboard-ai-skeleton-card">
            <div className="dashboard-ai-skeleton-line w-36" />
            <div className="dashboard-ai-skeleton-line w-full" />
            <div className="dashboard-ai-skeleton-line w-[88%]" />
            <div className="dashboard-ai-skeleton-line w-[79%]" />
          </div>
        </div>
      </div>
    </section>
  );
}

function ErrorCard({
  config,
  error,
  onRetry,
}: {
  config: DashboardAiSummaryConfig;
  error: DashboardAiSummaryApiError;
  onRetry: () => void | Promise<void>;
}) {
  return (
    <section
      className="dashboard-ai-summary-panel"
      style={buildDashboardAiCssVars(config.accentTheme)}
    >
      <div className="dashboard-ai-summary-card">
        <div className="dashboard-ai-summary-topbar">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="dashboard-ai-summary-icon">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <h2 className="dashboard-ai-summary-title">Resume Decisionnel IA indisponible</h2>
                <p className="dashboard-ai-summary-subtitle">
                  {error.status === 'API_UNAVAILABLE'
                    ? 'Le backend local ne repond pas.'
                    : error.status === 'GROQ_UNAVAILABLE'
                      ? 'Le service Groq ne repond pas.'
                      : error.status === 'GROQ_AUTH_ERROR' || error.status === 'GROQ_CONFIG_ERROR'
                        ? 'La configuration Groq doit etre verifiee.'
                        : error.status === 'DATA_UNAVAILABLE'
                          ? 'La lecture live du dashboard n est pas disponible.'
                          : error.status === 'GROQ_RATE_LIMITED'
                            ? 'La limite Groq est atteinte temporairement.'
                            : 'La generation n a pas abouti.'}
                </p>
              </div>
            </div>
            <p className="dashboard-ai-summary-status-copy">{error.message}</p>
          </div>

          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            className="dashboard-ai-action-button"
            onClick={onRetry}
          >
            Reessayer
          </Button>
        </div>
      </div>
    </section>
  );
}

function RefreshCard({
  config,
  onRetry,
}: {
  config: DashboardAiSummaryConfig;
  onRetry: () => void | Promise<void>;
}) {
  return (
    <section
      className="dashboard-ai-summary-panel"
      style={buildDashboardAiCssVars(config.accentTheme)}
    >
      <div className="dashboard-ai-summary-card">
        <div className="dashboard-ai-summary-topbar">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="dashboard-ai-summary-icon">
                <BrainCircuit className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <h2 className="dashboard-ai-summary-title">Contexte mis a jour</h2>
                <p className="dashboard-ai-summary-subtitle">
                  Les filtres ou la vue active ont change depuis la derniere generation.
                </p>
              </div>
            </div>
            <p className="dashboard-ai-summary-status-copy">
              Relancez l analyse pour obtenir une synthese alignee sur le contexte courant.
            </p>
          </div>

          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            className="dashboard-ai-action-button"
            onClick={onRetry}
          >
            Relancer l analyse
          </Button>
        </div>
      </div>
    </section>
  );
}

const DashboardAiSummarySection = forwardRef<HTMLDivElement, DashboardAiSummarySectionProps>(
  function DashboardAiSummarySection(
    {
      config,
      visible,
      isLoading,
      isRefreshing,
      response,
      error,
      filters,
      needsRefresh,
      copyState,
      onRetry,
      onRegenerate,
      onCopy,
    },
    ref,
  ) {
    const [isExpanded, setIsExpanded] = useState(true);

    useEffect(() => {
      if (response) {
        setIsExpanded(true);
      }
    }, [response]);

    if (!visible) {
      return null;
    }

    return (
      <div ref={ref} className="pt-2">
        {isLoading ? <LoadingCard config={config} /> : null}
        {!isLoading && error ? <ErrorCard config={config} error={error} onRetry={onRetry} /> : null}
        {!isLoading && !error && !response && needsRefresh ? (
          <RefreshCard config={config} onRetry={onRetry} />
        ) : null}
        {!isLoading && !error && response ? (
          <DashboardAiSummaryCard
            config={config}
            response={response}
            filters={filters}
            isExpanded={isExpanded}
            isRefreshing={isRefreshing}
            copyState={copyState}
            onRegenerate={onRegenerate}
            onCopy={onCopy}
            onToggleExpanded={() => setIsExpanded((current) => !current)}
          />
        ) : null}
      </div>
    );
  },
);

export default DashboardAiSummarySection;
