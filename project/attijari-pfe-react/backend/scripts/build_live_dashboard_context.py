from __future__ import annotations

import json
import math
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
sys.stderr.reconfigure(encoding="utf-8", errors="replace")


DATAFRAME_CACHE: dict[str, pd.DataFrame] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def text(value) -> str:
    if pd.isna(value):
        return ""

    return str(value).strip()


def normalize_text(value) -> str:
    return (
        unicodedata.normalize("NFKD", text(value))
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )


def safe_round(value, digits: int = 2) -> float:
    try:
        numeric_value = float(value)
    except (TypeError, ValueError):
        return 0.0

    if not math.isfinite(numeric_value):
        return 0.0

    return round(numeric_value, digits)


def pct(part, total, digits: int = 2) -> float:
    try:
        total_value = float(total)
    except (TypeError, ValueError):
        total_value = 0.0

    if total_value <= 0:
        return 0.0

    return safe_round((float(part) / total_value) * 100, digits)


def numeric_series(series: pd.Series) -> pd.Series:
    return pd.to_numeric(
        series.astype(str)
        .str.replace("\u00A0", "", regex=False)
        .str.replace(" ", "", regex=False)
        .str.replace("%", "", regex=False)
        .str.replace("$", "", regex=False)
        .str.replace(",", ".", regex=False),
        errors="coerce",
    )


def read_csv_cached(cache_key: str, file_path: str, *, sep: str, encoding: str) -> pd.DataFrame:
    if cache_key not in DATAFRAME_CACHE:
        DATAFRAME_CACHE[cache_key] = pd.read_csv(
            Path(file_path),
            sep=sep,
            encoding=encoding,
        )

    return DATAFRAME_CACHE[cache_key].copy()


def read_excel_cached(cache_key: str, file_path: str, *, sheet_name: str) -> pd.DataFrame:
    if cache_key not in DATAFRAME_CACHE:
        DATAFRAME_CACHE[cache_key] = pd.read_excel(
            Path(file_path),
            sheet_name=sheet_name,
        )

    return DATAFRAME_CACHE[cache_key].copy()


def build_top_counts(series: pd.Series, *, label_key: str, count_key: str, top_n: int = 5):
    cleaned = series.dropna().astype(str).str.strip()
    counts = cleaned.value_counts().head(top_n)
    total = int(cleaned.shape[0])

    return [
        {
            label_key: label,
            count_key: int(count),
            "sharePct": pct(count, total),
        }
        for label, count in counts.items()
    ]


def build_group_average(
    dataframe: pd.DataFrame,
    *,
    group_column: str,
    value_column: str,
    label_key: str,
    value_key: str,
    top_n: int = 5,
    ascending: bool = False,
):
    grouped = (
        dataframe.dropna(subset=[group_column, value_column])
        .groupby(group_column, dropna=True)[value_column]
        .agg(["mean", "count"])
        .reset_index()
        .sort_values(["mean", "count"], ascending=[ascending, False])
        .head(top_n)
    )

    return [
        {
            label_key: text(row[group_column]),
            value_key: safe_round(row["mean"], 2),
            "sampleSize": int(row["count"]),
        }
        for _, row in grouped.iterrows()
    ]


def load_google_campaigns(config: dict) -> pd.DataFrame:
    dataframe = read_csv_cached(
        "google_campaigns",
        config["googleCampaignsFilePath"],
        sep=";",
        encoding="latin1",
    )
    numeric_columns = [
        "Impressions",
        "Interactions",
        "Clics",
        "CTR",
        "CPC_Moyen_USD",
        "CPM_Moyen_USD",
        "CPA_USD",
        "Taux_Conversion",
        "Budget_Estime_USD",
    ]

    for column in numeric_columns:
        if column in dataframe.columns:
            dataframe[column] = numeric_series(dataframe[column])

    return dataframe


def load_meta_campaigns(config: dict) -> pd.DataFrame:
    dataframe = read_csv_cached(
        "meta_campaigns",
        config["metaCampaignsFilePath"],
        sep=";",
        encoding="latin1",
    )
    numeric_columns = [
        "Impressions",
        "Couverture",
        "Clics_Tous",
        "CTR_Tous",
        "CPC_USD",
        "CPM_USD",
        "Clics_Sur_Lien",
        "CTR_Lien",
        "Vues_Page_Destination",
        "Lectures_Video",
        "Lectures_Video_3Sec",
        "Commentaires",
        "Reactions",
        "Partages",
    ]

    for column in numeric_columns:
        if column in dataframe.columns:
            dataframe[column] = numeric_series(dataframe[column])

    return dataframe


