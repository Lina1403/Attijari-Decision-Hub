import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { AiSummaryPanelComponent } from '../../components/ai-summary-panel/ai-summary-panel.component';
import { DashboardApiService } from '../../core/services/dashboard-api.service';
import type { PowerBiConfig, PowerBiReportDescriptor } from '../../core/models/dashboard.models';

@Component({
  selector: 'app-report',
  standalone: true,
  imports: [CommonModule, AiSummaryPanelComponent],
  templateUrl: './report.component.html',
  styleUrl: './report.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardApi = inject(DashboardApiService);
  private readonly sanitizer = inject(DomSanitizer);

  private readonly embedFrame = viewChild<ElementRef<HTMLElement>>('embedFrame');
  private readonly summarySection = viewChild<ElementRef<HTMLElement>>('summarySection');

  readonly report = signal<PowerBiReportDescriptor | null>(null);
  readonly config = signal<PowerBiConfig | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal('');
  readonly lastRefreshAt = signal(this.formatTime());
  readonly refreshNonce = signal(0);

  readonly liveFrameUrl = computed(() => {
    const embedUrl = this.config()?.embedUrl ?? '';
    if (!embedUrl) {
      return null;
    }

    return this.sanitizer.bypassSecurityTrustResourceUrl(
      this.appendRefreshNonce(embedUrl, this.refreshNonce()),
    );
  });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const reportId = params.get('reportId') ?? '';
          this.isLoading.set(true);
          this.error.set('');
          this.refreshNonce.set(0);
          return forkJoin({
            report: this.dashboardApi.getReport(reportId),
            config: this.dashboardApi.getPowerBiConfig(reportId),
          });
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: ({ report, config }) => {
          this.report.set(report);
          this.config.set(config);
          this.isLoading.set(false);
          this.lastRefreshAt.set(this.formatTime());
        },
        error: () => {
          this.error.set('Impossible de charger ce dashboard depuis le backend Flask.');
          this.isLoading.set(false);
        },
      });
  }

  scrollToSummary() {
    this.summarySection()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  refreshView() {
    this.refreshNonce.update((value) => value + 1);
    this.lastRefreshAt.set(this.formatTime());
  }

  openFullscreen() {
    this.embedFrame()?.nativeElement.requestFullscreen?.();
  }

  openPowerBi() {
    const openUrl = this.config()?.openUrl;
    if (!openUrl) {
      return;
    }

    window.open(openUrl, '_blank', 'noopener,noreferrer');
  }

  reportBadge(report: PowerBiReportDescriptor) {
    const id = report.reportId;
    if (id.includes('churn')) return 'CH';
    if (id.includes('campagnes')) return 'MA';
    if (id.includes('reclamations')) return 'RE';
    if (id.includes('agences')) return 'AG';
    if (id.includes('social')) return 'SM';
    return 'VG';
  }

  reportTone(report: PowerBiReportDescriptor) {
    const id = report.reportId;
    if (id.includes('churn')) return 'danger';
    if (id.includes('campagnes')) return 'warning';
    if (id.includes('reclamations')) return 'blue';
    if (id.includes('agences')) return 'success';
    if (id.includes('social')) return 'violet';
    return 'violet';
  }

  quickStats(report: PowerBiReportDescriptor) {
    const presets: Record<string, Array<{ label: string; value: string; trend: string }>> = {
      'clients-churn': [
        { label: 'Clients a risque', value: '8 420', trend: '-3.1%' },
        { label: 'Score moyen', value: '42%', trend: '+1.8 pts' },
        { label: 'Plans actifs', value: '126', trend: '+12' },
      ],
      campagnes: [
        { label: 'Campagnes actives', value: '38', trend: '+6' },
        { label: 'ROI moyen', value: '2.8x', trend: '+0.4x' },
        { label: 'Budget engage', value: '1.2M', trend: '92%' },
      ],
      reclamations: [
        { label: 'Tickets ouverts', value: '312', trend: '-8%' },
        { label: 'SLA respecte', value: '91%', trend: '+4 pts' },
        { label: 'Critiques', value: '18', trend: '-5' },
      ],
    };

    return (
      presets[report.reportId] ?? [
        { label: 'Couverture data', value: '98%', trend: '+2 pts' },
        { label: 'Refresh', value: '15 min', trend: 'live' },
        { label: 'Vues actives', value: '12', trend: '+3' },
      ]
    );
  }

  private appendRefreshNonce(url: string, nonce: number) {
    try {
      const parsed = new URL(url);
      parsed.searchParams.set('reportRefreshNonce', String(nonce));
      return parsed.toString();
    } catch {
      const separator = url.includes('?') ? '&' : '?';
      return `${url}${separator}reportRefreshNonce=${nonce}`;
    }
  }

  private formatTime() {
    return new Intl.DateTimeFormat('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date());
  }
}
