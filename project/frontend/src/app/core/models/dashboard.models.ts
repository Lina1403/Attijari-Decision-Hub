export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
  meta: Record<string, unknown>;
  errors: string[];
}

export interface BreadcrumbItem {
  label: string;
  path: string;
}

export interface NavigationItem {
  label: string;
  path: string;
}

export interface NavigationModule {
  id: string;
  label: string;
  icon: string;
  items: NavigationItem[];
}

export interface KpiItem {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  accentColor: string;
  helperText: string;
  icon: string;
}

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: string;
  timestamp: string;
}

export interface DashboardShortcut {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: string;
  tag: string;
}

export interface StrategicRecommendation {
  id: string;
  title: string;
  description: string;
  impact: number;
  roi: string;
  priority: string;
  owner: string;
  eta: string;
  actionLabel: string;
  category: string;
}

export interface OverviewSummary {
  kpis: KpiItem[];
  shortcuts: DashboardShortcut[];
  alerts: AlertItem[];
  recommendations: StrategicRecommendation[];
  source: string;
}

export interface PowerBiReportDescriptor {
  reportId: string;
  dashboardType: string;
  pageId: string;
  title: string;
  description: string;
  path: string;
  category: string;
}

export interface PowerBiConfig {
  reportId: string;
  pageId: string;
  title: string;
  embedEnabled: boolean;
  embedUrl: string;
  openUrl: string;
  accessToken: string;
  workspaceId: string;
  message: string;
}

export interface AiSummaryRequest {
  dashboardType: string;
  filters?: Record<string, unknown>;
  kpiSnapshot?: Record<string, unknown>;
  forceRefresh?: boolean;
  options?: {
    bypassCache?: boolean;
  };
}

export interface AiSummaryResponse {
  dashboardType: string;
  generatedAt: string;
  status: string;
  summary: {
    globalSummary: string;
    strengths: string[];
    watchouts: string[];
  };
  meta: {
    provider: string;
    model: string;
    cacheHit: boolean;
    filters: Record<string, unknown>;
    contextSource: string;
  };
}

export interface IntelligenceMetric {
  id: string;
  label: string;
  value: string;
  helperText: string;
  tone: 'default' | 'danger' | 'gold' | 'success';
}

export interface RiskTab {
  id: string;
  label: string;
  count: number;
}

export interface RiskClientRow {
  id: string;
  clientSK: number;
  fullName: string;
  segment: string;
  gouvernorat: string;
  riskScore: number;
  riskClass: string;
  satisfaction: number;
  products: number;
  complaints: number;
  appConnections: number;
  appFeatures: number;
  cardPayments: number;
  topFeatures: string[];
}

export interface IntelligenceInsight {
  id: string;
  title: string;
  description: string;
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
  direction: 'positive' | 'negative' | 'neutral';
}

export interface IntelligencePage {
  pageId: string;
  dashboardType: string;
  eyebrow: string;
  title: string;
  description: string;
  metrics?: IntelligenceMetric[];
  riskTabs?: RiskTab[];
  tableRows?: RiskClientRow[];
  suggestedClients?: RiskClientRow[];
  defaultClientId?: string;
  tips?: string[];
  insights?: IntelligenceInsight[];
  featureImportance?: FeatureImportanceItem[];
  modelVersion?: string;
  examples?: RiskClientRow[];
  recommendations?: StrategicRecommendation[];
}