def load_complaints(config: dict) -> pd.DataFrame:
    dataframe = read_csv_cached(
        "complaints",
        config["complaintsFilePath"],
        sep=";",
        encoding="utf-8",
    )
    dataframe["Temps_Resolution_Days"] = numeric_series(dataframe["Temps_Resolution_Days"])
    dataframe["Satisfaction_Post_Resolution"] = numeric_series(
        dataframe["Satisfaction_Post_Resolution"]
    )
    dataframe["statusNormalized"] = dataframe["Statut_Resolution"].map(normalize_text)
    return dataframe


def load_master_clients(config: dict) -> pd.DataFrame:
    dataframe = read_csv_cached(
        "master_clients",
        config["masterClientsFilePath"],
        sep=";",
        encoding="utf-8",
    )
    dataframe["A_Quitte"] = numeric_series(dataframe["A_Quitte"])
    dataframe["Score_Satisfaction"] = numeric_series(dataframe["Score_Satisfaction"])
    return dataframe


def load_agencies(config: dict) -> pd.DataFrame:
    dataframe = read_excel_cached(
        "agencies",
        config["agenciesFilePath"],
        sheet_name="SA_AvisAgence",
    )
    for column in ["Note_Google", "Nb_Avis", "Satisfaction_Score", "Nb_Reclamations"]:
        if column in dataframe.columns:
            dataframe[column] = numeric_series(dataframe[column])

    return dataframe


def load_social_posts(config: dict) -> pd.DataFrame:
    dataframe = read_excel_cached(
        "social_posts",
        config["socialPostsFilePath"],
        sheet_name="Posts Attijari",
    )
    numeric_columns = [
        "Nb Likes",
        "Nb Commentaires",
        "Nb Partages",
        "Vues",
        "Nb Hashtags",
        "Engagement total",
    ]

    for column in numeric_columns:
        if column in dataframe.columns:
            dataframe[column] = numeric_series(dataframe[column])

    return dataframe


def load_competitor_posts(config: dict, sheet_name: str) -> pd.DataFrame:
    dataframe = read_excel_cached(
        f"competitor_{sheet_name}",
        config["competitorsWorkbookFilePath"],
        sheet_name=sheet_name,
    )
    for column in ["Nb Likes", "Nb Commentaires", "Nb Partages", "Vues", "Nb Hashtags", "Engagement total"]:
        if column in dataframe.columns:
            dataframe[column] = numeric_series(dataframe[column])

    return dataframe


def load_churn_clients(config: dict) -> pd.DataFrame:
    dataframe = read_csv_cached(
        "churn_clients",
        config["churnClientsFilePath"],
        sep=";",
        encoding="utf-8-sig",
    )
    dataframe["A_Quitte"] = numeric_series(dataframe["A_Quitte"])
    return dataframe


def load_churn_predictions(config: dict) -> pd.DataFrame:
    dataframe = read_csv_cached(
        "churn_predictions",
        config["churnPredictionsFilePath"],
        sep=";",
        encoding="utf-8-sig",
    )
    dataframe["Score_Churn"] = numeric_series(dataframe["Score_Churn"])
    dataframe["Classe_Risque_Normalisee"] = dataframe["Classe_Risque"].map(normalize_text)
    return dataframe


