"""
Attijari Decision Hub - recommendation model export.

This script scores active clients with the saved churn model and exports
product recommendations to CSV and SQL Server.
"""

from __future__ import annotations

import json
from pathlib import Path
import warnings

import joblib
import numpy as np
import pandas as pd
import pyodbc
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.metrics import average_precision_score, roc_auc_score
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

warnings.filterwarnings("ignore")


PROJECT_ROOT = Path(__file__).resolve().parent
MODEL_DIR = PROJECT_ROOT / "models"
DATABASE = "DWH_AttijariBI_Final"
SERVER_CANDIDATES = ["ASUS", r"ASUS\LINA", ".", r".\LINA"]
DRIVER_CANDIDATES = [
    "ODBC Driver 18 for SQL Server",
    "ODBC Driver 17 for SQL Server",
    "SQL Server",
]
ACTIVE_SERVER = None

DEFAULT_FEATURES = [
    "Age",
    "Anciennete_Annees",
    "Score_Credit",
    "GouvernoratID",
    "Solde_Compte",
    "Solde_Moyen_3mois",
    "Montant_Credit_Total",
    "Nb_Produits",
    "Nb_Credits_Actifs",
    "Nb_Produits_Resilies_12mois",
    "Nb_Transactions_Mois",
    "Montant_Transaction_Moyen",
    "Nb_Retraits_GAB_Mois",
    "Nb_Paiements_CB_Mois",
    "Taux_Utilisation_Decouvert",
    "Nb_Connexions_App_Mois",
    "Nb_Virements_En_Ligne_Mois",
    "Nb_Fonctionnalites_App_Utilisees",
    "Nb_Offres_Recues_12mois",
    "Nb_Offres_Acceptees_12mois",
    "Score_Satisfaction",
    "Nb_Reclamations_12mois",
    "SegmentID",
    "PackID",
    "Est_TRE",
    "A_Notifications_Push_Activees",
    "A_Reclamation",
    "A_Resilie_Produits",
    "Taux_Offres_Acceptees",
    "Score_Engagement",
    "Ratio_Solde",
    "Est_Zombie_Digital",
    "Score_Engagement_Norm",
    "Taux_Reclamations_Produits",
    "Est_En_Decouvert",
    "Delta_Solde_Negatif",
    "Nb_Produits_Norm",
    "Ratio_Digital_Total",
    "Score_Fidelite",
    "Satisfaction_Digital_Interaction",
    "Product_Satisfaction_Fit",
    "Engagement_Zombie_Penalty",
]

RECOMMENDATION_FEATURES = DEFAULT_FEATURES + ["Score_Churn"]

CLIENTS_QUERY = """
SELECT
    f.ClientSK,
    d.Nom,
    d.Prenom,
    d.Age,
    d.Score_Credit,
    d.Anciennete_Annees,
    CAST(d.Est_TRE AS INT) AS Est_TRE,
    d.GouvernoratID,
    g.Nom AS GouvernoratNom,
    f.SegmentID,
    s.NomSegment,
    f.PackID,
    f.Nb_Produits,
    f.Nb_Credits_Actifs,
    f.Solde_Compte,
    f.Solde_Moyen_3mois,
    f.Montant_Credit_Total,
    f.Nb_Transactions_Mois,
    f.Montant_Transaction_Moyen,
    f.Nb_Retraits_GAB_Mois,
    f.Nb_Paiements_CB_Mois,
    f.Taux_Utilisation_Decouvert,
    f.Nb_Connexions_App_Mois,
    f.Nb_Virements_En_Ligne_Mois,
    CAST(f.A_Notifications_Push_Activees AS INT) AS A_Notifications_Push_Activees,
    f.Nb_Fonctionnalites_App_Utilisees,
    f.Nb_Offres_Recues_12mois,
    f.Nb_Offres_Acceptees_12mois,
    f.Score_Satisfaction,
    f.Nb_Reclamations_12mois,
    CAST(f.A_Reclamation AS INT) AS A_Reclamation,
    CAST(f.Est_Client_Actif AS INT) AS Est_Client_Actif,
    CAST(f.A_Quitte AS INT) AS A_Quitte,
    f.Nb_Produits_Resilies_12mois
FROM FACT_Client f
JOIN DIM_Client d ON f.ClientSK = d.ClientSK
LEFT JOIN DIM_Gouvernorat g ON g.GouvernoratID = d.GouvernoratID
LEFT JOIN DIM_Segment s ON s.SegmentID = f.SegmentID
WHERE CAST(ISNULL(f.Est_Client_Actif, 0) AS INT) = 1
"""

