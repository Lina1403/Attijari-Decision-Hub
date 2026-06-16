import type { BreadcrumbItem, NavigationModule } from '../models/dashboard.models';

export const APP_NAVIGATION_GROUPS: NavigationModule[] = [
  {
    id: 'home',
    label: 'Home',
    icon: 'layoutDashboard',
    items: [{ label: 'Accueil', path: '/home' }],
  },
  {
    id: 'analyses',
    label: 'Analyses',
    icon: 'activity',
    items: [
      { label: 'Vue globale', path: '/dashboards/vue-globale' },
      { label: 'Clients churn', path: '/dashboards/clients-churn' },
      { label: 'Campagnes', path: '/dashboards/campagnes' },
      { label: 'Reclamations', path: '/dashboards/reclamations' },
      { label: 'Agences', path: '/dashboards/agences' },
      { label: 'Social media', path: '/dashboards/social-media' },
    ],
  },
  {
    id: 'intelligence',
    label: 'Intelligence',
    icon: 'shieldAlert',
    items: [
      { label: 'Clients a risque', path: '/intelligence/clients-risque' },
      { label: 'Simulateur', path: '/intelligence/simulateur' },
      { label: 'Explicabilite', path: '/intelligence/explicabilite' },
      { label: 'Recommandations', path: '/intelligence/recommandations' },
    ],
  },
];

const PATH_LABELS = new Map(
  APP_NAVIGATION_GROUPS.flatMap((group) => group.items).map((item) => [item.path, item.label] as const),
);

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

export function flattenNavigationItems() {
  return APP_NAVIGATION_GROUPS.flatMap((group) => group.items);
}

export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);

  if (!segments.length) {
    return [];
  }

  return segments.map((_, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`;
    const segment = segments[index] ?? '';
    const label =
      PATH_LABELS.get(path) ??
      segment.replace(/-/g, ' ').replace(/(^|\s)\w/g, (char) => char.toUpperCase());
    return { label, path };
  });
}

export function resolveSearchTarget(searchQuery: string) {
  const trimmed = searchQuery.trim();
  const normalized = normalize(trimmed);
  const items = flattenNavigationItems();
  const direct = items.find((item) => normalize(item.label).includes(normalized));
  if (direct) {
    return direct.path;
  }

  if (normalized.includes('agence')) return '/dashboards/agences';
  if (normalized.includes('reclamation')) return '/dashboards/reclamations';
  if (normalized.includes('campagne')) return '/dashboards/campagnes';
  if (normalized.includes('social')) return '/dashboards/social-media';
  if (normalized.includes('explic')) return '/intelligence/explicabilite';
  if (normalized.includes('recommand')) return '/intelligence/recommandations';
  if (normalized.includes('simulat')) return '/intelligence/simulateur';

  return `/intelligence/clients-risque?search=${encodeURIComponent(trimmed)}`;
}