def get_campaign_metrics(config: dict) -> dict:
    google = load_google_campaigns(config)
    meta = load_meta_campaigns(config)

    google_impressions = float(google["Impressions"].fillna(0).sum())
    meta_impressions = float(meta["Impressions"].fillna(0).sum())
    google_clicks = float(google["Clics"].fillna(0).sum())
    meta_clicks = float(meta["Clics_Tous"].fillna(0).sum())
    total_impressions = google_impressions + meta_impressions
    total_clicks = google_clicks + meta_clicks

    google_budget = float(google["Budget_Estime_USD"].fillna(0).sum())
    google_ctr = pct(google_clicks, google_impressions)
    meta_ctr = pct(meta_clicks, meta_impressions)
    global_ctr = pct(total_clicks, total_impressions)

    top_google = (
        google.sort_values("Clics", ascending=False)
        .head(5)[["Nom_Campagne", "Clics", "CTR", "Budget_Estime_USD"]]
        .fillna(0)
    )
    top_meta = (
        meta.sort_values("Clics_Tous", ascending=False)
        .head(5)[["Nom_Campagne", "Clics_Tous", "CTR_Tous", "Couverture"]]
        .fillna(0)
    )

    return {
        "totalCampaigns": int(len(google) + len(meta)),
        "globalMetrics": {
            "totalImpressions": int(total_impressions),
            "totalClicks": int(total_clicks),
            "globalCtrPct": global_ctr,
            "googleBudgetUsd": safe_round(google_budget, 2),
            "metaCoverage": int(meta["Couverture"].fillna(0).sum()),
        },
        "googleMetrics": {
            "campaignCount": int(len(google)),
            "impressions": int(google_impressions),
            "clicks": int(google_clicks),
            "ctrPct": google_ctr,
            "averageCpaUsd": safe_round(google["CPA_USD"].dropna().mean(), 2),
            "averageCpcUsd": safe_round(google["CPC_Moyen_USD"].dropna().mean(), 2),
            "averageConversionRatePct": safe_round(google["Taux_Conversion"].dropna().mean(), 2),
            "budgetUsd": safe_round(google_budget, 2),
        },
        "metaMetrics": {
            "campaignCount": int(len(meta)),
            "impressions": int(meta_impressions),
            "coverage": int(meta["Couverture"].fillna(0).sum()),
            "clicks": int(meta_clicks),
            "ctrPct": meta_ctr,
            "linkCtrPct": pct(
                float(meta["Clics_Sur_Lien"].fillna(0).sum()),
                meta_impressions,
            ),
            "averageCpcUsd": safe_round(meta["CPC_USD"].dropna().mean(), 2),
            "landingPageViews": int(meta["Vues_Page_Destination"].fillna(0).sum()),
            "videoPlays": int(meta["Lectures_Video"].fillna(0).sum()),
        },
        "platformComparison": [
            {
                "platform": "Google",
                "campaignCount": int(len(google)),
                "impressions": int(google_impressions),
                "clicks": int(google_clicks),
                "ctrPct": google_ctr,
            },
            {
                "platform": "Meta",
                "campaignCount": int(len(meta)),
                "impressions": int(meta_impressions),
                "clicks": int(meta_clicks),
                "ctrPct": meta_ctr,
            },
        ],
        "topGoogleCampaignsByClicks": [
            {
                "campaignName": text(row["Nom_Campagne"]),
                "clicks": int(row["Clics"]),
                "ctrPct": safe_round(row["CTR"], 2),
                "budgetUsd": safe_round(row["Budget_Estime_USD"], 2),
            }
            for _, row in top_google.iterrows()
        ],
        "topMetaCampaignsByClicks": [
            {
                "campaignName": text(row["Nom_Campagne"]),
                "clicks": int(row["Clics_Tous"]),
                "ctrPct": safe_round(row["CTR_Tous"], 2),
                "coverage": int(row["Couverture"]),
            }
            for _, row in top_meta.iterrows()
        ],
    }


def get_complaint_metrics(config: dict) -> dict:
    complaints = load_complaints(config)
    clients = load_master_clients(config)

    complainant_ids = complaints["ID_Client"].astype(str).str.strip()
    client_id_column = "ClientSK" if "ClientSK" in clients.columns else "ID_Client"
    clients["matchingClientId"] = clients[client_id_column].astype(str).str.strip()
    matched_complainants = clients[clients["matchingClientId"].isin(set(complainant_ids))]

    resolved_mask = complaints["statusNormalized"].str.contains("resolu", na=False)
    escalated_mask = complaints["statusNormalized"].str.contains("escalad", na=False)
    open_mask = complaints["statusNormalized"].str.contains("cours", na=False)
    long_cases_mask = complaints["Temps_Resolution_Days"].fillna(0) > 15

    status_breakdown = (
        complaints["Statut_Resolution"]
        .fillna("Inconnu")
        .astype(str)
        .str.strip()
        .value_counts()
    )

    segment_breakdown = (
        matched_complainants["Segment_Client"].fillna("Inconnu").astype(str).str.strip().value_counts().head(4)
    )

    return {
        "totalComplaints": int(len(complaints)),
        "uniqueComplainants": int(complainant_ids.nunique()),
        "resolutionRatePct": pct(resolved_mask.sum(), len(complaints)),
        "escalationRatePct": pct(escalated_mask.sum(), len(complaints)),
        "openCasesRatePct": pct(open_mask.sum(), len(complaints)),
        "averageResolutionDays": safe_round(complaints["Temps_Resolution_Days"].dropna().mean(), 2),
        "averagePostResolutionSatisfaction": safe_round(
            complaints["Satisfaction_Post_Resolution"].dropna().mean(),
            2,
        ),
        "casesOver15DaysPct": pct(long_cases_mask.sum(), len(complaints)),
        "complainantChurnRatePct": safe_round(matched_complainants["A_Quitte"].dropna().mean() * 100, 2),
        "portfolioChurnRatePct": safe_round(clients["A_Quitte"].dropna().mean() * 100, 2),
        "topComplaintMotifs": build_top_counts(
            complaints["Motif_Reclamation"],
            label_key="motif",
            count_key="complaintCount",
        ),
        "topGovernorates": build_top_counts(
            complaints["Gouvernorat"],
            label_key="governorate",
            count_key="complaintCount",
        ),
        "statusBreakdown": [
            {
                "status": status,
                "complaintCount": int(count),
                "sharePct": pct(count, len(complaints)),
            }
            for status, count in status_breakdown.items()
        ],
        "complainantSegments": [
            {
                "segment": segment,
                "clientCount": int(count),
                "sharePct": pct(count, len(matched_complainants)),
            }
            for segment, count in segment_breakdown.items()
        ],
    }


