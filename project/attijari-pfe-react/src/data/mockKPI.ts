import type { AlertItem, DashboardShortcut, KPIItem } from '@/types';

const now = Date.now();

export const homeKpis: KPIItem[] = [
  {
    id: 'clients',
    label: 'Total Clients',
    value: '124 580',
    change: '+3.8% vs mois precedent',
    trend: 'up',
    accentColor: 'primary',
    helperText: 'Portefeuille actif toutes entites',
    icon: 'users',
  },
  {
    id: 'churn',
    label: 'Churn Predictif',
    value: '8.4%',
    change: '-1.2 pts sur 30 jours',
    trend: 'down',
    accentColor: 'gold',
    helperText: 'Probabilite moyenne de sortie',
    icon: 'userMinus',
  },
  {
    id: 'satisfaction',
    label: 'Satisfaction',
    value: '87 / 100',
    change: '+5 points ce trimestre',
    trend: 'up',
    accentColor: 'success',
    helperText: 'Indice relationnel consolide',
    icon: 'smile',
  },
  {
    id: 'reseau',
    label: 'Reseau',
    value: '211 agences',
    change: 'Couverture stable',
    trend: 'neutral',
    accentColor: 'navy',
    helperText: 'Agences et centres d affaires',
    icon: 'building2',
  },
];

export const dashboardShortcuts: DashboardShortcut[] = [
  {
    id: 'vue-globale',
    title: 'Vue Globale',
    description: 'Suivi executif transversal du portefeuille et des revenus.',
    path: '/dashboards/vue-globale',
    icon: 'activity',
    tag: 'Executive',
  },
  {
    id: 'clients-churn',
    title: 'Clients Churn',
    description: 'Analyse predictive des segments en attrition.',
    path: '/dashboards/clients-churn',
    icon: 'userMinus',
    tag: 'Retention',
  },
  {
    id: 'campagnes',
    title: 'Campagnes',
    description: 'Pilotage des campagnes cross-sell et reactivation.',
    path: '/dashboards/campagnes',
    icon: 'megaphone',
    tag: 'Marketing',
  },
  {
    id: 'reclamations',
    title: 'Reclamations',
    description: 'Detection des irritants et suivi des SLA service.',
    path: '/dashboards/reclamations',
    icon: 'messageSquareWarning',
    tag: 'Experience',
  },
  {
    id: 'agences',
    title: 'Agences',
    description: 'Performance commerciale et maillage territorial.',
    path: '/dashboards/agences',
    icon: 'mapPinned',
    tag: 'Reseau',
  },
  {
    id: 'social-media',
    title: 'Social Media',
    description: 'Ecoute digitale, tonalite et signaux faibles externes.',
    path: '/dashboards/social-media',
    icon: 'messagesSquare',
    tag: 'Voix du client',
  },
];

export const recentAlerts: AlertItem[] = [
  {
    id: 'ALR-001',
    title: 'Hausse du risque churn segment Premium',
    description: 'Le segment Premium Tunis Centre depasse le seuil de vigilance.',
    severity: 'Critique',
    timestamp: new Date(now - 35 * 60_000).toISOString(),
  },
  {
    id: 'ALR-002',
    title: 'Campagne retention mobile sous-performe',
    description: 'Le taux de conversion descend sous 12% sur la vague 3.',
    severity: 'Elevee',
    timestamp: new Date(now - 2 * 60 * 60_000).toISOString(),
  },
  {
    id: 'ALR-003',
    title: 'Reclamations cartes en progression',
    description: 'Les tickets cartes bancaires augmentent de 9% sur Sfax Sud.',
    severity: 'Elevee',
    timestamp: new Date(now - 5 * 60 * 60_000).toISOString(),
  },
  {
    id: 'ALR-004',
    title: 'Agence La Marsa au-dessus des objectifs',
    description: 'La production commerciale depasse le plan mensuel de 14%.',
    severity: 'Information',
    timestamp: new Date(now - 9 * 60 * 60_000).toISOString(),
  },
  {
    id: 'ALR-005',
    title: 'Baisse des connexions app sur un cohort jeune',
    description: 'Le cohort digital natif montre un ralentissement a suivre.',
    severity: 'Moderee',
    timestamp: new Date(now - 24 * 60 * 60_000).toISOString(),
  },
];
