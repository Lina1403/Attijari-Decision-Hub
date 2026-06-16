"""
API Flask - modeles ML churn et recommandations.
Source live : SQL Server / SSMS.
"""
from __future__ import annotations

from datetime import datetime, timedelta
from pathlib import Path
import logging
import os
import sys
import unicodedata

from flask import Flask, jsonify, request
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
import pyodbc


PROJECT_ROOT = Path(__file__).resolve().parent
MODEL_DIR = PROJECT_ROOT / "models"
ML_API_PORT = int(os.getenv("ML_API_PORT", "5001"))
ML_CACHE_TTL_SECONDS = int(os.getenv("ML_API_CACHE_TTL_SECONDS", "300"))
DATABASE_NAME = os.getenv("ML_SQL_DATABASE", os.getenv("DB_NAME", "DWH_AttijariBI_Final"))
DEFAULT_PAGE_SIZE = 40
MAX_PAGE_SIZE = 80
DEFAULT_SEARCH_LIMIT = 10
DEFAULT_RECOMMENDATION_LIMIT = 6

SERVER_CANDIDATES = [
    os.getenv("ML_SQL_SERVER", "").strip(),
    os.getenv("DB_SERVER", "").strip(),
    os.getenv("SQLCMD_SERVER", "").strip(),
    r".\LINA",
    r"ASUS\LINA",
    "ASUS",
    r"localhost\LINA",
    ".",
]

DRIVER_CANDIDATES = [
    "ODBC Driver 18 for SQL Server",
    "ODBC Driver 17 for SQL Server",
    "SQL Server",
]

MODEL_FEATURES = [
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

NUMERIC_COLUMNS = [
    "ClientSK",
    "Age",
    "GouvernoratID",
    "Score_Credit",
    "Est_TRE",
    "Est_Client_Actif",
    "Anciennete_Annees",
    "SegmentID",
    "PackID",
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
    "A_Notifications_Push_Activees",
    "A_Reclamation",
    "A_Quitte",
]

CLIENTS_QUERY = """
SELECT
    dc.ClientSK,
    dc.Nom,
    dc.Prenom,
    dc.Age,
    dc.GouvernoratID,
    g.Nom AS GouvernoratNom,
    dc.Score_Credit,
    CAST(dc.Est_TRE AS INT) AS Est_TRE,
    ISNULL(dc.Anciennete_Annees, DATEDIFF(YEAR, dc.Date_Entree_Relation, GETDATE())) AS Anciennete_Annees,
    fc.SegmentID,
    s.NomSegment,
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
    CAST(fc.A_Notifications_Push_Activees AS INT) AS A_Notifications_Push_Activees,
    CAST(fc.A_Reclamation AS INT) AS A_Reclamation,
    CAST(fc.Est_Client_Actif AS INT) AS Est_Client_Actif,
    CAST(fc.A_Quitte AS INT) AS A_Quitte
FROM DIM_Client dc
INNER JOIN FACT_Client fc ON dc.ClientSK = fc.ClientSK
LEFT JOIN DIM_Gouvernorat g ON g.GouvernoratID = dc.GouvernoratID
LEFT JOIN DIM_Segment s ON s.SegmentID = fc.SegmentID
WHERE CAST(ISNULL(fc.Est_Client_Actif, 0) AS INT) = 1
ORDER BY dc.ClientSK
"""

RISK_LABELS = {
    "faible": "Faible",
    "modere": "Modere",
    "eleve": "Eleve",
    "critique": "Critique",
}

CLIENT_SORT_FIELD_MAP = {
    "client": "_full_name_key",
    "nom": "_full_name_key",
    "nomclient": "_full_name_key",
    "fullname": "_full_name_key",
    "segment": "_segment_key",
    "gouvernorat": "_gouvernorat_key",
    "probabilitechurn": "Score_Churn",
    "scorechurn": "Score_Churn",
    "riskscore": "Score_Churn",
    "satisfaction": "Score_Satisfaction",
    "nombreproduits": "Nb_Produits",
    "nbproduits": "Nb_Produits",
    "produits": "Nb_Produits",
    "reclamations": "Nb_Reclamations_12mois",
    "nbreclamations": "Nb_Reclamations_12mois",
    "classerisque": "_risk_rank",
    "riskclass": "_risk_rank",
}

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

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})
logging.basicConfig(level=logging.INFO)
sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")
logger = logging.getLogger("attijari-ml-api")

_active_connection = {"driver": None, "server": None}
_predictions_cache = {"expires_at": None, "dataframe": None}
_recommendations_cache = {"expires_at": None, "dataframe": None}
recommendation_models = None
recommendation_scaler = None
recommendation_metadata = {}


def load_pickle(file_name: str):
    return joblib.load(MODEL_DIR / file_name)


try:
    churn_model = load_pickle("churn_model.pkl")
    scaler = load_pickle("scaler.pkl")
    logger.info("Modeles ML charges avec succes.")
except Exception as exc:
    churn_model = None
    scaler = None
    logger.error("Erreur chargement modeles ML: %s", exc)

try:
    recommendation_models = load_pickle("recommendation_models.pkl")
    recommendation_scaler = load_pickle("recommendation_scaler.pkl")
    recommendation_metadata_path = MODEL_DIR / "recommendation_metadata.json"
    if recommendation_metadata_path.exists():
        import json

        with open(recommendation_metadata_path, "r", encoding="utf-8") as metadata_file:
            recommendation_metadata = json.load(metadata_file)
    logger.info("Modeles ML de recommandation charges avec succes.")
except Exception as exc:
    recommendation_models = None
    recommendation_scaler = None
    recommendation_metadata = {}
    logger.warning("Modeles ML de recommandation indisponibles, fallback regles: %s", exc)


def available_driver_names() -> list[str]:
    return [driver for driver in DRIVER_CANDIDATES if driver in pyodbc.drivers()]


def build_connection_string(driver: str, server: str) -> str:
    security_options = (
        ""
        if driver == "SQL Server"
        else "Encrypt=no;TrustServerCertificate=yes"
    )
    return (
        f"DRIVER={{{driver}}};"
        f"SERVER={server};"
        f"DATABASE={DATABASE_NAME};"
        "Trusted_Connection=yes;"
        f"{security_options}"
    )


def get_connection() -> pyodbc.Connection:
    if _active_connection["driver"] and _active_connection["server"]:
        return pyodbc.connect(
            build_connection_string(_active_connection["driver"], _active_connection["server"])
        )

    drivers = available_driver_names()
    if not drivers:
        raise RuntimeError("Aucun driver ODBC SQL Server compatible n'est disponible.")

    last_error = None
    for driver in drivers:
        for server in filter(None, dict.fromkeys(SERVER_CANDIDATES)):
            try:
                connection = pyodbc.connect(build_connection_string(driver, server), timeout=5)
                _active_connection["driver"] = driver
                _active_connection["server"] = server
                logger.info("Connexion SQL Server activee via %s / %s", server, driver)
                return connection
            except Exception as exc:
                last_error = exc

    raise RuntimeError(f"Connexion SQL Server impossible: {last_error}")


