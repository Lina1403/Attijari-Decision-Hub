import type { PowerBIReportKey, PowerBIWorkspaceReport } from '@/types';

const POWERBI_IFRAME_BASE_URL = 'https://app.powerbi.com/reportEmbed';
const POWERBI_DEMO_REPORT_ID = '32d24acd-686a-43c6-b089-ad1c1b7cc5eb';
const POWERBI_DEFAULT_EMBED_URL =
  'https://app.powerbi.com/reportEmbed?reportId=32d24acd-686a-43c6-b089-ad1c1b7cc5eb&autoAuth=true&embeddedDemo=true';
const env = import.meta.env as Record<string, string | boolean | undefined>;

interface PowerBIWorkspaceDefinition {
  key: PowerBIReportKey;
  tabLabel: string;
  title: string;
  description: string;
  section: PowerBIWorkspaceReport['section'];
  embedUrlEnv: string;
  openUrlEnv: string;
  pageNameEnv: string;
  fallbackPageName: string;
  legacyReportIdEnv?: string;
  legacyPageNameEnv?: string;
  demoPageName?: string;
}

const workspaceDefinitions: PowerBIWorkspaceDefinition[] = [
  {
    key: '01_Vue_Globale',
    tabLabel: 'Vue Globale',
    title: 'Vue globale strategique',
    description:
      'Vue executive de reference pour le pilotage global, la lecture business et le suivi des KPI transverses.',
    section: 'strategic',
    embedUrlEnv: 'NEXT_PUBLIC_POWERBI_GLOBAL_EMBED_URL',
    openUrlEnv: 'NEXT_PUBLIC_POWERBI_GLOBAL_OPEN_URL',
    pageNameEnv: 'NEXT_PUBLIC_POWERBI_GLOBAL_PAGE_NAME',
    fallbackPageName: '01_Vue_Globale',
    legacyReportIdEnv: 'VITE_POWERBI_VUE_GLOBALE_REPORT_ID',
    legacyPageNameEnv: 'VITE_POWERBI_VUE_GLOBALE_PAGE_NAME',
    demoPageName: 'ReportSection',
  },
  {
    key: 'Clients & Churn',
    tabLabel: 'Clients & Churn',
    title: 'Analyse clients et churn',
    description:
      'Vue analytique dediee au churn, aux segments sensibles et aux priorites de retention.',
    section: 'clients',
    embedUrlEnv: 'NEXT_PUBLIC_POWERBI_CLIENTS_EMBED_URL',
    openUrlEnv: 'NEXT_PUBLIC_POWERBI_CLIENTS_OPEN_URL',
    pageNameEnv: 'NEXT_PUBLIC_POWERBI_CLIENTS_PAGE_NAME',
    fallbackPageName: 'Clients & Churn',
    legacyReportIdEnv: 'VITE_POWERBI_CLIENTS_CHURN_REPORT_ID',
    legacyPageNameEnv: 'VITE_POWERBI_CLIENTS_CHURN_PAGE_NAME',
    demoPageName: 'ReportSection3',
  },
  {
    key: 'Vue globale Campagnes Marketing',
    tabLabel: 'Campagnes',
    title: 'Vue globale campagnes marketing',
    description:
      'Synthese business des campagnes marketing avec lecture globale du volume, de la pression et du ROI.',
    section: 'marketing',
    embedUrlEnv: 'NEXT_PUBLIC_POWERBI_CAMPAIGNS_OVERVIEW_EMBED_URL',
    openUrlEnv: 'NEXT_PUBLIC_POWERBI_CAMPAIGNS_OVERVIEW_OPEN_URL',
    pageNameEnv: 'NEXT_PUBLIC_POWERBI_CAMPAIGNS_OVERVIEW_PAGE_NAME',
    fallbackPageName: 'Vue globale Campagnes Marketing',
  },
  {
    key: 'Google',
    tabLabel: 'Google',
    title: 'Detail campagnes Google',
    description:
      'Detail des campagnes Google avec lecture par canal, performances de trafic et conversion.',
    section: 'marketing',
    embedUrlEnv: 'NEXT_PUBLIC_POWERBI_GOOGLE_EMBED_URL',
    openUrlEnv: 'NEXT_PUBLIC_POWERBI_GOOGLE_OPEN_URL',
    pageNameEnv: 'NEXT_PUBLIC_POWERBI_GOOGLE_PAGE_NAME',
    fallbackPageName: 'Google',
  },
  {
    key: 'Meta',
    tabLabel: 'Meta',
    title: 'Detail campagnes Meta',
    description:
      'Detail des campagnes Meta pour isoler la performance paid social et les leviers d optimisation.',
    section: 'marketing',
    embedUrlEnv: 'NEXT_PUBLIC_POWERBI_META_EMBED_URL',
    openUrlEnv: 'NEXT_PUBLIC_POWERBI_META_OPEN_URL',
    pageNameEnv: 'NEXT_PUBLIC_POWERBI_META_PAGE_NAME',
    fallbackPageName: 'Meta',
  },
  {
    key: 'Reclamations',
    tabLabel: 'Reclamations',
    title: 'Reclamations',
    description:
      'Pilotage des reclamations, des delais de resolution et des irritants clients detectes.',
    section: 'service',
    embedUrlEnv: 'NEXT_PUBLIC_POWERBI_RECLAMATIONS_EMBED_URL',
    openUrlEnv: 'NEXT_PUBLIC_POWERBI_RECLAMATIONS_OPEN_URL',
    pageNameEnv: 'NEXT_PUBLIC_POWERBI_RECLAMATIONS_PAGE_NAME',
    fallbackPageName: 'R\u00e9clamations',
  },
  {
    key: 'Agences',
    tabLabel: 'Agences',
    title: 'Agences',
    description:
      'Lecture des performances commerciales et relationnelles par agence, zone et portefeuille.',
    section: 'network',
    embedUrlEnv: 'NEXT_PUBLIC_POWERBI_AGENCES_EMBED_URL',
    openUrlEnv: 'NEXT_PUBLIC_POWERBI_AGENCES_OPEN_URL',
    pageNameEnv: 'NEXT_PUBLIC_POWERBI_AGENCES_PAGE_NAME',
    fallbackPageName: 'Agences',
  },
  {
    key: 'Social media',
    tabLabel: 'Social media',
    title: 'Social Media',
    description:
      'Suivi des signaux reseaux sociaux, du sentiment et des themes critiques externes.',
    section: 'digital',
    embedUrlEnv: 'NEXT_PUBLIC_POWERBI_SOCIAL_MEDIA_EMBED_URL',
    openUrlEnv: 'NEXT_PUBLIC_POWERBI_SOCIAL_MEDIA_OPEN_URL',
    pageNameEnv: 'NEXT_PUBLIC_POWERBI_SOCIAL_MEDIA_PAGE_NAME',
    fallbackPageName: 'Social media',
  },
  {
    key: 'Clients a risque',
    tabLabel: 'Clients a risque',
    title: 'Clients a risque',
    description:
      'Vue dediee aux clients a risque pour isoler les portefeuilles critiques et les actions prioritaires.',
    section: 'risk',
    embedUrlEnv: 'NEXT_PUBLIC_POWERBI_CLIENTS_RISQUE_EMBED_URL',
    openUrlEnv: 'NEXT_PUBLIC_POWERBI_CLIENTS_RISQUE_OPEN_URL',
    pageNameEnv: 'NEXT_PUBLIC_POWERBI_CLIENTS_RISQUE_PAGE_NAME',
    fallbackPageName: 'Clients a risque',
  },
];

