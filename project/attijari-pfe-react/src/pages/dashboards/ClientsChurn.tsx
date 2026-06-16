import PowerBIPageTemplate from '@/components/powerbi/PowerBIPageTemplate';
import { POWERBI_URLS } from '@/config/powerbi';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function ClientsChurn() {
  usePageTitle('Clients & Churn');

  return (
    <PowerBIPageTemplate
      title="Clients churn"
      description="Analyse des segments a risque, cohortes sensibles, probabilites de churn et leviers de retention dans un cadre analytique homogene."
      dashboardType="clients-churn"
      reportId="Clients & Churn"
      pageId="Clients & Churn"
      iframeUrl={POWERBI_URLS.clients}
      reportKey="Clients & Churn"
      embedTitle="Parcours clients et attrition"
      embedDescription="Lecture detaillee des signaux de desengagement, de la dynamique des segments et des priorites d'action relationnelle."
    />
  );
}
