from __future__ import annotations

from flask import Blueprint, current_app

from ..schemas.responses import error_response, success_response


intelligence_blueprint = Blueprint("intelligence", __name__, url_prefix="/api/intelligence")


@intelligence_blueprint.get("/pages/<page_id>")
def get_intelligence_page(page_id: str):
    service = current_app.extensions["dashboard_service"]
    page = service.get_intelligence_page(page_id)
    if not page:
        return error_response(
            message="Page intelligence introuvable.",
            status="NOT_FOUND",
            status_code=404,
        )

    return success_response(
        data=page,
        message="Page intelligence chargee avec succes.",
    )
