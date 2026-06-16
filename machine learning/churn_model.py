"""
Attijari Decision Hub - training and export for churn prediction.

This script trains a churn model from SQL Server data and exports
live scores for active clients only.

If historical multi-snapshot data is available, the script derives a
true horizon target ("will churn within N days"). If not, it falls back
to the currently observable churn state and records that limitation in
the model metadata.
"""

from __future__ import annotations

from pathlib import Path
import json
import warnings

import joblib
import numpy as np
import pandas as pd
import pyodbc
from sklearn.ensemble import GradientBoostingClassifier, RandomForestClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
)
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

try:
    from xgboost import XGBClassifier
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

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
TARGET_HORIZON_DAYS = 90
ACTIVE_SERVER = None

FEATURES = [
    # Raw client attributes
    "Age",
    "Anciennete_Annees",
    "Score_Credit",
    "GouvernoratID",
    # Financial
    "Solde_Compte",
    "Solde_Moyen_3mois",
    "Montant_Credit_Total",
    "Nb_Produits",
    "Nb_Credits_Actifs",
    "Nb_Produits_Resilies_12mois",
    # Transactions
    "Nb_Transactions_Mois",
    "Montant_Transaction_Moyen",
    "Nb_Retraits_GAB_Mois",
    "Nb_Paiements_CB_Mois",
    "Taux_Utilisation_Decouvert",
    # Digital activity
    "Nb_Connexions_App_Mois",
    "Nb_Virements_En_Ligne_Mois",
    "Nb_Fonctionnalites_App_Utilisees",
    # Marketing
    "Nb_Offres_Recues_12mois",
    "Nb_Offres_Acceptees_12mois",
    # Satisfaction & complaints
    "Score_Satisfaction",
    "Nb_Reclamations_12mois",
    # Categorical / binary
    "SegmentID",
    "PackID",
    "Est_TRE",
    "A_Notifications_Push_Activees",
    "A_Reclamation",
    # Derived — engagement & product
    "A_Resilie_Produits",
    "Taux_Offres_Acceptees",
    "Score_Engagement",
    "Ratio_Solde",
    # Derived — behavioral signals
    "Est_Zombie_Digital",
    "Score_Engagement_Norm",
    "Taux_Reclamations_Produits",
    "Est_En_Decouvert",
    "Delta_Solde_Negatif",
    "Nb_Produits_Norm",
    "Ratio_Digital_Total",
    "Score_Fidelite",
    # Interaction features (amplify simulator sensitivity)
    "Satisfaction_Digital_Interaction",
    "Product_Satisfaction_Fit",
    "Engagement_Zombie_Penalty",
]

BASE_QUERY = """
SELECT
    f.ClientSK,
    f.TempID,
    t.DateComplete,
    f.Solde_Compte,
    f.Nb_Produits,
    f.Nb_Credits_Actifs,
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
    f.Solde_Moyen_3mois,
    f.Montant_Credit_Total,
    f.Nb_Produits_Resilies_12mois,
    f.SegmentID,
    f.PackID,
    d.Age,
    d.Score_Credit,
    d.Anciennete_Annees,
    CAST(d.Est_TRE AS INT) AS Est_TRE,
    d.GouvernoratID
FROM FACT_Client f
JOIN DIM_Client d ON f.ClientSK = d.ClientSK
LEFT JOIN DIM_Temps t ON t.TempsID = f.TempID
"""


def available_drivers() -> list[str]:
    installed = set(pyodbc.drivers())
    return [driver for driver in DRIVER_CANDIDATES if driver in installed]


def get_connection() -> pyodbc.Connection:
    global ACTIVE_SERVER
    last_error = None
    for driver in available_drivers():
        for server in SERVER_CANDIDATES:
            try:
                connection = pyodbc.connect(
                    (
                        f"DRIVER={{{driver}}};"
                        f"SERVER={server};"
                        f"DATABASE={DATABASE};"
                        "Trusted_Connection=yes;"
                        "Encrypt=no;"
                        "TrustServerCertificate=yes"
                    ),
                    timeout=5,
                )
                ACTIVE_SERVER = server
                return connection
            except Exception as exc:  # pragma: no cover - connectivity branch
                last_error = exc

    raise RuntimeError(f"SQL Server connection failed: {last_error}")


