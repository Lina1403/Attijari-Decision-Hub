import {
  PowerBIAccessDeniedError,
  PowerBIAuthenticationError,
  PowerBIConfigurationError,
  PowerBINotFoundError,
  PowerBIRequestError,
  PowerBIUnavailableError,
} from '../clients/PowerBIClient.js';
import { readJsonBody, sendJson } from '../utils/http.js';
import { hasRole, rolesForDashboard } from '../auth/rbac.js';

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function parsePowerBIEmbedRequest(payload) {
  if (!isPlainObject(payload)) {
    throw new PowerBIConfigurationError(
      'La requete Power BI Embedded doit contenir un objet JSON valide.',
    );
  }

  const reportId = typeof payload.reportId === 'string' ? payload.reportId.trim() : '';
  const pageId = typeof payload.pageId === 'string' ? payload.pageId.trim() : '';
  const iframeUrl = typeof payload.iframeUrl === 'string' ? payload.iframeUrl.trim() : '';
  const filters = isPlainObject(payload.filters) ? payload.filters : undefined;

  return {
    reportId,
    pageId,
    iframeUrl,
    filters,
  };
}

function mapErrorToResponse(error, requestId) {
  if (
    error instanceof PowerBIConfigurationError ||
    error instanceof PowerBIAuthenticationError ||
    error instanceof PowerBIAccessDeniedError ||
    error instanceof PowerBINotFoundError ||
    error instanceof PowerBIUnavailableError ||
    error instanceof PowerBIRequestError
  ) {
    return {
      statusCode: error.statusCode,
      payload: {
        status: error.code,
        message: error.message,
        requestId,
      },
    };
  }

  if (typeof error?.statusCode === 'number' && typeof error?.code === 'string') {
    return {
      statusCode: error.statusCode,
      payload: {
        status: error.code,
        message: error.message,
        requestId,
      },
    };
  }

  return {
    statusCode: 500,
    payload: {
      status: 'POWERBI_INTERNAL_ERROR',
      message: 'Une erreur interne empeche la preparation du report Power BI Embedded.',
      requestId,
    },
  };
}

export class PowerBIEmbedController {
  constructor({ service, logger, config }) {
    this.service = service;
    this.logger = logger;
    this.config = config;
  }

  async handleGetEmbedConfig(request, response, { requestId }) {
    try {
      const payload = await readJsonBody(request, {
        maxSizeBytes: this.config.server.requestBodyLimitBytes,
      });
      const parsedRequest = parsePowerBIEmbedRequest(payload);
      const allowedRoles = rolesForDashboard(parsedRequest.reportId || parsedRequest.pageId);

      if (request.user && !hasRole(request.user, allowedRoles)) {
        return sendJson(response, 403, {
          status: 'FORBIDDEN',
          message: 'Votre role ne permet pas d ouvrir ce dashboard Power BI.',
          requestId,
        });
      }

      const embedConfiguration = await this.service.generateEmbedConfiguration(parsedRequest);

      sendJson(response, 200, embedConfiguration);
    } catch (error) {
      this.logger.error('Power BI embed configuration failed.', {
        requestId,
        code: error?.code,
        message: error?.message,
      });

      const mappedError = mapErrorToResponse(error, requestId);
      sendJson(response, mappedError.statusCode, mappedError.payload);
    }
  }
}
