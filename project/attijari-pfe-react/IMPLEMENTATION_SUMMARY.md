# Résumé d'implémentation

## Vue d'ensemble

Attijari Decision Hub est une application d'aide à la décision bancaire construite autour de quatre briques principales :

- un frontend React/Vite pour l'expérience utilisateur,
- un backend Node.js pour l'orchestration applicative,
- une API Flask dédiée au Machine Learning,
- un entrepôt de données SQL Server / SSMS comme source de données principale.

L'application combine des tableaux de bord Power BI, un cockpit d'accueil live, un module churn prédictif, un simulateur métier et une vue d'explicabilité du modèle.

## Architecture actuelle

### Frontend

- React 18
- Vite
- TypeScript
- Tailwind CSS
- TanStack Query pour la gestion des appels API et du cache
- Zustand pour l'état de session
- Recharts pour les visualisations métier

### Backend applicatif

- Node.js
- serveur HTTP natif
- services métier pour l'accueil, Power BI, IA de synthèse et intégration SQL Server

### Backend ML

- Flask
- pyodbc pour la connexion à SQL Server
- pandas / numpy pour la préparation des données
- joblib pour charger le modèle et le scaler

### Base de données

- SQL Server / SSMS
- base principale : `DWH_AttijariBI_Final`

## Fonctionnalités couvertes

### 1. Authentification et shell applicatif

- page de connexion métier,
- persistance de session locale,
- sidebar de navigation,
- topbar avec recherche globale, notifications, profil et fil d'Ariane.

### 2. Accueil décisionnel

- chargement live depuis SQL Server,
- KPI synthétiques,
- alertes prioritaires,
- raccourcis vers les dashboards Power BI,
- recommandations restituées dans le cockpit.

### 3. Dashboards Power BI

- rapport Power BI centralisé,
- navigation par routes React,
- pages analytiques :
  - vue globale,
  - clients et churn,
  - campagnes,
  - réclamations,
  - agences,
  - social media.

### 4. Intelligence churn

- page `Clients à risque`,
- tri, recherche, filtres et pagination backend,
- simulateur churn par client,
- explicabilité globale et exemples locaux,
- recommandations stratégiques côté interface.

## Améliorations techniques déjà appliquées

### Performance

- lazy loading des pages React,
- préchargement différé des routes après connexion,
- pagination backend pour la liste des clients à risque,
- recherche distante côté simulateur,
- réduction des chargements massifs côté frontend,
- conservation des données précédentes lors des changements de page.

### Qualité des données

- suppression des mocks actifs pour l'accueil et la partie churn live,
- récupération des clients depuis SQL Server,
- récupération des noms et prénoms réels via `DIM_Client`,
- simulation branchée sur l'API ML réelle.

### UX

- loaders et skeletons,
- messages d'erreur plus explicites,
- recherche globale vers les pages métier,
- jauges de simulation corrigées.

## Endpoints principaux

### Backend Node

- `GET /api/health`
- `GET /api/home-snapshot`
- `GET /api/dashboard-churn`
- `GET /api/top-at-risk`
- `GET /api/intelligence/clients`
- `GET /api/intelligence/recommendations`
- `GET /api/feature-importance`
- `POST /api/dashboard-ai-summary/generate`
- `POST /api/powerbi/embed-config`

### API ML Flask

- `GET /api/health`
- `POST /api/load-data`
- `GET /api/dashboard-churn`
- `GET /api/top-at-risk`
- `GET /api/clients-with-scores`
- `GET /api/churn/clients-risk`
- `GET /api/clients/search`
- `GET /api/clients/<id>`
- `GET /api/feature-importance`
- `POST /api/predict-churn`
- `POST /api/simulate-churn`

## Fichiers clés

- `src/App.tsx`
- `src/pages/home/Home.tsx`
- `src/pages/intelligence/ClientsRisque.tsx`
- `src/pages/intelligence/Simulateur.tsx`
- `src/pages/intelligence/Explicabilite.tsx`
- `src/services/intelligenceService.ts`
- `src/services/mlService.ts`
- `backend/server.js`
- `backend/src/services/HomeSnapshotService.js`
- `backend/src/services/SqlCmdClient.js`
- `machine learning/api_ml_models.py`
- `machine learning/churn_model.py`
- `machine learning/recommandation_model.py`

## Environnement d'exécution

- frontend : `http://localhost:5173`
- backend Node : `http://localhost:5002`
- API ML : `http://localhost:5001`
- SQL Server : `.\LINA`
- base : `DWH_AttijariBI_Final`

## Document de rapport complet

Le document détaillé destiné au rapport se trouve dans :

- `RAPPORT_APPLICATION_ATTIJARI_DECISION_HUB.md`

Ce fichier contient l'architecture complète, les flux de données, les fonctionnalités métier, les endpoints et les points d'amélioration.
