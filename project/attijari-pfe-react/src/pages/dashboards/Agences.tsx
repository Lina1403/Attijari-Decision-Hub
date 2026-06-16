import PowerBIPageTemplate from '@/components/powerbi/PowerBIPageTemplate';
import { POWERBI_URLS } from '@/config/powerbi';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Agences() {
  usePageTitle('Agences');

  return (
    <PowerBIPageTemplate
      title="Agences"
      description="Performance commerciale et relationnelle par agence, territoire et segment de clientele avec un rendu coherent pour le pilotage reseau."
      dashboardType="agencies"
      reportId="Agences"
      pageId="Agences"
      iframeUrl={POWERBI_URLS.agences}
      reportKey="Agences"
      embedTitle="Performance territoriale et reseau"
      embedDescription="Cadre premium pour suivre les performances agence par agence en attendant le rapport detaille definitif."
    />
  );
}