def to_number(value, fallback=0):
    try:
        numeric_value = float(value)
    except (TypeError, ValueError):
        return fallback

    if np.isnan(numeric_value):
        return fallback
    return numeric_value


def normalize_text(value) -> str:
    if value is None:
        return ""
    if isinstance(value, float) and np.isnan(value):
        return ""
    return str(value).strip()


def normalize_search_text(value) -> str:
    normalized = unicodedata.normalize("NFD", normalize_text(value).lower())
    return "".join(character for character in normalized if not unicodedata.combining(character))


def normalize_sort_key(value) -> str:
    return "".join(character for character in normalize_search_text(value) if character.isalnum())


def normalize_numeric_columns(dataframe: pd.DataFrame) -> pd.DataFrame:
    normalized = dataframe.copy()

    for column in NUMERIC_COLUMNS:
        if column in normalized.columns:
            normalized[column] = pd.to_numeric(normalized[column], errors="coerce")

    for column in NUMERIC_COLUMNS:
        if column not in normalized.columns:
            normalized[column] = 0

    median_fill_columns = [
        column
        for column in MODEL_FEATURES
        if column in normalized.columns
        and column not in {"A_Notifications_Push_Activees", "A_Reclamation", "Est_TRE"}
    ]

    for column in median_fill_columns:
        median = normalized[column].median()
        normalized[column] = normalized[column].fillna(0 if np.isnan(median) else median)

    for column in ["A_Notifications_Push_Activees", "A_Reclamation", "Est_TRE"]:
        normalized[column] = normalized[column].fillna(0).astype(int)

    return normalized


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
    derived["Engagement_Zombie_Penalty"] = eng_norm * (1 - derived["Est_Zombie_Digital"].fillna(0))
    return derived


def recompute_derived_features(row: dict) -> dict:
    """Recompute all derived and interaction features from a flat dict of raw values.
    Called inside the simulator after applying what-if changes so the model sees
    the full downstream effect of each slider change."""
    d = dict(row)

    recus = d.get("Nb_Offres_Recues_12mois", 0)
    d["A_Resilie_Produits"] = 1 if d.get("Nb_Produits_Resilies_12mois", 0) > 0 else 0
    d["Taux_Offres_Acceptees"] = (
        d.get("Nb_Offres_Acceptees_12mois", 0) / recus if recus > 0 else 0
    )
    d["Score_Engagement"] = (
        d.get("Nb_Connexions_App_Mois", 0) * 2
        + d.get("Nb_Fonctionnalites_App_Utilisees", 0) * 3
        + d.get("Nb_Paiements_CB_Mois", 0)
        + d.get("A_Notifications_Push_Activees", 0) * 2
    )
    solde = d.get("Solde_Compte", 0)
    d["Ratio_Solde"] = d.get("Solde_Moyen_3mois", 0) / (solde + 1) if solde > 0 else 0

    tx = d.get("Nb_Transactions_Mois", 0)
    conn = d.get("Nb_Connexions_App_Mois", 0)
    d["Est_Zombie_Digital"] = 1 if (tx == 0 and conn == 0) else 0
    d["Score_Engagement_Norm"] = min(d["Score_Engagement"] / 20.0, 1.0)
    nb_produits = max(d.get("Nb_Produits", 1), 1)
    d["Taux_Reclamations_Produits"] = d.get("Nb_Reclamations_12mois", 0) / (nb_produits + 1)
    d["Est_En_Decouvert"] = 1 if d.get("Taux_Utilisation_Decouvert", 0) > 0.7 else 0
    d["Delta_Solde_Negatif"] = (
        1 if d.get("Solde_Moyen_3mois", 0) < d.get("Solde_Compte", 0) * 0.9 else 0
    )
    d["Nb_Produits_Norm"] = min(d.get("Nb_Produits", 0) / 6.0, 1.0)
    d["Ratio_Digital_Total"] = conn / (tx + conn + 1)
    d["Score_Fidelite"] = min(d.get("Anciennete_Annees", 0) / 20.0, 1.0) * (
        1 - min(d.get("Nb_Reclamations_12mois", 0) / 10.0, 1.0)
    )

    sat_norm = min(d.get("Score_Satisfaction", 3) / 5.0, 1.0)
    eng_norm = d["Score_Engagement_Norm"]
    d["Satisfaction_Digital_Interaction"] = sat_norm * eng_norm
    d["Product_Satisfaction_Fit"] = d["Nb_Produits_Norm"] * sat_norm
    d["Engagement_Zombie_Penalty"] = eng_norm * (1 - d["Est_Zombie_Digital"])

    return d


def load_clients_data() -> pd.DataFrame:
    connection = get_connection()
    try:
        dataframe = pd.read_sql_query(CLIENTS_QUERY, connection)
    finally:
        connection.close()

    if dataframe.empty:
        raise RuntimeError("Aucun client n'a ete trouve dans SQL Server.")

    return add_interaction_features(compute_derived_features(normalize_numeric_columns(dataframe)))


def classify_risk(score: float) -> str:
    if score < 30:
        return RISK_LABELS["faible"]
    if score < 50:
        return RISK_LABELS["modere"]
    if score < 70:
        return RISK_LABELS["eleve"]
    return RISK_LABELS["critique"]


def enrich_predictions_dataframe(dataframe: pd.DataFrame) -> pd.DataFrame:
    enriched = dataframe.copy()
    first_names = enriched["Prenom"].fillna("").astype(str).str.strip()
    last_names = enriched["Nom"].fillna("").astype(str).str.strip()
    full_names = (first_names + " " + last_names).str.strip()
    fallback_names = "Client " + enriched["ClientSK"].fillna(0).astype(int).astype(str)
    segment_labels = enriched["NomSegment"].fillna("Particulier").astype(str).str.strip()
    gouvernorat_labels = enriched["GouvernoratNom"].fillna("Non renseigne").astype(str).str.strip()
    risk_labels = enriched["Classe_Risque"].fillna(RISK_LABELS["faible"]).astype(str).str.strip()
    risk_ranks = {
        "faible": 0,
        "modere": 1,
        "eleve": 2,
        "critique": 3,
    }

    enriched["_full_name"] = full_names.where(full_names != "", fallback_names)
    enriched["_full_name_key"] = enriched["_full_name"].map(normalize_search_text)
    enriched["_segment_label"] = segment_labels
    enriched["_segment_key"] = segment_labels.map(normalize_search_text)
    enriched["_gouvernorat_label"] = gouvernorat_labels
    enriched["_gouvernorat_key"] = gouvernorat_labels.map(normalize_search_text)
    enriched["_risk_label"] = risk_labels
    enriched["_risk_key"] = risk_labels.map(normalize_search_text)
    enriched["_risk_rank"] = enriched["_risk_key"].map(risk_ranks).fillna(0).astype(int)
    enriched["_search_blob"] = (
        enriched["_full_name_key"]
        + " "
        + enriched["ClientSK"].astype(int).astype(str)
        + " "
        + enriched["_segment_key"]
        + " "
        + enriched["_gouvernorat_key"]
    ).str.strip()

    return enriched


