from __future__ import annotations

from flask import Blueprint, current_app, request

from ..clients.groq_client import GroqClientError
from ..schemas.responses import error_response, success_response
from ..services.ai_summary_service import DashboardDataUnavailableError


ai_summary_blueprint = Blueprint("ai_summary", __name__, url_prefix="/api/dashboard-ai-summary")


@ai_summary_blueprint.post("/generate")
def generate_ai_summary():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return error_response(
            message="La requete doit contenir un objet JSON valide.",
            status="INVALID_REQUEST",
            status_code=400,
        )

    dashboard_type = str(payload.get("dashboardType", "")).strip()
    if not dashboard_type:
        return error_response(
            message="dashboardType est requis.",
            status="INVALID_REQUEST",
            status_code=400,
        )

    normalized_payload = {
        "dashboardType": dashboard_type,
        "filters": payload.get("filters", {}) if isinstance(payload.get("filters"), dict) else {},
        "kpiSnapshot": payload.get("kpiSnapshot")
        if isinstance(payload.get("kpiSnapshot"), dict)
        else None,
        "options": {
            "bypassCache": bool(payload.get("forceRefresh"))
            or bool((payload.get("options") or {}).get("bypassCache")),
        },
    }

    service = current_app.extensions["ai_summary_service"]

    try:
        result = service.generate(normalized_payload)
    except DashboardDataUnavailableError as exc:
        return error_response(
            message=str(exc),
            status=exc.code,
            status_code=exc.status_code,
        )
    except GroqClientError as exc:
        return error_response(
            message=str(exc) or "La generation IA via Groq a echoue.",
            status=exc.code,
            status_code=exc.status_code,
        )
    except Exception:
        return error_response(
            message="Une erreur interne empeche la generation du resume IA.",
            status="INTERNAL_ERROR",
            status_code=500,
        )

    return success_response(
        data=result,
        message="Resume IA genere avec succes.",
    )
