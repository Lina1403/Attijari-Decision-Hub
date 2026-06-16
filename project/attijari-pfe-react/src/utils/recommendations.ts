import type { StrategicRecommendation } from '@/types';

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function getRecommendationActionPath(
  recommendation: Pick<StrategicRecommendation, 'title' | 'category' | 'owner'>,
) {
  const searchableText = normalize(
    `${recommendation.title} ${recommendation.category} ${recommendation.owner}`,
  );

  if (
    searchableText.includes('reclamation') ||
    searchableText.includes('service') ||
    searchableText.includes('resolution')
  ) {
    return '/dashboards/reclamations';
  }

  if (
    searchableText.includes('agence') ||
    searchableText.includes('reseau')
  ) {
    return '/dashboards/agences';
  }

  if (
    searchableText.includes('campagne') ||
    searchableText.includes('marketing')
  ) {
    return '/dashboards/campagnes';
  }

  if (
    searchableText.includes('digital') ||
    searchableText.includes('social')
  ) {
    return '/dashboards/social-media';
  }

  if (
    searchableText.includes('retention') ||
    searchableText.includes('churn') ||
    searchableText.includes('client')
  ) {
    return '/intelligence/clients-risque';
  }

  return '/intelligence/recommandations';
}
