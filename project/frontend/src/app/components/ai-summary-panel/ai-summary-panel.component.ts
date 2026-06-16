import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  input,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { take } from 'rxjs/operators';
import { DashboardApiService } from '../../core/services/dashboard-api.service';
import type { AiSummaryResponse } from '../../core/models/dashboard.models';

@Component({
  selector: 'app-ai-summary-panel',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './ai-summary-panel.component.html',
  styleUrl: './ai-summary-panel.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AiSummaryPanelComponent implements OnInit {
  private readonly dashboardApi = inject(DashboardApiService);

  readonly dashboardType = input.required<string>();
  readonly title = input('Resume AI');
  readonly hint = input('Synthese executive generee automatiquement.');
  readonly kpiSnapshot = input<Record<string, unknown> | null>(null);

  readonly summary = signal<AiSummaryResponse | null>(null);
  readonly isLoading = signal(false);
  readonly error = signal('');

  ngOnInit(): void {
    this.generate(false);
  }

  generate(forceRefresh: boolean) {
    this.isLoading.set(true);
    this.error.set('');

    this.dashboardApi
      .generateAiSummary({
        dashboardType: this.dashboardType(),
        forceRefresh,
        options: { bypassCache: forceRefresh },
        kpiSnapshot: this.kpiSnapshot() ?? undefined,
      })
      .pipe(take(1))
      .subscribe({
        next: (response) => {
          this.summary.set(response);
          this.isLoading.set(false);
        },
        error: () => {
          this.error.set(
            'Le resume AI n a pas pu etre genere. Verifiez le backend Flask et la configuration Groq.',
          );
          this.isLoading.set(false);
        },
      });
  }
}
