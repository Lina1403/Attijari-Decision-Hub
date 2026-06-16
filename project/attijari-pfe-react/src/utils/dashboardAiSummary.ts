import type { CSSProperties } from 'react';
import type {
  DashboardAiAccentTheme,
  DashboardAiSummaryConfig,
  DashboardAiSummaryFilters,
  DashboardAiSummaryResponse,
} from '@/types/dashboardAiSummary';

const HIDDEN_FILTER_KEYS = new Set([
  'powerBiFilters',
  'powerBiSnapshotMessage',
  'powerBiSnapshotReason',
  'powerBiSnapshotStatus',
  'reportFilters',
  'pageFilters',
  'reportId',
  'pageId',
  'reportKey',
  'kpiSnapshot',
]);

const FILTER_LABEL_OVERRIDES: Record<string, string> = {
  dateFrom: 'Du',
  dateTo: 'Au',
  view: 'Vue',
  platform: 'Plateforme',
  segment: 'Segment',
  region: 'Région',
  channel: 'Canal',
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }

  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((accumulator, key) => {
        accumulator[key] = sortValue(value[key]);
        return accumulator;
      }, {});
  }

  return value;
}

function formatFilterLabel(key: string) {
  if (FILTER_LABEL_OVERRIDES[key]) {
    return FILTER_LABEL_OVERRIDES[key];
  }

  const withSpaces = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();

  return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
}

function formatFilterValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed || null;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : null;
  }

  if (typeof value === 'boolean') {
    return value ? 'Oui' : 'Non';
  }

  if (Array.isArray(value)) {
    const values = value
      .map((item) => formatFilterValue(item))
      .filter((item): item is string => Boolean(item));

    return values.length ? values.join(', ') : null;
  }

  return null;
}

function collectFilterItems(
  filters: DashboardAiSummaryFilters,
  prefix = '',
  depth = 0,
): Array<{ label: string; value: string }> {
  if (!isPlainObject(filters) || depth > 2) {
    return [];
  }

  return Object.entries(filters).flatMap(([key, value]) => {
    if (HIDDEN_FILTER_KEYS.has(key)) {
      return [];
    }

    const formattedValue = formatFilterValue(value);
    const nextPrefix = prefix ? `${prefix} ${formatFilterLabel(key)}` : formatFilterLabel(key);

    if (formattedValue) {
      return [{ label: nextPrefix, value: formattedValue }];
    }

    if (isPlainObject(value)) {
      return collectFilterItems(value as DashboardAiSummaryFilters, nextPrefix, depth + 1);
    }

    return [];
  });
}

export function createDashboardAiFingerprint(payload: unknown) {
  return JSON.stringify(sortValue(payload));
}

export function buildDashboardAiCssVars(theme: DashboardAiAccentTheme): CSSProperties {
  return {
    '--ai-accent': theme.accent,
    '--ai-accent-soft': theme.soft,
    '--ai-accent-glow': theme.glow,
    '--ai-border': theme.border,
    '--ai-badge': theme.badge,
    '--ai-badge-text': theme.badgeText,
    '--ai-title': theme.title,
    '--ai-recommendation': theme.recommendation,
  } as CSSProperties;
}

export function getDashboardAiFilterChips(filters: DashboardAiSummaryFilters) {
  return collectFilterItems(filters).slice(0, 6);
}

export function formatDashboardAiGeneratedAt(value: string) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function formatDashboardAiSummaryCopy(
  config: DashboardAiSummaryConfig,
  response: DashboardAiSummaryResponse,
  filters: DashboardAiSummaryFilters,
) {
  const filterLines = getDashboardAiFilterChips(filters).map(
    (item) => `- ${item.label}: ${item.value}`,
  );

  return [
    `Résumé Décisionnel IA - ${config.label}`,
    `Généré le ${formatDashboardAiGeneratedAt(response.generatedAt)}`,
    filterLines.length ? 'Filtres actifs :' : '',
    ...filterLines,
    '',
    'Synthèse globale :',
    response.summary.globalSummary,
    '',
    'Points forts :',
    ...response.summary.strengths.map((item) => `- ${item}`),
    '',
    'Points d attention :',
    ...response.summary.watchouts.map((item) => `- ${item}`),
  ]
    .filter(Boolean)
    .join('\n');
}
