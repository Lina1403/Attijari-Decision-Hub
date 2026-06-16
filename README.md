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


## Stack technique

- Frontend principal : Angular
- Backend principal : Flask / Python
- Version applicative secondaire : React, TypeScript, Node.js
- Machine Learning : Python, scikit-learn, pandas, joblib
- BI : Power BI
- Données : CSV et préparation SQL Server



## Module Machine Learning

Le dossier `machine learning/` contient les scripts de prédiction churn, les recommandations, les modèles sauvegardés et les résultats CSV.

Fichiers importants :

- `churn_model.py` : entraînement et génération des scores churn.
- `recommandation_model.py` : génération des recommandations.
- `api_ml_models.py` : API Flask dédiée au ML.
- `ML_ChurnPredictions.csv` : résultats de prédiction churn.
- `ML_Recommandations.csv` : recommandations par client.
- `models/` : modèle entraîné, scaler et métadonnées.




Le dépôt contient le dashboard principal :

```text
Powerbiv1.pbix
```
## Notes
- La cible officielle documentée dans `project/README.md` est l'architecture Angular + Flask.
- La version React/Node reste disponible comme réserve technique et démonstrateur avancé.
- Les fichiers volumineux nécessaires au ML et au dashboard Power BI sont conservés lorsque leur présence est utile au projet.