def predict_churn_batch(dataframe: pd.DataFrame) -> pd.DataFrame:
    if churn_model is None or scaler is None:
        raise RuntimeError("Le modele churn n'est pas charge.")

    batch = dataframe.copy()
    features = batch[MODEL_FEATURES].fillna(0)
    scaled_features = scaler.transform(features)
    scores = churn_model.predict_proba(scaled_features)[:, 1] * 100

    batch["Score_Churn"] = np.round(scores, 1)
    batch["Classe_Risque"] = batch["Score_Churn"].apply(classify_risk)
    return enrich_predictions_dataframe(batch)


def load_exported_predictions_dataframe() -> pd.DataFrame:
    prediction_candidates = [
        PROJECT_ROOT / "ML_ChurnPredictions_SQL_LIVE.csv",
        PROJECT_ROOT / "ML_ChurnPredictions.csv",
    ]
    clients_candidates = [
        PROJECT_ROOT / "clients_ml.csv",
    ]
    identity_candidates = [
        PROJECT_ROOT / "client_identity_export.csv",
    ]

    predictions = pd.DataFrame()
    for prediction_path in prediction_candidates:
        if prediction_path.exists():
            predictions = pd.read_csv(prediction_path, sep=";", encoding="utf-8-sig")
            if not predictions.empty:
                break

    if predictions.empty:
        raise RuntimeError("Aucun export ML_ChurnPredictions disponible pour le fallback.")

    clients = pd.DataFrame()
    for clients_path in clients_candidates:
        if clients_path.exists():
            clients = pd.read_csv(clients_path, sep=";", encoding="utf-8-sig")
            if not clients.empty:
                break

    predictions["ClientSK"] = pd.to_numeric(predictions["ClientSK"], errors="coerce")
    predictions = predictions.dropna(subset=["ClientSK"]).copy()
    predictions["ClientSK"] = predictions["ClientSK"].astype(int)
    predictions["Score_Churn"] = pd.to_numeric(
        predictions.get("Score_Churn", 0),
        errors="coerce",
    ).fillna(0)
    predictions["Classe_Risque"] = predictions.get("Classe_Risque", "Faible").fillna("Faible")

    if not clients.empty:
        clients["ClientSK"] = pd.to_numeric(clients["ClientSK"], errors="coerce")
        clients = clients.dropna(subset=["ClientSK"]).copy()
        clients["ClientSK"] = clients["ClientSK"].astype(int)
        exported = clients.merge(
            predictions[["ClientSK", "Score_Churn", "Classe_Risque"]],
            on="ClientSK",
            how="inner",
        )
    else:
        exported = predictions.copy()

    identities = pd.DataFrame()
    for identity_path in identity_candidates:
        if identity_path.exists():
            identities = pd.read_csv(identity_path, sep=";", encoding="utf-8-sig")
            if not identities.empty:
                break

    if not identities.empty:
        identities["ClientSK"] = pd.to_numeric(identities["ClientSK"], errors="coerce")
        identities = identities.dropna(subset=["ClientSK"]).copy()
        identities["ClientSK"] = identities["ClientSK"].astype(int)
        identity_columns = [
            column
            for column in ["ClientSK", "Nom", "Prenom", "NomSegment", "GouvernoratNom"]
            if column in identities.columns
        ]
        exported = exported.merge(
            identities[identity_columns],
            on="ClientSK",
            how="left",
            suffixes=("", "_identity"),
        )

        for column in ["Nom", "Prenom", "NomSegment", "GouvernoratNom"]:
            identity_column = f"{column}_identity"
            if identity_column in exported.columns:
                current_values = exported.get(column)
                if current_values is None:
                    exported[column] = exported[identity_column]
                else:
                    current_text = current_values.fillna("").astype(str).str.strip()
                    identity_text = exported[identity_column].fillna("").astype(str).str.strip()
                    exported[column] = current_values.where(current_text != "", identity_text)
                exported = exported.drop(columns=[identity_column])

    defaults = {
        "Nom": "",
        "Prenom": "",
        "Age": 0,
        "GouvernoratID": 0,
        "GouvernoratNom": "Non renseigne",
        "Score_Credit": 0,
        "Est_TRE": 0,
        "Est_Client_Actif": 1,
        "Anciennete_Annees": 0,
        "SegmentID": 0,
        "NomSegment": "Particulier",
        "PackID": 0,
        "Solde_Compte": 0,
        "Solde_Moyen_3mois": 0,
        "Montant_Credit_Total": 0,
        "Nb_Produits": 0,
        "Nb_Credits_Actifs": 0,
        "Nb_Produits_Resilies_12mois": 0,
        "Nb_Transactions_Mois": 0,
        "Montant_Transaction_Moyen": 0,
        "Nb_Retraits_GAB_Mois": 0,
        "Nb_Paiements_CB_Mois": 0,
        "Taux_Utilisation_Decouvert": 0,
        "Nb_Connexions_App_Mois": 0,
        "Nb_Virements_En_Ligne_Mois": 0,
        "Nb_Fonctionnalites_App_Utilisees": 0,
        "Nb_Offres_Recues_12mois": 0,
        "Nb_Offres_Acceptees_12mois": 0,
        "Score_Satisfaction": 3,
        "Nb_Reclamations_12mois": 0,
        "A_Notifications_Push_Activees": 0,
        "A_Reclamation": 0,
        "A_Quitte": 0,
    }

    for column, value in defaults.items():
        if column not in exported.columns:
            exported[column] = value

    segment_names = {
        1: "Particulier",
        2: "Premium",
        3: "Professionnel",
        4: "VIP",
        5: "VIP",
        6: "VIP",
    }
    if "NomSegment" in exported.columns:
        exported["NomSegment"] = exported["NomSegment"].fillna("").astype(str)
        missing_segment = exported["NomSegment"].str.strip() == ""
        exported.loc[missing_segment, "NomSegment"] = (
            pd.to_numeric(exported.loc[missing_segment, "SegmentID"], errors="coerce")
            .fillna(0)
            .astype(int)
            .map(segment_names)
            .fillna("Particulier")
        )

    exported["Prenom"] = exported["Prenom"].fillna("").astype(str)
    exported["Nom"] = exported["Nom"].fillna("").astype(str)
    empty_names = (exported["Prenom"].str.strip() + exported["Nom"].str.strip()) == ""
    exported.loc[empty_names, "Nom"] = (
        "Client " + exported.loc[empty_names, "ClientSK"].astype(int).astype(str)
    )

    normalized = add_interaction_features(compute_derived_features(normalize_numeric_columns(exported)))
    normalized["Score_Churn"] = exported["Score_Churn"].values
    normalized["Classe_Risque"] = exported["Classe_Risque"].values
    return enrich_predictions_dataframe(normalized)