PRODUCT_RULES = {
    "Carte Flex": {
        "segments": [1, 2],
        "score_min": 500,
        "condition": lambda row: row.get("Age", 99) <= 35 and row.get("Nb_Produits", 99) < 3,
    },
    "Credit Immobilier TSF": {
        "segments": [3, 4, 5],
        "score_min": 650,
        "condition": lambda row: (
            row.get("Score_Credit", 0) >= 650
            and row.get("Anciennete_Annees", 0) >= 2
            and row.get("Nb_Credits_Actifs", 99) == 0
        ),
    },
    "EER TSF": {
        "segments": [4, 5, 6],
        "score_min": 600,
        "condition": lambda row: (
            row.get("Solde_Moyen_3mois", 0) > 5000
            and row.get("Anciennete_Annees", 0) >= 3
        ),
    },
    "Credit Consommation": {
        "segments": [1, 2, 3],
        "score_min": 550,
        "condition": lambda row: (
            row.get("Score_Credit", 0) >= 550 and row.get("Nb_Credits_Actifs", 99) < 2
        ),
    },
    "Pack Digital Premium": {
        "segments": [1, 2, 3],
        "score_min": 0,
        "condition": lambda row: (
            row.get("Nb_Connexions_App_Mois", 0) >= 5
            and row.get("Nb_Fonctionnalites_App_Utilisees", 0) >= 3
        ),
    },
    "Assurance Vie": {
        "segments": [3, 4, 5],
        "score_min": 0,
        "condition": lambda row: (
            row.get("Anciennete_Annees", 0) >= 2 and row.get("Solde_Compte", 0) > 2000
        ),
    },
    "Carte Gold": {
        "segments": [5, 6],
        "score_min": 700,
        "condition": lambda row: (
            row.get("Score_Credit", 0) >= 700 and row.get("Solde_Moyen_3mois", 0) > 10000
        ),
    },
}


def available_drivers() -> list[str]:
    installed = set(pyodbc.drivers())
    return [driver for driver in DRIVER_CANDIDATES if driver in installed]


def get_connection() -> pyodbc.Connection:
    global ACTIVE_SERVER
    last_error = None
    for driver in available_drivers():
        for server in SERVER_CANDIDATES:
            try:
                security_options = (
                    ""
                    if driver == "SQL Server"
                    else "Encrypt=no;TrustServerCertificate=yes"
                )
                connection = pyodbc.connect(
                    (
                        f"DRIVER={{{driver}}};"
                        f"SERVER={server};"
                        f"DATABASE={DATABASE};"
                        "Trusted_Connection=yes;"
                        f"{security_options}"
                    ),
                    timeout=5,
                )
                ACTIVE_SERVER = server
                return connection
            except Exception as exc:
                last_error = exc

    raise RuntimeError(f"SQL Server connection failed: {last_error}")


