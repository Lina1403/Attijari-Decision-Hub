import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs/operators';
import type {
  AiSummaryRequest,
  AiSummaryResponse,
  ApiEnvelope,
  IntelligencePage,
  NavigationModule,
  OverviewSummary,
  PowerBiConfig,
  PowerBiReportDescriptor,
} from '../models/dashboard.models';

@Injectable({
  providedIn: 'root'
})
export class DashboardApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBaseUrl = '/api';

  getNavigationModules() {
    return this.http
      .get<ApiEnvelope<NavigationModule[]>>(`${this.apiBaseUrl}/navigation/modules`)
      .pipe(map((response) => response.data));
  }

  getOverviewSummary() {
    return this.http
      .get<ApiEnvelope<OverviewSummary>>(`${this.apiBaseUrl}/overview/summary`)
      .pipe(map((response) => response.data));
  }

  getReports() {
    return this.http
      .get<ApiEnvelope<PowerBiReportDescriptor[]>>(`${this.apiBaseUrl}/powerbi/reports`)
      .pipe(map((response) => response.data));
  }

  getReport(reportId: string) {
    return this.http
      .get<ApiEnvelope<PowerBiReportDescriptor>>(`${this.apiBaseUrl}/powerbi/reports/${reportId}`)
      .pipe(map((response) => response.data));
  }

  getPowerBiConfig(reportId: string) {
    return this.http
      .get<ApiEnvelope<PowerBiConfig>>(`${this.apiBaseUrl}/powerbi/config/${reportId}`)
      .pipe(map((response) => response.data));
  }

  getIntelligencePage(pageId: string) {
    return this.http
      .get<ApiEnvelope<IntelligencePage>>(`${this.apiBaseUrl}/intelligence/pages/${pageId}`)
      .pipe(map((response) => response.data));
  }

  generateAiSummary(request: AiSummaryRequest) {
    return this.http
      .post<ApiEnvelope<AiSummaryResponse>>(
        `${this.apiBaseUrl}/dashboard-ai-summary/generate`,
        request,
      )
      .pipe(map((response) => response.data));
  }
}
