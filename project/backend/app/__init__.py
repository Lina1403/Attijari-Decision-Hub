from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask
from flask_cors import CORS

from .clients.groq_client import GroqClient
from .repositories.mock_repository import MockDashboardRepository
from .routes.ai_summary import ai_summary_blueprint
from .routes.health import health_blueprint
from .routes.intelligence import intelligence_blueprint
from .routes.navigation import navigation_blueprint
from .routes.overview import overview_blueprint
from .routes.powerbi import powerbi_blueprint
from .services.ai_summary_service import AiSummaryService
from .services.dashboard_service import DashboardService


def create_app() -> Flask:
    backend_dir = Path(__file__).resolve().parents[1]
    project_dir = backend_dir.parent
    reserve_frontend_env = project_dir / "attijari-pfe-react" / ".env"

    load_dotenv(backend_dir / ".env")
    if reserve_frontend_env.exists():
        load_dotenv(reserve_frontend_env, override=False)

    app = Flask(__name__)
    app.config.from_mapping(
        DEBUG=os.getenv("FLASK_ENV", "development").lower() == "development",
        BACKEND_HOST=os.getenv("BACKEND_HOST", "0.0.0.0"),
        BACKEND_PORT=int(os.getenv("BACKEND_PORT", "5000")),
        CORS_ORIGINS=os.getenv("CORS_ORIGINS", "http://localhost:4200"),
        GROQ_API_KEY=os.getenv("GROQ_API_KEY", ""),
        GROQ_BASE_URL=os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1"),
        GROQ_MODEL=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        GROQ_TIMEOUT_SECONDS=float(os.getenv("GROQ_TIMEOUT_SECONDS", "20")),
        GROQ_MAX_COMPLETION_TOKENS=int(os.getenv("GROQ_MAX_COMPLETION_TOKENS", "650")),
        AI_SUMMARY_CACHE_TTL_SECONDS=int(os.getenv("AI_SUMMARY_CACHE_TTL_SECONDS", "300")),
    )

    CORS(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"].split(",")}})

    repository = MockDashboardRepository()
    dashboard_service = DashboardService(repository)
    groq_client = GroqClient(
        api_key=app.config["GROQ_API_KEY"],
        base_url=app.config["GROQ_BASE_URL"],
        model=app.config["GROQ_MODEL"],
        timeout_seconds=app.config["GROQ_TIMEOUT_SECONDS"],
        max_completion_tokens=app.config["GROQ_MAX_COMPLETION_TOKENS"],
    )
    ai_summary_service = AiSummaryService(
        repository=repository,
        groq_client=groq_client,
        model=app.config["GROQ_MODEL"],
        cache_ttl_seconds=app.config["AI_SUMMARY_CACHE_TTL_SECONDS"],
    )

    app.extensions["dashboard_service"] = dashboard_service
    app.extensions["ai_summary_service"] = ai_summary_service

    app.register_blueprint(health_blueprint)
    app.register_blueprint(navigation_blueprint)
    app.register_blueprint(overview_blueprint)
    app.register_blueprint(intelligence_blueprint)
    app.register_blueprint(powerbi_blueprint)
    app.register_blueprint(ai_summary_blueprint)

    return app
