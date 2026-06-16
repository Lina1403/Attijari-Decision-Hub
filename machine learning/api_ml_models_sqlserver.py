"""
================================================
API Flask — Modèles ML Churn & Recommandation
Données depuis SQL Server ASUS
================================================
Lancer avec : python api_ml_models_sqlserver.py
"""
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import pandas as pd
import numpy as np
import pyodbc
from datetime import datetime, timedelta
import logging

# Configuration
app = Flask(__name__)
CORS(app)
logging.basicConfig(level=logging.INFO)

# SQL Server Configuration
SERVER = 'ASUS'
DATABASE = 'DWH_AttijariBI_Final'
DRIVER = 'ODBC Driver 17 for SQL Server'
CONN_STRING = f'DRIVER={DRIVER};SERVER={SERVER};DATABASE={DATABASE};Trusted_Connection=yes'

# Charger les modèles ML
try:
    churn_model = joblib.load('models/churn_model.pkl')
    scaler = joblib.load('models/scaler.pkl')
    print("✓ Modèles chargés avec succès")
except Exception as e:
    print(f"✗ Erreur chargement modèles: {e}")
    churn_model = None
    scaler = None

# ════════════════════════════════════════════════════════
# Fonctions connexion SQL Server
# ════════════════════════════════════════════════════════
def get_connection():
    """Créer une connexion SQL Server"""
    return pyodbc.connect(CONN_STRING)

def execute_query(query):
    """Exécuter une requête et retourner un DataFrame"""
    try:
        conn = get_connection()
        df = pd.read_sql(query, conn)
        conn.close()
        return df
    except Exception as e:
        print(f"Erreur SQL: {e}")
        return None

def load_clients_data():
    """Charger les données clients avec features ML"""
    query = """
    SELECT 
        dc.ClientSK,
        dc.ID_Client,
        dc.Age,
        dc.GouvernoratID,
        dc.Score_Credit,
        dc.Est_TRE,
        DATEDIFF(YEAR, dc.Date_Entree_Relation, GETDATE()) as Anciennete_Annees,
        fc.SegmentID,
        fc.PackID,
        fc.MotifDepartID,
        fc.Solde_Compte,
        fc.Solde_Moyen_3mois,
        fc.Montant_Credit_Total,
        fc.Nb_Produits,
        fc.Nb_Credits_Actifs,
        fc.Nb_Produits_Resilies_12mois,
        fc.Nb_Transactions_Mois,
        fc.Montant_Transaction_Moyen,
        fc.Nb_Retraits_GAB_Mois,
        fc.Nb_Paiements_CB_Mois,
        fc.Taux_Utilisation_Decouvert,
        fc.Nb_Connexions_App_Mois,
        fc.Nb_Virements_En_Ligne_Mois,
        fc.Nb_Fonctionnalites_App_Utilisees,
        fc.Nb_Offres_Recues_12mois,
        fc.Nb_Offres_Acceptees_12mois,
        fc.Score_Satisfaction,
        fc.Nb_Reclamations_12mois,
        fc.A_Notifications_Push_Activees,
        fc.A_Reclamation,
        fc.A_Resilie_Produits,
        CASE WHEN fc.Nb_Offres_Recues_12mois > 0 
             THEN CAST(fc.Nb_Offres_Acceptees_12mois AS FLOAT) / fc.Nb_Offres_Recues_12mois 
             ELSE 0 END as Taux_Offres_Acceptees,
        fc.Score_Engagement,
        CASE WHEN fc.Solde_Compte > 0 
             THEN CAST(fc.Montant_Credit_Total AS FLOAT) / fc.Solde_Compte 
             ELSE 0 END as Ratio_Solde
    FROM DIM_Client dc
    LEFT JOIN FACT_Client fc ON dc.ClientSK = fc.ClientSK
    WHERE fc.ClientSK IS NOT NULL
    ORDER BY dc.ClientSK
    """
    
    df = execute_query(query)
    if df is None or len(df) == 0:
        print("⚠ Pas de données clients trouvées")
        return None
    
    # Remplacer les NULL par la moyenne
    for col in df.columns:
        if df[col].dtype in ['float64', 'int64']:
            df[col].fillna(df[col].mean(), inplace=True)
    
    print(f"✓ {len(df)} clients chargés depuis SQL Server")
    return df

