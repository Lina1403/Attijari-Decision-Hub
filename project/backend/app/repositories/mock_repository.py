from __future__ import annotations

from copy import deepcopy

from ..data.mock_data import (
    DASHBOARD_CONTEXTS,
    DASHBOARD_SHORTCUTS,
    INTELLIGENCE_PAGES,
    HOME_KPIS,
    NAVIGATION_MODULES,
    POWERBI_REPORTS,
    RECENT_ALERTS,
    STRATEGIC_RECOMMENDATIONS,
)


class MockDashboardRepository:
    def get_navigation_modules(self):
        return deepcopy(NAVIGATION_MODULES)

    def get_overview_summary(self):
        return {
            "kpis": deepcopy(HOME_KPIS),
            "shortcuts": deepcopy(DASHBOARD_SHORTCUTS),
            "alerts": deepcopy(RECENT_ALERTS),
            "recommendations": deepcopy(STRATEGIC_RECOMMENDATIONS),
            "source": "mock-centralized-datasets",
        }

    def list_reports(self):
        return deepcopy(POWERBI_REPORTS)

    def get_report(self, report_id: str):
        for report in POWERBI_REPORTS:
            if report["reportId"] == report_id:
                return deepcopy(report)
        return None

    def get_dashboard_context(self, dashboard_type: str):
        context = DASHBOARD_CONTEXTS.get(dashboard_type)
        return deepcopy(context) if context else None

    def get_intelligence_page(self, page_id: str):
        page = INTELLIGENCE_PAGES.get(page_id)
        return deepcopy(page) if page else None
