import {
  Component,
  forwardRef,
  memo,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type ErrorInfo,
  type ForwardedRef,
  type ReactNode,
} from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, LayoutDashboard } from 'lucide-react';
import type { Embed, Report } from 'powerbi-client';
import { PowerBIEmbed as PowerBIReactEmbed } from 'powerbi-client-react';
import { powerbiService, PowerBIEmbedApiError } from '@/services/powerbiService';
import type { PowerBIEmbedHandle, PowerBIEmbedProps } from '@/types';
import {
  buildPowerBiDashboardSnapshot,
  parsePowerBiEmbedIdentity,
  PowerBIDashboardSnapshotError,
} from '@/utils/powerbiDashboardSnapshot';

interface PowerBIErrorBoundaryProps {
  children: ReactNode;
}

interface PowerBIErrorBoundaryState {
  hasError: boolean;
}

class PowerBIErrorBoundary extends Component<
  PowerBIErrorBoundaryProps,
  PowerBIErrorBoundaryState
> {
  public override state: PowerBIErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError() {
    return { hasError: true };
  }

  public override componentDidCatch(_error: Error, _errorInfo: ErrorInfo) {}

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[420px] flex-col items-center justify-center gap-3 rounded-card border border-danger/30 bg-danger/5 p-6 text-center">
          <AlertTriangle className="h-8 w-8 text-danger" aria-hidden="true" />
          <div className="space-y-1">
            <p className="text-base font-semibold text-navy">
              Le rapport Power BI n a pas pu etre charge.
            </p>
            <p className="text-sm text-muted">
              Verifiez la configuration Embedded ou utilisez le mode placeholder de demo.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function PowerBISkeleton({ height }: { height: number | string }) {
  return (
    <div className="dashboard-embed-frame" style={{ height }}>
      <div className="space-y-4 p-6">
        <div className="h-6 w-40 animate-pulse rounded bg-navy/10" />
        <div className="grid grid-cols-3 gap-3">
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-brand bg-navy/10" />
          ))}
        </div>
        <div className="h-[calc(100%-120px)] min-h-[250px] animate-pulse rounded-card bg-navy/10" />
      </div>
    </div>
  );
}

