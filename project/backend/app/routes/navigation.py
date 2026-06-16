from __future__ import annotations

from flask import Blueprint, current_app

from ..schemas.responses import success_response


navigation_blueprint = Blueprint("navigation", __name__, url_prefix="/api/navigation")


@navigation_blueprint.get("/modules")
def get_navigation_modules():
    service = current_app.extensions["dashboard_service"]
    return success_response(
        data=service.get_navigation_modules(),
        message="Navigation chargee avec succes.",
    )
