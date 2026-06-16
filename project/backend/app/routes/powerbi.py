from __future__ import annotations

from flask import Blueprint, current_app

from ..schemas.responses import error_response, success_response


powerbi_blueprint = Blueprint("powerbi", __name__, url_prefix="/api/powerbi")


@powerbi_blueprint.get("/reports")
def list_reports():
    service = current_app.extensions["dashboard_service"]
    return success_response(
        data=service.list_reports(),
        message="Catalogue Power BI charge avec succes.",
    )


@powerbi_blueprint.get("/reports/<report_id>")
def get_report(report_id: str):
    service = current_app.extensions["dashboard_service"]
    report = service.get_report(report_id)
    if not report:
        return error_response(
            message="Rapport introuvable.",
            status="NOT_FOUND",
            status_code=404,
        )
    return success_response(
        data=report,
        message="Rapport charge avec succes.",
    )


@powerbi_blueprint.get("/config/<report_id>")
def get_powerbi_config(report_id: str):
    service = current_app.extensions["dashboard_service"]
    config = service.get_powerbi_config(report_id)
    if not config:
        return error_response(
            message="Configuration Power BI introuvable.",
            status="NOT_FOUND",
            status_code=404,
        )
    return success_response(
        data=config,
        message="Configuration Power BI preparee.",
    )
