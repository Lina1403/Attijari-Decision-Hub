# Architecture Power BI - Documentation

## 📋 Vue d'ensemble

Cette architecture gère un **rapport Power BI unique** avec **navigation dynamique** entre plusieurs pages Power BI.

- **Report ID unique** : `32d24acd-686a-43c6-b089-ad1c1b7cc5eb`
- **Tenant ID** : `604f1a96-cbe8-43f8-abbf-f8eaf5d85730`
- **5 pages principales** + **3 sous-pages campagnes**

## 🏗️ Structure des fichiers

```
src/
├── config/
│   └── dashboards.ts          # Configuration centralisée
├── components/powerbi/
│   └── ReportFrame.tsx        # Composant iframe réutilisable
└── pages/dashboards/
    ├── DashboardsHub.tsx      # Page hub avec onglets (5 dashboards)
    └── Campagnes.tsx          # Page spéciale avec sous-nav (3 rapports)
```

## 🔧 Configuration centralisée (`config/dashboards.ts`)

### POWER_BI_CONFIG
Configuration globale du rapport Power BI :

```typescript
{
  reportId: '32d24acd-686a-43c6-b089-ad1c1b7cc5eb',
  baseEmbedUrl: 'https://app.powerbi.com/reportEmbed?...',
  tenantId: '604f1a96-cbe8-43f8-abbf-f8eaf5d85730',
  filterPaneEnabled: false,
  navContentPaneEnabled: false,
}
```

### DASHBOARD_PAGES
Définit les 5 dashboards principaux avec leurs pages Power BI :

```typescript
{
  global: { pageName: '01_Vue_Globale', pageId: '92602a0eb6d542235f6c', ... },
  clients: { pageName: 'Clients & Churn', pageId: 'cff734eb691c10564a79', ... },
  campaigns: { pageName: 'Vue globale Campagnes Marketing', pageId: '63fc0cbb10315672dc0c', ... },
  reclamations: { pageName: 'Réclamations', pageId: '', ... },
  agences: { pageName: 'Agences', pageId: '', ... },
  socialmedia: { pageName: 'Social media', pageId: '', ... },
}
```

### CAMPAIGNS_SUBREPORTS
Définit les 3 sous-pages de campagnes :

```typescript
{
  overview: { pageName: 'Vue globale Campagnes Marketing', pageId: '63fc0cbb10315672dc0c' },
  google: { pageName: 'Google', pageId: 'ccfe377bdc96b1180b72' },
  meta: { pageName: 'Meta', pageId: 'c99a76d79b887be7050b' },
}
```

### buildPowerBiEmbedUrl(pageName, pageId)
Construit une URL d'embed avec les bons paramètres :

```typescript
// Input:
buildPowerBiEmbedUrl('01_Vue_Globale', '92602a0eb6d542235f6c')

// Output:
// https://app.powerbi.com/reportEmbed?reportId=32d24acd...&autoAuth=true&...
// &filterPaneEnabled=false&navContentPaneEnabled=false&pageName=01_Vue_Globale
```

## 🎯 Composant ReportFrame

Wrapper réutilisable pour l'iframe Power BI :

```tsx
<ReportFrame
  src={embedUrl}              // URL Power BI embed
  title="Vue Globale"         // Titre de l'iframe
  height={800}                // Hauteur (default: 800px)
  isLoading={false}           // État de chargement
  onLoad={() => { }}          // Callback au chargement
  className=""                // CSS classes Tailwind
/>
```

## 📖 Page DashboardsHub

**Chemin** : `/dashboards/*` (sauf `/dashboards/campagnes`)

**Fonctionnalité** :
- Affiche les 5 dashboards principaux
- Navigation par onglets
- L'onglet actif se change automatiquement selon la route
- Boutons : Actualiser, Ouvrir Power BI, Plein écran

