import { useEffect, useState } from 'react';
import { Copy, RefreshCw, ShieldCheck, Sparkles, ChevronUp, ChevronDown } from 'lucide-react';
import Button from '@/components/ui/Button';
import type {
  DashboardAiSummaryConfig,
  DashboardAiSummaryFilters,
  DashboardAiSummaryResponse,
} from '@/types/dashboardAiSummary';
import {
  buildDashboardAiCssVars,
  formatDashboardAiGeneratedAt,
  getDashboardAiFilterChips,
} from '@/utils/dashboardAiSummary';

interface TypingTextProps {
  text: string;
  animationKey: string;
  className?: string;
}

function TypingText({ text, animationKey, className }: TypingTextProps) {
  const [visibleText, setVisibleText] = useState(text);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    let currentIndex = 0;
    const increment = Math.max(1, Math.ceil(text.length / 42));
    setVisibleText('');
    setIsTyping(true);

    const intervalId = window.setInterval(() => {
      currentIndex = Math.min(text.length, currentIndex + increment);
      setVisibleText(text.slice(0, currentIndex));

      if (currentIndex >= text.length) {
        window.clearInterval(intervalId);
        setIsTyping(false);
      }
    }, 18);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [animationKey, text]);

  return (
    <p className={className}>
      {visibleText}
      {isTyping ? <span className="dashboard-ai-typing-caret" aria-hidden="true" /> : null}
    </p>
  );
}

interface DashboardAiSummaryCardProps {
  config: DashboardAiSummaryConfig;
  response: DashboardAiSummaryResponse;
  filters: DashboardAiSummaryFilters;
  isExpanded: boolean;
  isRefreshing: boolean;
  copyState: 'idle' | 'copied' | 'error';
  onRegenerate: () => void | Promise<void>;
  onCopy: () => void | Promise<void>;
  onToggleExpanded: () => void;
}

export default function DashboardAiSummaryCard({
  config,
  response,
  filters,
  isExpanded,
  isRefreshing,
  copyState,
  onRegenerate,
  onCopy,
  onToggleExpanded,
}: DashboardAiSummaryCardProps) {
  const filterChips = getDashboardAiFilterChips(filters);
  const Icon = config.icon;
  const generatedAtLabel = formatDashboardAiGeneratedAt(response.generatedAt);
  const copyLabel =
    copyState === 'copied' ? 'Copie' : copyState === 'error' ? 'Echec copie' : 'Copier';

  return (
    <section
      className="dashboard-ai-summary-panel"
      style={buildDashboardAiCssVars(config.accentTheme)}
    >
      <div className="dashboard-ai-summary-card">
        <div className="dashboard-ai-summary-topbar">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="dashboard-ai-summary-icon">
                <Icon className="h-5 w-5" />
              </span>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="dashboard-ai-summary-title">Resume Decisionnel IA</h2>
                  <span className="dashboard-ai-summary-badge">
                    <Sparkles className="h-3.5 w-3.5" />
                    Genere via IA
                  </span>
                  {response.meta?.cacheHit ? (
                    <span className="dashboard-ai-summary-badge">Cache serveur</span>
                  ) : null}
                </div>
                <p className="dashboard-ai-summary-subtitle">
                  {config.tone} - {generatedAtLabel}
                </p>
              </div>
            </div>

            {filterChips.length ? (
              <div className="flex flex-wrap gap-2">
                {filterChips.map((item) => (
                  <span key={`${item.label}-${item.value}`} className="dashboard-ai-filter-chip">
                    <span className="font-semibold">{item.label}</span>
                    <span>{item.value}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className="h-4 w-4" />}
              isLoading={isRefreshing}
              className="dashboard-ai-action-button"
              onClick={onRegenerate}
            >
              Regenerer
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Copy className="h-4 w-4" />}
              className="dashboard-ai-action-button"
              onClick={onCopy}
            >
              {copyLabel}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={
                isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )
              }
              className="dashboard-ai-action-button"
              onClick={onToggleExpanded}
            >
              {isExpanded ? 'Reduire' : 'Deplier'}
            </Button>
          </div>
        </div>

        <div className="grid gap-5">
          <section className="dashboard-ai-content-block">
            <div className="dashboard-ai-section-label">
              <ShieldCheck className="h-4 w-4" />
              Synthese globale
            </div>
            <TypingText
              animationKey={response.generatedAt}
              text={response.summary.globalSummary}
              className="dashboard-ai-summary-text"
            />
          </section>
        </div>

        {isExpanded ? (
          <div className="grid gap-5 lg:grid-cols-2">
            <section className="dashboard-ai-content-block">
              <div className="dashboard-ai-section-label">Points forts</div>
              <ul className="dashboard-ai-list">
                {response.summary.strengths.map((item, index) => (
                  <li
                    key={`strength-${item}`}
                    className="dashboard-ai-list-item dashboard-ai-fade-in"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <span className="dashboard-ai-list-bullet" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="dashboard-ai-content-block">
              <div className="dashboard-ai-section-label">Points d attention</div>
              <ul className="dashboard-ai-list">
                {response.summary.watchouts.map((item, index) => (
                  <li
                    key={`watchout-${item}`}
                    className="dashboard-ai-list-item dashboard-ai-fade-in"
                    style={{ animationDelay: `${index * 80}ms` }}
                  >
                    <span className="dashboard-ai-list-bullet dashboard-ai-list-bullet-watch" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        ) : null}
      </div>
    </section>
  );
}
