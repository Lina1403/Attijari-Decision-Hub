import type { AppRole, NavGroup } from '@/types';

export const ROLE_HOME: Record<AppRole, string> = {
  ADMIN: '/admin/access-requests',
  MARKETING: '/dashboards/campagnes',
  COMMERCIAL: '/dashboards/clients-churn',
};

export const ROUTE_ROLES: Record<string, AppRole[]> = {
  '/admin/access-requests': ['ADMIN'],
  '/admin/users': ['ADMIN'],
  '/dashboards/campagnes': ['ADMIN', 'MARKETING'],
  '/dashboards/social-media': ['ADMIN', 'MARKETING'],
  '/intelligence/marketing-insights': ['ADMIN', 'MARKETING'],
  '/dashboards/vue-globale': ['ADMIN', 'COMMERCIAL'],
  '/dashboards/clients-churn': ['ADMIN', 'COMMERCIAL'],
  '/dashboards/reclamations': ['ADMIN', 'COMMERCIAL'],
  '/dashboards/agences': ['ADMIN', 'COMMERCIAL'],
  '/intelligence/clients-risque': ['ADMIN', 'COMMERCIAL'],
  '/intelligence/churn-dashboard': ['ADMIN', 'COMMERCIAL'],
  '/intelligence/simulateur': ['ADMIN', 'COMMERCIAL'],
  '/intelligence/explicabilite': ['ADMIN', 'COMMERCIAL'],
  '/intelligence/recommandations': ['ADMIN', 'COMMERCIAL'],
  '/eda-schema': ['ADMIN', 'COMMERCIAL', 'MARKETING'],
};

export function normalizeRole(role?: string | null): AppRole | null {
  const normalized = String(role ?? '').trim().toUpperCase();
  if (normalized === 'ADMIN' || normalized === 'MARKETING' || normalized === 'COMMERCIAL') {
    return normalized;
  }

  return null;
}

export function canAccessPath(role: string | null | undefined, path: string) {
  const normalizedRole = normalizeRole(role);
  if (!normalizedRole) return false;

  const pathname = path.split('?')[0] ?? path;
  const allowedRoles = ROUTE_ROLES[pathname];
  return Boolean(allowedRoles?.includes(normalizedRole));
}

export function getDefaultPathForRole(role: string | null | undefined) {
  const normalizedRole = normalizeRole(role);
  return normalizedRole ? ROLE_HOME[normalizedRole] : '/login';
}

export function filterNavigationByRole(groups: NavGroup[], role: string | null | undefined) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items
        .filter((item) => canAccessPath(role, item.path))
        .map((item) => ({
          ...item,
          children: item.children?.filter((child) => canAccessPath(role, child.path)),
        })),
    }))
    .filter((group) => group.items.length > 0);
}