**Flux** :
1. Route `/dashboards/vue-globale` → `DashboardsHub`
2. `getDashboardByRoute()` récupère la config du dashboard
3. `buildPowerBiEmbedUrl()` construit l'URL
4. `ReportFrame` affiche l'iframe

```tsx
// Exemple : cliquer sur "Clients & Churn"
navigate('/dashboards/clients-churn')
→ currentDashboard = DASHBOARD_PAGES.clients
→ embedUrl = buildPowerBiEmbedUrl('Clients & Churn', 'cff734eb691c10564a79')
→ Affiche la page Power BI 'Clients & Churn'
```

## 📱 Page Campagnes

**Chemin** : `/dashboards/campagnes`

**Fonctionnalité** :
- Affiche le dashboard Campagnes
- Sous-navigation avec 3 boutons : Vue Globale, Google Ads, Meta Ads
- Chaque sous-rapport change la page Power BI affichée
- Boutons : Actualiser, Ouvrir Power BI, Plein écran

**Flux** :
1. État local `activeReport` gère le rapport actif
2. Cliquer "Google Ads" → `activeReport = 'google'`
3. `embedUrl = buildPowerBiEmbedUrl('Google', 'ccfe377bdc96b1180b72')`
4. Affiche la page Power BI 'Google'

```tsx
// Exemple : cliquer sur "Meta Ads"
setActiveReport('meta')
→ selectedReport = CAMPAIGNS_SUBREPORTS.meta
→ embedUrl = buildPowerBiEmbedUrl('Meta', 'c99a76d79b887be7050b')
→ Affiche la page Power BI 'Meta'
```

## 🔀 Flux de navigation

```
Sidebar
  ├─ Vue globale → /dashboards/vue-globale → DashboardsHub (global)
  ├─ Clients churn → /dashboards/clients-churn → DashboardsHub (clients)
  ├─ Campagnes → /dashboards/campagnes → Campagnes (overview)
  │    └─ Clic "Google Ads" → activeReport = 'google'
  │    └─ Clic "Meta Ads" → activeReport = 'meta'
  ├─ Reclamations → /dashboards/reclamations → DashboardsHub (reclamations)
  ├─ Agences → /dashboards/agences → DashboardsHub (agences)
  └─ Social Media → /dashboards/social-media → DashboardsHub (socialmedia)
```

## 🎨 Responsive Design

- **Mobile** : Onglets en ligne, boutons responsive
- **Tablette** : Layout flexible
- **Desktop** : Layout full-width avec plein écran possible

## ⚙️ Optimisations

1. **useMemo** pour les calculs d'URL
2. **ReportFrame.tsx** est mémoïsé (React.memo)
3. Les routes déclenchent automatiquement le changement d'onglet
4. État local pour les sous-pages (Campagnes)

## 🔗 Intégration

### Mise à jour du .env
```env
# Le .env utilise déjà les bonnes variables d'env
# Pas besoin de changer, tout est géré dans config/dashboards.ts
```

### Ajouter une nouvelle page Power BI

1. **Dans `config/dashboards.ts`** :
```typescript
DASHBOARD_PAGES = {
  ...
  newDashboard: {
    key: 'newDashboard',
    label: 'Nouveau',
    title: 'Nouveau Dashboard',
    description: '...',
    pageName: 'Page Name',
    pageId: 'page-id-xxx',
    route: '/dashboards/nouveau',
    icon: 'icon',
  },
};
```

2. **Dans `src/utils/navigation.ts`** :
```typescript
navigationGroups[1].items.push({
  label: 'Nouveau',
  path: '/dashboards/nouveau',
  icon: 'icon',
});
```

3. **Dans `App.tsx`** :
```tsx
<Route path="/dashboards/nouveau" element={<DashboardsHub />} />
```

## 🚀 Démarrage

```bash
npm run dev
```

Puis naviguer vers un dashboard. L'iframe Power BI se charge automatiquement avec la bonne page !
