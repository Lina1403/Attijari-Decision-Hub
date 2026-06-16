import { useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import PowerBIPageTemplate from '@/components/powerbi/PowerBIPageTemplate';
import { POWERBI_URLS } from '@/config/powerbi';
import { usePageTitle } from '@/hooks/usePageTitle';

type View = 'campagnes' | 'google' | 'meta';

const CAMPAIGN_VIEWS = {
  campagnes: {
    label: 'Vue globale',
    embedTitle: 'Vue globale campagnes',
    embedDescription:
      'Synthese portefeuille, pression budgetaire, conversion et contribution commerciale avec un cadrage large et stable.',
    iframeUrl: POWERBI_URLS.campagnes,
    reportId: 'Vue globale Campagnes Marketing',
    pageId: 'Vue globale Campagnes Marketing',
    reportKey: 'Vue globale Campagnes Marketing' as const,
  },
  google: {
    label: 'Google Ads',
    embedTitle: 'Detail Google Ads',
    embedDescription:
      'Lecture detaillee de l acquisition, des couts et des performances de trafic Google dans un cadre analytique premium.',
    iframeUrl: POWERBI_URLS.google,
    reportId: 'Google',
    pageId: 'Google',
    reportKey: 'Google' as const,
  },
  meta: {
    label: 'Meta Ads',
    embedTitle: 'Detail Meta Ads',
    embedDescription:
      'Performance Meta Ads, pression media, efficacite des audiences et contribution campagne avec un rendu centre et lisible.',
    iframeUrl: POWERBI_URLS.meta,
    reportId: 'Meta',
    pageId: 'Meta',
    reportKey: 'Meta' as const,
  },
} satisfies Record<
  View,
  {
    label: string;
    embedTitle: string;
    embedDescription: string;
    iframeUrl: string;
    reportId: string;
    pageId: string;
    reportKey: 'Vue globale Campagnes Marketing' | 'Google' | 'Meta';
  }
>;

export default function Campagnes() {
  usePageTitle('Campagnes');

  const [searchParams] = useSearchParams();
  const view = useMemo<View>(() => {
    const candidate = searchParams.get('view');
    return candidate === 'google' || candidate === 'meta' || candidate === 'campagnes'
      ? candidate
      : 'campagnes';
  }, [searchParams]);
  const currentView = CAMPAIGN_VIEWS[view];

  return (
    <PowerBIPageTemplate
      title="Campagnes"
      description="Pilotage marketing des campagnes, de la pression media, de la conversion et du ROI avec une navigation integree entre les vues principales."
      dashboardType="campaigns"
      reportId={currentView.reportId}
      pageId={currentView.pageId}
      iframeUrl={currentView.iframeUrl}
      reportKey={currentView.reportKey}
      embedTitle={currentView.embedTitle}
      embedDescription={currentView.embedDescription}
      summaryFilters={{
        view,
        platform: view === 'campagnes' ? 'ALL' : view.toUpperCase(),
      }}
      topContent={null}
    />
  );
}
