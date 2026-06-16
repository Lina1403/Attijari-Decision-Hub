import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { take } from 'rxjs/operators';
import { DashboardApiService } from '../../core/services/dashboard-api.service';
import type {
  AlertItem,
  DashboardShortcut,
  KpiItem,
  OverviewSummary,
  StrategicRecommendation,
} from '../../core/models/dashboard.models';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly dashboardApi = inject(DashboardApiService);

  readonly overview = signal<OverviewSummary | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal('');
  readonly userFirstName = 'Lina';
  readonly longDate = this.formatLongDate();

  constructor() {
    this.dashboardApi
      .getOverviewSummary()
      .pipe(take(1))
      .subscribe({
        next: (summary) => {
          this.overview.set(summary);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set('Les donnees d accueil ne sont pas disponibles depuis le backend Flask.');
          this.isLoading.set(false);
        },
      });
  }

  trackById(_: number, item: { id: string }) {
    return item.id;
  }

  getAlertTone(severity: string) {
    if (severity === 'Critique') return 'danger';
    if (severity === 'Elevee') return 'gold';
    return 'primary';
  }

  getTrendClass(kpi: KpiItem) {
    if (kpi.trend === 'down') return 'down';
    if (kpi.trend === 'neutral') return 'neutral';
    return 'up';
  }

  getAccentClass(kpi: KpiItem) {
    return `accent-${kpi.accentColor}`;
  }

  getShortcutBadge(shortcut: DashboardShortcut) {
    const tag = shortcut.tag.toLowerCase();
    if (tag.includes('executive')) return 'EX';
    if (tag.includes('retention') || shortcut.title.toLowerCase().includes('churn')) return 'CH';
    if (tag.includes('marketing') || shortcut.title.toLowerCase().includes('campagne')) return 'MA';
    if (shortcut.title.toLowerCase().includes('reclamation')) return 'RE';
    if (shortcut.title.toLowerCase().includes('agence')) return 'AG';
    return shortcut.tag.slice(0, 2).toUpperCase();
  }

  getShortcutTone(shortcut: DashboardShortcut) {
    const title = shortcut.title.toLowerCase();
    if (title.includes('churn')) return 'danger';
    if (title.includes('campagne')) return 'warning';
    if (title.includes('reclamation')) return 'blue';
    if (title.includes('agence')) return 'success';
    if (title.includes('social')) return 'violet';
    return 'violet';
  }

  sparklinePoints(index: number) {
    const variants = [
      '0,34 22,30 44,20 66,23 88,12 110,16 132,8',
      '0,18 22,24 44,16 66,28 88,22 110,32 132,26',
      '0,30 22,18 44,24 66,14 88,20 110,12 132,16',
      '0,24 22,26 44,18 66,18 88,12 110,14 132,10',
    ];
    return variants[index % variants.length];
  }

  getRecommendationPath(recommendation: StrategicRecommendation) {
    const category = recommendation.category.toLowerCase();
    if (category.includes('retention')) return '/intelligence/clients-risque';
    if (category.includes('service')) return '/dashboards/reclamations';
    return '/dashboards/campagnes';
  }

  getRelativeTime(timestamp: string) {
    const value = new Date(timestamp).getTime();
    const diffMs = Date.now() - value;
    const diffMinutes = Math.max(Math.round(diffMs / 60000), 0);

    if (diffMinutes < 60) {
      return `il y a ${diffMinutes} min`;
    }

    const diffHours = Math.round(diffMinutes / 60);
    if (diffHours < 24) {
      return `il y a ${diffHours} h`;
    }

    const diffDays = Math.round(diffHours / 24);
    return `il y a ${diffDays} j`;
  }

  alertCount(data: OverviewSummary | null) {
    return data?.alerts.length ?? 0;
  }

  private formatLongDate() {
    return new Intl.DateTimeFormat('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  }
}