def get_agency_metrics(config: dict) -> dict:
    agencies = load_agencies(config)

    top_reviewed = (
        agencies.sort_values("Nb_Avis", ascending=False)
        .head(5)[["Nom_Agence", "Gouvernorat", "Note_Google", "Nb_Avis"]]
        .fillna(0)
    )

    return {
        "totalAgencies": int(len(agencies)),
        "totalGoogleReviews": int(agencies["Nb_Avis"].fillna(0).sum()),
        "averageGoogleRating": safe_round(agencies["Note_Google"].dropna().mean(), 2),
        "averageSatisfactionScore": safe_round(
            agencies["Satisfaction_Score"].dropna().mean(),
            2,
        ),
        "criticalAgencies": int((agencies["Note_Google"].fillna(0) < 3).sum()),
        "excellentAgencies": int((agencies["Note_Google"].fillna(0) >= 4).sum()),
        "belowBankingThresholdPct": pct(
            (agencies["Note_Google"].fillna(0) < 3.5).sum(),
            len(agencies),
        ),
        "topGovernoratesByRating": build_group_average(
            agencies,
            group_column="Gouvernorat",
            value_column="Note_Google",
            label_key="governorate",
            value_key="averageRating",
            top_n=5,
            ascending=False,
        ),
        "bottomGovernoratesByRating": build_group_average(
            agencies,
            group_column="Gouvernorat",
            value_column="Note_Google",
            label_key="governorate",
            value_key="averageRating",
            top_n=5,
            ascending=True,
        ),
        "ratingCategoryBreakdown": build_top_counts(
            agencies["Categorie_Note"],
            label_key="category",
            count_key="agencyCount",
        ),
        "topReviewedAgencies": [
            {
                "agency": text(row["Nom_Agence"]),
                "governorate": text(row["Gouvernorat"]),
                "averageRating": safe_round(row["Note_Google"], 2),
                "reviewCount": int(row["Nb_Avis"]),
            }
            for _, row in top_reviewed.iterrows()
        ],
    }


