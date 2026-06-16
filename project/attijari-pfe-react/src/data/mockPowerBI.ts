import type { PowerBIReportDescriptor } from '@/types';

export const powerBIReports: PowerBIReportDescriptor[] = [
  {
    reportId: 'report-vue-globale',
    pageId: 'ReportSectionOverview',
    title: 'Vue Globale',
    description: 'Vision executive unifiee des revenus, clients et performance globale.',
    path: '/dashboards/vue-globale',
    category: 'Executive',
  },
  {
    reportId: 'report-clients-churn',
    pageId: 'ReportSectionChurn',
    title: 'Clients Churn',
    description: 'Lecture detaillee des clients a risque, segments et tendances churn.',
    path: '/dashboards/clients-churn',
    category: 'Retention',
  },
  {
    reportId: 'report-campagnes',
    pageId: 'ReportSectionCampaigns',
    title: 'Campagnes',
    description: 'Performance marketing, reponse et efficacite des actions commerciales.',
    path: '/dashboards/campagnes',
    category: 'Marketing',
  },
  {
    reportId: 'report-reclamations',
    pageId: 'ReportSectionClaims',
    title: 'Reclamations',
    description: 'Suivi des reclamations, SLA et zones d irritation client.',
    path: '/dashboards/reclamations',
    category: 'Qualite',
  },
  {
    reportId: 'report-agences',
    pageId: 'ReportSectionBranches',
    title: 'Agences',
    description: 'Pilotage agence par agence de la performance commerciale et relationnelle.',
    path: '/dashboards/agences',
    category: 'Reseau',
  },
  {
    reportId: 'report-social-media',
    pageId: 'ReportSectionSocial',
    title: 'Social Media',
    description: 'Perception client, sentiment et signaux externes provenant des reseaux sociaux.',
    path: '/dashboards/social-media',
    category: 'Voix du client',
  },
];
