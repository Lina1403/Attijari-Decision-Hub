import { dashboardSummaryFixtureBuilders } from '../data/dashboardSummaryFixtures.js';
import { getDashboardTypeLabel } from '../enums/DashboardType.js';

export class DashboardDataUnavailableError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DashboardDataUnavailableError';
    this.code = 'DATA_UNAVAILABLE';
    this.statusCode = 503;
  }
}

function hasStructuredSnapshot(value) {
  return (
    Object.prototype.toString.call(value) === '[object Object]' &&
    Object.keys(value).length > 0
  );
}

function resolveSnapshotSource(kpiSnapshot) {
  const snapshotSource = String(kpiSnapshot?.source ?? '').trim();
  return snapshotSource || 'client-provided-snapshot';
}

function buildSnapshotUnavailableMessage(filters) {
  const snapshotMessage = String(filters?.powerBiSnapshotMessage ?? '').trim();
  const snapshotReason = String(filters?.powerBiSnapshotReason ?? '').trim();

  if (snapshotMessage) {
    return snapshotMessage;
  }

  if (snapshotReason === 'iframe-mode') {
    return 'Le rapport est charge en simple iframe. Un embed Power BI via le SDK ou une source BI backend est necessaire pour generer un resume IA live.';
  }

  if (snapshotReason === 'report-not-ready') {
    return 'Le rapport Power BI n est pas encore pret pour extraire un contexte structure.';
  }

  if (snapshotReason === 'no-readable-visuals') {
    return 'Le dashboard actif n expose pas encore de visuels exportables ou lisibles par le SDK Power BI.';
  }

  if (snapshotReason === 'sdk-error') {
    return 'L extraction structuree du dashboard a echoue cote Power BI SDK.';
  }

  return 'Aucun snapshot live du dashboard n a ete fourni pour generer le resume IA.';
}

function sanitizeSummaryFilters(filters) {
  if (Object.prototype.toString.call(filters) !== '[object Object]') {
    return {};
  }

  return Object.entries(filters).reduce((accumulator, [key, value]) => {
    if (
      [
        'reportId',
        'pageId',
        'reportKey',
        'powerBiSnapshotStatus',
        'powerBiSnapshotReason',
        'powerBiSnapshotMessage',
      ].includes(key)
    ) {
      return accumulator;
    }

    accumulator[key] = value;
    return accumulator;
  }, {});
}

export class DashboardSummaryContextBuilder {
  constructor({ config, liveContextProviders = {} }) {
    this.config = config;
    this.liveContextProviders = liveContextProviders;
  }

  async build({ dashboardType, filters, kpiSnapshot }) {
    const normalizedFilters = sanitizeSummaryFilters(filters ?? {});
    const builder = this.config.dashboardAi.allowFixtureFallback
      ? dashboardSummaryFixtureBuilders[dashboardType]
      : null;
    const liveContextProvider = this.liveContextProviders[dashboardType];

    let context = null;
    let contextSource = 'live-dashboard-snapshot';

    if (hasStructuredSnapshot(kpiSnapshot)) {
      context = kpiSnapshot;
      contextSource = resolveSnapshotSource(kpiSnapshot);
    } else if (typeof liveContextProvider?.buildSummaryContext === 'function') {
      context = await liveContextProvider.buildSummaryContext({
        dashboardType,
        filters: normalizedFilters,
      });
      contextSource =
        typeof context?.source === 'string' && context.source.trim()
          ? context.source.trim()
          : 'live-backend-source';
    } else if (builder) {
      context = builder(normalizedFilters);
      contextSource = 'fixture-fallback';
    }

    if (!context) {
      throw new DashboardDataUnavailableError(
        `Le contexte structure du dashboard ${dashboardType} est indisponible. ${buildSnapshotUnavailableMessage(
          filters ?? {},
        )}`,
      );
    }

    return {
      dashboardType,
      dashboardLabel: getDashboardTypeLabel(dashboardType),
      builtAt: new Date().toISOString(),
      contextSource,
      filters: normalizedFilters,
      context,
    };
  }
}
