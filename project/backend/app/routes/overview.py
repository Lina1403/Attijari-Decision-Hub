from __future__ import annotations

from flask import Blueprint, current_app

from ..schemas.responses import success_response


overview_blueprint = Blueprint("overview", __name__, url_prefix="/api/overview")


@overview_blueprint.get("/summary")
def get_overview_summary():
    service = current_app.extensions["dashboard_service"]
    return success_response(
        data=service.get_overview_summary(),
        message="Synthese d accueil chargee avec succes.",
    )