def predict_churn_batch(df_clients):
    """Prédire churn pour tous les clients"""
    if churn_model is None or len(df_clients) == 0:
        return None
    
    FEATURES = [
        'Age', 'Anciennete_Annees', 'Score_Credit', 'GouvernoratID',
        'Solde_Compte', 'Solde_Moyen_3mois', 'Montant_Credit_Total',
        'Nb_Produits', 'Nb_Credits_Actifs', 'Nb_Produits_Resilies_12mois',
        'Nb_Transactions_Mois', 'Montant_Transaction_Moyen',
        'Nb_Retraits_GAB_Mois', 'Nb_Paiements_CB_Mois',
        'Taux_Utilisation_Decouvert',
        'Nb_Connexions_App_Mois', 'Nb_Virements_En_Ligne_Mois',
        'Nb_Fonctionnalites_App_Utilisees',
        'Nb_Offres_Recues_12mois', 'Nb_Offres_Acceptees_12mois',
        'Score_Satisfaction', 'Nb_Reclamations_12mois',
        'SegmentID', 'PackID', 'Est_TRE',
        'A_Notifications_Push_Activees', 'A_Reclamation', 'A_Resilie_Produits',
        'Taux_Offres_Acceptees', 'Score_Engagement', 'Ratio_Solde',
    ]
    
    # Préparer les features
    X = df_clients[FEATURES].fillna(0).values
    X_scaled = scaler.transform(X)
    
    # Prédire
    predictions = churn_model.predict_proba(X_scaled)[:, 1] * 100
    
    # Ajouter au dataframe
    df_clients['Score_Churn'] = predictions
    
    # Classer
    def classify_risk(score):
        if score < 30:
            return 'Faible'
        elif score < 50:
            return 'Modéré'
        elif score < 70:
            return 'Élevé'
        else:
            return 'Critique'
    
    df_clients['Classe_Risque'] = df_clients['Score_Churn'].apply(classify_risk)
    
    return df_clients