def get_social_metrics(config: dict) -> dict:
    posts = load_social_posts(config)
    bh_posts = load_competitor_posts(config, "BH Bank Facebook")
    biat_posts = load_competitor_posts(config, "BIAT Facebook")

    by_source = (
        posts.groupby("Source", dropna=False)["Engagement total"]
        .agg(["sum", "mean", "count"])
        .reset_index()
        .sort_values("sum", ascending=False)
    )
    by_type = (
        posts.groupby("Type de post", dropna=False)["Engagement total"]
        .agg(["mean", "count"])
        .reset_index()
        .sort_values("mean", ascending=False)
        .head(5)
    )
    top_posts = (
        posts.sort_values("Engagement total", ascending=False)
        .head(5)[["Source", "Type de post", "Engagement total", "Nb Likes", "Nb Commentaires", "Nb Partages"]]
        .fillna(0)
    )

    benchmark = [
        {
            "brand": "Attijari Bank",
            "postCount": int(len(posts)),
            "totalEngagement": int(posts["Engagement total"].fillna(0).sum()),
            "averageEngagementPerPost": safe_round(posts["Engagement total"].dropna().mean(), 2),
        },
        {
            "brand": "BH Bank",
            "postCount": int(len(bh_posts)),
            "totalEngagement": int(bh_posts["Engagement total"].fillna(0).sum()),
            "averageEngagementPerPost": safe_round(bh_posts["Engagement total"].dropna().mean(), 2),
        },
        {
            "brand": "BIAT",
            "postCount": int(len(biat_posts)),
            "totalEngagement": int(biat_posts["Engagement total"].fillna(0).sum()),
            "averageEngagementPerPost": safe_round(biat_posts["Engagement total"].dropna().mean(), 2),
        },
    ]

    return {
        "totalPosts": int(len(posts)),
        "totalEngagement": int(posts["Engagement total"].fillna(0).sum()),
        "averageEngagementPerPost": safe_round(posts["Engagement total"].dropna().mean(), 2),
        "totalLikes": int(posts["Nb Likes"].fillna(0).sum()),
        "totalComments": int(posts["Nb Commentaires"].fillna(0).sum()),
        "totalShares": int(posts["Nb Partages"].fillna(0).sum()),
        "engagementBySource": [
            {
                "source": text(row["Source"]),
                "postCount": int(row["count"]),
                "totalEngagement": int(row["sum"]),
                "averageEngagementPerPost": safe_round(row["mean"], 2),
            }
            for _, row in by_source.iterrows()
        ],
        "postTypePerformance": [
            {
                "postType": text(row["Type de post"]),
                "postCount": int(row["count"]),
                "averageEngagementPerPost": safe_round(row["mean"], 2),
            }
            for _, row in by_type.iterrows()
        ],
        "competitiveBenchmark": benchmark,
        "topPosts": [
            {
                "source": text(row["Source"]),
                "postType": text(row["Type de post"]),
                "engagement": int(row["Engagement total"]),
                "likes": int(row["Nb Likes"]),
                "comments": int(row["Nb Commentaires"]),
                "shares": int(row["Nb Partages"]),
            }
            for _, row in top_posts.iterrows()
        ],
    }


def get_churn_metrics(config: dict) -> dict:
    clients = load_churn_clients(config)
    predictions = load_churn_predictions(config)
    high_risk_mask = predictions["Classe_Risque_Normalisee"].isin(["eleve", "critique"])
    risk_breakdown = predictions["Classe_Risque"].fillna("Inconnu").astype(str).str.strip().value_counts()

    return {
        "totalClients": int(len(clients)),
        "actualChurnRatePct": safe_round(clients["A_Quitte"].dropna().mean() * 100, 2),
        "churnedClients": int(clients["A_Quitte"].fillna(0).sum()),
        "scoredClients": int(len(predictions)),
        "highRiskClients": int(high_risk_mask.sum()),
        "highRiskSharePct": pct(high_risk_mask.sum(), len(predictions)),
        "averageScoreChurnPct": safe_round(predictions["Score_Churn"].dropna().mean(), 2),
        "riskDistribution": [
            {
                "riskClass": risk_class,
                "clientCount": int(count),
                "sharePct": pct(count, len(predictions)),
            }
            for risk_class, count in risk_breakdown.items()
        ],
    }


