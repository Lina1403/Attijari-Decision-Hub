# Rapport d'application - Attijari Decision Hub

## 1. Présentation générale

### 1.1 Contexte

Attijari Decision Hub est une application Business Intelligence conçue pour centraliser le pilotage de la performance bancaire, visualiser des tableaux de bord Power BI, détecter les clients à risque de churn et aider les équipes métier à prendre des décisions plus rapides et plus pertinentes.

Le projet s'appuie sur un Data Warehouse SQL Server, un frontend React moderne, un backend Node.js d'orchestration et une API Machine Learning dédiée à la prédiction du churn.

### 1.2 Objectifs métier

L'application poursuit quatre objectifs principaux :

1. fournir une vue consolidée de la performance bancaire,
2. détecter les clients à risque de départ,
3. simuler l'effet d'actions correctives sur le churn,
4. expliquer les facteurs qui influencent le modèle pour faciliter la prise de décision.

## 2. Architecture globale

L'architecture du projet repose sur quatre couches.

### 2.1 Frontend

Le frontend est développé avec :

- React 18
- Vite
- TypeScript
- Tailwind CSS
- TanStack Query
- Zustand
- Recharts

Il assure :

- l'authentification locale,
- la navigation entre les pages,
- l'affichage des dashboards,
- la consommation des API backend,
- les interactions utilisateur sur les modules churn.

### 2.2 Backend applicatif Node.js

Le backend principal est implémenté dans `backend/server.js`.

Il joue le rôle d'orchestrateur entre :

- le frontend React,
- SQL Server via `sqlcmd`,
- l'API ML Flask,
- les services Power BI,
- le service de génération de résumés IA.

Ses responsabilités principales sont :

- exposer les endpoints du cockpit d'accueil,
- servir de proxy pour certaines routes churn,
- gérer la configuration Power BI,
- construire le contexte envoyé au service de résumé IA,
- centraliser une partie des logs et du cache.

### 2.3 Backend Machine Learning

L'API ML est développée avec Flask dans `machine learning/api_ml_models.py`.

Elle assure :

- la connexion live à SQL Server,
- le chargement des clients depuis le Data Warehouse,
- le calcul des scores de churn,
- la pagination et le filtrage de la liste des clients à risque,
- la recherche ciblée de clients,
- la simulation churn,
- l'exposition de l'explicabilité globale du modèle.

### 2.4 Base de données

La source de vérité métier est SQL Server / SSMS avec la base :

- `DWH_AttijariBI_Final`

Les tables principales exploitées par l'application sont :

- `FACT_Client`
- `DIM_Client`
- `DIM_Gouvernorat`
- `DIM_Segment`
- `FACT_Reclamation`
- `DIM_Agence`
- `FACT_AvisAgence`

## 3. Architecture technique détaillée

### 3.1 Organisation du frontend

Le frontend est organisé autour de plusieurs répertoires :

- `src/pages` : pages de l'application
- `src/components` : composants réutilisables
- `src/services` : appels API
- `src/config` : configuration Power BI et paramètres d'affichage
- `src/stores` : gestion de session et d'interface
- `src/types` : contrats TypeScript

### 3.2 Organisation du backend Node.js

Le backend contient notamment :

- `src/services/HomeSnapshotService.js`
- `src/services/SqlCmdClient.js`
- `src/services/PowerBIEmbedService.js`
- `src/services/DashboardAiSummaryService.js`
- `src/services/DashboardSummaryContextBuilder.js`

### 3.3 Organisation du module ML

Le dossier `machine learning` contient :

- `churn_model.py` : entraînement et export du modèle churn
- `recommandation_model.py` : génération des recommandations produits
- `api_ml_models.py` : API Flask de scoring et simulation
- `ML_ChurnPredictions.csv` : export des scores churn
- `ML_Recommandations.csv` : export des recommandations
- `models/churn_model.pkl` : modèle sauvegardé
- `models/scaler.pkl` : scaler sauvegardé

## 4. Flux de données

### 4.1 Flux de l'accueil

Le cockpit d'accueil suit le flux suivant :

