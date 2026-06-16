import {
  Building2,
  Megaphone,
  MessageSquareWarning,
  MessagesSquare,
  TrendingUp,
  UserRoundSearch,
} from 'lucide-react';
import type {
  DashboardAiSummaryConfig,
  DashboardAiSummaryDashboardType,
} from '@/types/dashboardAiSummary';

export const DASHBOARD_AI_SUMMARY_CONFIG: Record<
  DashboardAiSummaryDashboardType,
  DashboardAiSummaryConfig
> = {
  overview: {
    dashboardType: 'overview',
    label: 'Vue globale',
    tone: 'Synthèse exécutive portefeuille et performance consolidée',
    icon: TrendingUp,
    accentTheme: {
      accent: '#8F1730',
      soft: 'rgba(143, 23, 48, 0.10)',
      glow: 'rgba(143, 23, 48, 0.22)',
      border: 'rgba(143, 23, 48, 0.20)',
      badge: 'rgba(143, 23, 48, 0.10)',
      badgeText: '#8F1730',
      title: '#5D1021',
      recommendation: 'rgba(143, 23, 48, 0.16)',
    },
  },
  campaigns: {
    dashboardType: 'campaigns',
    label: 'Campagnes',
    tone: 'Pilotage ROI, acquisition et pression média',
    icon: Megaphone,
    accentTheme: {
      accent: '#B96C12',
      soft: 'rgba(185, 108, 18, 0.11)',
      glow: 'rgba(185, 108, 18, 0.20)',
      border: 'rgba(185, 108, 18, 0.20)',
      badge: 'rgba(185, 108, 18, 0.10)',
      badgeText: '#9E5A0A',
      title: '#7A4100',
      recommendation: 'rgba(185, 108, 18, 0.16)',
    },
  },
  complaints: {
    dashboardType: 'complaints',
    label: 'Réclamations',
    tone: 'Qualité de service, SLA et risque relationnel',
    icon: MessageSquareWarning,
    accentTheme: {
      accent: '#C9524F',
      soft: 'rgba(201, 82, 79, 0.10)',
      glow: 'rgba(201, 82, 79, 0.18)',
      border: 'rgba(201, 82, 79, 0.18)',
      badge: 'rgba(201, 82, 79, 0.10)',
      badgeText: '#A33C39',
      title: '#7C2E2C',
      recommendation: 'rgba(201, 82, 79, 0.15)',
    },
  },
  agencies: {
    dashboardType: 'agencies',
    label: 'Agences',
    tone: 'Animation réseau et arbitrage territorial',
    icon: Building2,
    accentTheme: {
      accent: '#155E75',
      soft: 'rgba(21, 94, 117, 0.10)',
      glow: 'rgba(21, 94, 117, 0.20)',
      border: 'rgba(21, 94, 117, 0.18)',
      badge: 'rgba(21, 94, 117, 0.10)',
      badgeText: '#155E75',
      title: '#0D4558',
      recommendation: 'rgba(21, 94, 117, 0.16)',
    },
  },
  social: {
    dashboardType: 'social',
    label: 'Social Media',
    tone: 'Réputation, sentiment et signaux faibles externes',
    icon: MessagesSquare,
    accentTheme: {
      accent: '#5B4BB6',
      soft: 'rgba(91, 75, 182, 0.11)',
      glow: 'rgba(91, 75, 182, 0.20)',
      border: 'rgba(91, 75, 182, 0.18)',
      badge: 'rgba(91, 75, 182, 0.10)',
      badgeText: '#5042A6',
      title: '#3D3285',
      recommendation: 'rgba(91, 75, 182, 0.16)',
    },
  },
  'clients-churn': {
    dashboardType: 'clients-churn',
    label: 'Clients & Churn',
    tone: 'Rétention, valeur et priorisation anti-churn',
    icon: UserRoundSearch,
    accentTheme: {
      accent: '#9A255A',
      soft: 'rgba(154, 37, 90, 0.10)',
      glow: 'rgba(154, 37, 90, 0.20)',
      border: 'rgba(154, 37, 90, 0.18)',
      badge: 'rgba(154, 37, 90, 0.10)',
      badgeText: '#8A1E50',
      title: '#68163C',
      recommendation: 'rgba(154, 37, 90, 0.16)',
    },
  },
};

export function getDashboardAiSummaryConfig(dashboardType: DashboardAiSummaryDashboardType) {
  return DASHBOARD_AI_SUMMARY_CONFIG[dashboardType];
}