def build_campaigns_context(config: dict, filters: dict) -> dict:
    metrics = get_campaign_metrics(config)
    selected_view = normalize_text(filters.get("view") or filters.get("platform") or "all")

    if "google" in selected_view:
        return {
            "source": "live-local-campaign-datasets",
            "title": "Campagnes Google",
            "selectedView": "google",
            "extractedAt": now_iso(),
            "dataOrigin": {
                "googleDataset": Path(config["googleCampaignsFilePath"]).name,
            },
            "kpis": [
                {"label": "Campagnes Google", "value": metrics["googleMetrics"]["campaignCount"], "unit": "count"},
                {"label": "Impressions", "value": metrics["googleMetrics"]["impressions"], "unit": "count"},
                {"label": "Clics", "value": metrics["googleMetrics"]["clicks"], "unit": "count"},
                {"label": "CTR", "value": metrics["googleMetrics"]["ctrPct"], "unit": "pct"},
                {"label": "CPA moyen", "value": metrics["googleMetrics"]["averageCpaUsd"], "unit": "usd"},
                {"label": "Budget estime", "value": metrics["googleMetrics"]["budgetUsd"], "unit": "usd"},
            ],
            "googleMetrics": metrics["googleMetrics"],
            "topCampaignsByClicks": metrics["topGoogleCampaignsByClicks"],
        }

    if "meta" in selected_view:
        return {
            "source": "live-local-campaign-datasets",
            "title": "Campagnes Meta",
            "selectedView": "meta",
            "extractedAt": now_iso(),
            "dataOrigin": {
                "metaDataset": Path(config["metaCampaignsFilePath"]).name,
            },
            "kpis": [
                {"label": "Campagnes Meta", "value": metrics["metaMetrics"]["campaignCount"], "unit": "count"},
                {"label": "Impressions", "value": metrics["metaMetrics"]["impressions"], "unit": "count"},
                {"label": "Couverture", "value": metrics["metaMetrics"]["coverage"], "unit": "count"},
                {"label": "Clics", "value": metrics["metaMetrics"]["clicks"], "unit": "count"},
                {"label": "CTR", "value": metrics["metaMetrics"]["ctrPct"], "unit": "pct"},
                {"label": "CTR lien", "value": metrics["metaMetrics"]["linkCtrPct"], "unit": "pct"},
            ],
            "metaMetrics": metrics["metaMetrics"],
            "topCampaignsByClicks": metrics["topMetaCampaignsByClicks"],
        }

    return {
        "source": "live-local-campaign-datasets",
        "title": "Campagnes",
        "selectedView": "global",
        "extractedAt": now_iso(),
        "dataOrigin": {
            "googleDataset": Path(config["googleCampaignsFilePath"]).name,
            "metaDataset": Path(config["metaCampaignsFilePath"]).name,
        },
        "kpis": [
            {"label": "Campagnes totales", "value": metrics["totalCampaigns"], "unit": "count"},
            {"label": "Impressions totales", "value": metrics["globalMetrics"]["totalImpressions"], "unit": "count"},
            {"label": "Clics totaux", "value": metrics["globalMetrics"]["totalClicks"], "unit": "count"},
            {"label": "CTR global", "value": metrics["globalMetrics"]["globalCtrPct"], "unit": "pct"},
            {"label": "Budget Google estime", "value": metrics["globalMetrics"]["googleBudgetUsd"], "unit": "usd"},
            {"label": "Couverture Meta", "value": metrics["globalMetrics"]["metaCoverage"], "unit": "count"},
        ],
        "globalMetrics": metrics["globalMetrics"],
        "platformComparison": metrics["platformComparison"],
        "topGoogleCampaignsByClicks": metrics["topGoogleCampaignsByClicks"][:3],
        "topMetaCampaignsByClicks": metrics["topMetaCampaignsByClicks"][:3],
    }


def build_complaints_context(config: dict) -> dict:
    metrics = get_complaint_metrics(config)

    return {
        "source": "live-local-complaints-dataset",
        "title": "Reclamations",
        "extractedAt": now_iso(),
        "dataOrigin": {
            "complaintsDataset": Path(config["complaintsFilePath"]).name,
            "clientsDataset": Path(config["masterClientsFilePath"]).name,
        },
        "kpis": [
            {"label": "Total reclamations", "value": metrics["totalComplaints"], "unit": "count"},
            {"label": "Reclamants uniques", "value": metrics["uniqueComplainants"], "unit": "count"},
            {"label": "Taux de resolution", "value": metrics["resolutionRatePct"], "unit": "pct"},
            {"label": "Taux d escalade", "value": metrics["escalationRatePct"], "unit": "pct"},
            {"label": "Delai moyen de resolution", "value": metrics["averageResolutionDays"], "unit": "days"},
            {
                "label": "Satisfaction post-resolution",
                "value": metrics["averagePostResolutionSatisfaction"],
                "unit": "score",
            },
            {"label": "Taux churn reclamants", "value": metrics["complainantChurnRatePct"], "unit": "pct"},
        ],
        "serviceQuality": {
            "resolutionRatePct": metrics["resolutionRatePct"],
            "escalationRatePct": metrics["escalationRatePct"],
            "openCasesRatePct": metrics["openCasesRatePct"],
            "casesOver15DaysPct": metrics["casesOver15DaysPct"],
            "averageResolutionDays": metrics["averageResolutionDays"],
            "averagePostResolutionSatisfaction": metrics["averagePostResolutionSatisfaction"],
        },
        "complainantImpact": {
            "complainantChurnRatePct": metrics["complainantChurnRatePct"],
            "portfolioChurnRatePct": metrics["portfolioChurnRatePct"],
            "gapVsPortfolioPct": safe_round(
                metrics["complainantChurnRatePct"] - metrics["portfolioChurnRatePct"],
                2,
            ),
        },
        "topComplaintMotifs": metrics["topComplaintMotifs"],
        "topGovernorates": metrics["topGovernorates"],
        "statusBreakdown": metrics["statusBreakdown"],
        "complainantSegments": metrics["complainantSegments"],
    }