def get_predictions_dataframe(force_refresh: bool = False, copy: bool = True) -> pd.DataFrame:
    now = datetime.now()
    cache_valid = (
        not force_refresh
        and _predictions_cache["dataframe"] is not None
        and _predictions_cache["expires_at"] is not None
        and _predictions_cache["expires_at"] > now
    )

    if cache_valid:
        cached_dataframe = _predictions_cache["dataframe"]
        return cached_dataframe.copy(deep=False) if copy else cached_dataframe

    try:
        clients = load_clients_data()
        predictions = predict_churn_batch(clients)
        source = "SQL Server"
    except Exception as live_error:
        logger.warning("Live SQL predictions unavailable, using exported ML predictions: %s", live_error)
        predictions = load_exported_predictions_dataframe()
        source = "exports ML"

    _predictions_cache["dataframe"] = predictions
    _predictions_cache["expires_at"] = now + timedelta(seconds=ML_CACHE_TTL_SECONDS)
    _recommendations_cache["dataframe"] = None
    _recommendations_cache["expires_at"] = None
    logger.info("%s clients scores depuis %s.", len(predictions), source)
    return predictions.copy(deep=False) if copy else predictions


def build_dashboard_summary(dataframe: pd.DataFrame) -> dict:
    distribution = {
        "Faible": int((dataframe["_risk_key"] == "faible").sum()),
        "Modere": int((dataframe["_risk_key"] == "modere").sum()),
        "Eleve": int((dataframe["_risk_key"] == "eleve").sum()),
        "Critique": int((dataframe["_risk_key"] == "critique").sum()),
    }
    high_risk = distribution["Eleve"] + distribution["Critique"]
    dominant_risk = max(distribution.items(), key=lambda item: item[1], default=("Faible", 0))

    return {
        "totalClients": int(len(dataframe)),
        "distribution": distribution,
        "averageChurnScore": round(float(dataframe["Score_Churn"].mean()), 1),
        "highRiskClients": high_risk,
        "highRiskRatio": round(float(high_risk / max(len(dataframe), 1) * 100), 1),
        "dominantRiskClass": dominant_risk[0],
        "dominantRiskCount": int(dominant_risk[1]),
    }


def build_filter_options(dataframe: pd.DataFrame) -> dict:
    segments = sorted(
        value
        for value in dataframe["_segment_label"].dropna().astype(str).str.strip().unique().tolist()
        if value
    )
    gouvernorats = sorted(
        value
        for value in dataframe["_gouvernorat_label"].dropna().astype(str).str.strip().unique().tolist()
        if value
    )
    return {
        "segments": segments,
        "gouvernorats": gouvernorats,
        "riskClasses": list(RISK_LABELS.values()),
    }


def filter_clients_dataframe(
    dataframe: pd.DataFrame,
    *,
    search: str = "",
    segment: str = "",
    gouvernorat: str = "",
    risk_class: str = "",
) -> pd.DataFrame:
    filtered = dataframe
    normalized_search = normalize_search_text(search)

    if normalized_search:
        filtered = filtered[
            filtered["_search_blob"].str.contains(normalized_search, regex=False, na=False)
        ]

    if segment:
        filtered = filtered[filtered["_segment_key"] == normalize_search_text(segment)]

    if gouvernorat:
        filtered = filtered[filtered["_gouvernorat_key"] == normalize_search_text(gouvernorat)]

    if risk_class:
        filtered = filtered[filtered["_risk_key"] == normalize_search_text(risk_class)]

    return filtered


def sort_clients_dataframe(
    dataframe: pd.DataFrame,
    sort_by: str,
    direction: str,
) -> tuple[pd.DataFrame, str, str]:
    normalized_sort_by = normalize_sort_key(sort_by)
    column = CLIENT_SORT_FIELD_MAP.get(normalized_sort_by, "Score_Churn")
    resolved_direction = "asc" if normalize_search_text(direction) == "asc" else "desc"
    ascending = resolved_direction == "asc"
    sorted_dataframe = dataframe.sort_values(
        by=[column, "ClientSK"],
        ascending=[ascending, True],
        kind="mergesort",
    )
    return sorted_dataframe, column, resolved_direction


def get_client_row(dataframe: pd.DataFrame, client_id: int) -> pd.Series | None:
    match = dataframe[dataframe["ClientSK"] == int(client_id)]
    if match.empty:
        return None
    return match.iloc[0]


def feature_importance_payload() -> list[dict]:
    if churn_model is None:
        return []

    importance_map: list[tuple[str, float]] = []
    if hasattr(churn_model, "feature_importances_"):
        importance_map = list(zip(MODEL_FEATURES, churn_model.feature_importances_))
    elif hasattr(churn_model, "coef_"):
        importance_map = list(zip(MODEL_FEATURES, np.abs(churn_model.coef_[0])))

    if not importance_map:
        return []

    total = sum(float(value) for _, value in importance_map) or 1.0
    payload = []
    for feature_name, value in sorted(importance_map, key=lambda item: item[1], reverse=True)[:8]:
        payload.append(
            {
                "feature": feature_name.replace("_", " "),
                "importance": round(float(value) / total * 100, 1),
                "direction": "positive",
            }
        )
    return payload


def build_top_features(row: pd.Series) -> list[str]:
    features: list[str] = []

    if float(row.get("Score_Satisfaction", 0)) <= 2:
        features.append("Satisfaction en baisse")
    if float(row.get("Nb_Connexions_App_Mois", 0)) <= 3:
        features.append("Usage mobile faible")
    if float(row.get("Nb_Produits", 0)) <= 1:
        features.append("Mono-produit")
    if float(row.get("Nb_Reclamations_12mois", 0)) > 0:
        features.append("Reclamation recente")
    if float(row.get("Nb_Produits_Resilies_12mois", 0)) > 0:
        features.append("Resiliation recente")
    if float(row.get("Score_Credit", 0)) < 600:
        features.append("Score credit fragile")
    if float(row.get("Taux_Utilisation_Decouvert", 0)) > 70:
        features.append("Decouvert tres utilise")

    if not features:
        features.extend(
            [
                "Relation a stabiliser",
                "Surveillance comportementale",
                "Engagement a consolider",
            ]
        )

    return features[:3]


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


def has_recommendation_ml_artifacts() -> bool:
    return recommendation_models is not None and recommendation_scaler is not None


def score_products_with_recommendation_ml(row: pd.Series) -> list[tuple[str, float]]:
    if not has_recommendation_ml_artifacts():
        return []

    features = recommendation_metadata.get("features") or (MODEL_FEATURES + ["Score_Churn"])
    medians = recommendation_metadata.get("feature_medians") or {}
    product_names = recommendation_metadata.get("product_names") or list(recommendation_models.keys())
    feature_values = {}

    for feature in features:
        value = row.get(feature, medians.get(feature, 0))
        try:
            numeric_value = float(value)
        except (TypeError, ValueError):
            numeric_value = float(medians.get(feature, 0) or 0)
        if np.isnan(numeric_value):
            numeric_value = float(medians.get(feature, 0) or 0)
        feature_values[feature] = numeric_value

    feature_frame = pd.DataFrame([feature_values], columns=features)
    scaled_features = recommendation_scaler.transform(feature_frame)
    product_scores = []

    for product_name in product_names:
        model = recommendation_models.get(product_name)
        if model is None:
            continue
        probability = float(model.predict_proba(scaled_features)[0, 1]) * 100
        if probability >= 10:
            product_scores.append((product_name, round(probability, 1)))

    return product_scores


