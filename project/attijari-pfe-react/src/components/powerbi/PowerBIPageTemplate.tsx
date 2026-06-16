import { ExternalLink, Maximize2, RefreshCw, RotateCcw } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import DashboardAiSummaryButton from '@/components/dashboards/DashboardAiSummaryButton';
import DashboardAiSummarySection from '@/components/dashboards/DashboardAiSummarySection';
import DashboardEmbedCard from '@/components/dashboards/DashboardEmbedCard';
import DashboardPageLayout from '@/components/dashboards/DashboardPageLayout';
import { getDashboardAiSummaryConfig } from '@/config/dashboardAiSummary';
import { useDashboardAiSummary } from '@/hooks/useDashboardAiSummary';
import PowerBIEmbed from '@/components/powerbi/PowerBIEmbed';
import Button from '@/components/ui/Button';
import { powerbiService } from '@/services/powerbiService';
import type { PowerBIEmbedHandle, PowerBIReportKey } from '@/types';
import type {
  DashboardAiSummaryDashboardType,
  DashboardAiSummaryFilters,
} from '@/types/dashboardAiSummary';
import { getBreadcrumbs } from '@/utils/navigation';

interface PowerBIPageTemplateProps {
  title: string;
  description: string;
  dashboardType: DashboardAiSummaryDashboardType;
  reportId: string;
  pageId: string;
  iframeUrl?: string;
  reportKey?: PowerBIReportKey;
  openUrl?: string;
  topContent?: ReactNode;
  eyebrow?: string;
  embedTitle?: string;
  embedDescription?: string;
  embedHeight?: number | string;
  summaryFilters?: DashboardAiSummaryFilters;
}

export default function PowerBIPageTemplate({
  title,
  description,
  dashboardType,
  reportId,
  pageId,
  iframeUrl,
  reportKey,
  openUrl,
  topContent,
  eyebrow,
  embedTitle,
  embedDescription,
  embedHeight = 'clamp(680px, 76vh, 960px)',
  summaryFilters = {},
}: PowerBIPageTemplateProps) {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const embedRef = useRef<PowerBIEmbedHandle>(null);
  const aiSummaryRef = useRef<HTMLDivElement>(null);
  const aiSummaryConfig = getDashboardAiSummaryConfig(dashboardType);
  const aiSummary = useDashboardAiSummary({
    dashboardType,
    filters: summaryFilters,
  });

  const handleFullscreen = async () => {
    await wrapperRef.current?.requestFullscreen();
  };

  const scrollToAiSummary = () => {
    window.setTimeout(() => {
      aiSummaryRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 80);
  };

  const collectSummaryFilters = async () => {
    const [powerBiFilters, snapshotResult] = await Promise.all([
      embedRef.current?.getActiveFilters(),
      embedRef.current?.getDashboardSnapshot(),
    ]);

    return {
      ...summaryFilters,
      powerBiFilters,
      reportId,
      pageId,
      reportKey,
      powerBiSnapshotStatus: snapshotResult?.status ?? 'unavailable',
      powerBiSnapshotReason: snapshotResult?.reason,
      powerBiSnapshotMessage: snapshotResult?.message,
      kpiSnapshot: snapshotResult?.status === 'available' ? snapshotResult.snapshot : undefined,
    };
  };

  const handleAiSummary = async () => {
    if (aiSummary.isVisible && aiSummary.hasSummary && !aiSummary.needsRefresh) {
      scrollToAiSummary();
      return;
    }

    const nextFilters = await collectSummaryFilters();

    try {
      await aiSummary.openAndGenerate(nextFilters);
    } catch {
      // The section manages the user-facing error state.
    } finally {
      scrollToAiSummary();
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);

    try {
      if (reportKey) {
        await powerbiService.requestRefresh(reportKey);
      }
    } catch {
      // Keep the existing interface responsive even if the backend endpoint is not ready yet.
    } finally {
      setRefreshKey((current) => current + 1);
      setIsRefreshing(false);
    }
  };

  const handleResetFilters = async () => {
    setIsResetting(true);

    try {
      await embedRef.current?.resetFilters();
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <DashboardPageLayout
      title={title}
      description={description}
      breadcrumbs={breadcrumbs}
      eyebrow={eyebrow}
      actions={
        <>
          <DashboardAiSummaryButton
            config={aiSummaryConfig}
            isLoading={aiSummary.isLoading}
            isVisible={aiSummary.isVisible}
            hasSummary={aiSummary.hasSummary}
            shouldPulse={!aiSummary.hasSummary || aiSummary.needsRefresh}
            onClick={handleAiSummary}
          />
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            isLoading={isRefreshing}
            className="shadow-sm"
            onClick={handleRefresh}
          >
            Actualiser
          </Button>
          <Button
            variant="secondary"
            leftIcon={<RotateCcw className="h-4 w-4" />}
            isLoading={isResetting}
            className="shadow-sm"
            onClick={handleResetFilters}
          >
            Reinitialiser
          </Button>
          {openUrl ? (
            <Button
              variant="secondary"
              leftIcon={<ExternalLink className="h-4 w-4" />}
              className="shadow-sm"
              onClick={() => window.open(openUrl, '_blank', 'noopener,noreferrer')}
            >
              Ouvrir Power BI
            </Button>
          ) : null}
          <Button
            variant="secondary"
            leftIcon={<Maximize2 className="h-4 w-4" />}
            className="shadow-sm"
            onClick={handleFullscreen}
          >
            Plein ecran
          </Button>
        </>
      }
    >
      <DashboardEmbedCard
        title={embedTitle ?? title}
        description={
          embedDescription ??
          'Consultation interactive du rapport Power BI dans un cadre large, stable et optimise pour la lecture analytique.'
        }
        toolbar={topContent}
      >
        <div ref={wrapperRef} className="min-w-0">
          <PowerBIEmbed
            key={refreshKey}
            ref={embedRef}
            title={embedTitle ?? title}
            reportId={reportId}
            pageId={pageId}
            height={embedHeight}
            iframeUrl={iframeUrl}
          />
        </div>
      </DashboardEmbedCard>

      <DashboardAiSummarySection
        ref={aiSummaryRef}
        config={aiSummaryConfig}
        visible={aiSummary.isVisible}
        isLoading={aiSummary.isLoading}
        isRefreshing={aiSummary.isLoading}
        response={aiSummary.response}
        error={aiSummary.error}
        filters={aiSummary.activeFilters}
        needsRefresh={aiSummary.needsRefresh}
        copyState={aiSummary.copyState}
        onRetry={async () => {
          const nextFilters = await collectSummaryFilters();

          try {
            await aiSummary.retry(nextFilters);
          } catch {
            // The section manages the user-facing error state.
          }
        }}
        onRegenerate={async () => {
          const nextFilters = await collectSummaryFilters();

          try {
            await aiSummary.regenerate(nextFilters);
          } catch {
            // The section manages the user-facing error state.
          }
        }}
        onCopy={() => aiSummary.copySummary(aiSummaryConfig)}
      />
    </DashboardPageLayout>
  );
}