def load_dataset() -> pd.DataFrame:
    connection = get_connection()
    try:
        dataframe = pd.read_sql_query(BASE_QUERY, connection)
    finally:
        connection.close()

    if dataframe.empty:
        raise RuntimeError("No client data was returned from SQL Server.")

    dataframe["DateComplete"] = pd.to_datetime(dataframe["DateComplete"], errors="coerce")
    return dataframe


def compute_derived_features(dataframe: pd.DataFrame) -> pd.DataFrame:
    derived = dataframe.copy()

    # --- Original 4 derived features ---
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

    # --- New behavioral features ---
    # Client with zero transactions AND zero app logins: highest churn risk signal
    derived["Est_Zombie_Digital"] = (
        (derived["Nb_Transactions_Mois"].fillna(0) == 0)
        & (derived["Nb_Connexions_App_Mois"].fillna(0) == 0)
    ).astype(int)

    # Normalized engagement score (0–1) needed for interaction features
    derived["Score_Engagement_Norm"] = (derived["Score_Engagement"] / 20.0).clip(0, 1)

    # Complaint density relative to product portfolio (more complaints per product = more friction)
    derived["Taux_Reclamations_Produits"] = (
        derived["Nb_Reclamations_12mois"].fillna(0)
        / (derived["Nb_Produits"].fillna(1).clip(lower=1) + 1)
    )

    # Financial stress: heavy overdraft usage
    derived["Est_En_Decouvert"] = (
        derived["Taux_Utilisation_Decouvert"].fillna(0) > 0.7
    ).astype(int)

    # Declining balance: 3-month average below current balance signals withdrawals
    derived["Delta_Solde_Negatif"] = np.where(
        derived["Solde_Moyen_3mois"].fillna(0) < derived["Solde_Compte"].fillna(0) * 0.9,
        1,
        0,
    )

    # Normalized product depth (0–1, capped at 6 products)
    derived["Nb_Produits_Norm"] = (derived["Nb_Produits"].fillna(0) / 6.0).clip(0, 1)

    # Digital engagement share: proportion of digital vs total activity
    total_tx = (
        derived["Nb_Transactions_Mois"].fillna(0)
        + derived["Nb_Connexions_App_Mois"].fillna(0)
        + 1
    )
    derived["Ratio_Digital_Total"] = derived["Nb_Connexions_App_Mois"].fillna(0) / total_tx

    # Loyalty composite: long tenure weighted down by complaint history
    derived["Score_Fidelite"] = (
        (derived["Anciennete_Annees"].fillna(0) / 20.0).clip(0, 1)
        * (1 - (derived["Nb_Reclamations_12mois"].fillna(0) / 10.0).clip(0, 1))
    )

    return derived


def add_interaction_features(dataframe: pd.DataFrame) -> pd.DataFrame:
    derived = dataframe.copy()
    sat_norm = (derived["Score_Satisfaction"].fillna(3) / 5.0).clip(0, 1)
    eng_norm = derived["Score_Engagement_Norm"].fillna(0)

    # Satisfied + digitally active → strong retention signal
    derived["Satisfaction_Digital_Interaction"] = sat_norm * eng_norm

    # Multi-product + satisfied → sticky, less likely to churn
    derived["Product_Satisfaction_Fit"] = derived["Nb_Produits_Norm"].fillna(0) * sat_norm

    # Active engagement penalized by zombie flag → captures disengaged clients
    derived["Engagement_Zombie_Penalty"] = eng_norm * (1 - derived["Est_Zombie_Digital"].fillna(0))

    return derived


