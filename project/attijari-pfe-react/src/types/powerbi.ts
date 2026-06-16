/**
 * Types pour la configuration Power BI
 */

export interface PowerBIConfig {
  reportId: string;
  baseEmbedUrl: string;
  tenantId: string;
  filterPaneEnabled: boolean;
  navContentPaneEnabled: boolean;
}

export interface DashboardPage {
  key: string;
  label: string;
  title: string;
  description: string;
  pageName: string;
  pageId: string;
  route: string;
  icon: string;
}

export interface CampaignsSubReport {
  key: string;
  label: string;
  pageName: string;
  pageId: string;
}

export interface ReportFrameProps {
  src: string;
  title: string;
  height?: number | string;
  isLoading?: boolean;
  onLoad?: () => void;
  className?: string;
}
