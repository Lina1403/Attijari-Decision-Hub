export const ROLES = {
  ADMIN: 'ADMIN',
  MARKETING: 'MARKETING',
  COMMERCIAL: 'COMMERCIAL',
};

export const DASHBOARD_ACCESS = {
  '01_Vue_Globale': [ROLES.ADMIN, ROLES.COMMERCIAL],
  overview: [ROLES.ADMIN, ROLES.COMMERCIAL],
  'Vue globale Campagnes Marketing': [ROLES.ADMIN, ROLES.MARKETING],
  Google: [ROLES.ADMIN, ROLES.MARKETING],
  Meta: [ROLES.ADMIN, ROLES.MARKETING],
  campaigns: [ROLES.ADMIN, ROLES.MARKETING],
  'Social media': [ROLES.ADMIN, ROLES.MARKETING],
  social: [ROLES.ADMIN, ROLES.MARKETING],
  'Clients & Churn': [ROLES.ADMIN, ROLES.COMMERCIAL],
  'clients-churn': [ROLES.ADMIN, ROLES.COMMERCIAL],
  Reclamations: [ROLES.ADMIN, ROLES.COMMERCIAL],
  complaints: [ROLES.ADMIN, ROLES.COMMERCIAL],
  Agences: [ROLES.ADMIN, ROLES.COMMERCIAL],
  agencies: [ROLES.ADMIN, ROLES.COMMERCIAL],
  'Clients a risque': [ROLES.ADMIN, ROLES.COMMERCIAL],
};

export const ML_FULL_ACCESS_ROLES = [ROLES.ADMIN, ROLES.COMMERCIAL];

export function normalizeRole(role) {
  const normalized = String(role ?? '').trim().toUpperCase();
  return normalized === 'ADMIN' || normalized === 'MARKETING' || normalized === 'COMMERCIAL'
    ? normalized
    : '';
}

export function hasRole(user, allowedRoles = []) {
  const role = normalizeRole(user?.role);
  return allowedRoles.includes(role);
}

export function rolesForDashboard(dashboardKey) {
  return DASHBOARD_ACCESS[dashboardKey] ?? [];
}
