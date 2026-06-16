import type { LucideIcon } from 'lucide-react';

export type DashboardAiSummaryDashboardType =
  | 'overview'
  | 'campaigns'
  | 'complaints'
  | 'agencies'
  | 'social'
  | 'clients-churn';

export type DashboardAiSummaryFilters = Record<string, unknown>;

export interface DashboardAiStructuredSummary {
  globalSummary: string;
  strengths: string[];
  watchouts: string[];
}

export interface DashboardAiSummaryResponse {
  dashboardType: DashboardAiSummaryDashboardType;
  generatedAt: string;
  status: 'SUCCESS';
  summary: DashboardAiStructuredSummary;
  meta?: {
    model?: string;
    cacheHit?: boolean;
    provider?: string;
    filters?: DashboardAiSummaryFilters;
  };
}

export interface DashboardAiSummaryRequest {
  dashboardType: DashboardAiSummaryDashboardType;
  filters?: DashboardAiSummaryFilters;
  options?: {
    bypassCache?: boolean;
  };
  forceRefresh?: boolean;
  kpiSnapshot?: Record<string, unknown>;
}

export interface DashboardAiSummaryErrorPayload {
  dashboardType?: DashboardAiSummaryDashboardType;
  status: string;
  message: string;
  requestId?: string;
}

export interface DashboardAiAccentTheme {
  accent: string;
  soft: string;
  glow: string;
  border: string;
  badge: string;
  badgeText: string;
  title: string;
  recommendation: string;
}

export interface DashboardAiSummaryConfig {
  dashboardType: DashboardAiSummaryDashboardType;
  label: string;
  tone: string;
  icon: LucideIcon;
  accentTheme: DashboardAiAccentTheme;
}
