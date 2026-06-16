import http from 'node:http';
import { randomUUID } from 'node:crypto';
import { GroqClient } from './src/clients/GroqClient.js';
import { PowerBIClient } from './src/clients/PowerBIClient.js';
import { SimpleTtlCache } from './src/cache/SimpleTtlCache.js';
import { createAppConfig } from './src/config/appConfig.js';
import { DashboardAiSummaryController } from './src/controllers/DashboardAiSummaryController.js';
import { PowerBIEmbedController } from './src/controllers/PowerBIEmbedController.js';
import { DashboardPromptFactory } from './src/factories/DashboardPromptFactory.js';
import { ChurnDataService } from './src/services/ChurnDataService.js';
import { HomeSnapshotService } from './src/services/HomeSnapshotService.js';
import { DashboardAiSummaryService } from './src/services/DashboardAiSummaryService.js';
import { DashboardSummaryContextBuilder } from './src/services/DashboardSummaryContextBuilder.js';
import { MarketingInsightsService } from './src/services/MarketingInsightsService.js';
import { PowerBIEmbedService } from './src/services/PowerBIEmbedService.js';
import { SqlCmdClient } from './src/services/SqlCmdClient.js';
import { getRequestPath, sendJson, sendNoContent, setCommonHeaders } from './src/utils/http.js';
import { createLogger } from './src/utils/logger.js';
import { authController } from './src/auth/authController.js';
import { requireAuth, requireRole } from './src/auth/authMiddleware.js';
import { ML_FULL_ACCESS_ROLES } from './src/auth/rbac.js';
import { seedUsers } from './src/auth/seedUsers.js';
import { sqlUserStore } from './src/auth/sqlUserStore.js';
import { accessRequestStore } from './src/access/accessRequestStore.js';
import { accessRequestController } from './src/access/accessRequestController.js';
import { EmailService } from './src/services/emailService.js';
import { SqlDashboardDataService } from './src/services/SqlDashboardDataService.js';
import { DailyReportScheduler, DailyReportService } from './src/services/DailyReportService.js';

const config = createAppConfig();
const logger = createLogger('dashboard-ai-api');
const cache = new SimpleTtlCache({ ttlMs: config.cache.ttlMs });
const churnDataService = new ChurnDataService(config.churnData);
const sqlCmdClient = new SqlCmdClient({ config: config.sqlcmd, logger });
const sqlDashboardDataService = new SqlDashboardDataService({
  sqlClient: sqlCmdClient,
  logger,
});
const marketingInsightsService = new MarketingInsightsService({
  dashboardDataService: sqlDashboardDataService,
});
sqlUserStore.configure({ sqlClient: sqlCmdClient, logger });
accessRequestStore.configure({ sqlClient: sqlCmdClient, logger });
const emailService = new EmailService({ logger, config: config.email });
const dailyReportService = new DailyReportService({
  sqlUserStore,
  dashboardDataService: sqlDashboardDataService,
  emailService,
  logger,
});
const dailyReportScheduler = new DailyReportScheduler({
  service: dailyReportService,
  config: config.dailyReports,
  logger,
});
const homeSnapshotService = new HomeSnapshotService({
  sqlClient: sqlCmdClient,
  cache,
  logger,
});
const contextBuilder = new DashboardSummaryContextBuilder({
  config,
  liveContextProviders: {
    overview: sqlDashboardDataService,
    campaigns: sqlDashboardDataService,
    complaints: sqlDashboardDataService,
    agencies: sqlDashboardDataService,
    social: sqlDashboardDataService,
    'clients-churn': churnDataService,
  },
});
const promptFactory = new DashboardPromptFactory();
const groqClient = new GroqClient(config.groq);
const powerbiClient = new PowerBIClient(config.powerbi);
const service = new DashboardAiSummaryService({
  cache,
  contextBuilder,
  promptFactory,
  groqClient,
  logger,
  config,
});
const powerBIEmbedService = new PowerBIEmbedService({
  client: powerbiClient,
  config,
});
const controller = new DashboardAiSummaryController({
  service,
  logger,
  config,
});
const powerBIEmbedController = new PowerBIEmbedController({
  service: powerBIEmbedService,
  logger,
  config,
});
const mlApiBaseUrl = process.env.ML_API_BASE_URL ?? 'http://localhost:5001/api';

