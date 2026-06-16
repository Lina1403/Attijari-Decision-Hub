import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { switchMap } from 'rxjs/operators';
import { DashboardApiService } from '../../core/services/dashboard-api.service';
import type {
  FeatureImportanceItem,
  IntelligenceMetric,
  IntelligencePage,
  RiskClientRow,
  StrategicRecommendation,
} from '../../core/models/dashboard.models';

type SimulatorField =
  | 'satisfaction'
  | 'products'
  | 'complaints'
  | 'appConnections'
  | 'appFeatures'
  | 'cardPayments';

@Component({
  selector: 'app-intelligence',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './intelligence.component.html',
  styleUrl: './intelligence.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntelligenceComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dashboardApi = inject(DashboardApiService);

  readonly page = signal<IntelligencePage | null>(null);
  readonly isLoading = signal(true);
  readonly error = signal('');
  readonly selectedRisk = signal('all');
  readonly searchQuery = signal('');
  readonly selectedClientId = signal('');
  readonly satisfaction = signal(60);
  readonly products = signal(1);
  readonly complaints = signal(0);
  readonly appConnections = signal(0);
  readonly appFeatures = signal(1);
  readonly cardPayments = signal(0);
  readonly simulatedScore = signal<number | null>(null);
  readonly lastScenarioSignature = signal('');

  readonly selectedClient = computed(() => {
    const candidates = this.page()?.suggestedClients ?? [];
    const clientId = this.selectedClientId();
    return candidates.find((client) => client.id === clientId) ?? candidates[0] ?? null;
  });

  readonly filteredRows = computed(() => {
    const rows = this.page()?.tableRows ?? [];
    const selectedRisk = this.selectedRisk();
    const query = this.searchQuery().trim().toLowerCase();

    return rows.filter((row) => {
      const matchesRisk = selectedRisk === 'all' || row.riskClass === selectedRisk;
      const matchesQuery =
        !query ||
        row.fullName.toLowerCase().includes(query) ||
        row.segment.toLowerCase().includes(query) ||
        row.gouvernorat.toLowerCase().includes(query) ||
        String(row.clientSK).includes(query);
      return matchesRisk && matchesQuery;
    });
  });

  readonly currentScenarioSignature = computed(() =>
    JSON.stringify({
      satisfaction: this.satisfaction(),
      products: this.products(),
      complaints: this.complaints(),
      appConnections: this.appConnections(),
      appFeatures: this.appFeatures(),
      cardPayments: this.cardPayments(),
    }),
  );

  readonly scenarioDirty = computed(() => {
    return Boolean(
      this.simulatedScore() !== null && this.currentScenarioSignature() !== this.lastScenarioSignature(),
    );
  });

  readonly simulationResult = computed(() => {
    const client = this.selectedClient();
    if (!client) {
      return null;
    }

    const before = client.riskScore;
    const after = this.simulatedScore() ?? before;
    return {
      before,
      after,
      delta: Number((after - before).toFixed(1)),
    };
  });

  readonly scenarioDrivers = computed(() => {
    const client = this.selectedClient();
    if (!client) {
      return [] as Array<{ label: string; value: string; tone: 'positive' | 'negative' | 'neutral' }>;
    }

    const deltas = [
      {
        label: 'Satisfaction relationnelle',
        delta: this.satisfaction() - client.satisfaction,
        scale: 1,
      },
      {
        label: 'Nombre de produits',
        delta: this.products() - client.products,
        scale: 1,
      },
      {
        label: 'Reclamations',
        delta: client.complaints - this.complaints(),
        scale: 1,
      },
      {
        label: 'Connexions app / mois',
        delta: this.appConnections() - client.appConnections,
        scale: 1,
      },
      {
        label: 'Fonctionnalites app',
        delta: this.appFeatures() - client.appFeatures,
        scale: 1,
      },
      {
        label: 'Paiements carte / mois',
        delta: this.cardPayments() - client.cardPayments,
        scale: 1,
      },
    ];

    return deltas
      .filter((entry) => entry.delta !== 0)
      .map((entry) => ({
        label: entry.label,
        value: `${entry.delta > 0 ? '+' : ''}${entry.delta * entry.scale}`,
        tone: entry.delta > 0 ? 'positive' : 'negative',
      }));
  });

  readonly contextualTips = computed(() => {
    const client = this.selectedClient();
    if (!client) {
      return [] as string[];
    }

    const tips: string[] = [];

    if (this.satisfaction() > client.satisfaction) {
      tips.push('Prioriser un contact conseiller pour consolider la satisfaction gagnee.');
    } else if (this.satisfaction() < client.satisfaction) {
      tips.push('Renforcer le plan relationnel avant de lancer ce scenario.');
    }

    if (this.complaints() > 0) {
      tips.push('Traiter les reclamations ouvertes reste le levier le plus rapide.');
    } else {
      tips.push('Le passage a zero reclamation reduit fortement le risque residuel.');
    }

    if (this.products() <= 2) {
      tips.push('Proposer une offre de multi-equipement pour stabiliser la relation.');
    } else {
      tips.push('Le multi-equipement cree un effet protecteur sur la retention.');
    }

    if (this.appConnections() < client.appConnections || this.appFeatures() < client.appFeatures) {
      tips.push('Accompagner le client sur le digital pour soutenir les usages utiles.');
    }

    return tips.slice(0, 3);
  });

  constructor() {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const pageId = params.get('pageId') ?? '';
          this.isLoading.set(true);
          this.error.set('');
          this.selectedRisk.set('all');
          this.searchQuery.set('');
          return this.dashboardApi.getIntelligencePage(pageId);
        }),
        takeUntilDestroyed(),
      )
      .subscribe({
        next: (page) => {
          this.page.set(page);
          this.isLoading.set(false);

          if (page.pageId === 'simulateur') {
            const defaultId = page.defaultClientId ?? page.suggestedClients?.[0]?.id ?? '';
            this.selectClient(defaultId);
          } else {
            this.resetSimulatorState();
          }
        },
        error: () => {
          this.error.set('Impossible de charger cette page intelligence depuis le backend Flask.');
          this.isLoading.set(false);
          this.page.set(null);
        },
      });
  }

  isPage(pageId: IntelligencePage['pageId']) {
    return this.page()?.pageId === pageId;
  }

  trackById(_: number, item: { id: string }) {
    return item.id;
  }

  updateSearchQuery(event: Event) {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.searchQuery.set(target.value);
    }
  }

  setRiskTab(tabId: string) {
    this.selectedRisk.set(tabId);
  }

  selectClient(clientId: string) {
    const client = (this.page()?.suggestedClients ?? []).find((entry) => entry.id === clientId);
    if (!client) {
      return;
    }

    this.selectedClientId.set(clientId);
    this.satisfaction.set(client.satisfaction);
    this.products.set(client.products);
    this.complaints.set(client.complaints);
    this.appConnections.set(client.appConnections);
    this.appFeatures.set(client.appFeatures);
    this.cardPayments.set(client.cardPayments);
    this.simulatedScore.set(null);
    this.lastScenarioSignature.set('');
  }

  updateSimulatorField(field: SimulatorField, event: Event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    const value = Number(target.value);
    switch (field) {
      case 'satisfaction':
        this.satisfaction.set(value);
        break;
      case 'products':
        this.products.set(value);
        break;
      case 'complaints':
        this.complaints.set(value);
        break;
      case 'appConnections':
        this.appConnections.set(value);
        break;
      case 'appFeatures':
        this.appFeatures.set(value);
        break;
      case 'cardPayments':
        this.cardPayments.set(value);
        break;
    }
  }

  runSimulation() {
    const client = this.selectedClient();
    if (!client) {
      return;
    }

    const nextScore = this.computeScenarioScore(client);
    this.simulatedScore.set(nextScore);
    this.lastScenarioSignature.set(this.currentScenarioSignature());
  }

  metricToneClass(metric: IntelligenceMetric) {
    return `tone-${metric.tone}`;
  }

  recommendationPath(recommendation: StrategicRecommendation) {
    const category = recommendation.category.toLowerCase();
    if (category.includes('service')) return '/dashboards/reclamations';
    if (category.includes('cross')) return '/dashboards/campagnes';
    return '/intelligence/clients-risque';
  }

  featureWidth(feature: FeatureImportanceItem) {
    return `${Math.max(Math.min(feature.importance, 100), 8)}%`;
  }

  riskClassTone(riskClass: string) {
    if (riskClass === 'Critique') return 'danger';
    if (riskClass === 'Elevee') return 'gold';
    if (riskClass === 'Moderee') return 'primary';
    return 'success';
  }

  private computeScenarioScore(client: RiskClientRow) {
    const before = client.riskScore;
    const delta =
      (client.satisfaction - this.satisfaction()) * 0.42 +
      (client.products - this.products()) * 4.7 +
      (this.complaints() - client.complaints) * 6.4 +
      (client.appConnections - this.appConnections()) * 0.95 +
      (client.appFeatures - this.appFeatures()) * 1.85 +
      (client.cardPayments - this.cardPayments()) * 0.4;

    return Math.max(5, Math.min(95, Number((before + delta).toFixed(1))));
  }

  private resetSimulatorState() {
    this.selectedClientId.set('');
    this.simulatedScore.set(null);
    this.lastScenarioSignature.set('');
  }
}
