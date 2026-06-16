import { normalizeDashboardType } from '../enums/DashboardType.js';

function isPlainObject(value) {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function sanitizeJsonValue(value, depth = 0) {
  if (depth > 6) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => sanitizeJsonValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce((accumulator, [key, itemValue]) => {
      const sanitizedValue = sanitizeJsonValue(itemValue, depth + 1);

      if (sanitizedValue !== undefined) {
        accumulator[key] = sanitizedValue;
      }

      return accumulator;
    }, {});
  }

  return undefined;
}

function ensureStringArray(value, fieldName) {
  if (!Array.isArray(value)) {
    throw new DashboardAiResponseValidationError(
      `Le champ ${fieldName} doit etre un tableau de chaines.`,
    );
  }

  const items = value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean)
    .slice(0, 4);

  if (!items.length) {
    throw new DashboardAiResponseValidationError(
      `Le champ ${fieldName} doit contenir au moins un element.`,
    );
  }

  return items;
}

function ensureString(value, fieldName) {
  const text = String(value ?? '').trim();

  if (!text) {
    throw new DashboardAiResponseValidationError(
      `Le champ ${fieldName} doit contenir un texte non vide.`,
    );
  }

  return text;
}

export class DashboardAiRequestValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DashboardAiRequestValidationError';
    this.code = 'INVALID_REQUEST';
    this.statusCode = 400;
  }
}

export class DashboardAiResponseValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DashboardAiResponseValidationError';
    this.code = 'INVALID_MODEL_OUTPUT';
    this.statusCode = 502;
  }
}

export function parseDashboardAiSummaryRequest(payload) {
  if (!isPlainObject(payload)) {
    throw new DashboardAiRequestValidationError(
      'La requete doit contenir un objet JSON valide.',
    );
  }

  const dashboardType = normalizeDashboardType(payload.dashboardType);

  if (!dashboardType) {
    throw new DashboardAiRequestValidationError(
      'dashboardType est requis et doit correspondre a un dashboard supporte.',
    );
  }

  const filters = sanitizeJsonValue(payload.filters);
  const options = sanitizeJsonValue(payload.options);
  const kpiSnapshot = sanitizeJsonValue(payload.kpiSnapshot);

  return {
    dashboardType,
    filters: isPlainObject(filters) ? filters : {},
    kpiSnapshot: isPlainObject(kpiSnapshot) ? kpiSnapshot : undefined,
    options: {
      bypassCache:
        Boolean(payload.forceRefresh) || Boolean(options && options.bypassCache === true),
    },
  };
}

export function validateStructuredSummary(payload) {
  if (!isPlainObject(payload)) {
    throw new DashboardAiResponseValidationError(
      'Le modele n a pas renvoye un objet JSON exploitable.',
    );
  }

  return {
    globalSummary: ensureString(payload.globalSummary, 'globalSummary'),
    strengths: ensureStringArray(payload.strengths, 'strengths'),
    watchouts: ensureStringArray(payload.watchouts, 'watchouts'),
  };
}

export function buildDashboardAiSummarySuccessResponse({
  dashboardType,
  generatedAt,
  summary,
  meta,
}) {
  return {
    dashboardType,
    generatedAt,
    status: 'SUCCESS',
    summary,
    meta,
  };
}

export function buildDashboardAiSummaryErrorResponse({
  dashboardType,
  status,
  message,
  requestId,
}) {
  return {
    dashboardType,
    status,
    message,
    requestId,
  };
}
