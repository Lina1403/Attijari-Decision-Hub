import PowerBIPageTemplate from '@/components/powerbi/PowerBIPageTemplate';
import { POWERBI_URLS } from '@/config/powerbi';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function SocialMedia() {
  usePageTitle('Social Media');

  return (
    <PowerBIPageTemplate
      title="Social media"
      description="Suivi des mentions, du sentiment, des thematiques critiques et des signaux externes avec une presentation analytique sobre et lisible."
      dashboardType="social"
      reportId="Social media"
      pageId="Social media"
      iframeUrl={POWERBI_URLS.social}
      reportKey="Social media"
      embedTitle="Social listening et reputation"
      embedDescription="Vue large sur les signaux conversationnels et l'image de marque, integree dans un conteneur stable et bien dimensionne."
    />
  );
}
