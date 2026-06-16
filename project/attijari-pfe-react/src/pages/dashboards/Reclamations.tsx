import PowerBIPageTemplate from '@/components/powerbi/PowerBIPageTemplate';
import { POWERBI_URLS } from '@/config/powerbi';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function Reclamations() {
  usePageTitle('Reclamations');

  return (
    <PowerBIPageTemplate
      title="Reclamations"
      description="Vision service client sur les irritants majeurs, les delais de resolution et les zones de friction qui impactent la satisfaction."
      dashboardType="complaints"
      reportId="Reclamations"
      pageId="Reclamations"
      iframeUrl={POWERBI_URLS.reclamations}
      reportKey="Reclamations"
      embedTitle="Pilotage des reclamations et incidents"
      embedDescription="Suivi centralise des volumes, des delais et des poches de risque avec un affichage stable sur toute la largeur utile."
    />
  );
}
