import { DASHBOARD_PAGES } from '@/config/dashboards';
import { apiClient } from '@/services/api';
import type { DashboardShortcut, HomeSnapshot } from '@/types';

const shortcutTagByKey: Record<string, string> = {
  global: 'Executive',
  clients: 'Retention',
  campaigns: 'Marketing',
  reclamations: 'Experience',
  agences: 'Reseau',
  socialmedia: 'Voix du client',
};

const homeShortcuts: DashboardShortcut[] = Object.values(DASHBOARD_PAGES).map((page) => ({
  id: page.key,
  title: page.title,
  description: page.description,
  path: page.route,
  icon: page.icon,
  tag: shortcutTagByKey[page.key] ?? 'Dashboard',
}));

type LiveHomeSnapshot = Omit<HomeSnapshot, 'shortcuts'> & {
  collectedAt?: string;
  source?: string;
};

export const dashboardService = {
  async getHomeSnapshot(): Promise<HomeSnapshot> {
    const { data } = await apiClient.get<LiveHomeSnapshot>('/home-snapshot');

    return {
      ...data,
      shortcuts: homeShortcuts,
    };
  },
};
