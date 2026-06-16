# Attijari BI Premium Shell

Application web premium en **Angular 19 + Flask** servant de couche applicative autour d'un projet BI bancaire avec integration Power BI preparee et resume AI via Groq.

## Stack

- Frontend: Angular 19, standalone components, SCSS design system
- Backend: Flask, blueprints, services/repositories, JSON responses standardisees
- AI Summary: Groq API appelee par le backend Flask
- Data mode actuel: mock datasets centralises, architecture prevue pour brancher SQL Server

## Structure

```text
project/
  frontend/
    src/app/
      core/          # models et services HTTP Angular
      layout/        # shell premium, sidebar, topbar
      pages/         # pages Home et Dashboards
      components/    # composants reutilisables, dont resume AI
  backend/
    app/
      routes/        # blueprints API Flask
      services/      # logique metier et resume AI
      repositories/  # abstraction source data
      data/          # datasets mock centralises
      schemas/       # reponses JSON standardisees
      clients/       # client Groq
  attijari-pfe-react/ # ancienne version React/Node conservee comme reserve
```

## Lancer le projet

## 1) Backend Flask

```powershell
cd c:\Users\linab\DATAPFE\project\backend
copy .env.example .env
pip install -r requirements.txt
python run.py
```

API disponible sur `http://localhost:5000`

## 2) Frontend Angular

```powershell
cd c:\Users\linab\DATAPFE\project\frontend
npm install
npm start
```

App disponible sur `http://localhost:4200`

## Endpoints backend principaux

- `GET /api/health`
- `GET /api/navigation/modules`
- `GET /api/overview/summary`
- `GET /api/powerbi/reports`
- `GET /api/powerbi/reports/<id>`
- `GET /api/powerbi/config/<id>`
- `POST /api/dashboard-ai-summary/generate`

## Power BI

- Mode actuel: placeholder guide par Flask
- L architecture est prete pour brancher un embed reel plus tard

## Resume AI avec Groq

- Le frontend Angular envoie le type de dashboard au backend Flask
- Flask construit un contexte structure
- Flask appelle Groq pour generer:
  - `globalSummary`
  - `strengths`
  - `watchouts`
- La reponse est validee puis renvoyee au front

## Note de migration

- L ancienne version React/Node a ete **conservee comme reserve** dans `project/attijari-pfe-react/`
- La nouvelle cible officielle est desormais `Angular + Flask`