1. le frontend appelle `GET /api/home-snapshot`,
2. le backend Node exécute des requêtes SQL Server via `SqlCmdClient`,
3. `HomeSnapshotService` agrège les résultats,
4. le frontend affiche les KPI, alertes et recommandations.

### 4.2 Flux des clients à risque

La page `Clients à risque` suit le flux suivant :

1. le frontend appelle `GET /api/churn/clients-risk`,
2. l'API Flask charge les données clients depuis SQL Server,
3. le modèle churn calcule le score de risque,
4. l'API applique les filtres, le tri et la pagination,
5. le frontend affiche uniquement la page demandée.

### 4.3 Flux du simulateur churn

Le simulateur fonctionne ainsi :

1. l'utilisateur recherche un client,
2. le frontend appelle `GET /api/clients/search?q=...&limit=10`,
3. l'utilisateur sélectionne un client,
4. le frontend appelle `POST /api/simulate-churn`,
5. l'API ML renvoie :
   - le score avant,
   - le score après,
   - l'impact en points,
   - une recommandation métier,
6. les jauges sont mises à jour dans l'interface.

### 4.4 Flux des dashboards Power BI

Les dashboards Power BI sont pilotés par :

1. la route React active,
2. la configuration centralisée dans `src/config/dashboards.ts`,
3. la construction de l'URL d'embed,
4. l'affichage dans un composant `ReportFrame`.

## 5. Fonctionnalités de l'application

### 5.1 Authentification

Le module d'authentification propose :

- une page de connexion,
- une session persistée côté frontend via Zustand,
- une connexion classique,
- un bouton Microsoft 365.

Le système est actuellement centré sur une authentification locale côté interface.

### 5.2 Shell applicatif

Le shell se compose de :

- une sidebar métier,
- une topbar,
- un moteur de fil d'Ariane,
- une recherche globale de navigation,
- un menu utilisateur.

### 5.3 Accueil décisionnel

La page d'accueil fournit :

- un message de bienvenue contextualisé,
- des KPI clés,
- des alertes prioritaires,
- des raccourcis vers les dashboards,
- un panneau de recommandations.

Les données de cette page sont chargées en live depuis SQL Server.

### 5.4 Dashboards Power BI

La couche Power BI couvre :

- Vue globale
- Clients & Churn
- Campagnes
- Réclamations
- Agences
- Social Media

Les campagnes disposent en plus d'une sous-navigation :

- Vue globale Campagnes
- Google Ads
- Meta Ads

### 5.5 Clients à risque

Cette page permet :

- l'affichage paginé des clients à risque,
- le tri serveur,
- la recherche textuelle,
- le filtrage par segment,
- le filtrage par gouvernorat,
- le filtrage par classe de risque,
- l'accès direct au simulateur client.

La taille par défaut est de 40 clients par page, avec des options 20, 40 et 80.

### 5.6 Simulateur churn

Le simulateur permet :

- de rechercher un client sans charger toute la base,
- de sélectionner le client,
- de modifier des variables métier,
- de mesurer l'impact de la simulation,
- d'afficher des recommandations d'action.

Les indicateurs affichés sont :

- probabilité avant simulation,
- probabilité après simulation,
- delta en points.

### 5.7 Explicabilité

La page d'explicabilité présente :

- les variables les plus influentes du modèle,
- une explication métier du fonctionnement du score,
- des exemples locaux sur des clients prioritaires.

Son objectif est de rendre le modèle lisible par un public non technique, notamment dans le cadre d'une soutenance ou d'un jury.

### 5.8 Recommandations

Le projet contient deux dimensions de recommandation :

1. des recommandations stratégiques affichées dans l'application,
2. un modèle Python de recommandation produit dans `recommandation_model.py`.

Le modèle Python génère :

- `ML_Recommandations.csv`
- la table `ML_Recommandations` dans SQL Server

Il classe les opportunités commerciales et la priorité de rétention selon le profil du client et son score de churn.

## 6. Endpoints principaux

### 6.1 Endpoints du backend Node

