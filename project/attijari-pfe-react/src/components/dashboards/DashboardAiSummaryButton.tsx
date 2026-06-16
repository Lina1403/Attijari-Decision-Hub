import type { CSSProperties } from 'react';
import { Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button';
import type { DashboardAiSummaryConfig } from '@/types/dashboardAiSummary';
import { cn } from '@/utils/cn';
import { buildDashboardAiCssVars } from '@/utils/dashboardAiSummary';

interface DashboardAiSummaryButtonProps {
  config: DashboardAiSummaryConfig;
  isLoading: boolean;
  isVisible: boolean;
  hasSummary: boolean;
  shouldPulse: boolean;
  onClick: () => void | Promise<void>;
}

export default function DashboardAiSummaryButton({
  config,
  isLoading,
  isVisible,
  hasSummary,
  shouldPulse,
  onClick,
}: DashboardAiSummaryButtonProps) {
  let label = 'Résumé IA';

  if (isLoading) {
    label = 'Analyse en cours...';
  } else if (hasSummary && isVisible) {
    label = 'Voir le résumé IA';
  } else if (hasSummary) {
    label = 'Ouvrir le résumé IA';
  }

  return (
    <Button
      variant="secondary"
      isLoading={isLoading}
      onClick={onClick}
      leftIcon={!isLoading ? <Sparkles className="h-4 w-4" /> : undefined}
      className={cn(
        'dashboard-ai-summary-button relative overflow-hidden rounded-full px-4 shadow-sm',
        isVisible && 'dashboard-ai-summary-button-active',
        shouldPulse && !isLoading && 'dashboard-ai-summary-button-pulse',
      )}
      style={buildDashboardAiCssVars(config.accentTheme) as CSSProperties}
    >
      {label}
    </Button>
  );
}