def classify_risk(probability_percent: float) -> str:
    if probability_percent < 30:
        return "Faible"
    if probability_percent < 50:
        return "Modere"
    if probability_percent < 70:
        return "Eleve"
    return "Critique"


def build_training_target(dataframe: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    prepared = dataframe.sort_values(["ClientSK", "DateComplete"]).copy()
    duplicate_snapshots = prepared.groupby("ClientSK").size().gt(1).any()
    has_dates = prepared["DateComplete"].notna().any()

    metadata = {
        "requested_horizon_days": TARGET_HORIZON_DAYS,
        "applied_horizon_days": None,
        "target_mode": "observed_state_fallback",
        "training_population": "all_available_clients",
        "warning": (
            "No multi-snapshot client history was found. "
            "Falling back to the observed churn state instead of a true future horizon."
        ),
    }

    if not duplicate_snapshots or not has_dates:
        # Confirmed churned clients
        already_churned = prepared["A_Quitte"].fillna(0).astype(int) == 1
        # Behavioral zombie proxy: active but fully disengaged → imminent churn
        zombie_proxy = (
            (prepared["Nb_Transactions_Mois"].fillna(0) == 0)
            & (prepared["Nb_Connexions_App_Mois"].fillna(0) == 0)
            & (prepared["Nb_Reclamations_12mois"].fillna(0) > 1)
            & (prepared["Score_Satisfaction"].fillna(5) < 3.5)
            & (prepared["Est_Client_Actif"].fillna(0).astype(int) == 1)
        )
        prepared["Target_Churn_Horizon"] = (already_churned | zombie_proxy).astype(int)
        metadata["warning"] = (
            "No multi-snapshot history found. "
            "Target combines confirmed churn (A_Quitte) and behavioral zombie proxy."
        )
        return prepared, metadata

    labels_by_index: dict[int, int] = {}
    for _, group in prepared.groupby("ClientSK", sort=False):
        group = group.sort_values("DateComplete")
        rows = list(group.itertuples())

        for position, row in enumerate(rows):
            if pd.isna(row.DateComplete):
                labels_by_index[row.Index] = 0
                continue

            horizon_end = row.DateComplete + pd.Timedelta(days=TARGET_HORIZON_DAYS)
            label = 0
            for future_row in rows[position + 1 :]:
                if pd.isna(future_row.DateComplete):
                    continue
                if future_row.DateComplete > horizon_end:
                    break
                if int(getattr(future_row, "A_Quitte", 0) or 0) == 1:
                    label = 1
                    break
            labels_by_index[row.Index] = label

    prepared["Target_Churn_Horizon"] = (
        pd.Series(labels_by_index).reindex(prepared.index).fillna(0).astype(int)
    )
    prepared = prepared[prepared["Est_Client_Actif"].fillna(0).astype(int) == 1].copy()
    metadata.update(
        {
            "applied_horizon_days": TARGET_HORIZON_DAYS,
            "target_mode": "future_horizon",
            "training_population": "active_snapshots_only",
            "warning": "",
        }
    )
    return prepared, metadata


def fit_best_model(features_frame: pd.DataFrame, labels: pd.Series):
    X_train, X_test, y_train, y_test = train_test_split(
        features_frame,
        labels,
        test_size=0.2,
        random_state=42,
        stratify=labels,
    )

    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    try:
        from imblearn.over_sampling import SMOTE

        minority_count = int(y_train.sum())
        neighbors = min(5, max(minority_count - 1, 1))
        smote = SMOTE(random_state=42, k_neighbors=neighbors)
        X_resampled, y_resampled = smote.fit_resample(X_train_scaled, y_train)
        smote_used = True
    except Exception:
        X_resampled, y_resampled = X_train_scaled, y_train
        smote_used = False

    candidate_models = {
        "Random Forest": RandomForestClassifier(
            n_estimators=250,
            max_depth=12,
            class_weight="balanced",
            random_state=42,
            n_jobs=-1,
        ),
        "Gradient Boosting": GradientBoostingClassifier(
            n_estimators=220,
            learning_rate=0.05,
            max_depth=5,
            random_state=42,
        ),
        "Logistic Regression": LogisticRegression(
            class_weight="balanced",
            max_iter=1000,
            random_state=42,
        ),
    }

    if XGBOOST_AVAILABLE:
        n_neg = int((y_resampled == 0).sum())
        n_pos = int((y_resampled == 1).sum())
        scale_pos_weight = max(1.0, n_neg / max(n_pos, 1))
        candidate_models["XGBoost"] = XGBClassifier(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            scale_pos_weight=scale_pos_weight,
            eval_metric="auc",
            random_state=42,
            n_jobs=-1,
            verbosity=0,
        )

    results = {}
    for model_name, model in candidate_models.items():
        model.fit(X_resampled, y_resampled)
        probabilities = model.predict_proba(X_test_scaled)[:, 1]
        predictions = (probabilities >= 0.4).astype(int)
        results[model_name] = {
            "model": model,
            "auc": roc_auc_score(y_test, probabilities),
            "f1": f1_score(y_test, predictions),
            "precision": precision_score(y_test, predictions),
            "recall": recall_score(y_test, predictions),
            "probabilities": probabilities,
            "predictions": predictions,
        }

    best_name = max(results, key=lambda name: results[name]["auc"])
    best_result = results[best_name]

    evaluation = {
        "best_model_name": best_name,
        "auc": round(float(best_result["auc"]), 4),
        "f1": round(float(best_result["f1"]), 4),
        "precision": round(float(best_result["precision"]), 4),
        "recall": round(float(best_result["recall"]), 4),
        "smote_used": smote_used,
        "classification_report": classification_report(
            y_test,
            best_result["predictions"],
            target_names=["Actif", "Churn"],
            zero_division=0,
        ),
    }

    return best_result["model"], scaler, evaluation


def score_active_clients(
    dataframe: pd.DataFrame,
    model,
    scaler: StandardScaler,
    feature_medians: pd.Series,
    metadata: dict,
    auc_score: float,
    model_name: str,
) -> pd.DataFrame:
    scoring_population = dataframe[dataframe["Est_Client_Actif"].fillna(0).astype(int) == 1].copy()
    scoring_features = scoring_population[FEATURES].fillna(feature_medians)
    scaled_features = scaler.transform(scoring_features)
    probabilities = model.predict_proba(scaled_features)[:, 1] * 100

    scored = scoring_population.copy()
    scored["Score_Churn"] = np.round(probabilities, 1)
    scored["Classe_Risque"] = scored["Score_Churn"].apply(classify_risk)
    scored["Date_Prediction"] = pd.Timestamp.today().strftime("%Y-%m-%d")
    scored["Modele"] = model_name
    scored["AUC"] = auc_score
    scored["Population_Cible"] = "clients_actifs_uniquement"
    scored["Target_Mode"] = metadata["target_mode"]
    scored["Target_Horizon_Days"] = metadata["applied_horizon_days"] or ""
    return scored


def export_predictions(scored_dataframe: pd.DataFrame) -> None:
    export_columns = [
        "ClientSK",
        "Score_Churn",
        "Classe_Risque",
        "Date_Prediction",
        "Modele",
        "AUC",
        "Population_Cible",
        "Target_Mode",
        "Target_Horizon_Days",
    ]
    export_frame = scored_dataframe[export_columns].copy()
    export_frame.to_csv(
        PROJECT_ROOT / "ML_ChurnPredictions.csv",
        index=False,
        sep=";",
        encoding="utf-8-sig",
    )

    try:
        from sqlalchemy import create_engine, text

        engine = create_engine(
            f"mssql+pyodbc://{ACTIVE_SERVER or 'ASUS'}/{DATABASE}"
            "?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes"
        )
        with engine.begin() as connection:
            connection.execute(text("DROP TABLE IF EXISTS [dbo].[ML_ChurnPredictions]"))
        export_frame.to_sql(
            "ML_ChurnPredictions",
            engine,
            schema="dbo",
            if_exists="replace",
            index=False,
        )
    except Exception as exc:
        print(f"[warn] SQL export skipped: {exc}")


def save_artifacts(model, scaler: StandardScaler, metadata: dict, feature_medians: pd.Series) -> None:
    MODEL_DIR.mkdir(exist_ok=True)
    joblib.dump(model, MODEL_DIR / "churn_model.pkl")
    joblib.dump(scaler, MODEL_DIR / "scaler.pkl")

    metadata_payload = {
        **metadata,
        "feature_count": len(FEATURES),
        "features": FEATURES,
        "feature_medians": {key: float(value) for key, value in feature_medians.items()},
    }
    with open(MODEL_DIR / "model_metadata.json", "w", encoding="utf-8") as metadata_file:
        json.dump(metadata_payload, metadata_file, ensure_ascii=False, indent=2)


def main():
    print("=" * 72)
    print("ATTIJARI DECISION HUB - CHURN MODEL")
    print("=" * 72)
    print("[1/5] Loading data from SQL Server...")
    raw_dataframe = add_interaction_features(compute_derived_features(load_dataset()))
    print(f"  Rows loaded        : {len(raw_dataframe):,}")
    print(f"  Distinct clients   : {raw_dataframe['ClientSK'].nunique():,}")
    print(f"  Active clients     : {int(raw_dataframe['Est_Client_Actif'].sum()):,}")
    print(f"  Churned clients    : {int(raw_dataframe['A_Quitte'].sum()):,}")

    print("[2/5] Building training target...")
    training_dataframe, target_metadata = build_training_target(raw_dataframe)
    feature_medians = training_dataframe[FEATURES].median(numeric_only=True)
    X = training_dataframe[FEATURES].fillna(feature_medians)
    y = training_dataframe["Target_Churn_Horizon"].astype(int)
    positive_rate = (y.mean() * 100) if len(y) else 0
    print(f"  Target mode        : {target_metadata['target_mode']}")
    print(f"  Horizon requested  : {TARGET_HORIZON_DAYS} days")
    print(f"  Horizon applied    : {target_metadata['applied_horizon_days'] or 'fallback'}")
    print(f"  Training rows      : {len(training_dataframe):,}")
    print(f"  Positive class     : {int(y.sum()):,} ({positive_rate:.1f}%)")
    if target_metadata["warning"]:
        print(f"  Warning            : {target_metadata['warning']}")

    print("[3/5] Training candidate models...")
    model, scaler, evaluation = fit_best_model(X, y)
    print(f"  Best model         : {evaluation['best_model_name']}")
    print(f"  AUC-ROC            : {evaluation['auc']:.4f}")
    print(f"  F1-score           : {evaluation['f1']:.4f}")
    print(f"  Precision          : {evaluation['precision']:.4f}")
    print(f"  Recall             : {evaluation['recall']:.4f}")
    print(f"  SMOTE used         : {'yes' if evaluation['smote_used'] else 'no'}")

    print("[4/5] Scoring active clients for serving...")
    scored_active_clients = score_active_clients(
        raw_dataframe,
        model,
        scaler,
        feature_medians,
        target_metadata,
        evaluation["auc"],
        evaluation["best_model_name"],
    )
    print(f"  Active clients scored : {len(scored_active_clients):,}")
    print(
        "  Risk distribution     : "
        + ", ".join(
            f"{label}={int((scored_active_clients['Classe_Risque'] == label).sum()):,}"
            for label in ["Faible", "Modere", "Eleve", "Critique"]
        )
    )

    print("[5/5] Exporting model artifacts...")
    export_predictions(scored_active_clients)
    save_artifacts(model, scaler, target_metadata, feature_medians)
    print("  Files written       : ML_ChurnPredictions.csv, models/churn_model.pkl, models/scaler.pkl")
    print("=" * 72)
    print("DONE")
    print("=" * 72)


if __name__ == "__main__":
    main()
