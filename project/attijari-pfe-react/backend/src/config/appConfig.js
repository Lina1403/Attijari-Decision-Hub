import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

function parseDotEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {};
  }

  const content = fs.readFileSync(filePath, 'utf-8');
  const entries = {};

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');

    if (separatorIndex <= 0) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    entries[key] = value;
  }

  return entries;
}

function pickConfigValue(configMap, keys, fallback) {
  for (const key of keys) {
    const value = configMap[key];

    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return fallback;
}

function parseNumber(value, fallback) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function parseBoolean(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const normalizedValue = value.trim().toLowerCase();

  if (['true', '1', 'yes', 'on'].includes(normalizedValue)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalizedValue)) {
    return false;
  }

  return fallback;
}

export function createAppConfig() {
  const configDirectory = path.dirname(fileURLToPath(import.meta.url));
  const projectRoot = path.resolve(configDirectory, '../../..');
  const churnClientsFilePathDefault = path.resolve(
    projectRoot,
    '..',
    '..',
    'machine learning',
    'clients_ml.csv',
  );
  const churnPredictionsFilePathDefault = path.resolve(
    projectRoot,
    '..',
    '..',
    'machine learning',
    'ML_ChurnPredictions.csv',
  );
  const dotenvSources = [
    path.join(projectRoot, '.env'),
    path.join(projectRoot, '.env.local'),
    path.join(projectRoot, 'backend', '.env'),
  ];

  const fileConfig = dotenvSources.reduce((accumulator, filePath) => {
    return { ...accumulator, ...parseDotEnvFile(filePath) };
  }, {});

  const configMap = { ...fileConfig, ...process.env };

  return {
    server: {
      host: pickConfigValue(configMap, ['SERVER_HOST', 'server.host'], '0.0.0.0'),
      port: parseNumber(
        pickConfigValue(configMap, ['PORT', 'SERVER_PORT', 'server.port'], '5002'),
        5002,
      ),
      requestBodyLimitBytes: parseNumber(
        pickConfigValue(
          configMap,
          ['REQUEST_BODY_LIMIT_BYTES', 'server.request-body-limit-bytes'],
          '1000000',
        ),
        1_000_000,
      ),
    },
    groq: {
      apiKey: pickConfigValue(configMap, ['GROQ_API_KEY', 'groq.api-key'], ''),
      baseUrl: pickConfigValue(
        configMap,
        ['GROQ_BASE_URL', 'groq.base-url'],
        'https://api.groq.com/openai/v1',
      ),
      model: pickConfigValue(
        configMap,
        ['GROQ_MODEL', 'groq.model'],
        'llama-3.3-70b-versatile',
      ),
      timeoutMs: parseNumber(
        pickConfigValue(configMap, ['GROQ_TIMEOUT_MS', 'groq.timeout-ms'], '20000'),
        20_000,
      ),
      temperature: parseNumber(
        pickConfigValue(configMap, ['GROQ_TEMPERATURE', 'groq.temperature'], '0.2'),
        0.2,
      ),
      maxCompletionTokens: parseNumber(
        pickConfigValue(
          configMap,
          ['GROQ_MAX_COMPLETION_TOKENS', 'groq.max-completion-tokens'],
          '650',
        ),
        650,
      ),
    },
    cache: {
      ttlMs: parseNumber(
        pickConfigValue(
          configMap,
          ['DASHBOARD_AI_CACHE_TTL_MS', 'dashboard-ai.cache-ttl-ms'],
          '300000',
        ),
        300_000,
      ),
    },
    dashboardAi: {
      allowFixtureFallback: parseBoolean(
        pickConfigValue(
          configMap,
          ['DASHBOARD_AI_ALLOW_FIXTURE_FALLBACK', 'dashboard-ai.allow-fixture-fallback'],
          'false',
        ),
        false,
      ),
    },
    churnData: {
      clientsFilePath: pickConfigValue(
        configMap,
        ['CHURN_CLIENTS_FILE_PATH', 'churn-data.clients-file-path'],
        churnClientsFilePathDefault,
      ),
      predictionsFilePath: pickConfigValue(
        configMap,
        ['CHURN_PREDICTIONS_FILE_PATH', 'churn-data.predictions-file-path'],
        churnPredictionsFilePathDefault,
      ),
    },
    sqlcmd: {
      executable: pickConfigValue(
        configMap,
        ['SQLCMD_PATH', 'sqlcmd.path'],
        'sqlcmd',
      ),
      server: pickConfigValue(
        configMap,
        ['SQLCMD_SERVER', 'DB_SERVER', 'sqlcmd.server'],
        '.\\LINA',
      ),
      database: pickConfigValue(
        configMap,
        ['SQLCMD_DATABASE', 'DB_NAME', 'sqlcmd.database'],
        'DWH_AttijariBI_Final',
      ),
      user: pickConfigValue(
        configMap,
        ['SQLCMD_USER', 'DB_USER', 'sqlcmd.user'],
        '',
      ),
      password: pickConfigValue(
        configMap,
        ['SQLCMD_PASSWORD', 'DB_PASSWORD', 'sqlcmd.password'],
        '',
      ),
      useWindowsAuth: parseBoolean(
        pickConfigValue(
          configMap,
          ['SQLCMD_USE_WINDOWS_AUTH', 'DB_USE_WINDOWS_AUTH', 'sqlcmd.use-windows-auth'],
          'false',
        ),
        false,
      ),
      timeoutMs: parseNumber(
        pickConfigValue(configMap, ['SQLCMD_TIMEOUT_MS', 'sqlcmd.timeout-ms'], '15000'),
        15_000,
      ),
    },
    email: {
      host: pickConfigValue(configMap, ['SMTP_HOST', 'EMAIL_HOST', 'MAIL_HOST'], ''),
      port: parseNumber(
        pickConfigValue(configMap, ['SMTP_PORT', 'EMAIL_PORT', 'MAIL_PORT'], '587'),
        587,
      ),
      secure: parseBoolean(
        pickConfigValue(configMap, ['SMTP_SECURE', 'EMAIL_SECURE', 'MAIL_SECURE'], 'false'),
        false,
      ),
      user: pickConfigValue(configMap, ['SMTP_USER', 'EMAIL_USER', 'MAIL_USER'], ''),
      pass: pickConfigValue(
        configMap,
        ['SMTP_PASS', 'SMTP_PASSWORD', 'EMAIL_PASS', 'EMAIL_PASSWORD', 'MAIL_PASS'],
        '',
      ),
      from: pickConfigValue(
        configMap,
        ['SMTP_FROM', 'EMAIL_FROM', 'MAIL_FROM', 'SMTP_USER', 'EMAIL_USER', 'MAIL_USER'],
        '',
      ),
    },
    dailyReports: {
      enabled: parseBoolean(
        pickConfigValue(configMap, ['DAILY_REPORT_ENABLED'], 'false'),
        false,
      ),
      hour: parseNumber(pickConfigValue(configMap, ['DAILY_REPORT_HOUR'], '8'), 8),
      minute: parseNumber(pickConfigValue(configMap, ['DAILY_REPORT_MINUTE'], '0'), 0),
    },
    powerbi: {
      tenantId: pickConfigValue(
        configMap,
        ['POWERBI_TENANT_ID', 'powerbi.tenant-id'],
        '',
      ),
      clientId: pickConfigValue(
        configMap,
        ['POWERBI_CLIENT_ID', 'powerbi.client-id'],
        '',
      ),
      clientSecret: pickConfigValue(
        configMap,
        ['POWERBI_CLIENT_SECRET', 'powerbi.client-secret'],
        '',
      ),
      workspaceId: pickConfigValue(
        configMap,
        ['POWERBI_WORKSPACE_ID', 'powerbi.workspace-id'],
        '',
      ),
      authorityBaseUrl: pickConfigValue(
        configMap,
        ['POWERBI_AUTHORITY_BASE_URL', 'powerbi.authority-base-url'],
        'https://login.microsoftonline.com',
      ),
      apiBaseUrl: pickConfigValue(
        configMap,
        ['POWERBI_API_BASE_URL', 'powerbi.api-base-url'],
        'https://api.powerbi.com/v1.0/myorg',
      ),
      scope: pickConfigValue(
        configMap,
        ['POWERBI_SCOPE', 'powerbi.scope'],
        'https://analysis.windows.net/powerbi/api/.default',
      ),
      timeoutMs: parseNumber(
        pickConfigValue(configMap, ['POWERBI_TIMEOUT_MS', 'powerbi.timeout-ms'], '15000'),
        15_000,
      ),
      embedTokenLifetimeMinutes: parseNumber(
        pickConfigValue(
          configMap,
          ['POWERBI_EMBED_TOKEN_LIFETIME_MINUTES', 'powerbi.embed-token-lifetime-minutes'],
          '60',
        ),
        60,
      ),
    },
  };
}
