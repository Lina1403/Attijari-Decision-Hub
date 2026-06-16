# GUIDE COMPLET ML — ATTIJARI DECISION HUB

## Dossier projet
Placer tous les fichiers dans : C:\Users\linab\DATAPFE\ML_Attijari\

## Fichiers fournis (dans l'ordre d'exécution)
1. test_connexion.py
2. churn_model.py
3. recommandation_model.py
4. export_powerbi.py

---

## ÉTAPE 1 — Installer les packages (une seule fois)

Ouvrir VS Code → Terminal → coller :

```
pip install pyodbc sqlalchemy scikit-learn imbalanced-learn pandas numpy matplotlib seaborn joblib
```

---

## ÉTAPE 2 — Tester la connexion

```
python test_connexion.py
```

Résultat attendu :
```
✓ CONNEXION RÉUSSIE avec SERVER=ASUS\LINAB
  Total clients : 50,000
  Clients churnés : 10,500
  Taux churn : 21.0%
```

Si un autre SERVER= est affiché → ouvrir churn_model.py
et changer la ligne SERVER = 'ASUS\\LINAB' par le bon nom

---

## ÉTAPE 3 — Lancer le modèle Churn

```
python churn_model.py
```

Durée : ~2 à 5 minutes selon ton PC
Résultat : fichier ML_ChurnPredictions.csv + table SQL Server

---

## ÉTAPE 4 — Lancer le modèle Recommandation

```
python recommandation_model.py
```

Durée : ~1 minute
Résultat : fichier ML_Recommandations.csv + table SQL Server

---

## ÉTAPE 5 — Vérifier les exports

```
python export_powerbi.py
```

Affiche le résumé + les instructions Power BI exactes

---

## ÉTAPE 6 — Connecter dans Power BI

1. Power BI → Obtenir les données → SQL Server
2. Serveur : ASUS\LINAB  |  Base : DWH_AttijariBI_Final
3. Sélectionner : ML_ChurnPredictions + ML_Recommandations
4. Créer les relations avec FACT_Client[ClientSK]
5. Créer les mesures DAX (voir export_powerbi.py)

---

## En cas d'erreur

Erreur ODBC → vérifier que SQL Server est démarré
  Services Windows (Win+R → services.msc)
  → SQL Server (MSSQLSERVER) → Démarrer

Erreur imbalanced-learn → enlever le SMOTE
  Le script continue sans SMOTE automatiquement

Erreur sqlalchemy → utiliser le CSV
  Le script exporte toujours en CSV en fallback
