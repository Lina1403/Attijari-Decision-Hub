import axios from 'axios';
import { apiClient } from '@/services/api';
import type {
  DashboardAiSummaryErrorPayload,
  DashboardAiSummaryRequest,
  DashboardAiSummaryResponse,
} from '@/types/dashboardAiSummary';

export class DashboardAiSummaryApiError extends Error {
  status: string;
  statusCode?: number;
  requestId?: string;

  constructor(
    message: string,
    {
      status,
      statusCode,
      requestId,
    }: { status: string; statusCode?: number; requestId?: string },
  ) {
    super(message);
    this.name = 'DashboardAiSummaryApiError';
    this.status = status;
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

export const dashboardAiSummaryService = {
  async generate(request: DashboardAiSummaryRequest): Promise<DashboardAiSummaryResponse> {
    try {
      const response = await apiClient.post<DashboardAiSummaryResponse>(
        '/dashboard-ai-summary/generate',
        request,
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          const isTimeout = error.code === 'ECONNABORTED';

          throw new DashboardAiSummaryApiError(
            isTimeout
              ? 'L API locale des resumes IA a depasse le delai de reponse. Verifiez le serveur local et la configuration Groq.'
              : 'L API locale des resumes IA est indisponible. Demarrez `npm run server`, puis verifiez la configuration Groq cote backend.',
            {
              status: isTimeout ? 'API_TIMEOUT' : 'API_UNAVAILABLE',
            },
          );
        }

        const payload = error.response.data as DashboardAiSummaryErrorPayload | undefined;

        throw new DashboardAiSummaryApiError(
          payload?.message ?? 'La generation du resume IA a echoue.',
          {
            status: payload?.status ?? 'REQUEST_FAILED',
            statusCode: error.response.status,
            requestId: payload?.requestId,
          },
        );
      }

      throw new DashboardAiSummaryApiError(
        'Une erreur inattendue empeche la generation du resume IA.',
        {
          status: 'REQUEST_FAILED',
        },
      );
    }
  },
};