def build_agencies_context(config: dict) -> dict:
    metrics = get_agency_metrics(config)

    return {
        "source": "live-local-agency-ratings-dataset",
        "title": "Agences",
        "extractedAt": now_iso(),
        "dataOrigin": {
            "agenciesDataset": Path(config["agenciesFilePath"]).name,
        },
        "kpis": [
            {"label": "Agences evaluees", "value": metrics["totalAgencies"], "unit": "count"},
            {"label": "Avis Google", "value": metrics["totalGoogleReviews"], "unit": "count"},
            {"label": "Note Google moyenne", "value": metrics["averageGoogleRating"], "unit": "score"},
            {"label": "Satisfaction moyenne", "value": metrics["averageSatisfactionScore"], "unit": "score"},
            {"label": "Agences critiques", "value": metrics["criticalAgencies"], "unit": "count"},
            {"label": "Agences excellentes", "value": metrics["excellentAgencies"], "unit": "count"},
            {
                "label": "Part sous seuil 3.5",
                "value": metrics["belowBankingThresholdPct"],
                "unit": "pct",
            },
        ],
        "ratingOverview": {
            "averageGoogleRating": metrics["averageGoogleRating"],
            "averageSatisfactionScore": metrics["averageSatisfactionScore"],
            "criticalAgencies": metrics["criticalAgencies"],
            "excellentAgencies": metrics["excellentAgencies"],
            "belowBankingThresholdPct": metrics["belowBankingThresholdPct"],
        },
        "topGovernoratesByRating": metrics["topGovernoratesByRating"],
        "bottomGovernoratesByRating": metrics["bottomGovernoratesByRating"],
        "ratingCategoryBreakdown": metrics["ratingCategoryBreakdown"],
        "topReviewedAgencies": metrics["topReviewedAgencies"],
    }


def build_social_context(config: dict) -> dict:
    metrics = get_social_metrics(config)

    return {
        "source": "live-local-social-datasets",
        "title": "Social Media",
        "extractedAt": now_iso(),
        "dataOrigin": {
            "attijariDataset": Path(config["socialPostsFilePath"]).name,
            "competitorDataset": Path(config["competitorsWorkbookFilePath"]).name,
        },
        "kpis": [
            {"label": "Posts Attijari", "value": metrics["totalPosts"], "unit": "count"},
            {"label": "Engagement total", "value": metrics["totalEngagement"], "unit": "count"},
            {
                "label": "Engagement moyen par post",
                "value": metrics["averageEngagementPerPost"],
                "unit": "count",
            },
            {"label": "Likes", "value": metrics["totalLikes"], "unit": "count"},
            {"label": "Commentaires", "value": metrics["totalComments"], "unit": "count"},
            {"label": "Partages", "value": metrics["totalShares"], "unit": "count"},
        ],
        "channelMix": metrics["engagementBySource"],
        "postTypePerformance": metrics["postTypePerformance"],
        "competitiveBenchmark": metrics["competitiveBenchmark"],
        "topPosts": metrics["topPosts"],
    }


