import {
  PowerBIConfigurationError,
  PowerBINotFoundError,
  PowerBIRequestError,
} from '../clients/PowerBIClient.js';

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isUuid(value) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(
    String(value ?? '').trim(),
  );
}

function parseEmbedUrlMetadata(iframeUrl) {
  if (!isNonEmptyString(iframeUrl)) {
    return {};
  }

  try {
    const url = new URL(iframeUrl);

    return {
      reportId: url.searchParams.get('reportId') ?? undefined,
      groupId: url.searchParams.get('groupId') ?? undefined,
      pageName: url.searchParams.get('pageName') ?? undefined,
      tenantId: url.searchParams.get('ctid') ?? undefined,
    };
  } catch {
    return {};
  }
}

function sanitizeFilters(filters) {
  return isPlainObject(filters) ? filters : undefined;
}

export class PowerBIEmbedService {
  constructor({ client, config }) {
    this.client = client;
    this.config = config;
  }

  async generateEmbedConfiguration({
    reportId,
    pageId,
    iframeUrl,
    filters,
  }) {
    const parsedEmbedUrl = parseEmbedUrlMetadata(iframeUrl);
    const resolvedReportId = isUuid(reportId) ? reportId.trim() : parsedEmbedUrl.reportId;
    const resolvedPageName = isNonEmptyString(pageId)
      ? pageId.trim()
      : parsedEmbedUrl.pageName ?? '';
    const resolvedTenantId = this.config.powerbi.tenantId || parsedEmbedUrl.tenantId || undefined;
    const resolvedWorkspaceId =
      this.config.powerbi.workspaceId || parsedEmbedUrl.groupId || undefined;

    if (!isUuid(resolvedReportId)) {
      throw new PowerBIConfigurationError(
        'Le reportId Power BI est introuvable ou invalide. Verifiez l URL d embed du dashboard.',
      );
    }

    if (!resolvedTenantId) {
      throw new PowerBIConfigurationError(
        'Le tenant Power BI est introuvable. Ajoutez POWERBI_TENANT_ID ou un ctid valide dans l URL d embed.',
      );
    }

    let reportMetadata;

    try {
      reportMetadata = await this.client.getReportMetadata({
        reportId: resolvedReportId,
        workspaceId: resolvedWorkspaceId,
        tenantId: resolvedTenantId,
      });
    } catch (error) {
      if (error instanceof PowerBINotFoundError && !resolvedWorkspaceId) {
        throw new PowerBIConfigurationError(
          'Le report Power BI n a pas ete trouve sans workspace explicite. Ajoutez POWERBI_WORKSPACE_ID ou un groupId valide dans l URL d embed.',
        );
      }

      throw error;
    }

    const datasetId = isNonEmptyString(reportMetadata?.datasetId)
      ? reportMetadata.datasetId.trim()
      : undefined;
    const embedUrl = isNonEmptyString(reportMetadata?.embedUrl)
      ? reportMetadata.embedUrl.trim()
      : undefined;

    if (!embedUrl) {
      throw new PowerBIRequestError(
        'Power BI n a pas renvoye d URL d embed exploitable pour ce report.',
      );
    }

    const embedToken = await this.client.generateEmbedToken({
      reportId: resolvedReportId,
      datasetId,
      tenantId: resolvedTenantId,
      lifetimeInMinutes: this.config.powerbi.embedTokenLifetimeMinutes,
    });

    return {
      type: 'report',
      id: resolvedReportId,
      embedUrl,
      accessToken: embedToken.token,
      tokenType: 1,
      pageName: resolvedPageName,
      expiration: embedToken.expiration,
      filters: sanitizeFilters(filters),
      settings: {
        panes: {
          filters: { visible: false },
          pageNavigation: { visible: false },
        },
        background: 'Transparent',
      },
    };
  }
}
