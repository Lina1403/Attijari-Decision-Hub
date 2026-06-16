export type MarketingInsightStatus = 'available' | 'insufficient';
export type MarketingMetricUnit = 'count' | 'pct' | 'usd' | 'text';

export interface MarketingMetric {
  label: string;
  value: number | string;
  unit: MarketingMetricUnit;
  helperText?: string;
}

export interface MarketingInsightCard {
  status: MarketingInsightStatus;
  title: string;
  label: string;
  value: string;
  explanation: string;
  evidence: MarketingMetric[];
}

export interface MarketingRecommendation {
  title: string;
  recommendation: string;
  confidence: 'Élevée' | 'Moyenne' | 'Données insuffisantes';
  basedOn: MarketingMetric[];
}

export interface MarketingInsightsResponse {
  source: string;
  generatedAt: string;
  dataAvailable: boolean;
  message: string;
  kpis: MarketingMetric[];
  insights: {
    bestCampaign: MarketingInsightCard;
    bestChannel: MarketingInsightCard;
    bestOffer: MarketingInsightCard;
    socialPerformance: MarketingInsightCard;
  };
  recommendations: MarketingRecommendation[];
  aiSnapshot: Record<string, unknown> | null;
}