def build_client_recommendations_dataframe(
    predictions_dataframe: pd.DataFrame,
    force_refresh: bool = False,
) -> pd.DataFrame:
    now = datetime.now()
    cache_valid = (
        not force_refresh
        and _recommendations_cache["dataframe"] is not None
        and _recommendations_cache["expires_at"] is not None
        and _recommendations_cache["expires_at"] > now
    )

    if cache_valid:
        return _recommendations_cache["dataframe"].copy(deep=False)

    recommendations: list[dict] = []

    for _, row in predictions_dataframe.iterrows():
        client_row = row.to_dict()
        product_scores = score_products_with_recommendation_ml(row)
        recommendation_source = "ProductPropensityML" if product_scores else "RuleBaseline"

        if not product_scores:
            for product_name, product_rule in PRODUCT_RULES.items():
                propensity_score = score_product_propensity(client_row, product_rule)
                if propensity_score > 0:
                    product_scores.append((product_name, propensity_score))

        for rank, (product_name, propensity_score) in enumerate(
            sorted(product_scores, key=lambda item: item[1], reverse=True)[:3],
            start=1,
        ):
            recommendations.append(
                {
                    "ClientSK": int(row["ClientSK"]),
                    "FullName": str(row.get("_full_name") or format_full_name(row)),
                    "Segment": str(row.get("_segment_label") or "Particulier"),
                    "Gouvernorat": str(row.get("_gouvernorat_label") or "Non renseigne"),
                    "Rang": rank,
                    "Produit_Recommande": product_name,
                    "Score_Propension": propensity_score,
                    "Score_Churn": float(row.get("Score_Churn", 0) or 0),
                    "Classe_Risque_Churn": str(row.get("Classe_Risque") or RISK_LABELS["faible"]),
                    "Urgence_Retention": "OUI"
                    if float(row.get("Score_Churn", 0) or 0) >= 50
                    else "NON",
                    "Date_Calcul": now.date().isoformat(),
                    "Modele": recommendation_source,
                }
            )

    recommendations_dataframe = pd.DataFrame(recommendations)
    _recommendations_cache["dataframe"] = recommendations_dataframe
    _recommendations_cache["expires_at"] = now + timedelta(seconds=ML_CACHE_TTL_SECONDS)
    return recommendations_dataframe.copy(deep=False)


def build_segment_recommendations(
    predictions_dataframe: pd.DataFrame,
    recommendations_dataframe: pd.DataFrame,
    limit: int = DEFAULT_RECOMMENDATION_LIMIT,
) -> list[dict]:
    if recommendations_dataframe.empty or predictions_dataframe.empty:
        return []

    primary_recommendations = recommendations_dataframe[
        recommendations_dataframe["Rang"] == 1
    ].copy()
    if primary_recommendations.empty:
        return []

    high_risk_predictions = predictions_dataframe[predictions_dataframe["Score_Churn"] >= 50]
    feature_counters: dict[str, dict[str, int]] = {}

    for _, row in high_risk_predictions.iterrows():
        segment_label = str(row.get("_segment_label") or "Particulier")
        segment_counter = feature_counters.setdefault(segment_label, {})
        for feature in build_top_features(row):
            segment_counter[feature] = segment_counter.get(feature, 0) + 1

    strategic_recommendations: list[dict] = []
    grouped = primary_recommendations.groupby("Segment", dropna=False)

    for segment_label, group in grouped:
        normalized_segment = normalize_text(segment_label) or "Portefeuille global"
        client_count = int(group["ClientSK"].nunique())
        average_churn = round(float(group["Score_Churn"].mean()), 1)
        average_propensity = round(float(group["Score_Propension"].mean()), 1)
        urgent_clients = int((group["Urgence_Retention"] == "OUI").sum())
        priority = "Haute" if average_churn >= 70 else "Moyenne" if average_churn >= 50 else "Basse"

        product_counts = group["Produit_Recommande"].value_counts()
        top_products = product_counts.head(2).index.tolist()
        top_products_label = ", ".join(top_products) if top_products else "offres de retention ciblees"

        factor_counts = feature_counters.get(normalized_segment, {})
        top_factors = sorted(
            factor_counts.items(),
            key=lambda item: item[1],
            reverse=True,
        )[:3]
        factor_label = ", ".join(item[0] for item in top_factors) if top_factors else "suivi relationnel renforce"

        strategic_recommendations.append(
            {
                "id": f"REC-ML-{normalize_sort_key(normalized_segment) or 'segment'}",
                "title": f"Segment {normalized_segment} : retention prioritaire",
                "description": (
                    f"{client_count} clients actifs presentent un churn moyen de {average_churn:.1f}%. "
                    f"Levier recommande : {top_products_label}. "
                    f"Facteurs dominants : {factor_label}."
                ),
                "impact": int(round(min(99, max(45, average_churn)))),
                "roi": f"x{round(1.6 + average_propensity / 55, 1):.1f}",
                "priority": priority,
                "owner": "Direction Relation Client",
                "eta": "7 jours" if priority == "Haute" else "14 jours",
                "actionLabel": "Voir les clients",
                "category": "ML retention segment",
                "_sortUrgentClients": urgent_clients,
                "_sortAverageChurn": average_churn,
            }
        )

    strategic_recommendations.sort(
        key=lambda item: (item["_sortUrgentClients"], item["_sortAverageChurn"], item["impact"]),
        reverse=True,
    )

    trimmed_recommendations = strategic_recommendations[: max(1, limit)]
    for recommendation in trimmed_recommendations:
        recommendation.pop("_sortUrgentClients", None)
        recommendation.pop("_sortAverageChurn", None)

    return trimmed_recommendations


def load_exported_recommendations_dataframe() -> pd.DataFrame:
    export_candidates = [
        PROJECT_ROOT / "ML_Recommandations_SQL_LIVE.csv",
        PROJECT_ROOT / "ML_Recommandations.csv",
    ]

    for export_path in export_candidates:
        if export_path.exists():
            dataframe = pd.read_csv(export_path, sep=";", encoding="utf-8-sig")
            if not dataframe.empty:
                return dataframe

    return pd.DataFrame()


def build_predictions_from_recommendations_export(
    recommendations_dataframe: pd.DataFrame,
) -> pd.DataFrame:
    if recommendations_dataframe.empty:
        return pd.DataFrame()

    client_rows = (
        recommendations_dataframe.sort_values(["ClientSK", "Rang"])
        .drop_duplicates(subset=["ClientSK"], keep="first")
        .copy()
    )
    client_rows["_segment_label"] = client_rows["Segment"].fillna("Particulier")
    client_rows["Score_Churn"] = pd.to_numeric(
        client_rows.get("Score_Churn", 0),
        errors="coerce",
    ).fillna(0)
    client_rows["Score_Satisfaction"] = 3
    client_rows["Nb_Connexions_App_Mois"] = 4
    client_rows["Nb_Produits"] = 2
    client_rows["Nb_Reclamations_12mois"] = 0
    client_rows["Nb_Produits_Resilies_12mois"] = 0
    client_rows["Score_Credit"] = 650
    client_rows["Taux_Utilisation_Decouvert"] = 35
    return client_rows