def compute_derived_features(dataframe: pd.DataFrame) -> pd.DataFrame:
    derived = dataframe.copy()
    derived["A_Resilie_Produits"] = (
        derived["Nb_Produits_Resilies_12mois"].fillna(0) > 0
    ).astype(int)
    derived["Taux_Offres_Acceptees"] = np.where(
        derived["Nb_Offres_Recues_12mois"] > 0,
        derived["Nb_Offres_Acceptees_12mois"] / derived["Nb_Offres_Recues_12mois"],
        0,
    )
    derived["Score_Engagement"] = (
        derived["Nb_Connexions_App_Mois"].fillna(0) * 2
        + derived["Nb_Fonctionnalites_App_Utilisees"].fillna(0) * 3
        + derived["Nb_Paiements_CB_Mois"].fillna(0)
        + derived["A_Notifications_Push_Activees"].fillna(0) * 2
    )
    derived["Ratio_Solde"] = np.where(
        derived["Solde_Compte"].fillna(0) > 0,
        derived["Solde_Moyen_3mois"].fillna(0) / (derived["Solde_Compte"].fillna(0) + 1),
        0,
    )

    derived["Est_Zombie_Digital"] = (
        (derived["Nb_Transactions_Mois"].fillna(0) == 0)
        & (derived["Nb_Connexions_App_Mois"].fillna(0) == 0)
    ).astype(int)
    derived["Score_Engagement_Norm"] = (derived["Score_Engagement"] / 20.0).clip(0, 1)
    derived["Taux_Reclamations_Produits"] = (
        derived["Nb_Reclamations_12mois"].fillna(0)
        / (derived["Nb_Produits"].fillna(1).clip(lower=1) + 1)
    )
    derived["Est_En_Decouvert"] = (
        derived["Taux_Utilisation_Decouvert"].fillna(0) > 0.7
    ).astype(int)
    derived["Delta_Solde_Negatif"] = np.where(
        derived["Solde_Moyen_3mois"].fillna(0) < derived["Solde_Compte"].fillna(0) * 0.9,
        1,
        0,
    )
    derived["Nb_Produits_Norm"] = (derived["Nb_Produits"].fillna(0) / 6.0).clip(0, 1)
    total_tx = (
        derived["Nb_Transactions_Mois"].fillna(0)
        + derived["Nb_Connexions_App_Mois"].fillna(0)
        + 1
    )
    derived["Ratio_Digital_Total"] = derived["Nb_Connexions_App_Mois"].fillna(0) / total_tx
    derived["Score_Fidelite"] = (
        (derived["Anciennete_Annees"].fillna(0) / 20.0).clip(0, 1)
        * (1 - (derived["Nb_Reclamations_12mois"].fillna(0) / 10.0).clip(0, 1))
    )
    return derived


def add_interaction_features(dataframe: pd.DataFrame) -> pd.DataFrame:
    derived = dataframe.copy()
    sat_norm = (derived["Score_Satisfaction"].fillna(3) / 5.0).clip(0, 1)
    eng_norm = derived["Score_Engagement_Norm"].fillna(0)

    derived["Satisfaction_Digital_Interaction"] = sat_norm * eng_norm
    derived["Product_Satisfaction_Fit"] = derived["Nb_Produits_Norm"].fillna(0) * sat_norm
    derived["Engagement_Zombie_Penalty"] = eng_norm * (
        1 - derived["Est_Zombie_Digital"].fillna(0)
    )
    return derived


def load_active_clients() -> pd.DataFrame:
    connection = get_connection()
    try:
        dataframe = pd.read_sql_query(CLIENTS_QUERY, connection)
    finally:
        connection.close()

    if dataframe.empty:
        raise RuntimeError("No active clients were returned from SQL Server.")

    return add_interaction_features(compute_derived_features(dataframe))


def classify_risk(probability_percent: float) -> str:
    if probability_percent < 30:
        return "Faible"
    if probability_percent < 50:
        return "Modere"
    if probability_percent < 70:
        return "Eleve"
    return "Critique"


def load_runtime_artifacts():
    model = joblib.load(MODEL_DIR / "churn_model.pkl")
    scaler = joblib.load(MODEL_DIR / "scaler.pkl")
    runtime_features = list(getattr(scaler, "feature_names_in_", [])) or DEFAULT_FEATURES
    runtime_feature_medians = {}

    metadata_path = MODEL_DIR / "model_metadata.json"
    if metadata_path.exists():
        with open(metadata_path, "r", encoding="utf-8") as metadata_file:
            metadata = json.load(metadata_file)
        runtime_features = metadata.get("features") or runtime_features
        runtime_feature_medians = metadata.get("feature_medians") or {}

    return model, scaler, runtime_features, runtime_feature_medians


def score_active_clients(
    dataframe: pd.DataFrame,
    model,
    scaler,
    runtime_features: list[str],
    runtime_feature_medians: dict,
) -> pd.DataFrame:
    features_frame = dataframe.reindex(columns=runtime_features).apply(
        pd.to_numeric,
        errors="coerce",
    )
    if runtime_feature_medians:
        features_frame = features_frame.fillna(pd.Series(runtime_feature_medians))
    else:
        features_frame = features_frame.fillna(features_frame.median(numeric_only=True))
    features_frame = features_frame.fillna(0)
    probabilities = model.predict_proba(scaler.transform(features_frame))[:, 1] * 100
    scored = dataframe.copy()
    scored["Score_Churn"] = np.round(probabilities, 1)
    scored["Classe_Risque"] = scored["Score_Churn"].apply(classify_risk)
    return scored


