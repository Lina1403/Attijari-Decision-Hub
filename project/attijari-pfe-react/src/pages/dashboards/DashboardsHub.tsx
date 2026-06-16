import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePageTitle } from '@/hooks/usePageTitle';
import { buildPowerBiEmbedUrl, DASHBOARD_PAGES, getDashboardByRoute } from '@/config/dashboards';
import ReportFrame from '@/components/powerbi/ReportFrame';
import Button from '@/components/ui/Button';
import { ExternalLink, RefreshCw, Maximize2 } from 'lucide-react';

export default function DashboardsHub() {
  const location = useLocation();
  const navigate = useNavigate();
  const currentDashboard = getDashboardByRoute(location.pathname) || DASHBOARD_PAGES.global;

  usePageTitle(currentDashboard.title);

  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const embedUrl = useMemo(
    () => buildPowerBiEmbedUrl(currentDashboard.pageName, currentDashboard.pageId),
    [currentDashboard]
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleFullscreen = async () => {
    const element = document.querySelector('[data-report-container]');
    if (element instanceof HTMLElement) {
      try {
        await element.requestFullscreen();
      } catch (err) {
        console.error('Erreur plein écran:', err);
      }
    }
  };

  const handleOpenPowerBI = () => {
    const powerBiUrl = `https://app.powerbi.com/reportEmbed?reportId=32d24acd-686a-43c6-b089-ad1c1b7cc5eb&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730`;
    window.open(powerBiUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <section className="page-section">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="page-title">{currentDashboard.title}</h1>
          <p className="page-subtitle mt-2 max-w-3xl">{currentDashboard.description}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button
            variant="secondary"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            isLoading={isRefreshing}
            onClick={handleRefresh}
          >
            Actualiser
          </Button>
          <Button
            variant="secondary"
            leftIcon={<ExternalLink className="h-4 w-4" />}
            onClick={handleOpenPowerBI}
          >
            Ouvrir Power BI
          </Button>
          <Button
            variant="secondary"
            leftIcon={<Maximize2 className="h-4 w-4" />}
            onClick={handleFullscreen}
          >
            Plein écran
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="mt-6 flex flex-wrap gap-2 border-b border-border">
        {Object.values(DASHBOARD_PAGES).map(dashboard => (
          <button
            key={dashboard.key}
            onClick={() => navigate(dashboard.route)}
            className={`px-4 py-3 text-sm font-medium transition-colors ${
              currentDashboard.key === dashboard.key
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted hover:text-navy'
            }`}
          >
            {dashboard.label}
          </button>
        ))}
      </div>

      {/* Report Frame */}
      <div data-report-container className="mt-6">
        <ReportFrame
          key={refreshKey}
          src={embedUrl}
          title={currentDashboard.title}
          height={800}
          onLoad={() => {
            console.log(`Dashboard ${currentDashboard.key} loaded`);
          }}
        />
      </div>
    </section>
  );
}
