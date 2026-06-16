import PowerBIPageTemplate from '@/components/powerbi/PowerBIPageTemplate';
import { POWERBI_URLS } from '@/config/powerbi';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function VueGlobale() {
  usePageTitle('Vue Globale');

  return (
    <PowerBIPageTemplate
      title="Vue globale"
      description="Vision executive consolidee du portefeuille, des revenus, des KPI reseau et des indicateurs de satisfaction dans une lecture claire et stable."
      dashboardType="overview"
      reportId="01_Vue_Globale"
      pageId="01_Vue_Globale"
      iframeUrl={POWERBI_URLS.global}
      reportKey="01_Vue_Globale"
      embedTitle="Synthese executive du reseau"
      embedDescription="Vue consolidee des indicateurs majeurs avec un cadrage large, centre et optimise pour la lecture manageriale."
    />
  );
}