- `GET /api/health`
- `GET /api/home-snapshot`
- `GET /api/dashboard-churn`
- `GET /api/top-at-risk`
- `GET /api/intelligence/clients`
- `GET /api/intelligence/recommendations`
- `GET /api/feature-importance`
- `POST /api/dashboard-ai-summary/generate`
- `POST /api/powerbi/embed-config`

### 6.2 Endpoints de l'API ML

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

### 6.3 Format paginé des clients à risque

Le format utilisé est :

```json
{
  "content": [],
  "page": 0,
  "size": 40,
  "totalElements": 1200,
  "totalPages": 30
}
```

## 7. Modèle churn

### 7.1 Variables exploitées

Le modèle churn utilise notamment :

- âge,
- ancienneté,
- score crédit,
- gouvernorat,
- solde compte,
- montant total de crédit,
- nombre de produits,
- nombre de crédits actifs,
- nombre de produits résiliés,
- transactions mensuelles,
- connexions mobile,
- virements en ligne,
- fonctionnalités app utilisées,
- offres reçues,
- offres acceptées,
- score satisfaction,
- nombre de réclamations.

### 7.2 Sortie du modèle

Le modèle produit :

- un score de churn de 0 à 100,
- une classe de risque :
  - Faible
  - Modéré
  - Élevé
  - Critique

### 7.3 Explicabilité

L'API expose également l'importance globale des variables afin de justifier le score calculé.

## 8. Optimisations de performance appliquées

Les optimisations déjà mises en place sont les suivantes :

- lazy loading des routes dans `src/App.tsx`,
- préchargement différé des pages après authentification,
- pagination backend des clients à risque,
- recherche distante pour le simulateur,
- réduction des appels inutiles,
- cache en mémoire de l'API ML,
- suppression du chargement complet de tous les clients dans le navigateur,
- état de chargement avec skeletons sur la table.

## 9. Points de qualité et robustesse

### 9.1 Points forts

- architecture séparée front / back / ML,
- SQL Server utilisé comme source métier,
- modèle churn réellement exploitable dans l'interface,
- navigation métier structurée,
- interface compatible avec de gros volumes de clients,
- composants réutilisables,
- code TypeScript typé,
- intégration Power BI centralisée.

### 9.2 Gestion des erreurs

Le projet inclut :

- des messages d'erreur frontend,
- des retours d'erreur API lisibles,
- des logs backend et ML utiles,
- des health checks sur les services.

## 10. Exécution et ports

### 10.1 Services

- frontend : `http://localhost:5173`
- backend Node : `http://localhost:5002`
- API ML : `http://localhost:5001`

### 10.2 Base de données

- serveur SQL Server : `.\LINA`
- base : `DWH_AttijariBI_Final`

## 11. Vérification et tests

Les contrôles utiles pour le projet sont :

```bash
cd project/attijari-pfe-react
npm run dev
npx tsc --noEmit
npm run build
```

```bash
cd "machine learning"
python api_ml_models.py
python churn_model.py
python recommandation_model.py
```

Health checks :

- `http://localhost:5002/api/health`
- `http://localhost:5001/api/health`

## 12. Limites actuelles et pistes d'amélioration

Les évolutions possibles du projet sont :

- brancher l'authentification sur un SSO réel,
- matérialiser les scores churn en base pour accélérer encore la première charge,
- enrichir la page recommandations avec les sorties directes du modèle `ML_Recommandations`,
- ajouter des recommandations agrégées par segment de clients à risque,
- proposer des index SQL ciblés pour les colonnes les plus filtrées,
- industrialiser davantage les logs et le monitoring.

## 13. Conclusion

Attijari Decision Hub constitue une plateforme analytique complète orientée métier. Elle relie un Data Warehouse bancaire, des dashboards Power BI, un moteur de prédiction de churn et une interface React moderne pour offrir une expérience décisionnelle unifiée.

Le projet répond à un besoin concret : transformer les données bancaires en actions pilotables. Il permet à la fois de surveiller la performance, d'anticiper le churn, de simuler des scénarios de rétention et d'expliquer les décisions du modèle aux utilisateurs métier.
