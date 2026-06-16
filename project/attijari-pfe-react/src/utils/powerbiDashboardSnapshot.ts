import { models, type Report, type VisualDescriptor } from 'powerbi-client';
import type { PowerBIDashboardSnapshot } from '@/types';

const MAX_VISUALS = 8;
const MAX_ROWS_PER_VISUAL = 12;
const MAX_COLUMNS_PER_VISUAL = 8;
const NON_EXPORTABLE_VISUAL_TYPES = new Set([
  'actionbutton',
  'basicshape',
  'bookmarknavigator',
  'image',
  'line',
  'pagenavigator',
  'shape',
  'textbox',
]);

export class PowerBIDashboardSnapshotError extends Error {
  code: 'NO_READABLE_VISUALS';

  constructor(code: 'NO_READABLE_VISUALS', message: string) {
    super(message);
    this.name = 'PowerBIDashboardSnapshotError';
    this.code = code;
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function normalizeValue(value: unknown, depth = 0): unknown {
  if (depth > 5) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => normalizeValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (isPlainObject(value)) {
    return Object.entries(value).reduce<Record<string, unknown>>((accumulator, [key, item]) => {
      const normalizedItem = normalizeValue(item, depth + 1);

      if (normalizedItem !== undefined) {
        accumulator[key] = normalizedItem;
      }

      return accumulator;
    }, {});
  }

  return undefined;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    const nextCharacter = line[index + 1];

    if (character === '"') {
      if (inQuotes && nextCharacter === '"') {
        currentValue += '"';
        index += 1;
        continue;
      }

      inQuotes = !inQuotes;
      continue;
    }

    if (character === ',' && !inQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
      continue;
    }

    currentValue += character;
  }

  values.push(currentValue.trim());
  return values;
}

function parseCsvTable(rawCsv: string) {
  return rawCsv
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map(parseCsvLine);
}

function parseExportedVisualData(rawCsv: string) {
  const rows = parseCsvTable(rawCsv);

  if (!rows.length) {
    return null;
  }

  const [rawColumns, ...rawEntries] = rows;
  if (!rawColumns) {
    return null;
  }
  const columns = rawColumns
    .map((item) => item.replace(/^"|"$/gu, '').trim())
    .filter(Boolean)
    .slice(0, MAX_COLUMNS_PER_VISUAL);

  if (!columns.length) {
    return null;
  }

  const entries = rawEntries
    .slice(0, MAX_ROWS_PER_VISUAL)
    .map((entry) => {
      return columns.reduce<Record<string, string>>((accumulator, column, index) => {
        accumulator[column] = String(entry[index] ?? '').replace(/^"|"$/gu, '').trim();
        return accumulator;
      }, {});
    })
    .filter((entry) => Object.values(entry).some(Boolean));

  if (!entries.length) {
    return null;
  }

  return {
    columns,
    rows: entries,
  };
}

function getVisualArea(visual: VisualDescriptor) {
  const layout = normalizeValue(visual.layout);

  if (!isPlainObject(layout)) {
    return 0;
  }

  const width = Number(layout.width ?? 0);
  const height = Number(layout.height ?? 0);

  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    return 0;
  }

  return width * height;
}

async function buildVisualSnapshot(visual: VisualDescriptor) {
  const visualSnapshot: Record<string, unknown> = {
    name: visual.name,
    title: visual.title || visual.name,
    type: visual.type,
    layout: normalizeValue(visual.layout),
  };

  try {
    const filters = await visual.getFilters();

    if (filters.length) {
      visualSnapshot.filters = normalizeValue(filters);
    }
  } catch {
    // Visual-level filters are best effort only.
  }

  const normalizedType = String(visual.type ?? '').trim().toLowerCase();

  if (normalizedType === 'slicer') {
    try {
      visualSnapshot.slicerState = normalizeValue(await visual.getSlicerState());
    } catch {
      // Slicer extraction is best effort only.
    }

    return visualSnapshot;
  }

  if (NON_EXPORTABLE_VISUAL_TYPES.has(normalizedType)) {
    return visualSnapshot;
  }

  try {
    const exportedData = await visual.exportData(
      models.ExportDataType.Summarized,
      MAX_ROWS_PER_VISUAL,
    );
    const dataPreview = parseExportedVisualData(exportedData.data ?? '');

    if (dataPreview) {
      visualSnapshot.dataPreview = dataPreview;
    }
  } catch {
    // Not every visual supports exportData. Keep the rest of the snapshot.
  }

  return visualSnapshot;
}

export function parsePowerBiEmbedIdentity(iframeUrl?: string) {
  if (!iframeUrl) {
    return {};
  }

  try {
    const url = new URL(iframeUrl);

    return {
      reportId: url.searchParams.get('reportId') ?? undefined,
      pageName: url.searchParams.get('pageName') ?? undefined,
    };
  } catch {
    return {};
  }
}

export async function buildPowerBiDashboardSnapshot(
  report: Report,
  {
    reportId,
    pageName,
    dashboardTitle,
  }: {
    reportId: string;
    pageName: string;
    dashboardTitle?: string;
  },
): Promise<PowerBIDashboardSnapshot> {
  const [pages, activePage, reportFilters] = await Promise.all([
    report.getPages(),
    report.getActivePage(),
    report.getFilters(),
  ]);
  const [pageFilters, visuals] = await Promise.all([activePage.getFilters(), activePage.getVisuals()]);
  const candidateVisuals = visuals
    .slice()
    .sort((leftVisual, rightVisual) => getVisualArea(rightVisual) - getVisualArea(leftVisual))
    .slice(0, MAX_VISUALS);

  const visualSnapshots: Array<Record<string, unknown>> = [];

  for (const visual of candidateVisuals) {
    visualSnapshots.push(await buildVisualSnapshot(visual));
  }

  const readableVisualCount = visualSnapshots.filter((item) => {
    const dataPreview = item.dataPreview;
    return (
      isPlainObject(dataPreview) &&
      Array.isArray(dataPreview.rows) &&
      dataPreview.rows.length > 0
    );
  }).length;

  if (!readableVisualCount) {
    throw new PowerBIDashboardSnapshotError(
      'NO_READABLE_VISUALS',
      'Le dashboard ne contient pas de visuels exportables pour une synthese IA live.',
    );
  }

  return {
    source: 'powerbi-live-sdk',
    collectedAt: new Date().toISOString(),
    report: {
      id: reportId,
      pageName,
      activePageName: activePage.name,
      activePageDisplayName: activePage.displayName ?? activePage.name,
      dashboardTitle,
      totalPages: pages.length,
      totalVisualsOnPage: visuals.length,
    },
    filters: {
      report: normalizeValue(reportFilters),
      page: normalizeValue(pageFilters),
    },
    visuals: visualSnapshots,
    extraction: {
      mode: 'summarized-export',
      maxVisuals: MAX_VISUALS,
      maxRowsPerVisual: MAX_ROWS_PER_VISUAL,
      readableVisualCount,
    },
  };
}
