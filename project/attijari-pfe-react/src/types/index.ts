import type { ReactNode } from 'react';

export type Trend = 'up' | 'down' | 'neutral';
export type AccentColor = 'primary' | 'gold' | 'navy' | 'success' | 'danger';
export type Priority = 'Haute' | 'Moyenne' | 'Basse';
export type Severity = 'Critique' | 'Elevee' | 'Moderee' | 'Information';
export type AppRole = 'ADMIN' | 'MARKETING' | 'COMMERCIAL';
export type AccessSpace = 'marketing' | 'commercial' | 'admin';
export type AppTheme = 'light' | 'dark';
export type ContentDensity = 'comfortable' | 'compact';
export type IconKey =
  | 'users'
  | 'userMinus'
  | 'smile'
  | 'building2'
  | 'layoutDashboard'
  | 'activity'
  | 'megaphone'
  | 'messageSquareWarning'
  | 'mapPinned'
  | 'messagesSquare'
  | 'brain'
  | 'shieldAlert'
  | 'slidersHorizontal'
  | 'lightbulb'
  | 'barChart3';

export interface AppUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  role: AppRole | string;
  initials: string;
  entity: string;
  createdAt?: string;
  lastLoginAt?: string | null;
}

export interface NotificationPreferences {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  weeklyDigest: boolean;
  churnAlerts: boolean;
  marketingAlerts: boolean;
}

export interface UserPreferences {
  language: 'fr';
  theme: AppTheme;
  contentDensity: ContentDensity;
  notifications: NotificationPreferences;
}

export interface UserNotification {
  id: string;
  category: 'system' | 'security' | 'profile' | 'marketing';
  title: string;
  message: string;
  createdAt: string;
  readAt: string | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AccessRequest {
  id: string;
  fullName: string;
  email: string;
  requestedRole: 'MARKETING' | 'COMMERCIAL';
  message: string;
  status: 'EN_ATTENTE' | 'APPROUVEE' | 'REFUSEE';
  requestedAt: string;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reviewedByName: string | null;
  approvedUserId: string | null;
  reviewComment: string | null;
}

export interface AccessRequestEmailDelivery {
  fullName: string;
  email: string;
  role: 'MARKETING' | 'COMMERCIAL';
  spaceLabel: string;
  mode: string;
  delivered: boolean;
  error?: string;
}

export interface KPIItem {
  id: string;
  label: string;
  value: string;
  change: string;
  trend: Trend;
  accentColor: AccentColor;
  helperText: string;
  icon: IconKey;
}

export interface DashboardShortcut {
  id: string;
  title: string;
  description: string;
  path: string;
  icon: IconKey;
  tag: string;
}

export interface AlertItem {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  timestamp: string;
}

export interface StrategicRecommendation {
  id: string;
  title: string;
  description: string;
  impact: number;
  roi: string;
  priority: Priority;
  owner: string;
  eta: string;
  actionLabel: string;
  category: string;
}

export interface FeatureImportance {
  feature: string;
  importance: number;
  direction: 'positive' | 'negative' | 'neutral';
}

export interface RiskClient {
  id: string;
  clientSK: number;
  firstName?: string;
  lastName?: string;
  nom?: string;
  prenom?: string;
  fullName: string;
  segment: string;
  gouvernorat: string;
  age: number;
  score: number;
  riskScore: number;
  riskClass: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
  satisfaction: number;
  products: number;
  complaints: number;
  appConnections: number;
  appFeatures: number;
  cardPayments: number;
  annualValue: number;
  churnProbability: number;
  topFeatures: string[];
  lastContact: string;
  manager: string;
}

export interface RiskClientsPageSummary {
  totalClients: number;
  distribution: Record<'Faible' | 'Modéré' | 'Élevé' | 'Critique', number>;
  averageChurnScore: number;
  highRiskClients: number;
  highRiskRatio: number;
  dominantRiskClass: 'Faible' | 'Modéré' | 'Élevé' | 'Critique';
  dominantRiskCount: number;
}

export interface RiskClientsPageFilters {
  segments: string[];
  gouvernorats: string[];
  riskClasses: Array<'Faible' | 'Modéré' | 'Élevé' | 'Critique'>;
}

export interface RiskClientsPage {
  content: RiskClient[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  sortBy: string;
  direction: 'asc' | 'desc';
  summary: RiskClientsPageSummary;
  filters: RiskClientsPageFilters;
}

export interface RiskFilters {
  segment: string;
  gouvernorat: string;
  scoreBand: string;
}

export interface RiskClientsQueryParams {
  page?: number;
  size?: number;
  sortBy?: string;
  direction?: 'asc' | 'desc';
  search?: string;
  segment?: string;
  gouvernorat?: string;
  riskClass?: string;
}

export interface HomeSnapshot {
  kpis: KPIItem[];
  shortcuts: DashboardShortcut[];
  alerts: AlertItem[];
  recommendations: StrategicRecommendation[];
}

export interface PowerBIEmbedProps {
  reportId: string;
  pageId: string;
  filters?: Record<string, unknown>;
  height?: number | string;
  title?: string;
  iframeUrl?: string;
  onLoad?: () => void;
}

export interface PowerBIDashboardSnapshot {
  source: 'powerbi-live-sdk';
  collectedAt: string;
  report: Record<string, unknown>;
  filters: Record<string, unknown>;
  visuals: Array<Record<string, unknown>>;
  extraction: Record<string, unknown>;
}

export interface PowerBIDashboardSnapshotResult {
  status: 'available' | 'unavailable';
  snapshot?: PowerBIDashboardSnapshot;
  reason?: 'iframe-mode' | 'report-not-ready' | 'no-readable-visuals' | 'sdk-error';
  message?: string;
}

export interface PowerBIEmbedHandle {
  resetFilters: () => Promise<void>;
  getActiveFilters: () => Promise<Record<string, unknown>>;
  getDashboardSnapshot: () => Promise<PowerBIDashboardSnapshotResult>;
}

export type PowerBIReportKey =
  | '01_Vue_Globale'
  | 'Clients & Churn'
  | 'Vue globale Campagnes Marketing'
  | 'Google'
  | 'Meta'
  | 'Reclamations'
  | 'Agences'
  | 'Social media'
  | 'Clients a risque';

export type PowerBIWorkspaceSection =
  | 'strategic'
  | 'clients'
  | 'marketing'
  | 'service'
  | 'network'
  | 'digital'
  | 'risk';

export interface PowerBIWorkspaceReport {
  key: PowerBIReportKey;
  tabLabel: string;
  title: string;
  description: string;
  pageName: string;
  reportId: string;
  section: PowerBIWorkspaceSection;
  embedUrl?: string;
  openUrl?: string;
}

export interface PowerBIReportDescriptor {
  reportId: string;
  pageId: string;
  title: string;
  description: string;
  path: string;
  category: string;
}

export interface NavItem {
  label: string;
  path: string;
  icon: IconKey;
  children?: NavItem[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export interface BreadcrumbItem {
  label: string;
  path: string;
}

export interface TableColumn<TData> {
  key: string;
  header: string;
  width?: string;
  className?: string;
  render: (row: TData) => ReactNode;
}