# ════════════════════════════════════════════════════════
# Endpoints
# ════════════════════════════════════════════════════════

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check"""
    try:
        conn = get_connection()
        conn.close()
        sql_ok = True
    except:
        sql_ok = False
    
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'models_loaded': churn_model is not None,
        'sql_server': sql_ok
    })

@app.route('/api/load-data', methods=['POST'])
def load_data():
    """Charger et prédire les données clients depuis SQL Server"""
    try:
        print("\n📥 Chargement données depuis SQL Server...")
        
        # Charger les clients
        df_clients = load_clients_data()
        if df_clients is None or len(df_clients) == 0:
            return jsonify({'error': 'Aucun client trouvé'}), 404
        
        # Prédire churn
        df_predictions = predict_churn_batch(df_clients)
        
        # Sauvegarder
        df_predictions.to_csv('../ML_ChurnPredictions_SQL.csv', sep=';', index=False)
        print("✓ Prédictions sauvegardées: ML_ChurnPredictions_SQL.csv")
        
        # Retourner les stats
        return jsonify({
            'success': True,
            'total_clients': len(df_predictions),
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/dashboard-churn', methods=['GET'])
def dashboard_churn():
    """Retourner les stats churn depuis SQL Server"""
    try:
        df_clients = load_clients_data()
        if df_clients is None:
            return jsonify({'error': 'Données non disponibles'}), 404
        
        df_predictions = predict_churn_batch(df_clients)
        
        total_clients = len(df_predictions)
        faible = (df_predictions['Classe_Risque'] == 'Faible').sum()
        modere = (df_predictions['Classe_Risque'] == 'Modéré').sum()
        eleve = (df_predictions['Classe_Risque'] == 'Élevé').sum()
        critique = (df_predictions['Classe_Risque'] == 'Critique').sum()
        
        return jsonify({
            'total_clients': int(total_clients),
            'distribution': {
                'Faible': int(faible),
                'Modéré': int(modere),
                'Élevé': int(eleve),
                'Critique': int(critique)
            },
            'score_churn_moyen': float(df_predictions['Score_Churn'].mean()),
            'clients_a_risque': int(eleve + critique),
            'pourcentage_risque': float((eleve + critique) / total_clients * 100),
            'timestamp': datetime.now().isoformat()
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/top-at-risk', methods=['GET'])
def top_at_risk():
    """Top clients à risque"""
    try:
        limit = request.args.get('limit', 10, type=int)
        
        df_clients = load_clients_data()
        if df_clients is None:
            return jsonify({'error': 'Données non disponibles'}), 404
        
        df_predictions = predict_churn_batch(df_clients)
        top = df_predictions.nlargest(limit, 'Score_Churn')[[
            'ClientSK', 'Score_Churn', 'Classe_Risque'
        ]].to_dict('records')
        
        return jsonify({
            'success': True,
            'count': len(top),
            'clients': [
                {
                    'ClientSK': int(c['ClientSK']),
                    'Score_Churn': float(c['Score_Churn']),
                    'Classe_Risque': c['Classe_Risque']
                }
                for c in top
            ]
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/predict-churn', methods=['POST'])
def predict_churn():
    """Prédire churn pour un client"""
    try:
        if churn_model is None:
            return jsonify({'error': 'Modèle non chargé'}), 500
        
        data = request.json
        client_sk = data.get('ClientSK')
        
        if client_sk:
            # Charger les données du client
            query = f"""
            SELECT 
                dc.ClientSK,
                dc.Age,
                dc.GouvernoratID,
                dc.Score_Credit,
                dc.Est_TRE,
                DATEDIFF(YEAR, dc.Date_Entree_Relation, GETDATE()) as Anciennete_Annees,
                fc.SegmentID,
                fc.PackID,
                fc.Solde_Compte,
                fc.Solde_Moyen_3mois,
                fc.Montant_Credit_Total,
                fc.Nb_Produits,
                fc.Nb_Credits_Actifs,
                fc.Nb_Produits_Resilies_12mois,
                fc.Nb_Transactions_Mois,
                fc.Montant_Transaction_Moyen,
                fc.Nb_Retraits_GAB_Mois,
                fc.Nb_Paiements_CB_Mois,
                fc.Taux_Utilisation_Decouvert,
                fc.Nb_Connexions_App_Mois,
                fc.Nb_Virements_En_Ligne_Mois,
                fc.Nb_Fonctionnalites_App_Utilisees,
                fc.Nb_Offres_Recues_12mois,
                fc.Nb_Offres_Acceptees_12mois,
                fc.Score_Satisfaction,
                fc.Nb_Reclamations_12mois,
                fc.A_Notifications_Push_Activees,
                fc.A_Reclamation,
                fc.A_Resilie_Produits,
                CASE WHEN fc.Nb_Offres_Recues_12mois > 0 
                     THEN CAST(fc.Nb_Offres_Acceptees_12mois AS FLOAT) / fc.Nb_Offres_Recues_12mois 
                     ELSE 0 END as Taux_Offres_Acceptees,
                fc.Score_Engagement,
                CASE WHEN fc.Solde_Compte > 0 
                     THEN CAST(fc.Montant_Credit_Total AS FLOAT) / fc.Solde_Compte 
                     ELSE 0 END as Ratio_Solde
            FROM DIM_Client dc
            LEFT JOIN FACT_Client fc ON dc.ClientSK = fc.ClientSK
            WHERE dc.ClientSK = {client_sk}
            """
            
            df_client = execute_query(query)
            if df_client is None or len(df_client) == 0:
                return jsonify({'error': f'Client {client_sk} non trouvé'}), 404
            
            # Prédire
            df_pred = predict_churn_batch(df_client)
            result = df_pred.iloc[0]
            
            return jsonify({
                'success': True,
                'ClientSK': int(result['ClientSK']),
                'Score_Churn': float(result['Score_Churn']),
                'Classe_Risque': result['Classe_Risque'],
                'Age': int(result['Age']),
                'Score_Satisfaction': int(result['Score_Satisfaction']),
                'Nb_Produits': int(result['Nb_Produits']),
                'Solde_Compte': float(result['Solde_Compte'])
            })
        
        return jsonify({'error': 'ClientSK requis'}), 400
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/simulate-churn', methods=['POST'])
def simulate_churn():
    """Simuler churn avec what-if analysis"""
    try:
        if churn_model is None:
            return jsonify({'error': 'Modèle non chargé'}), 500
        
        data = request.json
        base_profile = data.get('base_profile', {})
        changes = data.get('changes', {})
        
        FEATURES = [
            'Age', 'Anciennete_Annees', 'Score_Credit', 'GouvernoratID',
            'Solde_Compte', 'Solde_Moyen_3mois', 'Montant_Credit_Total',
            'Nb_Produits', 'Nb_Credits_Actifs', 'Nb_Produits_Resilies_12mois',
            'Nb_Transactions_Mois', 'Montant_Transaction_Moyen',
            'Nb_Retraits_GAB_Mois', 'Nb_Paiements_CB_Mois',
            'Taux_Utilisation_Decouvert',
            'Nb_Connexions_App_Mois', 'Nb_Virements_En_Ligne_Mois',
            'Nb_Fonctionnalites_App_Utilisees',
            'Nb_Offres_Recues_12mois', 'Nb_Offres_Acceptees_12mois',
            'Score_Satisfaction', 'Nb_Reclamations_12mois',
            'SegmentID', 'PackID', 'Est_TRE',
            'A_Notifications_Push_Activees', 'A_Reclamation', 'A_Resilie_Produits',
            'Taux_Offres_Acceptees', 'Score_Engagement', 'Ratio_Solde',
        ]
        
        # Avant
        base_values = [base_profile.get(feat, 0) for feat in FEATURES]
        X_base = np.array([base_values])
        X_base_scaled = scaler.transform(X_base)
        score_before = float(churn_model.predict_proba(X_base_scaled)[0, 1]) * 100
        
        # Après
        modified_values = base_values.copy()
        for feat, val in changes.items():
            if feat in FEATURES:
                idx = FEATURES.index(feat)
                modified_values[idx] = val
        
        X_after = np.array([modified_values])
        X_after_scaled = scaler.transform(X_after)
        score_after = float(churn_model.predict_proba(X_after_scaled)[0, 1]) * 100
        
        impact = score_before - score_after
        
        return jsonify({
            'success': True,
            'score_before': round(score_before, 1),
            'score_after': round(score_after, 1),
            'impact': round(impact, 1),
            'impact_percentage': round(impact / score_before * 100, 1) if score_before > 0 else 0
        })
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("\n" + "="*60)
    print("API ML — Démarrage sur http://localhost:5000")
    print("Base de données : SQL Server ASUS")
    print("="*60)
    print("\nEndpoints disponibles:")
    print("  GET  /api/health")
    print("  POST /api/load-data")
    print("  GET  /api/dashboard-churn")
    print("  GET  /api/top-at-risk")
    print("  POST /api/predict-churn")
    print("  POST /api/simulate-churn")
    print("="*60 + "\n")
    app.run(debug=True, port=5000, threaded=True)