def score_product_propensity(client_row: dict, product_rule: dict) -> float:
    try:
        if not product_rule["condition"](client_row):
            return 0.0
    except Exception:
        return 0.0

    score = 40.0
    credit_score = float(client_row.get("Score_Credit", 500) or 500)
    score += min(20, max(0, (credit_score - product_rule["score_min"]) / 10))

    if int(client_row.get("SegmentID", 0) or 0) in product_rule["segments"]:
        score += 10

    app_connections = float(client_row.get("Nb_Connexions_App_Mois", 0) or 0)
    score += min(10, app_connections * 0.5)

    offers_received = float(client_row.get("Nb_Offres_Recues_12mois", 0) or 0)
    offers_accepted = float(client_row.get("Nb_Offres_Acceptees_12mois", 0) or 0)
    if offers_received > 0:
        score += (offers_accepted / offers_received) * 10

    churn_score = float(client_row.get("Score_Churn", 0) or 0)
    if churn_score >= 50:
        score += 10

    seniority = float(client_row.get("Anciennete_Annees", 0) or 0)
    complaints = float(client_row.get("Nb_Reclamations_12mois", 0) or 0)
    score += min(5, seniority * 0.5)
    score -= min(5, complaints * 1.5)

    return round(max(0, min(100, score)), 1)


def build_training_labels(scored_dataframe: pd.DataFrame) -> pd.DataFrame:
    """Build weak supervised labels from business outcomes available in the DWH.

    The project does not currently store historical product offer responses per
    client. These labels therefore act as weak supervision: they transform the
    banking eligibility and retention rules into a training target, then the ML
    models learn a smoother propensity boundary from client behavior.
    """
    label_frame = pd.DataFrame(index=scored_dataframe.index)

    for product_name, product_rule in PRODUCT_RULES.items():
        label_frame[product_name] = scored_dataframe.apply(
            lambda row: int(score_product_propensity(row.to_dict(), product_rule) >= 55),
            axis=1,
        )

    return label_frame


def fit_product_model(features_frame: pd.DataFrame, labels: pd.Series):
    if labels.nunique() < 2:
        model = DummyClassifier(strategy="constant", constant=int(labels.iloc[0]))
        model.fit(features_frame, labels)
        return model, {
            "model": "DummyClassifier",
            "auc": None,
            "average_precision": None,
            "positive_rate": round(float(labels.mean()), 4),
            "warning": "Single-class target generated for this product.",
        }

    X_train, X_test, y_train, y_test = train_test_split(
        features_frame,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )
    candidates = {
        "GradientBoostingClassifier": GradientBoostingClassifier(
            n_estimators=180,
            learning_rate=0.05,
            max_depth=3,
            random_state=42,
        ),
        "RandomForestClassifier": RandomForestClassifier(
            n_estimators=220,
            max_depth=10,
            min_samples_leaf=8,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        ),
    }
    results = {}

    for model_name, model in candidates.items():
        model.fit(X_train, y_train)
        probabilities = model.predict_proba(X_test)[:, 1]
        try:
            auc = roc_auc_score(y_test, probabilities)
        except ValueError:
            auc = 0.5
        results[model_name] = {
            "model": model,
            "auc": auc,
            "average_precision": average_precision_score(y_test, probabilities),
        }

    best_name = max(results, key=lambda name: results[name]["auc"])
    best_result = results[best_name]

    return best_result["model"], {
        "model": best_name,
        "auc": round(float(best_result["auc"]), 4),
        "average_precision": round(float(best_result["average_precision"]), 4),
        "positive_rate": round(float(labels.mean()), 4),
        "warning": "",
    }


