import type { BreadcrumbItem, NavGroup } from '@/types';

export const navigationGroups: NavGroup[] = [
  {
    label: 'Administration',
    items: [
      { label: 'Demandes d acces', path: '/admin/access-requests', icon: 'users' },
      { label: 'Comptes utilisateurs', path: '/admin/users', icon: 'users' },
    ],
  },
  {
    label: 'Analyses',
    items: [
      { label: 'Vue globale', path: '/dashboards/vue-globale', icon: 'activity' },
      {
        label: 'Campagnes',
        path: '/dashboards/campagnes',
        icon: 'megaphone',
        children: [
          { label: 'Google Ads', path: '/dashboards/campagnes?view=google', icon: 'megaphone' },
          { label: 'Meta Ads', path: '/dashboards/campagnes?view=meta', icon: 'megaphone' },
        ],
      },
      { label: 'Réseaux sociaux', path: '/dashboards/social-media', icon: 'messagesSquare' },
      { label: 'Clients en attrition', path: '/dashboards/clients-churn', icon: 'userMinus' },
      {
        label: 'Réclamations',
        path: '/dashboards/reclamations',
        icon: 'messageSquareWarning',
      },
      { label: 'Agences', path: '/dashboards/agences', icon: 'mapPinned' },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      {
        label: 'Insights marketing',
        path: '/intelligence/marketing-insights',
        icon: 'lightbulb',
      },
      {
        label: 'Clients à risque',
        path: '/intelligence/clients-risque',
        icon: 'shieldAlert',
      },
      {
        label: 'Simulateur',
        path: '/intelligence/simulateur',
        icon: 'slidersHorizontal',
      },
      {
        label: 'Explicabilité',
        path: '/intelligence/explicabilite',
        icon: 'barChart3',
      },
      {
        label: 'Recommandations',
        path: '/intelligence/recommandations',
        icon: 'lightbulb',
      },
    ],
  },
];

const extraPathLabels = new Map<string, string>([
  ['/profile', 'Mon profil'],
  ['/settings', 'Paramètres'],
  ['/access-denied', 'Accès refusé'],
  ['/session-expired', 'Session expirée'],
  ['/eda-schema', 'Schéma DWH'],
  ['/choose-space', 'Choix de l espace'],
  ['/request-access', 'Demande d acces'],
  ['/admin/access-requests', 'Demandes d acces'],
  ['/admin/users', 'Comptes utilisateurs'],
]);

const pathLabels = new Map(
  navigationGroups
    .flatMap((group) => group.items.flatMap((item) => [item, ...(item.children ?? [])]))
    .map((item) => [item.path, item.label] as const),
);

extraPathLabels.forEach((label, path) => {
  pathLabels.set(path, label);
});

export function getBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);

  if (!segments.length) {
    return [];
  }

  const breadcrumbs = segments.map((_, index) => {
    const path = `/${segments.slice(0, index + 1).join('/')}`;
    const segment = segments[index] ?? '';
    const label =
      pathLabels.get(path) ??
      segment.replace(/-/g, ' ').replace(/(^|\s)\w/g, (char: string) => char.toUpperCase());
    return { label, path };
  });

  return breadcrumbs;
}
