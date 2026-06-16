import { apiClient } from '@/services/api';
import type { MarketingInsightsResponse } from '@/types/marketingInsights';

export const marketingInsightsService = {
  async getInsights(): Promise<MarketingInsightsResponse> {
    const { data } = await apiClient.get<MarketingInsightsResponse>('/marketing-insights');
    return data;
  },
};
