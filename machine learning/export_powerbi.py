"""
================================================
ATTIJARI DECISION HUB
Fichier 4 : Vérification exports + résumé
================================================
Lancer APRÈS les 2 modèles
Commande : python export_powerbi.py
================================================
"""
import pandas as pd
import os

print("=" * 60)
print("VÉRIFICATION DES EXPORTS ML")
print("=" * 60)

# ── Vérifier les CSV générés ────────────────────────────
files = {
    'ML_ChurnPredictions.csv':   'Prédictions churn',
    'ML_Recommandations.csv':    'Recommandations produits',
}

for fname, label in files.items():
    if os.path.exists(fname):
        df = pd.read_csv(fname, sep=';')
        print(f"\n✓ {label}")
        print(f"  Fichier  : {fname}")
        print(f"  Lignes   : {len(df):,}")
        print(f"  Colonnes : {list(df.columns)}")
        print(f"  Aperçu :")
        print(df.head(3).to_string(index=False))
    else:
        print(f"\n✗ {fname} — non trouvé, relancer le modèle correspondant")

# ── Tables SQL Server à créer dans Power BI ─────────────
print("\n" + "=" * 60)
print("TABLES À CONNECTER DANS POWER BI")
print("=" * 60)
print("""
1. Ouvrir Power BI Desktop
2. Accueil → Obtenir les données → SQL Server
3. Serveur : ASUS\\LINAB
4. Base    : DWH_AttijariBI_Final
5. Sélectionner les tables :
   ☑ ML_ChurnPredictions   ← scores de churn par client
   ☑ ML_Recommandations    ← produits recommandés par client

6. Créer les relations :
   ML_ChurnPredictions[ClientSK]  → FACT_Client[ClientSK]
   ML_Recommandations[ClientSK]   → FACT_Client[ClientSK]

7. Mesures DAX à créer (Modélisation → Nouvelle mesure) :

   -- Dashboard Churn
   Clients Risque Élevé =
   CALCULATE(DISTINCTCOUNT(ML_ChurnPredictions[ClientSK]),
     ML_ChurnPredictions[Classe_Risque] IN {"Élevé","Critique"})

   Score Churn Moyen =
   AVERAGE(ML_ChurnPredictions[Score_Churn])

   % Portefeuille à Risque =
   DIVIDE([Clients Risque Élevé],
          DISTINCTCOUNT(ML_ChurnPredictions[ClientSK]))

   -- Dashboard Recommandations
   Clients Urgents Retention =
   CALCULATE(DISTINCTCOUNT(ML_Recommandations[ClientSK]),
     ML_Recommandations[Urgence_Retention]="OUI",
     ML_Recommandations[Rang]=1)

8. Visuels à créer :
   - KPI : Clients à risque élevé
   - KPI : Score churn moyen du portefeuille
   - KPI : % Portefeuille à risque
   - Bar chart : Score churn moyen par segment
   - Table : Top 20 clients à risque + produit recommandé
   - Jauge : Score churn vs objectif < 30%
""")
