import {
  buildDashboardAiSummaryErrorResponse,
  parseDashboardAiSummaryRequest,
} from '../dto/dashboardAiSummaryDtos.js';
import {
  GroqAuthenticationError,
  GroqConfigurationError,
  GroqInvalidResponseError,
  GroqRateLimitError,
  GroqResponseEmptyError,
  GroqTimeoutError,
  GroqUnavailableError,
} from '../clients/GroqClient.js';
import { DashboardDataUnavailableError } from '../services/DashboardSummaryContextBuilder.js';
import { readJsonBody, sendJson } from '../utils/http.js';
import { hasRole, rolesForDashboard } from '../auth/rbac.js';

function mapErrorToResponse(error, requestId) {
  if (error instanceof GroqTimeoutError) {
    return {
      statusCode: error.statusCode,
      payload: buildDashboardAiSummaryErrorResponse({
        status: error.code,
        message:
          'La generation IA via Groq a depasse le delai prevu. Reessayez dans quelques instants.',
        requestId,
      }),
    };
  }

  if (error instanceof GroqUnavailableError) {
    return {
      statusCode: error.statusCode,
      payload: buildDashboardAiSummaryErrorResponse({
        status: error.code,
        message:
          'Le service Groq est indisponible. Verifiez la connectivite reseau et reessayez.',
        requestId,
      }),
    };
  }

  if (error instanceof GroqAuthenticationError || error instanceof GroqConfigurationError) {
    return {
      statusCode: error.statusCode,
      payload: buildDashboardAiSummaryErrorResponse({
        status: error.code,
        message:
          'La configuration Groq est invalide. Verifiez GROQ_API_KEY, GROQ_BASE_URL et GROQ_MODEL.',
        requestId,
      }),
    };
  }

  if (error instanceof GroqRateLimitError) {
    return {
      statusCode: error.statusCode,
      payload: buildDashboardAiSummaryErrorResponse({
        status: error.code,
        message:
          'Le quota ou la limite de requetes Groq est atteint temporairement. Reessayez dans quelques instants.',
        requestId,
      }),
    };
  }

  if (error instanceof GroqInvalidResponseError || error instanceof GroqResponseEmptyError) {
    return {
      statusCode: error.statusCode,
      payload: buildDashboardAiSummaryErrorResponse({
        status: error.code,
        message:
          'Le modele Groq a renvoye une reponse inexploitable. Reessayez ou changez de modele.',
        requestId,
      }),
    };
  }

  if (error instanceof DashboardDataUnavailableError) {
    return {
      statusCode: error.statusCode,
      payload: buildDashboardAiSummaryErrorResponse({
        status: error.code,
        message: error.message,
        requestId,
      }),
    };
  }

  if (typeof error?.statusCode === 'number' && typeof error?.code === 'string') {
    return {
      statusCode: error.statusCode,
      payload: buildDashboardAiSummaryErrorResponse({
        status: error.code,
        message: error.message,
        requestId,
      }),
    };
  }

  return {
    statusCode: 500,
    payload: buildDashboardAiSummaryErrorResponse({
      status: 'INTERNAL_ERROR',
      message: 'Une erreur interne empeche la generation du resume IA.',
      requestId,
    }),
  };
}

export class DashboardAiSummaryController {
  constructor({ service, logger, config }) {
    this.service = service;
    this.logger = logger;
    this.config = config;
  }

  async handleGenerate(request, response, { requestId }) {
    try {
      const payload = await readJsonBody(request, {
        maxSizeBytes: this.config.server.requestBodyLimitBytes,
      });
      const parsedRequest = parseDashboardAiSummaryRequest(payload);
      const allowedRoles = rolesForDashboard(parsedRequest.dashboardType);

      if (request.user && !hasRole(request.user, allowedRoles)) {
        return sendJson(response, 403, {
          status: 'FORBIDDEN',
          message: 'Votre role ne permet pas de generer ce resume AI.',
          requestId,
        });
      }

      const serviceResponse = await this.service.generate(parsedRequest, { requestId });

      sendJson(response, 200, serviceResponse);
    } catch (error) {
      this.logger.error('Dashboard AI summary generation failed.', {
        requestId,
        code: error?.code,
        message: error?.message,
      });

      const mappedError = mapErrorToResponse(error, requestId);
      sendJson(response, mappedError.statusCode, mappedError.payload);
    }
  }
}