def train_recommendation_models(scored_dataframe: pd.DataFrame):
    labels = build_training_labels(scored_dataframe)
    feature_medians = scored_dataframe[RECOMMENDATION_FEATURES].median(numeric_only=True)
    features_frame = scored_dataframe[RECOMMENDATION_FEATURES].fillna(feature_medians).fillna(0)

    scaler = StandardScaler()
    scaled_features = pd.DataFrame(
        scaler.fit_transform(features_frame),
        columns=RECOMMENDATION_FEATURES,
        index=features_frame.index,
    )

    models = {}
    metrics = {}
    for product_name in PRODUCT_RULES:
        model, model_metrics = fit_product_model(scaled_features, labels[product_name].astype(int))
        models[product_name] = model
        metrics[product_name] = model_metrics

    metadata = {
        "approach": "weakly_supervised_product_propensity",
        "label_source": "business_eligibility_rules_until_offer_response_history_is_available",
        "feature_count": len(RECOMMENDATION_FEATURES),
        "features": RECOMMENDATION_FEATURES,
        "product_names": list(PRODUCT_RULES.keys()),
        "feature_medians": {key: float(value) for key, value in feature_medians.items()},
        "metrics": metrics,
    }
    return models, scaler, metadata


def score_products_with_models(
    scored_dataframe: pd.DataFrame,
    product_models: dict,
    recommendation_scaler: StandardScaler,
    metadata: dict,
) -> pd.DataFrame:
    features = metadata.get("features") or RECOMMENDATION_FEATURES
    medians = metadata.get("feature_medians") or {}
    feature_frame = scored_dataframe.reindex(columns=features).apply(pd.to_numeric, errors="coerce")
    feature_frame = feature_frame.fillna(pd.Series(medians)).fillna(0)
    scaled_features = pd.DataFrame(
        recommendation_scaler.transform(feature_frame),
        columns=features,
        index=scored_dataframe.index,
    )

    rows = []
    for index, row in scored_dataframe.iterrows():
        product_scores = []
        one_row = scaled_features.loc[[index]]

        for product_name, model in product_models.items():
            probability = float(model.predict_proba(one_row)[0, 1]) * 100
            if probability >= 10:
                product_scores.append((product_name, round(probability, 1)))

        full_name = f"{str(row.get('Prenom') or '').strip()} {str(row.get('Nom') or '').strip()}".strip()
        if not full_name:
            full_name = f"Client {int(row['ClientSK'])}"

        for rank, (product_name, propensity) in enumerate(
            sorted(product_scores, key=lambda item: item[1], reverse=True)[:3],
            start=1,
        ):
            rows.append(
                {
                    "ClientSK": int(row["ClientSK"]),
                    "Nom_Complet": full_name,
                    "Segment": str(row.get("NomSegment") or "Particulier"),
                    "Gouvernorat": str(row.get("GouvernoratNom") or "Non renseigne"),
                    "Rang": rank,
                    "Produit_Recommande": product_name,
                    "Score_Propension": propensity,
                    "Score_Churn": round(float(row.get("Score_Churn", 0) or 0), 1),
                    "Classe_Risque_Churn": str(row.get("Classe_Risque") or "Faible"),
                    "Urgence_Retention": "OUI"
                    if float(row.get("Score_Churn", 0) or 0) >= 50
                    else "NON",
                    "Date_Calcul": pd.Timestamp.today().strftime("%Y-%m-%d"),
                    "Modele": "ProductPropensityML",
                }
            )

    return pd.DataFrame(rows)


def build_recommendations(scored_dataframe: pd.DataFrame, product_models, recommendation_scaler, metadata) -> pd.DataFrame:
    return score_products_with_models(
        scored_dataframe,
        product_models,
        recommendation_scaler,
        metadata,
    )


