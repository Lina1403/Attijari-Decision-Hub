from __future__ import annotations

from flask import Blueprint, current_app

from ..schemas.responses import success_response


health_blueprint = Blueprint("health", __name__, url_prefix="/api")


@health_blueprint.get("/health")
def get_health():
    return success_response(
        data={
            "status": "UP",
            "service": "attijari-bi-premium-shell-api",
            "provider": "groq",
            "model": current_app.config["GROQ_MODEL"],
            "hasApiKey": bool(current_app.config["GROQ_API_KEY"]),
        },
        message="Backend Flask operationnel.",
    )
