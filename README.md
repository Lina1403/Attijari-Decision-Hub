# Attijari Decision Hub

Attijari Decision Hub est une plateforme BI et analytique conçue pour centraliser la lecture des indicateurs bancaires, l'analyse des dashboards Power BI et l'exploitation de modèles de Machine Learning autour du risque de churn client.

Le projet regroupe une application web, un backend API, des dashboards Power BI et un module Machine Learning permettant de produire des scores de risque, des recommandations et des simulations d'impact.

## Objectifs

- Offrir une interface décisionnelle claire pour suivre les indicateurs clés.
- Intégrer les dashboards Power BI dans un parcours applicatif structuré.
- Exploiter des modèles ML pour identifier les clients à risque de churn.
- Générer des recommandations d'actions commerciales et de rétention.
- Préparer une architecture extensible vers SQL Server, Power BI Embedded et l'IA générative.

## Fonctionnalités principales

- Tableau de bord global avec indicateurs de performance.
- Espaces de consultation pour les dashboards métiers.
- Module d'intelligence client : churn, clients à risque, recommandations et simulateur.
- Résumé intelligent des dashboards via API backend.
- Pipeline Machine Learning Python pour prédiction et scoring.
- Export des résultats ML vers des fichiers CSV exploitables par l'application.

## Structure du dépôt

```text
Attijari-Decision-Hub/
  project/
    frontend/              # Application Angular
    backend/               # Backend Flask
    attijari-pfe-react/    # Version React/Node conservée comme réserve technique
  machine learning/        # Modèles, scripts, API ML et résultats de scoring
  Powerbiv1.pbix           # Dashboard Power BI principal
```

## Stack technique

- Frontend principal : Angular
- Backend principal : Flask / Python
- Version applicative secondaire : React, TypeScript, Node.js
- Machine Learning : Python, scikit-learn, pandas, joblib
- BI : Power BI
- Données : CSV et préparation SQL Server

## Lancer le backend Flask

```powershell
cd project\backend
copy .env.example .env
pip install -r requirements.txt
python run.py
```

API disponible par défaut sur :

```text
http://localhost:5000
```

## Lancer le frontend Angular

```powershell
cd project\frontend
npm install
npm start
```

Application disponible par défaut sur :

```text
http://localhost:4200
```

## Lancer la version React/Node

La version React/Node est conservée dans `project/attijari-pfe-react/`.

```powershell
cd project\attijari-pfe-react
npm install
npm run server
npm run dev
```

Backend Node par défaut :

```text
http://localhost:5002
```

Frontend Vite par défaut :

```text
http://localhost:5173
```

## Module Machine Learning

Le dossier `machine learning/` contient les scripts de prédiction churn, les recommandations, les modèles sauvegardés et les résultats CSV.

Fichiers importants :

- `churn_model.py` : entraînement et génération des scores churn.
- `recommandation_model.py` : génération des recommandations.
- `api_ml_models.py` : API Flask dédiée au ML.
- `ML_ChurnPredictions.csv` : résultats de prédiction churn.
- `ML_Recommandations.csv` : recommandations par client.
- `models/` : modèle entraîné, scaler et métadonnées.

Installation rapide :

```powershell
cd "machine learning"
pip install pandas numpy scikit-learn imbalanced-learn joblib flask flask-cors pyodbc sqlalchemy
python run_all.py
```

L'API ML peut aussi être lancée directement :

```powershell
python api_ml_models.py
```

## Power BI

Le dépôt contient le dashboard principal :

```text
Powerbiv1.pbix
```

Le fichier `PFE.pbix` n'est pas conservé dans ce dépôt.

## Configuration

Les fichiers `.env` réels ne sont pas versionnés. Utiliser les fichiers `.env.example` comme base de configuration :

- `project/backend/.env.example`
- `project/attijari-pfe-react/.env.example`

Les secrets, tokens, fichiers de session, logs, caches, `node_modules` et builds générés sont exclus du dépôt.

## Endpoints utiles

Backend Flask :

- `GET /api/health`
- `GET /api/navigation/modules`
- `GET /api/overview/summary`
- `GET /api/powerbi/reports`
- `POST /api/dashboard-ai-summary/generate`

Backend React/Node :

- `GET /api/intelligence/clients`
- `GET /api/top-at-risk`
- `GET /api/health`

## Notes

- La cible officielle documentée dans `project/README.md` est l'architecture Angular + Flask.
- La version React/Node reste disponible comme réserve technique et démonstrateur avancé.
- Les fichiers volumineux nécessaires au ML et au dashboard Power BI sont conservés lorsque leur présence est utile au projet.