def build_rule_based_recommendations(scored_dataframe: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for _, row in scored_dataframe.iterrows():
        client = row.to_dict()
        product_scores = []
        for product_name, product_rule in PRODUCT_RULES.items():
            propensity = score_product_propensity(client, product_rule)
            if propensity > 0:
                product_scores.append((product_name, propensity))

        full_name = f"{str(row.get('Prenom') or '').strip()} {str(row.get('Nom') or '').strip()}".strip()
        if not full_name:
            full_name = f"Client {int(row['ClientSK'])}"

        for rank, (product_name, propensity) in enumerate(
            sorted(product_scores, key=lambda item: item[1], reverse=True)[:3],
            start=1,
        ):
            rows.append(
                {
                    "ClientSK": int(row["ClientSK"]),
                    "Nom_Complet": full_name,
                    "Segment": str(row.get("NomSegment") or "Particulier"),
                    "Gouvernorat": str(row.get("GouvernoratNom") or "Non renseigne"),
                    "Rang": rank,
                    "Produit_Recommande": product_name,
                    "Score_Propension": propensity,
                    "Score_Churn": round(float(row.get("Score_Churn", 0) or 0), 1),
                    "Classe_Risque_Churn": str(row.get("Classe_Risque") or "Faible"),
                    "Urgence_Retention": "OUI"
                    if float(row.get("Score_Churn", 0) or 0) >= 50
                    else "NON",
                    "Date_Calcul": pd.Timestamp.today().strftime("%Y-%m-%d"),
                    "Modele": "RuleBaseline",
                }
            )

    return pd.DataFrame(rows)


def export_recommendations(recommendations_dataframe: pd.DataFrame) -> None:
    recommendations_dataframe.to_csv(
        PROJECT_ROOT / "ML_Recommandations.csv",
        index=False,
        sep=";",
        encoding="utf-8-sig",
    )

    try:
        from sqlalchemy import create_engine

        engine = create_engine(
            f"mssql+pyodbc://{ACTIVE_SERVER or 'ASUS'}/{DATABASE}"
            "?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes"
        )
        recommendations_dataframe.to_sql(
            "ML_Recommandations",
            engine,
            schema="dbo",
            if_exists="replace",
            index=False,
        )
    except Exception as exc:
        print(f"[warn] SQL export skipped: {exc}")


def save_recommendation_artifacts(product_models, recommendation_scaler, metadata: dict) -> None:
    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump(product_models, MODEL_DIR / "recommendation_models.pkl")
    joblib.dump(recommendation_scaler, MODEL_DIR / "recommendation_scaler.pkl")
    with open(MODEL_DIR / "recommendation_metadata.json", "w", encoding="utf-8") as metadata_file:
        json.dump(metadata, metadata_file, ensure_ascii=False, indent=2)


def main():
    print("=" * 72)
    print("ATTIJARI DECISION HUB - RECOMMENDATION MODEL")
    print("=" * 72)
    print("[1/4] Loading active clients...")
    active_clients = load_active_clients()
    print(f"  Active clients loaded : {len(active_clients):,}")

    print("[2/4] Loading churn runtime artifacts...")
    model, scaler, runtime_features, runtime_feature_medians = load_runtime_artifacts()
    scored_clients = score_active_clients(
        active_clients,
        model,
        scaler,
        runtime_features,
        runtime_feature_medians,
    )
    print(
        f"  Average churn score   : {scored_clients['Score_Churn'].mean():.1f}%"
    )

    print("[3/5] Training product propensity models...")
    product_models, recommendation_scaler, recommendation_metadata = train_recommendation_models(
        scored_clients,
    )
    for product_name, metrics in recommendation_metadata["metrics"].items():
        auc_label = "n/a" if metrics["auc"] is None else f"{metrics['auc']:.4f}"
        print(
            f"    - {product_name}: model={metrics['model']} auc={auc_label} "
            f"positive_rate={metrics['positive_rate']:.1%}"
        )

    print("[4/5] Building ML product recommendations...")
    recommendations = build_recommendations(
        scored_clients,
        product_models,
        recommendation_scaler,
        recommendation_metadata,
    )
    print(f"  Recommendation rows   : {len(recommendations):,}")
    if not recommendations.empty:
        top_products = recommendations[recommendations["Rang"] == 1]["Produit_Recommande"].value_counts()
        for product_name, client_count in top_products.head(5).items():
            print(f"    - {product_name}: {client_count:,} clients")

    print("[5/5] Exporting ML_Recommandations and model artifacts...")
    export_recommendations(recommendations)
    save_recommendation_artifacts(product_models, recommendation_scaler, recommendation_metadata)
    print(
        "  Files written        : ML_Recommandations.csv, "
        "models/recommendation_models.pkl, models/recommendation_scaler.pkl"
    )
    print("=" * 72)
    print("DONE")
    print("=" * 72)


if __name__ == "__main__":
    main()
