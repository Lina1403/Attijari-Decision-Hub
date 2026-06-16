from __future__ import annotations

import os
from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse


REPORT_POWERBI_ENV_KEYS = {
    "vue-globale": {
        "embed": ["NEXT_PUBLIC_POWERBI_GLOBAL_EMBED_URL"],
        "open": ["NEXT_PUBLIC_POWERBI_GLOBAL_OPEN_URL"],
        "page": ["NEXT_PUBLIC_POWERBI_PAGE_GLOBAL", "NEXT_PUBLIC_POWERBI_GLOBAL_PAGE_NAME"],
    },
    "clients-churn": {
        "embed": ["NEXT_PUBLIC_POWERBI_CLIENTS_EMBED_URL"],
        "open": ["NEXT_PUBLIC_POWERBI_CLIENTS_OPEN_URL"],
        "page": ["NEXT_PUBLIC_POWERBI_PAGE_CLIENTS", "NEXT_PUBLIC_POWERBI_CLIENTS_PAGE_NAME"],
    },
    "campagnes": {
        "embed": ["NEXT_PUBLIC_POWERBI_CAMPAIGNS_OVERVIEW_EMBED_URL"],
        "open": ["NEXT_PUBLIC_POWERBI_CAMPAIGNS_OVERVIEW_OPEN_URL"],
        "page": [
            "NEXT_PUBLIC_POWERBI_PAGE_CAMPAGNES",
            "NEXT_PUBLIC_POWERBI_CAMPAIGNS_OVERVIEW_PAGE_NAME",
        ],
    },
    "reclamations": {
        "embed": ["NEXT_PUBLIC_POWERBI_RECLAMATIONS_EMBED_URL"],
        "open": ["NEXT_PUBLIC_POWERBI_RECLAMATIONS_OPEN_URL"],
        "page": [
            "NEXT_PUBLIC_POWERBI_PAGE_RECLAMATIONS",
            "NEXT_PUBLIC_POWERBI_RECLAMATIONS_PAGE_NAME",
        ],
    },
    "agences": {
        "embed": ["NEXT_PUBLIC_POWERBI_AGENCES_EMBED_URL"],
        "open": ["NEXT_PUBLIC_POWERBI_AGENCES_OPEN_URL"],
        "page": ["NEXT_PUBLIC_POWERBI_PAGE_AGENCES", "NEXT_PUBLIC_POWERBI_AGENCES_PAGE_NAME"],
    },
    "social-media": {
        "embed": [
            "NEXT_PUBLIC_POWERBI_SOCIAL_MEDIA_EMBED_URL",
            "NEXT_PUBLIC_POWERBI_SOCIALMEDIA_EMBED_URL",
        ],
        "open": [
            "NEXT_PUBLIC_POWERBI_SOCIAL_MEDIA_OPEN_URL",
            "NEXT_PUBLIC_POWERBI_SOCIALMEDIA_OPEN_URL",
        ],
        "page": [
            "NEXT_PUBLIC_POWERBI_PAGE_SOCIAL",
            "NEXT_PUBLIC_POWERBI_SOCIAL_MEDIA_PAGE_NAME",
            "NEXT_PUBLIC_POWERBI_SOCIALMEDIA_PAGE_NAME",
        ],
    },
}

POWERBI_BASE_ENV_KEYS = ["NEXT_PUBLIC_POWERBI_BASE", "VITE_POWERBI_BASE"]
POWERBI_PARAMS_ENV_KEYS = ["NEXT_PUBLIC_POWERBI_PARAMS", "VITE_POWERBI_PARAMS"]


def _read_env_value(keys: list[str]):
    for key in keys:
        value = os.getenv(key, "").strip()
        if value:
            return value
    return ""


def _normalize_query_params(value: str):
    trimmed = value.strip()
    if trimmed.startswith("&") or trimmed.startswith("?"):
        return trimmed[1:]
    return trimmed


def _append_query_params(base_url: str, extra_params: dict[str, str]):
    parsed = urlparse(base_url)
    query_pairs = dict(parse_qsl(parsed.query, keep_blank_values=True))
    for key, value in extra_params.items():
        if value:
            query_pairs[key] = value

    return urlunparse(
        parsed._replace(
            query=urlencode(query_pairs, doseq=True),
        )
    )


def _apply_powerbi_defaults(base_url: str, page_name: str):
    iframe_url = _append_query_params(base_url, {"pageName": page_name})
    extra_params = _normalize_query_params(_read_env_value(POWERBI_PARAMS_ENV_KEYS))
    if not extra_params:
        return iframe_url

    for key, value in parse_qsl(extra_params, keep_blank_values=True):
        iframe_url = _append_query_params(iframe_url, {key: value})
    return iframe_url


def _build_powerbi_urls(report_id: str, default_page_name: str):
    env_keys = REPORT_POWERBI_ENV_KEYS.get(report_id, {})
    explicit_embed_url = _read_env_value(env_keys.get("embed", []))
    explicit_open_url = _read_env_value(env_keys.get("open", []))
    page_name = _read_env_value(env_keys.get("page", [])) or default_page_name

    if explicit_embed_url:
        iframe_url = _apply_powerbi_defaults(explicit_embed_url, page_name)
        open_url = explicit_open_url or iframe_url
        return iframe_url, open_url

    base_url = _read_env_value(POWERBI_BASE_ENV_KEYS)
    if not base_url:
        return "", explicit_open_url

    iframe_url = _apply_powerbi_defaults(base_url, page_name)
    open_url = explicit_open_url or iframe_url
    return iframe_url, open_url


class DashboardService:
    def __init__(self, repository):
        self.repository = repository

    def get_navigation_modules(self):
        return self.repository.get_navigation_modules()

    def get_overview_summary(self):
        return self.repository.get_overview_summary()

    def list_reports(self):
        return self.repository.list_reports()

    def get_report(self, report_id: str):
        return self.repository.get_report(report_id)

    def get_powerbi_config(self, report_id: str):
        report = self.repository.get_report(report_id)
        if not report:
            return None

        iframe_url, open_url = _build_powerbi_urls(report_id, report["pageId"])
        embed_enabled = bool(iframe_url)

        return {
            "reportId": report["reportId"],
            "pageId": report["pageId"],
            "title": report["title"],
            "embedEnabled": embed_enabled,
            "embedUrl": iframe_url,
            "openUrl": open_url,
            "accessToken": "",
            "workspaceId": "",
            "message": (
                "Rapport Power BI relie en iframe depuis la configuration du projet reserve."
                if embed_enabled
                else "Aucune URL Power BI n a ete trouvee. Le dashboard reste en mode placeholder."
            ),
        }

    def get_intelligence_page(self, page_id: str):
        return self.repository.get_intelligence_page(page_id)