function PowerBIPlaceholder({
  height,
  title,
}: {
  height: number | string;
  title?: string;
}) {
  return (
    <div className="dashboard-embed-frame" style={{ height }}>
      <div className="flex h-full flex-col p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
              Power BI Embedded
            </p>
            <h3 className="mt-2 text-xl font-semibold text-navy">
              {title ?? 'Rapport de demonstration'}
            </h3>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Aucun jeton Embedded n est configure. Le conteneur affiche donc une
              maquette visuelle a la charte, prete a etre remplacee par un vrai
              rapport Power BI.
            </p>
          </div>
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-brand bg-primary-soft text-primary">
            <LayoutDashboard className="h-6 w-6" />
          </span>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-card border border-border bg-page p-4">
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              {['Clients', 'Revenus', 'Attrition'].map((item, index) => (
                <div key={item} className="rounded-brand border border-border bg-white p-4">
                  <p className="text-xs uppercase tracking-wide text-muted">{item}</p>
                  <p className="mt-2 text-xl font-bold text-navy">
                    {index === 0 ? '124.6k' : index === 1 ? '67.4M TND' : '8.4%'}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid h-[280px] grid-cols-12 gap-3">
              {Array.from({ length: 12 }, (_, index) => (
                <div
                  key={index}
                  className="self-end rounded-t-brand bg-primary/85"
                  style={{ height: `${35 + ((index * 17) % 55)}%` }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-card border border-border bg-page p-4">
              <p className="text-xs uppercase tracking-wide text-muted">Filtres actifs</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {['Segment', 'Region', 'Periode'].map((item) => (
                  <span
                    key={item}
                    className="rounded-full border border-border bg-white px-3 py-1 text-xs text-muted"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rounded-card border border-border bg-page p-4">
              <p className="text-xs uppercase tracking-wide text-muted">Zones d analyse</p>
              <div className="mt-4 space-y-3">
                {['Synthese', 'Drill segment', 'Tendance 12 mois', 'Alertes'].map((item) => (
                  <div
                    key={item}
                    className="rounded-brand border border-border bg-white px-3 py-2 text-sm text-navy"
                  >
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PowerBIEmbedComponent(
  {
    reportId,
    pageId,
    filters,
    height = 'clamp(680px, 76vh, 960px)',
    title,
    iframeUrl,
    onLoad,
  }: PowerBIEmbedProps,
  ref: ForwardedRef<PowerBIEmbedHandle>,
) {
  const parsedIdentity = useMemo(() => parsePowerBiEmbedIdentity(iframeUrl), [iframeUrl]);
  const resolvedReportId = parsedIdentity.reportId ?? reportId;
  const resolvedPageName = parsedIdentity.pageName ?? pageId;
  const { data, error, isLoading } = useQuery({
    queryKey: ['powerbi', resolvedReportId, resolvedPageName, filters],
    queryFn: () =>
      powerbiService.getEmbedConfiguration(
        resolvedReportId,
        resolvedPageName,
        filters,
        iframeUrl,
      ),
    enabled: Boolean(resolvedReportId && resolvedPageName),
  });
  const embedConfig = data as unknown as ComponentProps<typeof PowerBIReactEmbed>['embedConfig'];
  const hasTriggeredLoadRef = useRef(false);
  const embeddedReportRef = useRef<Report | null>(null);
  const [iframeReloadKey, setIframeReloadKey] = useState(0);
  const shouldUseEmbeddedReport = Boolean(data);
  const embedConfigurationErrorMessage =
    error instanceof PowerBIEmbedApiError ? error.message : null;
  const eventHandlers = useMemo(() => {
    if (!onLoad) {
      return undefined;
    }

    return new Map([
      [
        'loaded',
        () => {
          hasTriggeredLoadRef.current = true;
          onLoad();
        },
      ],
    ]);
  }, [onLoad]);

  useEffect(() => {
    hasTriggeredLoadRef.current = false;
  }, [iframeUrl, resolvedPageName, resolvedReportId, shouldUseEmbeddedReport]);

  useEffect(() => {
    embeddedReportRef.current = null;
    setIframeReloadKey(0);
  }, [iframeUrl, resolvedPageName, resolvedReportId, shouldUseEmbeddedReport]);

  useEffect(() => {
    if (shouldUseEmbeddedReport || iframeUrl || isLoading || hasTriggeredLoadRef.current || !onLoad) {
      return;
    }

    hasTriggeredLoadRef.current = true;
    onLoad();
  }, [iframeUrl, isLoading, onLoad, shouldUseEmbeddedReport]);

  useImperativeHandle(
    ref,
    () => ({
      resetFilters: async () => {
        if (!embeddedReportRef.current) {
          if (iframeUrl) {
            setIframeReloadKey((current) => current + 1);
          }
          return;
        }

        const report = embeddedReportRef.current;

        try {
          await report.resetPersistentFilters();
        } catch {
          // Some embed modes may not support persistent filters.
        }

        try {
          await report.removeFilters();
        } catch {
          // Report-level filters may be absent.
        }

        try {
          const activePage = await report.getActivePage();
          await activePage.removeFilters();
        } catch {
          // Page-level cleanup is best effort.
        }
      },
      getActiveFilters: async () => {
        if (!embeddedReportRef.current) {
          return {};
        }

        const report = embeddedReportRef.current;
        const snapshot: Record<string, unknown> = {};

        try {
          const reportFilters = await report.getFilters();

          if (reportFilters.length) {
            snapshot.reportFilters = reportFilters;
          }
        } catch {
          // Filter extraction is best effort and should never block the summary flow.
        }

        try {
          const activePage = await report.getActivePage();
          const pageFilters = await activePage.getFilters();

          if (pageFilters.length) {
            snapshot.pageFilters = pageFilters;
          }

          snapshot.activePageName = activePage.name;
        } catch {
          // Filter extraction is best effort and should never block the summary flow.
        }

        return snapshot;
      },
      getDashboardSnapshot: async () => {
        if (!embeddedReportRef.current) {
          return {
            status: 'unavailable' as const,
            reason: embedConfigurationErrorMessage
              ? ('sdk-error' as const)
              : iframeUrl
                ? ('iframe-mode' as const)
                : ('report-not-ready' as const),
            message: embedConfigurationErrorMessage
              ? embedConfigurationErrorMessage
              : iframeUrl
                ? 'Le dashboard est actuellement affiche en iframe simple. La lecture live pour le resume IA necessite un embed Power BI via le SDK.'
                : 'Le rapport Power BI n est pas encore pret pour extraire un snapshot structure.',
          };
        }

        try {
          const snapshot = await buildPowerBiDashboardSnapshot(embeddedReportRef.current, {
            reportId: resolvedReportId,
            pageName: resolvedPageName,
            dashboardTitle: title,
          });

          return {
            status: 'available' as const,
            snapshot,
          };
        } catch (error) {
          if (
            error instanceof PowerBIDashboardSnapshotError &&
            error.code === 'NO_READABLE_VISUALS'
          ) {
            return {
              status: 'unavailable' as const,
              reason: 'no-readable-visuals' as const,
              message: error.message,
            };
          }

          return {
            status: 'unavailable' as const,
            reason: 'sdk-error' as const,
            message:
              'Le SDK Power BI n a pas pu extraire un contexte structure exploitable pour le resume IA.',
          };
        }
      },
    }),
    [embedConfigurationErrorMessage, iframeUrl, resolvedPageName, resolvedReportId, title],
  );

  if (isLoading && !iframeUrl) {
    return <PowerBISkeleton height={height} />;
  }

  if (shouldUseEmbeddedReport) {
    return (
      <PowerBIErrorBoundary>
        <div className="dashboard-embed-frame" style={{ height }}>
          <PowerBIReactEmbed
            embedConfig={embedConfig}
            cssClassName="h-full w-full"
            eventHandlers={eventHandlers}
            getEmbeddedComponent={(embeddedComponent: Embed) => {
              embeddedReportRef.current = embeddedComponent as Report;
            }}
          />
        </div>
      </PowerBIErrorBoundary>
    );
  }

  if (iframeUrl) {
    return (
      <div className="dashboard-embed-frame" style={{ height }}>
        <iframe
          key={iframeReloadKey}
          title={title ?? 'Power BI report'}
          src={iframeUrl}
          frameBorder="0"
          className="h-full w-full"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          onLoad={onLoad}
        />
      </div>
    );
  }

  if (isLoading) {
    return <PowerBISkeleton height={height} />;
  }

  return (
    <PowerBIErrorBoundary>
      <PowerBIPlaceholder height={height} title={title} />
    </PowerBIErrorBoundary>
  );
}

const PowerBIEmbed = memo(forwardRef(PowerBIEmbedComponent));
PowerBIEmbed.displayName = 'PowerBIEmbed';

export default PowerBIEmbed;
