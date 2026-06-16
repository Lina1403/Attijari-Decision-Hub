/**
 * FLUX DE DONNÉES POWER BI
 * ========================
 *
 * Rapport unique avec navigation multi-pages
 * Report ID: 32d24acd-686a-43c6-b089-ad1c1b7cc5eb
 * Tenant ID: 604f1a96-cbe8-43f8-abbf-f8eaf5d85730
 *
 *
 * PAGES DISPONIBLES
 * =================
 *
 * [DASHBOARDS PRINCIPAUX] - Route: /dashboards/*
 * │
 * ├─ Vue Globale
 * │  └─ Page: 01_Vue_Globale
 * │  └─ ID: 92602a0eb6d542235f6c
 * │
 * ├─ Clients & Churn
 * │  └─ Page: Clients & Churn
 * │  └─ ID: cff734eb691c10564a79
 * │
 * ├─ Campagnes (avec sous-nav)
 * │  ├─ Vue Globale Campagnes
 * │  │  └─ Page: Vue globale Campagnes Marketing
 * │  │  └─ ID: 63fc0cbb10315672dc0c
 * │  ├─ Google Ads
 * │  │  └─ Page: Google
 * │  │  └─ ID: ccfe377bdc96b1180b72
 * │  └─ Meta Ads
 * │     └─ Page: Meta
 * │     └─ ID: c99a76d79b887be7050b
 * │
 * ├─ Réclamations
 * │  └─ Page: Réclamations
 * │
 * ├─ Agences
 * │  └─ Page: Agences
 * │
 * └─ Social Media
 *    └─ Page: Social media
 *
 *
 * FLUX TECHNIQUE
 * ==============
 *
 * 1. UTILISATEUR CLIQUE SUR "Vue Globale"
 *    └─> navigate('/dashboards/vue-globale')
 *
 * 2. DashboardsHub reçoit la route
 *    └─> getDashboardByRoute('/dashboards/vue-globale')
 *    └─> currentDashboard = DASHBOARD_PAGES.global
 *
 * 3. Construit l'URL Power BI
 *    └─> buildPowerBiEmbedUrl('01_Vue_Globale', '92602a0eb6d542235f6c')
 *    └─> https://app.powerbi.com/reportEmbed
 *        ?reportId=32d24acd-686a-43c6-b089-ad1c1b7cc5eb
 *        &autoAuth=true
 *        &ctid=604f1a96-cbe8-43f8-abbf-f8eaf5d85730
 *        &filterPaneEnabled=false
 *        &navContentPaneEnabled=false
 *        &pageName=01_Vue_Globale
 *
 * 4. ReportFrame affiche l'iframe avec cette URL
 *    └─> <iframe src={embedUrl} />
 *
 *
 * SOUS-NAVIGATION CAMPAGNES
 * =========================
 *
 * 1. UTILISATEUR CLIQUE SUR "Meta Ads"
 *    └─> setActiveReport('meta')
 *
 * 2. Campagnes.tsx met à jour activeReport
 *    └─> selectedReport = CAMPAIGNS_SUBREPORTS.meta
 *
 * 3. Construit la nouvelle URL
 *    └─> buildPowerBiEmbedUrl('Meta', 'c99a76d79b887be7050b')
 *
 * 4. ReportFrame se rerend avec la nouvelle URL
 *    └─> iframe recharge la page Power BI 'Meta'
 *
 *
 * ARCHITECTURE COMPOSANTS
 * =======================
 *
 * DashboardsHub.tsx
 * ├─ State: activeReport (calculé depuis la route)
 * ├─ useMemo: embedUrl (recalculé si currentDashboard change)
 * ├─ UI: Header + Navigation Tabs + ReportFrame
 * └─ Onglets naviguent avec navigate(route)
 *
 * Campagnes.tsx
 * ├─ State: activeReport (local, non routé)
 * ├─ useMemo: embedUrl (recalculé si selectedReport change)
 * ├─ UI: Header + Sous-nav boutons + ReportFrame
 * └─ Boutons changent activeReport (pas de navigation)
 *
 * ReportFrame.tsx
 * ├─ Props: src, title, height, isLoading, onLoad, className
 * ├─ Rendu conditionnel: Loading state ou <iframe>
 * └─ Mémoïsé pour éviter rerenders inutiles
 *
 *
 * PARAMÉTRISATION
 * ===============
 *
 * Configuration centralisée dans src/config/dashboards.ts :
 * - POWER_BI_CONFIG : settings globaux
 * - DASHBOARD_PAGES : 5 dashboards principaux
 * - CAMPAIGNS_SUBREPORTS : 3 sous-pages campagnes
 * - buildPowerBiEmbedUrl() : construit l'URL
 * - getDashboardByRoute() : trouve le dashboard par route
 *
 *
 * AVANTAGES DE CETTE ARCHITECTURE
 * ================================
 *
 * ✓ Single Report ID - toutes les pages dans un rapport Power BI
 * ✓ Centralisé - config à un seul endroit
 * ✓ Maintenable - ajouter une page = 2 lignes
 * ✓ Type-safe - TypeScript pour les clés
 * ✓ Responsive - fonctionne mobile/tablet/desktop
 * ✓ Performance - useMemo pour les calculs
 * ✓ Réutilisable - ReportFrame pour toutes les pages
 * ✓ Navigation fluide - onglets qui reflètent la route
 *
 */

export default {};
