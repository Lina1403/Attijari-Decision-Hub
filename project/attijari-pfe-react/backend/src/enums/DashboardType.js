export const DashboardType = Object.freeze({
  OVERVIEW: 'overview',
  CAMPAIGNS: 'campaigns',
  COMPLAINTS: 'complaints',
  AGENCIES: 'agencies',
  SOCIAL: 'social',
  CLIENTS_CHURN: 'clients-churn',
});

const DASHBOARD_TYPE_LABELS = Object.freeze({
  [DashboardType.OVERVIEW]: 'Vue globale',
  [DashboardType.CAMPAIGNS]: 'Campagnes',
  [DashboardType.COMPLAINTS]: 'Réclamations',
  [DashboardType.AGENCIES]: 'Agences',
  [DashboardType.SOCIAL]: 'Social Media',
  [DashboardType.CLIENTS_CHURN]: 'Clients & Churn',
});

const DASHBOARD_TYPE_ALIASES = Object.freeze({
  [DashboardType.OVERVIEW]: ['overview', 'global', 'vue-globale', 'vue_globale'],
  [DashboardType.CAMPAIGNS]: ['campaigns', 'campagnes', 'marketing'],
  [DashboardType.COMPLAINTS]: ['complaints', 'reclamations', 'réclamations', 'service'],
  [DashboardType.AGENCIES]: ['agencies', 'agences', 'network'],
  [DashboardType.SOCIAL]: ['social', 'social-media', 'social_media', 'socialmedia'],
  [DashboardType.CLIENTS_CHURN]: [
    'clients-churn',
    'clients_churn',
    'clients',
    'churn',
    'clients-churn',
  ],
});

export function normalizeDashboardType(value) {
  const normalizedValue = String(value ?? '')
    .trim()
    .toLowerCase();

  for (const [dashboardType, aliases] of Object.entries(DASHBOARD_TYPE_ALIASES)) {
    if (aliases.includes(normalizedValue)) {
      return dashboardType;
    }
  }

  return null;
}

export function getDashboardTypeLabel(dashboardType) {
  return DASHBOARD_TYPE_LABELS[dashboardType] ?? dashboardType;
}

export function getSupportedDashboardTypes() {
  return Object.values(DashboardType);
}