export const DEFAULT_POWERBI_REPORT_KEY: PowerBIReportKey = '01_Vue_Globale';
export const PRIMARY_POWERBI_REPORT_KEYS: PowerBIReportKey[] = [
  '01_Vue_Globale',
  'Clients & Churn',
  'Vue globale Campagnes Marketing',
];
export const CAMPAIGN_POWERBI_REPORT_KEYS: PowerBIReportKey[] = [
  'Vue globale Campagnes Marketing',
  'Google',
  'Meta',
];

function readEnvValue(keys: Array<string | undefined>) {
  for (const key of keys) {
    if (!key) {
      continue;
    }

    const value = env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function appendQueryParams(baseUrl: string, params: Record<string, string>) {
  try {
    const url = new URL(baseUrl);

    Object.entries(params).forEach(([key, value]) => {
      if (value) {
        url.searchParams.set(key, value);
      }
    });

    return url.toString();
  } catch {
    const separator = baseUrl.includes('?') ? '&' : '?';
    const searchParams = new URLSearchParams(params);
    return `${baseUrl}${separator}${searchParams.toString()}`;
  }
}

export function buildPowerBiEmbedUrl(
  baseUrl: string,
  pageName: string,
  reportRefreshNonce: number,
) {
  if (!baseUrl.trim()) {
    return undefined;
  }

  return appendQueryParams(baseUrl, {
    pageName,
    reportRefreshNonce: String(reportRefreshNonce),
  });
}

function buildLegacyReportEmbedUrl(
  reportId: string,
  pageName: string,
  reportRefreshNonce: number,
  embeddedDemo?: boolean,
) {
  const params = new URLSearchParams({
    reportId,
    autoAuth: 'true',
    filterPaneEnabled: 'false',
    navContentPaneEnabled: 'false',
    pageName,
    reportRefreshNonce: String(reportRefreshNonce),
  });

  if (embeddedDemo) {
    params.set('embeddedDemo', 'true');
  }

  return `${POWERBI_IFRAME_BASE_URL}?${params.toString()}`;
}

function resolvePageName(definition: PowerBIWorkspaceDefinition) {
  return (
    readEnvValue([definition.pageNameEnv, definition.legacyPageNameEnv]) ??
    definition.fallbackPageName
  );
}

function resolveEmbedUrl(
  definition: PowerBIWorkspaceDefinition,
  reportRefreshNonce: number,
  pageName: string,
) {
  const configuredEmbedUrl =
    readEnvValue([definition.embedUrlEnv]) ?? POWERBI_DEFAULT_EMBED_URL;
  if (configuredEmbedUrl) {
    return buildPowerBiEmbedUrl(configuredEmbedUrl, pageName, reportRefreshNonce);
  }

  const legacyReportId = readEnvValue([definition.legacyReportIdEnv]);
  if (legacyReportId) {
    return buildLegacyReportEmbedUrl(legacyReportId, pageName, reportRefreshNonce);
  }

  if (definition.demoPageName) {
    return buildLegacyReportEmbedUrl(
      POWERBI_DEMO_REPORT_ID,
      definition.demoPageName,
      reportRefreshNonce,
      true,
    );
  }

  return undefined;
}

export function getPowerBiReports(reportRefreshNonce: number): PowerBIWorkspaceReport[] {
  return workspaceDefinitions.map((definition) => {
    const pageName = resolvePageName(definition);

    return {
      key: definition.key,
      tabLabel: definition.tabLabel,
      title: definition.title,
      description: definition.description,
      pageName,
      reportId: definition.key,
      section: definition.section,
      embedUrl: resolveEmbedUrl(definition, reportRefreshNonce, pageName),
      openUrl: readEnvValue([definition.openUrlEnv]),
    };
  });
}

export function getPowerBiReportByKey(
  reportKey: PowerBIReportKey,
  reportRefreshNonce: number,
) {
  return getPowerBiReports(reportRefreshNonce).find((report) => report.key === reportKey);
}

export function normalizePowerBiReportKey(value: string | null) {
  if (!value) {
    return null;
  }

  const matchingReport = workspaceDefinitions.find((definition) => definition.key === value);
  return matchingReport?.key ?? null;
}

export function isCampaignPowerBiReport(reportKey: PowerBIReportKey) {
  return CAMPAIGN_POWERBI_REPORT_KEYS.includes(reportKey);
}