async function getMlApiPayload(pathname) {
  const response = await fetch(`${mlApiBaseUrl}${pathname}`);
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.message ?? payload?.error ?? 'La lecture de l API ML a echoue.',
    );
    error.statusCode = response.status;
    error.code = payload?.status ?? 'ML_API_ERROR';
    throw error;
  }

  return payload;
}

function getRequestUrl(request) {
  return new URL(request.url ?? '/', `http://${request.headers.host ?? 'localhost'}`);
}

function buildMlPath(pathname, url) {
  return `${pathname}${url.search}`;
}

async function postMlApiPayload(pathname, body) {
  const response = await fetch(`${mlApiBaseUrl}${pathname}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(
      payload?.message ?? payload?.error ?? 'La lecture de l API ML a echoue.',
    );
    error.statusCode = response.status;
    error.code = payload?.status ?? 'ML_API_ERROR';
    throw error;
  }

  return payload;
}

function matchAdminAccessRequestPath(path) {
  return path.match(/^\/api\/admin\/access-requests\/([^/]+)\/(approve|reject)$/);
}

function matchAdminUserPath(path) {
  return path.match(/^\/api\/admin\/users\/([^/]+)$/);
}

const server = http.createServer(async (request, response) => {
  const requestId = randomUUID();
  const path = getRequestPath(request);

  response.setHeader('X-Request-Id', requestId);
  setCommonHeaders(response);

  if (request.method === 'OPTIONS') {
    sendNoContent(response);
    return;
  }

  // ── Auth routes ─────────────────────────────────────────────────────────────

  if (request.method === 'POST' && path === '/api/auth/login') {
    await authController.handleLogin(request, response, { requestId });
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/register') {
    await authController.handleRegister(request, response, { requestId });
    return;
  }

  if (request.method === 'POST' && path === '/api/access-requests') {
    await accessRequestController.handleCreateRequest(request, response, { requestId });
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/refresh') {
    await authController.handleRefresh(request, response, { requestId });
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/logout') {
    await authController.handleLogout(request, response, { requestId });
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/forgot-password') {
    await authController.handleForgotPassword(request, response, { requestId, emailService });
    return;
  }

  if (request.method === 'GET' && path === '/api/auth/me') {
    await authController.handleMe(request, response, { requestId });
    return;
  }

  // ────────────────────────────────────────────────────────────────────────────

  if (request.method === 'GET' && path === '/api/auth/profile') {
    if (!(await requireAuth(request, response, { requestId }))) return;
    await authController.handleGetProfile(request, response, { requestId });
    return;
  }

  if (request.method === 'PUT' && path === '/api/auth/profile') {
    if (!(await requireAuth(request, response, { requestId }))) return;
    await authController.handleUpdateProfile(request, response, { requestId });
    return;
  }

  if (request.method === 'GET' && path === '/api/auth/preferences') {
    if (!(await requireAuth(request, response, { requestId }))) return;
    await authController.handleGetPreferences(request, response, { requestId });
    return;
  }

  if (request.method === 'PUT' && path === '/api/auth/preferences') {
    if (!(await requireAuth(request, response, { requestId }))) return;
    await authController.handleUpdatePreferences(request, response, { requestId });
    return;
  }

  if (request.method === 'GET' && path === '/api/auth/notifications') {
    if (!(await requireAuth(request, response, { requestId }))) return;
    await authController.handleGetNotifications(request, response, { requestId });
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/notifications/read') {
    if (!(await requireAuth(request, response, { requestId }))) return;
    await authController.handleMarkNotificationsRead(request, response, { requestId });
    return;
  }

  if (request.method === 'DELETE' && path === '/api/auth/notifications/read') {
    if (!(await requireAuth(request, response, { requestId }))) return;
    await authController.handleClearReadNotifications(request, response, { requestId });
    return;
  }

  if (request.method === 'POST' && path === '/api/auth/change-password') {
    if (!(await requireAuth(request, response, { requestId }))) return;
    await authController.handleChangePassword(request, response, { requestId });
    return;
  }

  if (request.method === 'GET' && path === '/api/admin/access-requests') {
    if (!(await requireRole(request, response, ['ADMIN'], { requestId }))) return;
    await accessRequestController.handleListRequests(request, response, { requestId });
    return;
  }

  if (request.method === 'GET' && path === '/api/admin/users') {
    if (!(await requireRole(request, response, ['ADMIN'], { requestId }))) return;
    await authController.handleListUsers(request, response, { requestId });
    return;
  }

  if (request.method === 'POST' && path === '/api/admin/daily-reports/send') {
    if (!(await requireRole(request, response, ['ADMIN'], { requestId }))) return;

    try {
      const reports = await dailyReportService.sendAll();
      sendJson(response, 200, {
        message: 'Rapports quotidiens traites.',
        reports,
      });
    } catch (error) {
      logger.error('Daily report manual send failed.', { requestId, message: error?.message });
      sendJson(response, 500, {
        code: 'DAILY_REPORT_SEND_ERROR',
        message: error?.message ?? 'L envoi des rapports quotidiens a echoue.',
        requestId,
      });
    }
    return;
  }

  const adminUserMatch = matchAdminUserPath(path);
  if (request.method === 'DELETE' && adminUserMatch) {
    if (!(await requireRole(request, response, ['ADMIN'], { requestId }))) return;

    request.params = {
      userId: adminUserMatch[1],
    };

    await authController.handleDeleteUser(request, response, { requestId });
    return;
  }

  const adminAccessRequestMatch = matchAdminAccessRequestPath(path);
  if (request.method === 'PATCH' && adminAccessRequestMatch) {
    if (!(await requireRole(request, response, ['ADMIN'], { requestId }))) return;

    request.params = {
      requestId: adminAccessRequestMatch[1],
      action: adminAccessRequestMatch[2],
    };

    if (adminAccessRequestMatch[2] === 'approve') {
      await accessRequestController.handleApproveRequest(request, response, {
        requestId,
        emailService,
      });
      return;
    }

    await accessRequestController.handleRejectRequest(request, response, { requestId });
    return;
  }

  if (request.method === 'GET' && path === '/api/health') {
    sendJson(response, 200, {
      status: 'UP',
      service: 'dashboard-ai-summary-api',
      provider: 'groq',
      groqBaseUrl: config.groq.baseUrl,
      model: config.groq.model,
      hasApiKey: Boolean(config.groq.apiKey),
      cacheTtlMs: config.cache.ttlMs,
      allowFixtureFallback: config.dashboardAi.allowFixtureFallback,
      churnLiveDataConfigured: churnDataService.hasRequiredFiles(),
      dashboardSqlDataConfigured: true,
      dashboardSqlDataAvailableFor: sqlDashboardDataService.getAvailableDashboards(),
      powerbiEmbeddedConfigured: Boolean(
        config.powerbi.clientId && config.powerbi.clientSecret,
      ),
      powerbiWorkspaceConfigured: Boolean(config.powerbi.workspaceId),
      smtpConfigured: emailService.isConfigured(),
      dailyReportsEnabled: config.dailyReports.enabled,
    });
    return;
  }

  if (request.method === 'POST' && path === '/api/powerbi/embed-config') {
    if (!(await requireAuth(request, response, { requestId }))) return;
    await powerBIEmbedController.handleGetEmbedConfig(request, response, { requestId });
    return;
  }

  if (request.method === 'GET' && path === '/api/home-snapshot') {
    if (!(await requireAuth(request, response, { requestId }))) return;
    try {
      const snapshot = await homeSnapshotService.getSnapshot();
      try {
        const recommendationsPayload = await getMlApiPayload('/recommendations?limit=3');
        if (Array.isArray(recommendationsPayload?.recommendations)) {
          snapshot.recommendations = recommendationsPayload.recommendations;
        }
      } catch (recommendationsError) {
        logger.error('Erreur chargement recommandations ML pour accueil', {
          requestId,
          message: recommendationsError?.message,
        });
      }
      sendJson(response, 200, snapshot);
    } catch (error) {
      logger.error('Erreur chargement accueil live SQL Server', {
        requestId,
        message: error?.message,
      });
      sendJson(response, error?.statusCode ?? 500, {
        status: error?.code ?? 'HOME_SNAPSHOT_ERROR',
        message:
          error?.message ??
          'Le chargement live de l accueil depuis SQL Server a echoue.',
        requestId,
      });
    }
    return;
  }

  if (request.method === 'GET' && path === '/api/dashboard-churn') {
    if (!(await requireRole(request, response, ML_FULL_ACCESS_ROLES, { requestId }))) return;
    try {
      const payload = await getMlApiPayload('/dashboard-churn');
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, error?.statusCode ?? 500, {
        status: error?.code ?? 'CHURN_DATA_ERROR',
        message: error?.message ?? 'Le chargement du dashboard churn a echoue.',
        requestId,
      });
    }
    return;
  }

  if (request.method === 'GET' && path === '/api/top-at-risk') {
    if (!(await requireRole(request, response, ML_FULL_ACCESS_ROLES, { requestId }))) return;
    try {
      const url = getRequestUrl(request);
      const limit = Number(url.searchParams.get('limit') ?? '10');
      const payload = await getMlApiPayload(`/top-at-risk?limit=${limit}`);
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, error?.statusCode ?? 500, {
        status: error?.code ?? 'CHURN_DATA_ERROR',
        message: error?.message ?? 'Le chargement des clients a risque a echoue.',
        requestId,
      });
    }
    return;
  }

  if (request.method === 'POST' && path === '/api/dashboard-ai-summary/generate') {
    if (!(await requireAuth(request, response, { requestId }))) return;
    await controller.handleGenerate(request, response, { requestId });
    return;
  }

  if (request.method === 'GET' && path === '/api/marketing-insights') {
    if (!(await requireAuth(request, response, { requestId }))) return;
    try {
      const payload = await marketingInsightsService.buildInsights();
      sendJson(response, 200, payload);
    } catch (error) {
      logger.error('Erreur chargement intelligence marketing', {
        requestId,
        message: error?.message,
      });
      sendJson(response, 200, marketingInsightsService.buildUnavailablePayload(error));
    }
    return;
  }

  if (request.method === 'GET' && path === '/api/intelligence/clients') {
    if (!(await requireRole(request, response, ML_FULL_ACCESS_ROLES, { requestId }))) return;
    try {
      const payload = await getMlApiPayload('/clients-with-scores');
      sendJson(response, 200, payload);
    } catch (error) {
      logger.error('Erreur chargement clients intelligence', error);
      sendJson(response, error?.statusCode ?? 500, {
        status: error?.code ?? 'CHURN_DATA_ERROR',
        message: error?.message ?? 'Le chargement des clients a echoue.',
        requestId,
      });
    }
    return;
  }

  if (request.method === 'GET' && path === '/api/intelligence/clients-sql') {
    if (!(await requireRole(request, response, ML_FULL_ACCESS_ROLES, { requestId }))) return;
    try {
      const payload = await getMlApiPayload('/clients-with-scores');
      sendJson(response, 200, payload);
    } catch (error) {
      logger.error('Erreur chargement clients intelligence SQL', error);
      sendJson(response, error?.statusCode ?? 500, {
        status: error?.code ?? 'CHURN_DATA_ERROR',
        message: error?.message ?? 'Le chargement SQL des clients a echoue.',
        requestId,
      });
    }
    return;
  }

  if (request.method === 'GET' && path === '/api/intelligence/recommendations') {
    if (!(await requireRole(request, response, ML_FULL_ACCESS_ROLES, { requestId }))) return;
    try {
      const url = getRequestUrl(request);
      const limit = Number(url.searchParams.get('limit') ?? '6');
      const snapshot = await getMlApiPayload(`/recommendations?limit=${limit}`);
      sendJson(response, 200, {
        success: true,
        count: snapshot.recommendations.length,
        recommendations: snapshot.recommendations,
      });
    } catch (error) {
      logger.error('Erreur chargement recommandations intelligence', error);
      sendJson(response, error?.statusCode ?? 500, {
        status: error?.code ?? 'HOME_SNAPSHOT_ERROR',
        message: error?.message ?? 'Le chargement des recommandations a echoue.',
        requestId,
      });
    }
    return;
  }

  if (request.method === 'GET' && path === '/api/feature-importance') {
    if (!(await requireRole(request, response, ML_FULL_ACCESS_ROLES, { requestId }))) return;
    try {
      const payload = await getMlApiPayload('/feature-importance');
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, error?.statusCode ?? 500, {
        status: error?.code ?? 'ML_API_ERROR',
        message: error?.message ?? "Le chargement de l explicabilite a echoue.",
        requestId,
      });
    }
    return;
  }

  if (request.method === 'GET' && path === '/api/clients-with-scores') {
    if (!(await requireRole(request, response, ML_FULL_ACCESS_ROLES, { requestId }))) return;
    try {
      const payload = await getMlApiPayload(buildMlPath('/clients-with-scores', getRequestUrl(request)));
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, error?.statusCode ?? 500, {
        status: error?.code ?? 'CHURN_DATA_ERROR',
        message: error?.message ?? 'Le chargement des clients scores a echoue.',
        requestId,
      });
    }
    return;
  }

  if (request.method === 'GET' && path === '/api/churn/clients-risk') {
    if (!(await requireRole(request, response, ML_FULL_ACCESS_ROLES, { requestId }))) return;
    try {
      const payload = await getMlApiPayload(buildMlPath('/churn/clients-risk', getRequestUrl(request)));
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, error?.statusCode ?? 500, {
        status: error?.code ?? 'CHURN_DATA_ERROR',
        message:
          error?.message ??
          'Le chargement live pagine des clients a risque a echoue.',
        requestId,
      });
    }
    return;
  }

  if (request.method === 'GET' && path === '/api/clients/search') {
    if (!(await requireRole(request, response, ML_FULL_ACCESS_ROLES, { requestId }))) return;
    try {
      const payload = await getMlApiPayload(buildMlPath('/clients/search', getRequestUrl(request)));
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, error?.statusCode ?? 500, {
        status: error?.code ?? 'CHURN_SEARCH_ERROR',
        message: error?.message ?? 'La recherche clients a risque a echoue.',
        requestId,
      });
    }
    return;
  }

  const clientDetailsMatch = path.match(/^\/api\/clients\/(\d+)$/);
  if (request.method === 'GET' && clientDetailsMatch) {
    if (!(await requireRole(request, response, ML_FULL_ACCESS_ROLES, { requestId }))) return;
    try {
      const payload = await getMlApiPayload(`/clients/${clientDetailsMatch[1]}`);
      sendJson(response, 200, payload);
    } catch (error) {
      sendJson(response, error?.statusCode ?? 500, {
        status: error?.code ?? 'CLIENT_DETAILS_ERROR',
        message: error?.message ?? 'Le detail du client a risque a echoue.',
        requestId,
      });
    }
    return;
  }

  if (request.method === 'POST' && path === '/api/simulate-churn') {
    if (!(await requireRole(request, response, ML_FULL_ACCESS_ROLES, { requestId }))) return;
    try {
      const body = await new Promise((resolve, reject) => {
        let data = '';
        request.on('data', chunk => data += chunk);
        request.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(e);
          }
        });
        request.on('error', reject);
      });

      const payload = await postMlApiPayload('/simulate-churn', body);
      sendJson(response, 200, payload);
    } catch (error) {
      logger.error('Erreur simulation churn', error);
      sendJson(response, error?.statusCode ?? 500, {
        status: error?.code ?? 'SIMULATION_ERROR',
        message: error?.message ?? 'La simulation de churn a echoue.',
        requestId,
      });
    }
    return;
  }

  sendJson(response, 404, {
    status: 'NOT_FOUND',
    message: 'Route inconnue.',
    requestId,
  });
});

// Seed demo users then start listening
seedUsers(logger)
  .catch((err) => logger.error('User seed failed', { message: err?.message }))
  .finally(() => {
    server.listen(config.server.port, config.server.host, () => {
  logger.info('Dashboard AI summary API started.', {
    host: config.server.host,
    port: config.server.port,
    provider: 'groq',
    groqBaseUrl: config.groq.baseUrl,
    model: config.groq.model,
    hasApiKey: Boolean(config.groq.apiKey),
    cacheTtlMs: config.cache.ttlMs,
    allowFixtureFallback: config.dashboardAi.allowFixtureFallback,
    churnLiveDataConfigured: churnDataService.hasRequiredFiles(),
    dashboardSqlDataConfigured: true,
    dashboardSqlDataAvailableFor: sqlDashboardDataService.getAvailableDashboards(),
    powerbiEmbeddedConfigured: Boolean(
      config.powerbi.clientId && config.powerbi.clientSecret,
    ),
    powerbiWorkspaceConfigured: Boolean(config.powerbi.workspaceId),
    smtpConfigured: emailService.isConfigured(),
    dailyReportsEnabled: config.dailyReports.enabled,
  });
    dailyReportScheduler.start();
    });
  });

process.on('SIGINT', () => {
  logger.info('Dashboard AI summary API stopping.');
  server.close(() => process.exit(0));
});
