attijari-pfe-react/
│
├── 📄 POWERBI_ARCHITECTURE.md          ← Documentation complète
├── 📄 IMPLEMENTATION_SUMMARY.md        ← Résumé d'implémentation
│
├── src/
│   │
│   ├── config/
│   │   ├── dashboards.ts               ← ⭐ Configuration centralisée Power BI
│   │   ├── POWERBI_FLOW.ts             ← Diagramme du flux de données
│   │   └── EXAMPLES.tsx                ← Exemples d'utilisation
│   │
│   ├── types/
│   │   └── powerbi.ts                  ← Types TypeScript
│   │
│   ├── components/powerbi/
│   │   ├── ReportFrame.tsx             ← ⭐ Composant iframe réutilisable
│   │   ├── PowerBIEmbed.tsx            ← (Existant)
│   │   └── PowerBIPageTemplate.tsx     ← (Existant)
│   │
│   ├── pages/dashboards/
│   │   ├── DashboardsHub.tsx           ← ⭐ Hub central (5 dashboards)
│   │   ├── Campagnes.tsx               ← ⭐ Page spéciale (3 sous-pages)
│   │   ├── VueGlobale.tsx              ← (Existant - peut être supprimé)
│   │   ├── ClientsChurn.tsx            ← (Existant - peut être supprimé)
│   │   ├── Reclamations.tsx            ← (Existant - peut être supprimé)
│   │   ├── Agences.tsx                 ← (Existant - peut être supprimé)
│   │   └── SocialMedia.tsx             ← (Existant - peut être supprimé)
│   │
│   ├── utils/
│   │   ├── navigation.ts               ← Sidebar items (pas modifié)
│   │   └── powerbi.ts                  ← (Existant - remplacé par dashboards.ts)
│   │
│   └── App.tsx                         ← Routes mises à jour
│
└── .env                                ← Variables d'env (déjà créé)


═══════════════════════════════════════════════════════════════════════════════
                            FLUX DE DONNÉES
═══════════════════════════════════════════════════════════════════════════════

1. UTILISATEUR NAVIGUE
   │
   ├─ Clique sur "Vue Globale" dans le sidebar
   └─> Route: /dashboards/vue-globale

2. APP.TSX ROUTE
   │
   ├─ <Route path="/dashboards/vue-globale" element={<DashboardsHub />} />
   └─> DashboardsHub se rend

3. DASHBOARDSHUB.TSX
   │
   ├─ useLocation() → location.pathname = "/dashboards/vue-globale"
   ├─ getDashboardByRoute(pathname) → DASHBOARD_PAGES.global
   ├─ buildPowerBiEmbedUrl("01_Vue_Globale", "92602a0eb6d542235f6c")
   │  └─> https://app.powerbi.com/reportEmbed?...&pageName=01_Vue_Globale
   └─> <ReportFrame src={embedUrl} ... />

4. REPORTFRAME.TSX
   │
   ├─ <iframe src={embedUrl} />
   └─> Power BI affiche la page "01_Vue_Globale"


═══════════════════════════════════════════════════════════════════════════════
                        SOUS-NAVIGATION CAMPAGNES
═══════════════════════════════════════════════════════════════════════════════

1. UTILISATEUR CLIQUE "Meta Ads"
   │
   └─> setActiveReport('meta')

2. CAMPAGNES.TSX UPDATE
   │
   ├─ activeReport = 'meta'
   ├─ selectedReport = CAMPAIGNS_SUBREPORTS.meta
   ├─ buildPowerBiEmbedUrl("Meta", "c99a76d79b887be7050b")
   └─> <ReportFrame src={embedUrl} ... />

3. REPORTFRAME.TSX
   │
   ├─ key change → rerend
   ├─ <iframe src={embedUrl} />
   └─> Power BI affiche la page "Meta"


═══════════════════════════════════════════════════════════════════════════════
                        FICHIERS CLÉS À COMPRENDRE
═══════════════════════════════════════════════════════════════════════════════

📌 config/dashboards.ts
   └─ Configuration centrale de tous les dashboards
   └─ Pages Power BI avec leurs IDs
   └─ Fonction buildPowerBiEmbedUrl()
   └─ Fonction getDashboardByRoute()

📌 components/powerbi/ReportFrame.tsx
   └─ Wrapper autour de <iframe>
   └─ Gère loading state
   └─ Mémoïsé pour performance
   └─ Réutilisable partout

📌 pages/dashboards/DashboardsHub.tsx
   └─ Page principale pour 5 dashboards
   └─ Navigation par onglets
   └─ Onglets reflètent la route
   └─ Boutons : Actualiser, Ouvrir Power BI, Plein écran

📌 pages/dashboards/Campagnes.tsx
   └─ Page spéciale pour campagnes
   └─ Sous-navigation avec 3 rapports
   └─ État local pour activeReport
   └─ Même boutons que DashboardsHub

📌 App.tsx
   └─ Routes pointent vers DashboardsHub (sauf Campagnes)
   └─ Campagnes a sa propre route


═══════════════════════════════════════════════════════════════════════════════
                        AMÉLIORATIONS POSSIBLE
═══════════════════════════════════════════════════════════════════════════════

☐ Supprimer les anciens fichiers non utilisés
  └─ VueGlobale.tsx, ClientsChurn.tsx, etc.

☐ Mettre en cache les URLs construites
  └─ Pour éviter les recalculs

☐ Ajouter des query params pour la persistence
  └─ ?tab=clients dans l'URL

☐ Animations lors du changement de page
  └─ Fade in/out sur l'iframe

☐ Error boundary plus robuste
  └─ Fallback si Power BI ne charge pas

☐ Analytics
  └─ Tracker quelles pages sont consultées

☐ Bookmarks Power BI
  └─ Pour filtres persistants


═══════════════════════════════════════════════════════════════════════════════
                        COMMANDES UTILES
═══════════════════════════════════════════════════════════════════════════════

# Démarrer le serveur dev
npm run dev

# Build production
npm run build

# Vérifier les types TypeScript
npx tsc --noEmit

# Formatter le code
npm run format

# Lint
npm run lint


═══════════════════════════════════════════════════════════════════════════════
                        RÉCAPITULATIF
═══════════════════════════════════════════════════════════════════════════════

✅ Architecture propre et centralisée
✅ Un seul reportId Power BI utilisé
✅ Filtres supprimés (filterPaneEnabled=false)
✅ Navigation fluide par onglets
✅ Sous-navigation Campagnes fonctionnelle
✅ Responsive design (mobile/tablet/desktop)
✅ Code réutilisable (ReportFrame)
✅ TypeScript complet
✅ Documentation exhaustive

Prêt pour la production ! 🚀