def build_overview_context(config: dict) -> dict:
    churn = get_churn_metrics(config)
    campaigns = get_campaign_metrics(config)
    complaints = get_complaint_metrics(config)
    agencies = get_agency_metrics(config)
    social = get_social_metrics(config)

    attijari_benchmark = next(
        (
            item
            for item in social["competitiveBenchmark"]
            if item["brand"] == "Attijari Bank"
        ),
        None,
    )
    bh_benchmark = next(
        (item for item in social["competitiveBenchmark"] if item["brand"] == "BH Bank"),
        None,
    )
    biat_benchmark = next(
        (item for item in social["competitiveBenchmark"] if item["brand"] == "BIAT"),
        None,
    )

    return {
        "source": "live-local-overview-datasets",
        "title": "Vue globale",
        "extractedAt": now_iso(),
        "kpis": [
            {"label": "Total clients", "value": churn["totalClients"], "unit": "count"},
            {"label": "Taux churn reel", "value": churn["actualChurnRatePct"], "unit": "pct"},
            {"label": "Clients a risque eleve", "value": churn["highRiskClients"], "unit": "count"},
            {"label": "Reclamations", "value": complaints["totalComplaints"], "unit": "count"},
            {"label": "Taux resolution reclamations", "value": complaints["resolutionRatePct"], "unit": "pct"},
            {"label": "Note Google agences", "value": agencies["averageGoogleRating"], "unit": "score"},
            {"label": "Campagnes totales", "value": campaigns["totalCampaigns"], "unit": "count"},
            {"label": "Engagement social total", "value": social["totalEngagement"], "unit": "count"},
        ],
        "portfolio": {
            "totalClients": churn["totalClients"],
            "actualChurnRatePct": churn["actualChurnRatePct"],
            "churnedClients": churn["churnedClients"],
            "highRiskClients": churn["highRiskClients"],
            "highRiskSharePct": churn["highRiskSharePct"],
            "averageScoreChurnPct": churn["averageScoreChurnPct"],
        },
        "serviceQuality": {
            "totalComplaints": complaints["totalComplaints"],
            "resolutionRatePct": complaints["resolutionRatePct"],
            "escalationRatePct": complaints["escalationRatePct"],
            "casesOver15DaysPct": complaints["casesOver15DaysPct"],
            "complainantChurnRatePct": complaints["complainantChurnRatePct"],
        },
        "networkPerception": {
            "totalAgencies": agencies["totalAgencies"],
            "averageGoogleRating": agencies["averageGoogleRating"],
            "criticalAgencies": agencies["criticalAgencies"],
            "belowBankingThresholdPct": agencies["belowBankingThresholdPct"],
        },
        "marketingReach": {
            "totalCampaigns": campaigns["totalCampaigns"],
            "totalImpressions": campaigns["globalMetrics"]["totalImpressions"],
            "totalClicks": campaigns["globalMetrics"]["totalClicks"],
            "globalCtrPct": campaigns["globalMetrics"]["globalCtrPct"],
        },
        "socialReputation": {
            "totalPosts": social["totalPosts"],
            "totalEngagement": social["totalEngagement"],
            "averageEngagementPerPost": social["averageEngagementPerPost"],
        },
        "crossSignals": {
            "complainantChurnGapVsPortfolioPct": safe_round(
                complaints["complainantChurnRatePct"] - churn["actualChurnRatePct"],
                2,
            ),
            "attijariVsBhAvgEngagementGap": safe_round(
                (attijari_benchmark or {}).get("averageEngagementPerPost", 0)
                - (bh_benchmark or {}).get("averageEngagementPerPost", 0),
                2,
            ),
            "attijariVsBiatAvgEngagementGap": safe_round(
                (attijari_benchmark or {}).get("averageEngagementPerPost", 0)
                - (biat_benchmark or {}).get("averageEngagementPerPost", 0),
                2,
            ),
            "googleVsMetaCtrGapPct": safe_round(
                campaigns["googleMetrics"]["ctrPct"] - campaigns["metaMetrics"]["ctrPct"],
                2,
            ),
        },
        "topSignals": {
            "topComplaintMotifs": complaints["topComplaintMotifs"][:3],
            "topGovernoratesByAgencyRating": agencies["topGovernoratesByRating"][:3],
            "socialCompetitiveBenchmark": social["competitiveBenchmark"],
            "campaignPlatformComparison": campaigns["platformComparison"],
        },
    }


def build_context(dashboard_type: str, filters: dict, config: dict) -> dict:
    if dashboard_type == "overview":
        return build_overview_context(config)
    if dashboard_type == "campaigns":
        return build_campaigns_context(config, filters)
    if dashboard_type == "complaints":
        return build_complaints_context(config)
    if dashboard_type == "agencies":
        return build_agencies_context(config)
    if dashboard_type == "social":
        return build_social_context(config)

    raise ValueError(f"Dashboard live non supporte: {dashboard_type}")


def main() -> int:
    dashboard_type = sys.argv[1] if len(sys.argv) > 1 else ""
    filters = json.loads(sys.argv[2]) if len(sys.argv) > 2 and sys.argv[2] else {}
    config = json.loads(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3] else {}

    context = build_context(dashboard_type, filters, config)
    print(json.dumps(context, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(text(error), file=sys.stderr)
        raise SystemExit(1)