def format_full_name(row: pd.Series) -> str:
    first_name = normalize_text(row.get("Prenom"))
    last_name = normalize_text(row.get("Nom"))
    full_name = f"{first_name} {last_name}".strip()
    return full_name or f"Client {int(row['ClientSK'])}"


def serialize_client(row: pd.Series) -> dict:
    risk_score = float(row["Score_Churn"])
    satisfaction_raw = float(row.get("Score_Satisfaction", 0))
    satisfaction_ui = int(round(max(0, min(5, satisfaction_raw)) * 20))
    first_name = normalize_text(row.get("Prenom"))
    last_name = normalize_text(row.get("Nom"))
    annual_value = float(
        max(
            row.get("Solde_Compte", 0),
            row.get("Solde_Moyen_3mois", 0) * 12,
            row.get("Montant_Credit_Total", 0),
        )
    )

    return {
        "id": str(int(row["ClientSK"])),
        "clientSK": int(row["ClientSK"]),
        "firstName": first_name,
        "lastName": last_name,
        "nom": last_name,
        "prenom": first_name,
        "fullName": str(row.get("_full_name") or format_full_name(row)),
        "segment": str(row.get("_segment_label") or "Particulier"),
        "gouvernorat": str(row.get("_gouvernorat_label") or "Non renseigne"),
        "age": int(row.get("Age") or 0),
        "satisfaction": satisfaction_ui,
        "products": int(row.get("Nb_Produits") or 0),
        "complaints": int(row.get("Nb_Reclamations_12mois") or 0),
        "appConnections": int(row.get("Nb_Connexions_App_Mois") or 0),
        "appFeatures": int(row.get("Nb_Fonctionnalites_App_Utilisees") or 0),
        "cardPayments": int(row.get("Nb_Paiements_CB_Mois") or 0),
        "annualValue": round(annual_value, 2),
        "churnProbability": risk_score,
        "score": risk_score,
        "riskScore": risk_score,
        "riskClass": str(row.get("Classe_Risque") or RISK_LABELS["faible"]),
        "topFeatures": build_top_features(row),
        "lastContact": datetime.now().isoformat(),
        "manager": "Conseiller Attijari",
    }


def get_actions(classe_risque: str) -> list[str]:
    actions = {
        "Faible": [
            "Maintenir le suivi relationnel standard.",
            "Poursuivre l'animation digitale.",
        ],
        "Modere": [
            "Planifier un contact conseiller sous 7 jours.",
            "Proposer une offre ou un service complementaire.",
        ],
        "Eleve": [
            "Declencher une campagne de retention ciblee.",
            "Analyser immediatement les irritants recents.",
        ],
        "Critique": [
            "Escalade prioritaire au responsable relation client.",
            "Activer une offre de retention personnalisee sous 48h.",
        ],
    }
    return actions.get(classe_risque, [])


def get_simulation_recommendation(
    score_after: float,
    score_before: float | None = None,
    impact: float | None = None,
) -> dict:
    """Return a structured action recommendation based on the post-simulation risk level."""
    score_before = float(score_before if score_before is not None else score_after)
    impact = float(impact if impact is not None else 0)
    category = classify_risk(score_after)

    if score_after >= 70:
        return {
            "category": category,
            "action": "Call center prioritaire dans 48h",
            "budget_max": 500,
            "offer": "Upgrade produit ou geste commercial cible",
            "reason": "Le risque simule reste critique apres scenario.",
        }

    if score_after >= 50:
        return {
            "category": category,
            "action": "Contact conseiller personnel sous 5 jours",
            "budget_max": 220,
            "offer": "Offre de retention adaptee au segment client",
            "reason": "Le score baisse mais le client reste dans une zone de risque elevee.",
        }

    if score_after >= 40:
        return {
            "category": category,
            "action": "Validation conseiller sous 5 jours",
            "budget_max": 120,
            "offer": "Geste commercial leger et rappel relationnel",
            "reason": (
                "Le scenario ameliore bien le score, mais le risque residuel reste proche "
                "de la zone elevee."
                if score_before >= 70 or impact >= 20
                else "Le risque devient modere mais merite encore un suivi humain court."
            ),
        }

    if score_after >= 30:
        return {
            "category": category,
            "action": "Campagne proactive multicanale sous 10 jours",
            "budget_max": 60,
            "offer": "Reduction ciblee sur frais ou package digital",
            "reason": "Le risque devient modere et peut etre traite par une action legere.",
        }

    return {
        "category": category,
        "action": "Suivi marketing standard",
        "budget_max": 0,
        "offer": "Newsletter mensuelle",
        "reason": "Le risque simule devient faible apres application du scenario.",
    }

    if score_after >= 70:
        return {
            "category": "Critique",
            "action": "Call center prioritaire dans 48h",
            "budget_max": 500,
            "offer": "Upgrade produit ou augmentation limite crédit",
        }
    if score_after >= 50:
        return {
            "category": "Elevee",
            "action": "Contact conseiller personnel sous 1 semaine",
            "budget_max": 200,
            "offer": "Offre cross-sell adaptée au segment client",
        }
    if score_after >= 30:
        return {
            "category": "Moderee",
            "action": "Campagne email automatisée sous 2 semaines",
            "budget_max": 50,
            "offer": "Réduction -5% sur les frais de services",
        }
    return {
        "category": "Faible",
        "action": "Suivi marketing standard",
        "budget_max": 0,
        "offer": "Newsletter mensuelle",
    }


def build_base_profile_from_row(row: pd.Series) -> dict:
    return {feature: float(row.get(feature, 0) or 0) for feature in MODEL_FEATURES}


def build_simulation_result(
    base_profile: dict,
    changes: dict,
    scenario_name: str | None = None,
) -> dict:
    if churn_model is None or scaler is None:
        raise RuntimeError("Le modele churn n'est pas charge.")

    original_row = {feature: float(base_profile.get(feature, 0) or 0) for feature in MODEL_FEATURES}

    # Build what-if row: apply changes to raw features, then recompute all derived features
    # so interaction features (e.g. Satisfaction_Digital_Interaction) reflect the changes too
    raw_simulated = original_row.copy()
    for feature_name, value in changes.items():
        if feature_name in raw_simulated:
            raw_simulated[feature_name] = float(value or 0)
    simulated_row = recompute_derived_features(raw_simulated)

    original_frame = pd.DataFrame([original_row], columns=MODEL_FEATURES).fillna(0)
    simulated_frame = pd.DataFrame([simulated_row], columns=MODEL_FEATURES).fillna(0)

    original_scaled = scaler.transform(original_frame)
    simulated_scaled = scaler.transform(simulated_frame)

    before = float(churn_model.predict_proba(original_scaled)[0, 1] * 100)
    after = float(churn_model.predict_proba(simulated_scaled)[0, 1] * 100)
    impact = before - after

    rec = get_simulation_recommendation(after, before, impact)

    return {
        "success": True,
        "scenario_name": scenario_name or "Sans nom",
        "score_before": round(before, 1),
        "score_after": round(after, 1),
        "impact": round(impact, 1),
        "impact_percentage": round((impact / before * 100), 1) if before > 0 else 0,
        # Structured recommendation fields
        "risk_category": rec["category"],
        "recommendation_action": rec["action"],
        "recommendation_budget": rec["budget_max"],
        "recommendation_offer": rec["offer"],
        "recommendation_reason": rec["reason"],
        # Legacy field kept for backward compatibility
        "recommendation": f"{rec['action']} — {rec['offer']}",
    }


