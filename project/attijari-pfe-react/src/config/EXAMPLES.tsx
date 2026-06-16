/**
 * EXEMPLES D UTILISATION
 * ======================
 *
 * Comment utiliser l architecture Power BI dans React
 */

import { ExternalLink, Maximize2, RefreshCw } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ReportFrame from '@/components/powerbi/ReportFrame';
import Button from '@/components/ui/Button';
import {
  buildPowerBiEmbedUrl,
  CAMPAIGNS_SUBREPORTS,
  DASHBOARD_PAGES,
  getDashboardByRoute,
} from '@/config/dashboards';

// ============================================================================
// EXEMPLE 1 : Afficher un dashboard principal
// ============================================================================

function Example1_MainDashboard() {
  const location = useLocation();

  const currentDashboard = getDashboardByRoute(location.pathname) || DASHBOARD_PAGES.global;
  const embedUrl = buildPowerBiEmbedUrl(
    currentDashboard.pageName,
    currentDashboard.pageId,
  );

  return (
    <div>
      <h1>{currentDashboard.title}</h1>
      <p>{currentDashboard.description}</p>

      <ReportFrame src={embedUrl} title={currentDashboard.title} height={800} />
    </div>
  );
}

// ============================================================================
// EXEMPLE 2 : Navigation avec onglets
// ============================================================================

function Example2_TabNavigation() {
  const navigate = useNavigate();

  return (
    <div className="flex gap-2 border-b pb-4">
      {Object.values(DASHBOARD_PAGES).map((dashboard) => (
        <button
          key={dashboard.key}
          onClick={() => navigate(dashboard.route)}
          className="px-4 py-2 text-sm font-medium"
        >
          {dashboard.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// EXEMPLE 3 : Sous-navigation (comme Campagnes)
// ============================================================================

function Example3_CampaignsSubNav() {
  const [activeReport, setActiveReport] =
    useState<keyof typeof CAMPAIGNS_SUBREPORTS>('overview');

  const selectedReport = CAMPAIGNS_SUBREPORTS[activeReport];
  const embedUrl = buildPowerBiEmbedUrl(selectedReport.pageName, selectedReport.pageId);

  return (
    <>
      <div className="flex gap-2">
        {Object.values(CAMPAIGNS_SUBREPORTS).map((report) => (
          <button
            key={report.key}
            onClick={() => setActiveReport(report.key)}
            className={`px-4 py-2 ${
              activeReport === report.key ? 'bg-primary text-white' : 'bg-gray-100'
            }`}
          >
            {report.label}
          </button>
        ))}
      </div>

      <ReportFrame src={embedUrl} title={selectedReport.pageName} height={800} />
    </>
  );
}

// ============================================================================
// EXEMPLE 4 : Avec etat de chargement
// ============================================================================

function Example4_WithLoading() {
  const [isLoading, setIsLoading] = useState(true);
  const location = useLocation();

  const currentDashboard = getDashboardByRoute(location.pathname) || DASHBOARD_PAGES.global;
  const embedUrl = buildPowerBiEmbedUrl(
    currentDashboard.pageName,
    currentDashboard.pageId,
  );

  return (
    <ReportFrame
      src={embedUrl}
      title={currentDashboard.title}
      height={800}
      isLoading={isLoading}
      onLoad={() => {
        setIsLoading(false);
      }}
    />
  );
}

// ============================================================================
// EXEMPLE 5 : Avec boutons d action
// ============================================================================

function Example5_WithActions() {
  const [refreshKey, setRefreshKey] = useState(0);
  const location = useLocation();

  const currentDashboard = getDashboardByRoute(location.pathname) || DASHBOARD_PAGES.global;
  const embedUrl = buildPowerBiEmbedUrl(
    currentDashboard.pageName,
    currentDashboard.pageId,
  );

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  const handleOpenPowerBI = () => {
    const powerBiUrl =
      'https://app.powerbi.com/reportEmbed?reportId=32d24acd-686a-43c6-b089-ad1c1b7cc5eb&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730';
    window.open(powerBiUrl, '_blank');
  };

  const handleFullscreen = () => {
    document.querySelector('[data-report-container]')?.requestFullscreen();
  };

  return (
    <div>
      <div className="mb-6 flex gap-3">
        <Button onClick={handleRefresh} leftIcon={<RefreshCw className="h-4 w-4" />}>
          Actualiser
        </Button>
        <Button onClick={handleOpenPowerBI} leftIcon={<ExternalLink className="h-4 w-4" />}>
          Ouvrir Power BI
        </Button>
        <Button onClick={handleFullscreen} leftIcon={<Maximize2 className="h-4 w-4" />}>
          Plein ecran
        </Button>
      </div>

      <div data-report-container>
        <ReportFrame
          key={refreshKey}
          src={embedUrl}
          title={currentDashboard.title}
          height={800}
        />
      </div>
    </div>
  );
}

// ============================================================================
// EXEMPLE 6 : Ajouter une nouvelle page Power BI
// ============================================================================

/**
 * Etapes pour ajouter une nouvelle page :
 *
 * 1. Dans src/config/dashboards.ts, ajouter la config.
 * 2. Dans src/utils/navigation.ts, ajouter l entree sidebar.
 * 3. Dans src/App.tsx, ajouter la route correspondante.
 */

// ============================================================================
// EXEMPLE 7 : Combiner plusieurs donnees
// ============================================================================

function Example7_Advanced() {
  const location = useLocation();
  const navigate = useNavigate();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const currentDashboard = getDashboardByRoute(location.pathname) || DASHBOARD_PAGES.global;

  const embedUrl = useMemo(
    () => buildPowerBiEmbedUrl(currentDashboard.pageName, currentDashboard.pageId),
    [currentDashboard],
  );

  const handleRefresh = () => {
    setIsRefreshing(true);
    setRefreshKey((prev) => prev + 1);
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{currentDashboard.title}</h1>
        <p className="text-gray-600">{currentDashboard.description}</p>
      </div>

      <div className="flex gap-2">
        {Object.values(DASHBOARD_PAGES).map((db) => (
          <button
            key={db.key}
            onClick={() => navigate(db.route)}
            className={`rounded px-4 py-2 ${
              currentDashboard.key === db.key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800'
            }`}
          >
            {db.label}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <Button onClick={handleRefresh} isLoading={isRefreshing}>
          Actualiser
        </Button>
        <Button onClick={() => window.open('https://app.powerbi.com', '_blank')}>
          Ouvrir Power BI
        </Button>
      </div>

      <ReportFrame
        key={refreshKey}
        src={embedUrl}
        title={currentDashboard.title}
        height={800}
      />
    </section>
  );
}

export {
  Example1_MainDashboard,
  Example2_TabNavigation,
  Example3_CampaignsSubNav,
  Example4_WithLoading,
  Example5_WithActions,
  Example7_Advanced,
};
