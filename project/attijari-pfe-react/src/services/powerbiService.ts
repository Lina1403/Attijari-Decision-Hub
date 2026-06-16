import axios from 'axios';
import { apiClient } from '@/services/api';
import type { PowerBIReportKey } from '@/types';

interface PowerBIEmbedConfiguration {
  type: 'report';
  id: string;
  embedUrl: string;
  accessToken: string;
  tokenType: number;
  pageName: string;
  settings: {
    panes: {
      filters: { visible: boolean };
      pageNavigation: { visible: boolean };
    };
    background: 'Transparent';
  };
  filters?: Record<string, unknown>;
  expiration?: string;
}

function buildEmbedUrl(baseUrl: string, reportId: string) {
  if (baseUrl.includes('{reportId}')) {
    return baseUrl.replace('{reportId}', reportId);
  }

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('reportId', reportId);
    return url.toString();
  } catch {
    return `${baseUrl.replace(/\/$/, '')}/${reportId}`;
  }
}

export class PowerBIEmbedApiError extends Error {
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
    this.name = 'PowerBIEmbedApiError';
    this.status = status;
    this.statusCode = statusCode;
    this.requestId = requestId;
  }
}

function buildClientSideEmbedConfiguration(
  reportId: string,
  pageId: string,
  filters?: Record<string, unknown>,
  iframeUrl?: string,
) {
  const embedUrlBase = import.meta.env.VITE_POWERBI_EMBED_URL || iframeUrl;
  const accessToken = import.meta.env.VITE_POWERBI_ACCESS_TOKEN;

  if (!embedUrlBase || !accessToken) {
    return null;
  }

  return {
    type: 'report' as const,
    id: reportId,
    embedUrl: buildEmbedUrl(embedUrlBase, reportId),
    accessToken,
    tokenType: 1,
    pageName: pageId,
    filters,
    settings: {
      panes: {
        filters: { visible: false },
        pageNavigation: { visible: false },
      },
      background: 'Transparent' as const,
    },
  };
}

export const powerbiService = {
  async getEmbedConfiguration(
    reportId: string,
    pageId: string,
    filters?: Record<string, unknown>,
    iframeUrl?: string,
  ): Promise<PowerBIEmbedConfiguration | null> {
    try {
      const response = await apiClient.post<PowerBIEmbedConfiguration>(
        '/powerbi/embed-config',
        {
          reportId,
          pageId,
          iframeUrl,
          filters,
        },
        {
          timeout: 20_000,
        },
      );

      return response.data;
    } catch (error) {
      const clientSideFallback = buildClientSideEmbedConfiguration(
        reportId,
        pageId,
        filters,
        iframeUrl,
      );

      if (clientSideFallback) {
        return clientSideFallback;
      }

      if (axios.isAxiosError(error)) {
        if (!error.response) {
          throw new PowerBIEmbedApiError(
            'L API locale Power BI Embedded est indisponible. Verifiez le serveur backend local.',
            {
              status: 'API_UNAVAILABLE',
            },
          );
        }

        const payload = error.response.data as
          | {
              status?: string;
              message?: string;
              requestId?: string;
            }
          | undefined;

        throw new PowerBIEmbedApiError(
          payload?.message ?? 'La configuration Power BI Embedded a echoue.',
          {
            status: payload?.status ?? 'REQUEST_FAILED',
            statusCode: error.response.status,
            requestId: payload?.requestId,
          },
        );
      }

      throw new PowerBIEmbedApiError(
        'Une erreur inattendue empeche la configuration du report Power BI Embedded.',
        {
          status: 'REQUEST_FAILED',
        },
      );
    }
  },

  async requestRefresh(reportKey: PowerBIReportKey) {
    const response = await apiClient.post<{ message?: string }>('/bi/powerbi/refresh', {
      report_key: reportKey,
    });

    return response.data.message ?? `Actualisation demandee pour ${reportKey}.`;
  },
};