@app.route("/api/health", methods=["GET"])
def health_check():
    try:
        connection = get_connection()
        connection.close()
        sql_ok = True
    except Exception as exc:
        sql_ok = False
        logger.error("Health SQL error: %s", exc)

    return jsonify(
        {
            "status": "ok",
            "timestamp": datetime.now().isoformat(),
            "models_loaded": churn_model is not None and scaler is not None,
            "recommendation_models_loaded": has_recommendation_ml_artifacts(),
            "recommendation_model_type": recommendation_metadata.get("approach", "fallback_rules"),
            "sql_server": sql_ok,
            "server": _active_connection["server"],
            "database": DATABASE_NAME,
        }
    )


@app.route("/api/load-data", methods=["POST"])
def load_data():
    try:
        dataframe = get_predictions_dataframe(force_refresh=True)
        export_path = PROJECT_ROOT / "ML_ChurnPredictions_SQL_LIVE.csv"
        dataframe[["ClientSK", "Score_Churn", "Classe_Risque"]].to_csv(
            export_path,
            sep=";",
            index=False,
            encoding="utf-8-sig",
        )
        recommendations_dataframe = build_client_recommendations_dataframe(
            dataframe,
            force_refresh=True,
        )
        recommendations_export_path = PROJECT_ROOT / "ML_Recommandations_SQL_LIVE.csv"
        if not recommendations_dataframe.empty:
            recommendations_dataframe.to_csv(
                recommendations_export_path,
                sep=";",
                index=False,
                encoding="utf-8-sig",
            )

        return jsonify(
            {
                "success": True,
                "total_clients": int(len(dataframe)),
                "timestamp": datetime.now().isoformat(),
                "export_file": str(export_path.name),
                "recommendations_export_file": str(recommendations_export_path.name),
            }
        )
    except Exception as exc:
        logger.exception("Erreur load-data")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/dashboard-churn", methods=["GET"])
def dashboard_churn():
    try:
        dataframe = get_predictions_dataframe(copy=False)
        summary = build_dashboard_summary(dataframe)
        return jsonify(
            {
                "total_clients": summary["totalClients"],
                "distribution": summary["distribution"],
                "score_churn_moyen": summary["averageChurnScore"],
                "clients_a_risque": summary["highRiskClients"],
                "pourcentage_risque": summary["highRiskRatio"],
                "timestamp": datetime.now().isoformat(),
            }
        )
    except Exception as exc:
        logger.exception("Erreur dashboard-churn")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/top-at-risk", methods=["GET"])
def top_at_risk():
    try:
        limit = request.args.get("limit", 10, type=int)
        dataframe = get_predictions_dataframe(copy=False)
        top_clients = dataframe.nlargest(limit, "Score_Churn")
        clients = [
            {
                "ClientSK": int(row["ClientSK"]),
                "Score_Churn": float(row["Score_Churn"]),
                "Classe_Risque": str(row["Classe_Risque"]),
            }
            for _, row in top_clients.iterrows()
        ]
        return jsonify({"success": True, "count": len(clients), "clients": clients})
    except Exception as exc:
        logger.exception("Erreur top-at-risk")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/clients-with-scores", methods=["GET"])
def clients_with_scores():
    try:
        limit = request.args.get("limit", type=int)
        dataframe = get_predictions_dataframe(copy=False)

        if limit and limit > 0:
            dataframe = dataframe.head(limit)

        clients = [serialize_client(row) for _, row in dataframe.iterrows()]
        return jsonify(
            {
                "success": True,
                "count": len(clients),
                "source": "sqlserver-live-ml",
                "timestamp": datetime.now().isoformat(),
                "clients": clients,
            }
        )
    except Exception as exc:
        logger.exception("Erreur clients-with-scores")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/churn/clients-risk", methods=["GET"])
def paginated_clients_risk():
    try:
        page = max(request.args.get("page", 0, type=int), 0)
        size = request.args.get("size", DEFAULT_PAGE_SIZE, type=int) or DEFAULT_PAGE_SIZE
        size = max(1, min(size, MAX_PAGE_SIZE))
        sort_by = request.args.get("sortBy", "probabiliteChurn", type=str) or "probabiliteChurn"
        direction = request.args.get("direction", "desc", type=str) or "desc"
        search = request.args.get("search", "", type=str) or ""
        segment = request.args.get("segment", "", type=str) or ""
        gouvernorat = request.args.get("gouvernorat", "", type=str) or ""
        risk_class = (
            request.args.get("riskClass", "", type=str)
            or request.args.get("statutChurn", "", type=str)
            or ""
        )

        dataframe = get_predictions_dataframe(copy=False)
        filtered = filter_clients_dataframe(
            dataframe,
            search=search,
            segment=segment,
            gouvernorat=gouvernorat,
            risk_class=risk_class,
        )
        sorted_dataframe, _, resolved_direction = sort_clients_dataframe(
            filtered,
            sort_by,
            direction,
        )

        total_elements = int(len(sorted_dataframe))
        total_pages = (total_elements + size - 1) // size if total_elements else 0
        start = page * size
        end = start + size
        page_dataframe = sorted_dataframe.iloc[start:end]

        logger.info(
            "Liste churn paginee page=%s size=%s total=%s search=%s sortBy=%s direction=%s",
            page,
            size,
            total_elements,
            search,
            sort_by,
            resolved_direction,
        )

        return jsonify(
            {
                "success": True,
                "content": [serialize_client(row) for _, row in page_dataframe.iterrows()],
                "page": page,
                "size": size,
                "totalElements": total_elements,
                "totalPages": total_pages,
                "sortBy": sort_by,
                "direction": resolved_direction,
                "summary": build_dashboard_summary(dataframe),
                "filters": build_filter_options(dataframe),
                "timestamp": datetime.now().isoformat(),
            }
        )
    except Exception as exc:
        logger.exception("Erreur paginated_clients_risk")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/clients/search", methods=["GET"])
def search_clients():
    try:
        query = (request.args.get("q", "", type=str) or "").strip()
        limit = request.args.get("limit", DEFAULT_SEARCH_LIMIT, type=int) or DEFAULT_SEARCH_LIMIT
        limit = max(1, min(limit, DEFAULT_SEARCH_LIMIT))

        if len(query) < 2 and not query.isdigit():
            return jsonify({"success": True, "count": 0, "clients": []})

        dataframe = get_predictions_dataframe(copy=False)
        filtered = filter_clients_dataframe(dataframe, search=query)

        if query.isdigit():
            exact_match = dataframe[dataframe["ClientSK"] == int(query)]
            if not exact_match.empty:
                filtered = pd.concat([exact_match, filtered]).drop_duplicates(
                    subset=["ClientSK"],
                    keep="first",
                )

        filtered = filtered.sort_values(
            by=["Score_Churn", "ClientSK"],
            ascending=[False, True],
            kind="mergesort",
        )
        results = filtered.head(limit)

        return jsonify(
            {
                "success": True,
                "count": int(len(results)),
                "clients": [serialize_client(row) for _, row in results.iterrows()],
            }
        )
    except Exception as exc:
        logger.exception("Erreur clients/search")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/clients/<int:client_id>", methods=["GET"])
