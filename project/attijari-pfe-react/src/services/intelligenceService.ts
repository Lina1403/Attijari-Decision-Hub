import { apiClient } from '@/services/api';
import type {
  FeatureImportance,
  RiskClient,
  RiskClientsPage,
  RiskClientsQueryParams,
  StrategicRecommendation,
} from '@/types';

interface RiskClientsApiResponse {
  clients?: unknown[];
}

interface RiskClientsPageApiResponse {
  content?: unknown[];
  page?: number;
  size?: number;
  totalElements?: number;
  totalPages?: number;
  sortBy?: string;
  direction?: 'asc' | 'desc';
  summary?: Record<string, unknown>;
  filters?: Record<string, unknown>;
}

interface RiskClientDetailsApiResponse {
  client?: unknown;
}

interface FeatureImportanceApiResponse {
  features?: unknown[];
}

interface RecommendationsApiResponse {
  recommendations?: StrategicRecommendation[];
}

function toNumber(value: unknown, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function toText(value: unknown) {
  return String(value ?? '').trim();
}

function toStringList(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => String(entry ?? '').trim())
    .filter(Boolean)
    .slice(0, 3);
}

function normalizeRiskClass(value: unknown): RiskClient['riskClass'] {
  const normalizedValue = String(value ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  switch (normalizedValue) {
    case 'critique':
      return 'Critique';
    case 'eleve':
      return '\u00C9lev\u00E9' as RiskClient['riskClass'];
    case 'modere':
      return 'Mod\u00E9r\u00E9' as RiskClient['riskClass'];
    default:
      return 'Faible';
  }
}

function normalizeDirection(value: unknown): FeatureImportance['direction'] {
  if (value === 'negative') {
    return 'negative';
  }

  if (value === 'neutral') {
    return 'neutral';
  }

  return 'positive';
}

function buildClientName(client: Record<string, unknown>, clientId: string) {
  const firstName = toText(client.firstName ?? client.prenom);
  const lastName = toText(client.lastName ?? client.nom);
  const explicitFullName = toText(client.fullName);
  const recomposedFullName = [firstName, lastName].filter(Boolean).join(' ').trim();

  if (recomposedFullName) {
    return { firstName, lastName, fullName: recomposedFullName };
  }

  if (explicitFullName && !/^client\s+\d+$/i.test(explicitFullName)) {
    return { firstName, lastName, fullName: explicitFullName };
  }

  return {
    firstName,
    lastName,
    fullName: `Client ${clientId}`,
  };
}

function mapRiskClient(payload: unknown): RiskClient {
  const client = (payload ?? {}) as Record<string, unknown>;
  const clientId = String(client.clientSK ?? client.id ?? '').trim();
  const riskScore = toNumber(client.riskScore ?? client.score ?? client.churnProbability);
  const names = buildClientName(client, clientId);

  return {
    id: String(client.id ?? client.clientSK ?? ''),
    clientSK: toNumber(client.clientSK ?? client.id),
    firstName: names.firstName || undefined,
    lastName: names.lastName || undefined,
    prenom: names.firstName || undefined,
    nom: names.lastName || undefined,
    fullName: names.fullName,
    segment: toText(client.segment) || 'Particulier',
    gouvernorat: toText(client.gouvernorat) || 'Non renseigne',
    age: toNumber(client.age),
    score: riskScore,
    riskScore,
    riskClass: normalizeRiskClass(client.riskClass),
    satisfaction: toNumber(client.satisfaction),
    products: toNumber(client.products, 1),
    complaints: toNumber(client.complaints),
    appConnections: toNumber(client.appConnections),
    appFeatures: toNumber(client.appFeatures),
    cardPayments: toNumber(client.cardPayments),
    annualValue: toNumber(client.annualValue),
    churnProbability: toNumber(client.churnProbability ?? riskScore),
    topFeatures: toStringList(client.topFeatures),
    lastContact: toText(client.lastContact),
    manager: toText(client.manager) || 'Conseiller Attijari',
  };
}

function buildPageUrl(pathname: string, params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const serialized = searchParams.toString();
  return serialized ? `${pathname}?${serialized}` : pathname;
}

function mapRiskClientsPage(payload: RiskClientsPageApiResponse): RiskClientsPage {
  const content = Array.isArray(payload.content) ? payload.content.map(mapRiskClient) : [];
  const summary = (payload.summary ?? {}) as Record<string, unknown>;
  const rawDistribution = (summary.distribution ?? {}) as Record<string, unknown>;
  const filters = (payload.filters ?? {}) as Record<string, unknown>;

  return {
    content,
    page: toNumber(payload.page),
    size: toNumber(payload.size, 40),
    totalElements: toNumber(payload.totalElements),
    totalPages: toNumber(payload.totalPages),
    sortBy: toText(payload.sortBy) || 'probabiliteChurn',
    direction: payload.direction === 'asc' ? 'asc' : 'desc',
    summary: {
      totalClients: toNumber(summary.totalClients),
      distribution: {
        Faible: toNumber(rawDistribution.Faible),
        ['Mod\u00E9r\u00E9']: toNumber(
          rawDistribution.Modere ?? rawDistribution['Mod\u00E9r\u00E9'],
        ),
        ['\u00C9lev\u00E9']: toNumber(
          rawDistribution.Eleve ?? rawDistribution['\u00C9lev\u00E9'],
        ),
        Critique: toNumber(rawDistribution.Critique),
      } as unknown as RiskClientsPage['summary']['distribution'],
      averageChurnScore: toNumber(summary.averageChurnScore),
      highRiskClients: toNumber(summary.highRiskClients),
      highRiskRatio: toNumber(summary.highRiskRatio),
      dominantRiskClass: normalizeRiskClass(summary.dominantRiskClass),
      dominantRiskCount: toNumber(summary.dominantRiskCount),
    } as RiskClientsPage['summary'],
    filters: {
      segments: Array.isArray(filters.segments)
        ? filters.segments.map((value) => toText(value)).filter(Boolean)
        : [],
      gouvernorats: Array.isArray(filters.gouvernorats)
        ? filters.gouvernorats.map((value) => toText(value)).filter(Boolean)
        : [],
      riskClasses: Array.isArray(filters.riskClasses)
        ? filters.riskClasses.map((value) => normalizeRiskClass(value))
        : [],
    } as RiskClientsPage['filters'],
  };
}

export const intelligenceService = {
  async getRiskClients(limit?: number): Promise<RiskClient[]> {
    const { data: payload } = await apiClient.get<RiskClientsApiResponse>(
      buildPageUrl('/clients-with-scores', {
        limit,
      }),
    );

    if (!Array.isArray(payload.clients)) {
      throw new Error("Le format des clients live renvoye par l'API ML est invalide.");
    }

    return payload.clients.map(mapRiskClient).sort((left, right) => right.riskScore - left.riskScore);
  },

  async getRiskClientsPage(params: RiskClientsQueryParams = {}): Promise<RiskClientsPage> {
    const { data } = await apiClient.get<RiskClientsPageApiResponse>(
      buildPageUrl('/churn/clients-risk', {
        page: params.page ?? 0,
        size: params.size ?? 40,
        sortBy: params.sortBy ?? 'probabiliteChurn',
        direction: params.direction ?? 'desc',
        search: params.search?.trim() ?? '',
        segment: params.segment?.trim() ?? '',
        gouvernorat: params.gouvernorat?.trim() ?? '',
        riskClass: params.riskClass?.trim() ?? '',
      }),
    );

    return mapRiskClientsPage(data);
  },

  async searchRiskClients(query: string, limit = 10): Promise<RiskClient[]> {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2 && !/^\d+$/.test(trimmedQuery)) {
      return [];
    }

    const { data: payload } = await apiClient.get<RiskClientsApiResponse>(
      buildPageUrl('/clients/search', {
        q: trimmedQuery,
        limit,
      }),
    );

    if (!Array.isArray(payload.clients)) {
      return [];
    }

    return payload.clients.map(mapRiskClient);
  },

  async getRiskClientById(clientId: number | string): Promise<RiskClient> {
    const { data: payload } = await apiClient.get<RiskClientDetailsApiResponse>(
      `/clients/${clientId}`,
    );
    if (!payload.client) {
      throw new Error("Le format du client live renvoye par l'API ML est invalide.");
    }

    return mapRiskClient(payload.client);
  },

  async getRecommendations(): Promise<StrategicRecommendation[]> {
    const { data } = await apiClient.get<RecommendationsApiResponse>('/intelligence/recommendations');

    if (!Array.isArray(data.recommendations)) {
      throw new Error("Les recommandations live n'ont pas pu etre recuperees depuis l'API.");
    }

    return [...data.recommendations].sort((left, right) => right.impact - left.impact);
  },

  async getPortfolioFeatureImportance(): Promise<FeatureImportance[]> {
    const { data: payload } = await apiClient.get<FeatureImportanceApiResponse>('/feature-importance');
    if (!Array.isArray(payload.features)) {
      throw new Error("Le format des importances de variables renvoye par l'API ML est invalide.");
    }

    return payload.features
      .map((entry) => {
        const feature = (entry ?? {}) as Record<string, unknown>;
        return {
          feature: toText(feature.feature) || 'Variable',
          importance: toNumber(feature.importance),
          direction: normalizeDirection(feature.direction),
        };
      })
      .sort((left, right) => right.importance - left.importance);
  },
};
