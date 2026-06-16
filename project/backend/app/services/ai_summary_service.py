from __future__ import annotations

import hashlib
import json
import time

from ..clients.groq_client import GroqInvalidResponseError


class DashboardDataUnavailableError(Exception):
    status_code = 503
    code = "DATA_UNAVAILABLE"


class AiSummaryService:
    def __init__(self, *, repository, groq_client, model: str, cache_ttl_seconds: int):
        self.repository = repository
        self.groq_client = groq_client
        self.model = model
        self.cache_ttl_seconds = cache_ttl_seconds
        self._cache = {}

    def _create_cache_key(self, payload):
        serializable = {
            "dashboardType": payload["dashboardType"],
            "filters": payload.get("filters", {}),
            "model": self.model,
            "kpiSnapshot": payload.get("kpiSnapshot"),
        }
        raw = json.dumps(serializable, sort_keys=True, ensure_ascii=False)
        return hashlib.sha1(raw.encode("utf-8")).hexdigest()

    def _read_cache(self, cache_key):
        cached = self._cache.get(cache_key)
        if not cached:
            return None
        if cached["expires_at"] < time.time():
            self._cache.pop(cache_key, None)
            return None
        return cached["value"]

    def _write_cache(self, cache_key, value):
        self._cache[cache_key] = {
            "value": value,
            "expires_at": time.time() + self.cache_ttl_seconds,
        }

    def _build_summary_context(self, payload):
        if isinstance(payload.get("kpiSnapshot"), dict) and payload["kpiSnapshot"]:
            return payload["kpiSnapshot"], "client-provided-snapshot"

        context = self.repository.get_dashboard_context(payload["dashboardType"])
        if not context:
            raise DashboardDataUnavailableError(
                f"Le contexte structure du dashboard {payload['dashboardType']} est indisponible."
            )
        return context, "mock-centralized-datasets"

    def _build_messages(self, *, dashboard_type: str, summary_context: dict, context_source: str):
        response_shape = {
            "globalSummary": "string",
            "strengths": ["string"],
            "watchouts": ["string"],
        }
        system_message = "\n".join(
            [
                "Tu es un analyste decisionnel senior dans un contexte bancaire.",
                "Tu produis un resume executif a partir de donnees structurees de dashboards BI.",
                "Regles imperatives :",
                "- utilise exclusivement les donnees fournies dans le contexte",
                "- n invente jamais de chiffres, de causes ni de comparaisons non presentes dans les donnees",
                "- reste factuel, synthetique, professionnel et utile pour un decideur",
                "- reponds en francais",
                "- globalSummary : un seul paragraphe clair de 80 a 120 mots",
                "- strengths : 2 a 4 points courts bases sur les donnees positives ou stables",
                "- watchouts : 2 a 4 points courts bases sur les alertes, risques ou variations negatives",
                "- renvoie uniquement un JSON valide, sans markdown, sans commentaire",
                f"Structure attendue : {json.dumps(response_shape, ensure_ascii=False)}",
            ]
        )
        user_message = "\n\n".join(
            [
                f"Dashboard cible : {dashboard_type}",
                f"Source du contexte : {context_source}",
                "Contexte metier structure :",
                json.dumps(summary_context, ensure_ascii=False, indent=2),
                "Analyse les donnees avec une perspective bancaire et aide a la decision.",
            ]
        )
        return [
            {"role": "system", "content": system_message},
            {"role": "user", "content": user_message},
        ]

    def _validate_summary(self, payload):
        if not isinstance(payload, dict):
            raise GroqInvalidResponseError("Le modele n a pas renvoye un objet JSON exploitable.")

        global_summary = str(payload.get("globalSummary", "")).strip()
        strengths = [str(item).strip() for item in payload.get("strengths", []) if str(item).strip()]
        watchouts = [str(item).strip() for item in payload.get("watchouts", []) if str(item).strip()]

        if not global_summary or not strengths or not watchouts:
            raise GroqInvalidResponseError("Le modele n a pas renvoye la structure attendue.")

        return {
            "globalSummary": global_summary,
            "strengths": strengths[:4],
            "watchouts": watchouts[:4],
        }

    def generate(self, payload):
        cache_key = self._create_cache_key(payload)
        bypass_cache = bool(payload.get("options", {}).get("bypassCache"))

        if not bypass_cache:
            cached = self._read_cache(cache_key)
            if cached:
                cached["meta"]["cacheHit"] = True
                return cached

        summary_context, context_source = self._build_summary_context(payload)
        messages = self._build_messages(
            dashboard_type=payload["dashboardType"],
            summary_context=summary_context,
            context_source=context_source,
        )
        raw_summary = self.groq_client.generate_structured_summary(messages)
        summary = self._validate_summary(raw_summary)

        response = {
            "dashboardType": payload["dashboardType"],
            "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "status": "SUCCESS",
            "summary": summary,
            "meta": {
                "provider": "groq",
                "model": self.model,
                "cacheHit": False,
                "filters": payload.get("filters", {}),
                "contextSource": context_source,
            },
        }
        self._write_cache(cache_key, response.copy())
        return response