def get_client_details(client_id: int):
    try:
        dataframe = get_predictions_dataframe(copy=False)
        row = get_client_row(dataframe, client_id)

        if row is None:
            return jsonify({"error": f"Client {client_id} non trouve"}), 404

        return jsonify({"success": True, "client": serialize_client(row)})
    except Exception as exc:
        logger.exception("Erreur client details")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/recommendations", methods=["GET"])
def get_recommendations():
    try:
        limit = request.args.get("limit", DEFAULT_RECOMMENDATION_LIMIT, type=int)
        limit = max(1, min(limit or DEFAULT_RECOMMENDATION_LIMIT, 12))

        source = (
            "ml_product_propensity_live"
            if has_recommendation_ml_artifacts()
            else "rule_baseline_recommandations_live"
        )
        try:
            predictions_dataframe = get_predictions_dataframe(copy=False)
            recommendations_dataframe = build_client_recommendations_dataframe(predictions_dataframe)
        except Exception as live_error:
            logger.warning(
                "Live SQL recommendations unavailable, using exported recommendations: %s",
                live_error,
            )
            recommendations_dataframe = load_exported_recommendations_dataframe()
            predictions_dataframe = build_predictions_from_recommendations_export(
                recommendations_dataframe,
            )
            source = "ml_recommandations_export_fallback"

        recommendations = build_segment_recommendations(
            predictions_dataframe,
            recommendations_dataframe,
            limit=limit,
        )

        return jsonify(
            {
                "success": True,
                "source": source,
                "count": len(recommendations),
                "recommendations": recommendations,
                "timestamp": datetime.now().isoformat(),
            }
        )
    except Exception as exc:
        logger.exception("Erreur recommendations")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/feature-importance", methods=["GET"])
def feature_importance():
    try:
        return jsonify(
            {
                "success": True,
                "features": feature_importance_payload(),
                "timestamp": datetime.now().isoformat(),
            }
        )
    except Exception as exc:
        logger.exception("Erreur feature-importance")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/predict-churn", methods=["POST"])
def predict_churn():
    try:
        payload = request.json or {}
        client_sk = payload.get("ClientSK")

        if client_sk is not None:
            dataframe = get_predictions_dataframe(copy=False)
            row = get_client_row(dataframe, int(client_sk))
            if row is None:
                return jsonify({"error": f"Client {client_sk} non trouve"}), 404

            return jsonify(
                {
                    "success": True,
                    "ClientSK": int(row["ClientSK"]),
                    "Score_Churn": float(row["Score_Churn"]),
                    "Classe_Risque": str(row["Classe_Risque"]),
                    "Age": int(row.get("Age") or 0),
                    "Score_Satisfaction": int(row.get("Score_Satisfaction") or 0),
                    "Nb_Produits": int(row.get("Nb_Produits") or 0),
                    "Solde_Compte": float(row.get("Solde_Compte") or 0),
                    "Actions_Recommandees": get_actions(str(row["Classe_Risque"])),
                    "timestamp": datetime.now().isoformat(),
                }
            )

        base_profile = {feature: payload.get(feature, 0) for feature in MODEL_FEATURES}
        simulation = build_simulation_result(base_profile, {}, payload.get("scenario_name"))
        return jsonify(
            {
                "success": True,
                "Score_Churn": simulation["score_before"],
                "Classe_Risque": classify_risk(simulation["score_before"]),
                "Actions_Recommandees": get_actions(classify_risk(simulation["score_before"])),
                "timestamp": datetime.now().isoformat(),
            }
        )
    except Exception as exc:
        logger.exception("Erreur predict-churn")
        return jsonify({"error": str(exc)}), 500


@app.route("/api/simulate-churn", methods=["POST"])
def simulate_churn():
    try:
        payload = request.json or {}
        client_id = payload.get("client_id") or payload.get("ClientSK")

        if client_id is not None:
            dataframe = get_predictions_dataframe(copy=False)
            row = get_client_row(dataframe, int(client_id))
            if row is None:
                return jsonify({"error": f"Client {client_id} non trouve"}), 404
            base_profile = build_base_profile_from_row(row)
        else:
            base_profile = payload.get("base_profile", {})

        changes = payload.get("changes", {})
        scenario_name = payload.get("scenario_name")
        result = build_simulation_result(base_profile, changes, scenario_name)
        post_score = float(result.get("score_after") or 0)
        simulation_recommendation = get_simulation_recommendation(
            post_score,
            float(result.get("score_before") or 0),
            float(result.get("impact") or 0),
        )

        # Guard the public API contract even if an older helper shape is loaded in memory.
        result["risk_category"] = str(
            result.get("risk_category")
            or simulation_recommendation["category"]
            or classify_risk(post_score)
        )
        result["recommendation_action"] = str(
            result.get("recommendation_action")
            or simulation_recommendation["action"]
        )
        result["recommendation_budget"] = int(
            result.get("recommendation_budget")
            or simulation_recommendation["budget_max"]
            or 0
        )
        result["recommendation_offer"] = str(
            result.get("recommendation_offer")
            or simulation_recommendation["offer"]
        )
        result["recommendation_reason"] = str(
            result.get("recommendation_reason")
            or simulation_recommendation["reason"]
        )
        result["recommendation"] = str(
            result.get("recommendation")
            or f"{result['recommendation_action']} - {result['recommendation_offer']}"
        )

        logger.info(
            "Simulation live client=%s scenario=%s before=%.1f after=%.1f impact=%.1f keys=%s",
            client_id,
            scenario_name or "Sans nom",
            result["score_before"],
            result["score_after"],
            result["impact"],
            sorted(result.keys()),
        )

        return jsonify(result)
    except Exception as exc:
        logger.exception("Erreur simulate-churn")
        return jsonify({"error": str(exc)}), 500


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print(f"API ML - Demarrage sur http://localhost:{ML_API_PORT}")
    print(f"Base de donnees cible : {DATABASE_NAME}")
    print("=" * 60)
    print("\nEndpoints disponibles:")
    print("  GET  /api/health")
    print("  POST /api/load-data")
    print("  GET  /api/dashboard-churn")
    print("  GET  /api/top-at-risk")
    print("  GET  /api/clients-with-scores")
    print("  GET  /api/churn/clients-risk")
    print("  GET  /api/clients/search")
    print("  GET  /api/clients/<id>")
    print("  GET  /api/recommendations")
    print("  GET  /api/feature-importance")
    print("  POST /api/predict-churn")
    print("  POST /api/simulate-churn")
    print("=" * 60 + "\n")
    app.run(debug=False, use_reloader=False, port=ML_API_PORT, threaded=True)
