// Configuration centralisée Power BI
export const POWER_BI_CONFIG = {
  reportId: '32d24acd-686a-43c6-b089-ad1c1b7cc5eb',
  baseEmbedUrl:
    'https://app.powerbi.com/reportEmbed?reportId=32d24acd-686a-43c6-b089-ad1c1b7cc5eb&autoAuth=true&ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730',
  tenantId: '604f1a96-cbe8-43f8-abbf-f8eaf5d85730',
  filterPaneEnabled: false,
  navContentPaneEnabled: false,
} as const;

export const DASHBOARD_PAGES = {
  global: {
    key: 'global',
    label: 'Vue Globale',
    title: 'Vue Globale',
    description:
      'Vision executive consolidee du portefeuille, des revenus, des KPI reseau et des indicateurs de satisfaction.',
    pageName: '01_Vue_Globale',
    pageId: '92602a0eb6d542235f6c',
    route: '/dashboards/vue-globale',
    icon: 'activity',
  },
  clients: {
    key: 'clients',
    label: 'Clients & Churn',
    title: 'Clients & Churn',
    description:
      'Analyse des segments a risque, cohortes sensibles, probabilites churn et signaux de retention.',
    pageName: 'Clients & Churn',
    pageId: 'cff734eb691c10564a79',
    route: '/dashboards/clients-churn',
    icon: 'userMinus',
  },
  campaigns: {
    key: 'campaigns',
    label: 'Campagnes',
    title: 'Campagnes',
    description:
      'Suivi des campagnes marketing, reponse commerciale, conversion et pilotage du ROI.',
    pageName: 'Vue globale Campagnes Marketing',
    pageId: '63fc0cbb10315672dc0c',
    route: '/dashboards/campagnes',
    icon: 'megaphone',
  },
  reclamations: {
    key: 'reclamations',
    label: 'Réclamations',
    title: 'Réclamations',
    description:
      'Vue service client sur les irritants majeurs, les delais de resolution et les risques de churn post-incident.',
    pageName: 'Réclamations',
    pageId: '',
    route: '/dashboards/reclamations',
    icon: 'messageSquareWarning',
  },
  agences: {
    key: 'agences',
    label: 'Agences',
    title: 'Agences',
    description:
      'Performance commerciale et relationnelle par agence, gouvernorat et segment de clientele.',
    pageName: 'Agences',
    pageId: '',
    route: '/dashboards/agences',
    icon: 'mapPinned',
  },
  socialmedia: {
    key: 'socialmedia',
    label: 'Social Media',
    title: 'Social Media',
    description:
      'Suivi des mentions, du sentiment, des themes critiques et des signaux externes du parcours client.',
    pageName: 'Social media',
    pageId: '',
    route: '/dashboards/social-media',
    icon: 'messagesSquare',
  },
} as const;

export const CAMPAIGNS_SUBREPORTS = {
  overview: {
    key: 'overview',
    label: 'Vue Globale',
    pageName: 'Vue globale Campagnes Marketing',
    pageId: '63fc0cbb10315672dc0c',
  },
  google: {
    key: 'google',
    label: 'Google Ads',
    pageName: 'Google',
    pageId: 'ccfe377bdc96b1180b72',
  },
  meta: {
    key: 'meta',
    label: 'Meta Ads',
    pageName: 'Meta',
    pageId: 'c99a76d79b887be7050b',
  },
} as const;

/**
 * Construit une URL Power BI embed avec les paramètres configurés
 */
export function buildPowerBiEmbedUrl(pageName: string, pageId?: string): string {
  const url = new URL(POWER_BI_CONFIG.baseEmbedUrl);

  url.searchParams.set('filterPaneEnabled', 'false');
  url.searchParams.set('navContentPaneEnabled', 'false');

  if (pageName) {
    url.searchParams.set('pageName', pageName);
  }

  if (pageId) {
    url.searchParams.set('pageId', pageId);
  }

  return url.toString();
}

/**
 * Récupère la configuration d'un dashboard par sa route
 */
export function getDashboardByRoute(
  pathname: string
): (typeof DASHBOARD_PAGES)[keyof typeof DASHBOARD_PAGES] | null {
  return (
    Object.values(DASHBOARD_PAGES).find(d => d.route === pathname) || null
  );
}
