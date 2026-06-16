import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
} from 'recharts';
import {
  ArrowRight,
  Calculator,
  Lightbulb,
  Loader2,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import FeatureImportanceChart from '@/components/intelligence/FeatureImportanceChart';
import Badge from '@/components/ui/Badge';
import { usePageTitle } from '@/hooks/usePageTitle';
import { intelligenceService } from '@/services/intelligenceService';
import { simulateClientChurn } from '@/services/mlService';
import type { FeatureImportance, RiskClient } from '@/types';
import { formatPercent } from '@/utils/format';

interface GaugeCardProps {
  label: string;
  value: number;
  color: string;
}

interface SimulatorInputs {
  satisfaction: number;
  products: number;
  complaints: number;
  appConnections: number;
  appFeatures: number;
  cardPayments: number;
}

function GaugeCard({ label, value, color }: GaugeCardProps) {
  return (
    <div className="rounded-card border border-border bg-page p-4">
      <p className="text-sm font-medium text-muted">{label}</p>
      <div className="mt-3 h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            innerRadius="70%"
            outerRadius="100%"
            data={[{ name: label, value }]}
            startAngle={180}
            endAngle={0}
          >
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={10}
              fill={color}
              background={{ fill: '#E5E5E5' }}
              animationDuration={900}
            />
          </RadialBarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-3xl font-bold text-navy">{formatPercent(value)}</p>
    </div>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function serializeInputs(inputs: SimulatorInputs) {
  return JSON.stringify(inputs);
}

function buildScenarioFeatures(
  client: RiskClient,
  inputs: SimulatorInputs,
): FeatureImportance[] {
  const deltas = [
    {
      feature: 'Satisfaction relationnelle',
      gap: inputs.satisfaction - client.satisfaction,
      scale: 80,
    },
    {
      feature: 'Nombre de produits actifs',
      gap: inputs.products - client.products,
      scale: 5,
    },
    {
      feature: 'Reclamations reduites',
      gap: client.complaints - inputs.complaints,
      scale: 10,
    },
    {
      feature: 'Connexions app',
      gap: inputs.appConnections - client.appConnections,
      scale: 40,
    },
    {
      feature: 'Fonctionnalites app',
      gap: inputs.appFeatures - client.appFeatures,
      scale: 10,
    },
    {
      feature: 'Paiements carte',
      gap: inputs.cardPayments - client.cardPayments,
      scale: 40,
    },
  ];

  return deltas
    .filter((entry) => entry.gap !== 0)
    .map<FeatureImportance>((entry) => ({
      feature: entry.feature,
      importance: clamp(Math.round((Math.abs(entry.gap) / entry.scale) * 100), 4, 100),
      direction: entry.gap > 0 ? 'positive' : 'negative',
    }))
    .sort((left, right) => right.importance - left.importance);
}

function getRiskCategoryTone(
  category: string | undefined,
): 'danger' | 'gold' | 'primary' | 'success' | 'default' {
  if (category === 'Critique') return 'danger';
  if (category === 'Elevee') return 'gold';
  if (category === 'Moderee') return 'primary';
  if (category === 'Faible') return 'success';
  return 'default';
}

function getRiskCategoryLabel(category: string | undefined): string {
  if (category === 'Critique') return 'Critique';
  if (category === 'Elevee') return 'Eleve';
  if (category === 'Moderee') return 'Modere';
  if (category === 'Faible') return 'Faible';
  return category ?? 'Inconnu';
}

function buildContextualTips(
  client: RiskClient,
  inputs: SimulatorInputs,
): string[] {
  const tips: string[] = [];

  if (inputs.satisfaction < client.satisfaction) {
    tips.push('Renforcer le plan relationnel avant de deployer ce scenario.');
  } else {
    tips.push('Prioriser un contact conseiller pour consolider la satisfaction gagnee.');
  }

  if (inputs.complaints > 0) {
    tips.push('Traiter les reclamations ouvertes pour reduire le risque residuel.');
  } else if (inputs.products <= 2) {
    tips.push('Proposer une offre de multi-equipement adaptee au profil du client.');
  }

  if (inputs.appFeatures <= 2 || inputs.appConnections <= 4) {
    tips.push('Prevoir un accompagnement digital pour augmenter l usage mobile utile.');
  } else if (inputs.cardPayments > client.cardPayments) {
    tips.push('Soutenir l usage quotidien avec cashback ou avantages carte cibles.');
  }

  return tips.slice(0, 3);
}

function emptyInputs(): SimulatorInputs {
  return {
    satisfaction: 60,
    products: 1,
    complaints: 0,
    appConnections: 0,
    appFeatures: 1,
    cardPayments: 0,
  };
}

function inputsFromClient(client: RiskClient): SimulatorInputs {
  return {
    satisfaction: client.satisfaction,
    products: client.products,
    complaints: client.complaints,
    appConnections: client.appConnections,
    appFeatures: client.appFeatures,
    cardPayments: client.cardPayments,
  };
}

export default function Simulateur() {
  usePageTitle('Simulateur');

  const [searchParams] = useSearchParams();
  const initialClientId = useMemo(() => {
    const rawValue = searchParams.get('clientId');
    return rawValue ? Number(rawValue) : null;
  }, [searchParams]);
  const initialSearch = useMemo(() => searchParams.get('search') ?? '', [searchParams]);

  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedClient, setSelectedClient] = useState<RiskClient | null>(null);
  const [satisfaction, setSatisfaction] = useState(60);
  const [products, setProducts] = useState(1);
  const [complaints, setComplaints] = useState(0);
  const [appConnections, setAppConnections] = useState(0);
  const [appFeatures, setAppFeatures] = useState(1);
  const [cardPayments, setCardPayments] = useState(0);
  const [lastSimulatedInputs, setLastSimulatedInputs] = useState<SimulatorInputs | null>(null);

  const deferredSearch = useDeferredValue(searchQuery.trim());

  const { data: initialClient, isLoading: isLoadingInitialClient } = useQuery({
    queryKey: ['risk-client-by-id', initialClientId],
    enabled: Boolean(initialClientId),
    queryFn: () => intelligenceService.getRiskClientById(initialClientId!),
  });

  const { data: defaultPage, isLoading: isLoadingDefaultPage } = useQuery({
    queryKey: ['risk-clients-simulator-default'],
    queryFn: () =>
      intelligenceService.getRiskClientsPage({
        page: 0,
        size: 5,
        sortBy: 'probabiliteChurn',
        direction: 'desc',
      }),
  });

  const { data: searchResults = [], isFetching: isSearching } = useQuery({
    queryKey: ['risk-clients-search', deferredSearch],
    enabled: deferredSearch.length >= 2 || /^\d+$/.test(deferredSearch),
    queryFn: () => intelligenceService.searchRiskClients(deferredSearch, 10),
  });

  const currentInputs = useMemo<SimulatorInputs>(
    () => ({
      satisfaction,
      products,
      complaints,
      appConnections,
      appFeatures,
      cardPayments,
    }),
    [appConnections, appFeatures, cardPayments, complaints, products, satisfaction],
  );

  const simulationMutation = useMutation({
    mutationFn: async (scenario: SimulatorInputs) => {
      if (!selectedClient) {
        throw new Error('Veuillez selectionner un client avant de lancer la simulation.');
      }

      return simulateClientChurn(
        selectedClient.clientSK,
        {
          Score_Satisfaction: clamp(Math.round(scenario.satisfaction / 20), 1, 5),
          Nb_Produits: scenario.products,
          Nb_Reclamations_12mois: scenario.complaints,
          Nb_Connexions_App_Mois: scenario.appConnections,
          Nb_Fonctionnalites_App_Utilisees: scenario.appFeatures,
          Nb_Paiements_CB_Mois: scenario.cardPayments,
        },
        `Scenario client ${selectedClient.clientSK}`,
      );
    },
    onSuccess: (data, scenario) => {
      setLastSimulatedInputs(scenario);

      const before = data?.score_before ?? 0;
      const after = data?.score_after ?? 0;
      const delta = after - before;

      if (delta < 0) {
        toast.success(
          `Amelioration : ${before.toFixed(1)}% -> ${after.toFixed(1)}% (${delta.toFixed(1)} pts)`,
        );
      } else if (delta > 0) {
        toast.warning(
          `Risque accru : ${before.toFixed(1)}% -> ${after.toFixed(1)}% (+${delta.toFixed(1)} pts)`,
        );
      } else {
        toast.info('Simulation calculee : aucun changement de score detecte.');
      }
    },
    onError: (error) => {
      toast.error(
        error instanceof Error
          ? error.message
          : 'La simulation a echoue. Verifiez que l API ML est demarree sur le port 5001.',
      );
    },
  });

  const { isPending: isSimulationPending, reset: resetSimulation } = simulationMutation;

  const currentSignature = useMemo(() => serializeInputs(currentInputs), [currentInputs]);
  const lastSimulatedSignature = useMemo(
    () => (lastSimulatedInputs ? serializeInputs(lastSimulatedInputs) : ''),
    [lastSimulatedInputs],
  );

  const hasSimulationResult = Boolean(simulationMutation.data && lastSimulatedInputs);
  const isScenarioDirty = hasSimulationResult && currentSignature !== lastSimulatedSignature;
  const displayedInputs = hasSimulationResult && lastSimulatedInputs
    ? lastSimulatedInputs
    : currentInputs;

  useEffect(() => {
    setSearchQuery(initialSearch);
  }, [initialSearch]);

  useEffect(() => {
    if (!initialClient) {
      return;
    }

    setSelectedClient(initialClient);
    setSearchQuery(initialClient.fullName);
  }, [initialClient]);

  useEffect(() => {
    if (selectedClient || initialClientId || !defaultPage?.content.length) {
      return;
    }

    const nextClient = defaultPage.content[0];
    if (!nextClient) {
      return;
    }

    setSelectedClient(nextClient);
    setSearchQuery(nextClient.fullName);
  }, [defaultPage?.content, initialClientId, selectedClient]);

  useEffect(() => {
    if (!selectedClient) {
      const defaults = emptyInputs();
      setSatisfaction(defaults.satisfaction);
      setProducts(defaults.products);
      setComplaints(defaults.complaints);
      setAppConnections(defaults.appConnections);
      setAppFeatures(defaults.appFeatures);
      setCardPayments(defaults.cardPayments);
      setLastSimulatedInputs(null);
      resetSimulation();
      return;
    }

    const defaults = inputsFromClient(selectedClient);
    setSatisfaction(defaults.satisfaction);
    setProducts(defaults.products);
    setComplaints(defaults.complaints);
    setAppConnections(defaults.appConnections);
    setAppFeatures(defaults.appFeatures);
    setCardPayments(defaults.cardPayments);
    setLastSimulatedInputs(null);
    resetSimulation();
  }, [resetSimulation, selectedClient]);

  const result = useMemo(() => {
    if (!selectedClient) {
      return null;
    }

    const before = simulationMutation.data?.score_before ?? selectedClient.riskScore;
    const after = hasSimulationResult
      ? (simulationMutation.data?.score_after ?? selectedClient.riskScore)
      : selectedClient.riskScore;

    return {
      before,
      after,
      delta: after - before,
      hasSimulationResult,
      isScenarioDirty,
      features: buildScenarioFeatures(selectedClient, displayedInputs),
      tips: buildContextualTips(selectedClient, displayedInputs),
    };
  }, [
    displayedInputs,
    hasSimulationResult,
    isScenarioDirty,
    selectedClient,
    simulationMutation.data,
  ]);

  const showSearchResults =
    deferredSearch.length >= 2 &&
    deferredSearch !== (selectedClient?.fullName.trim() ?? '') &&
    (isSearching || searchResults.length > 0 || !selectedClient);

  const loadingClients = isLoadingInitialClient || isLoadingDefaultPage;
  const runSimulation = () => {
    if (!selectedClient) {
      toast.error('Selectionnez un client pour lancer la simulation.');
      return;
    }

    simulationMutation.mutate(currentInputs);
  };

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Scenario planning
        </p>
        <h1 className="page-title mt-2">Simulateur de churn</h1>
        <p className="page-subtitle mt-2 max-w-3xl">
          Recherchez un client sans charger toute la base, puis ajustez les leviers
          relationnels et digitaux pour mesurer l impact attendu sur le churn.
        </p>
      </div>

      {simulationMutation.error ? (
        <div className="rounded-card border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {simulationMutation.error instanceof Error
            ? simulationMutation.error.message
            : 'La simulation live n a pas pu etre calculee.'}
        </div>
      ) : null}

      {loadingClients ? (
        <div className="rounded-card border border-border bg-white p-8 text-center">
          <p className="text-sm font-medium text-navy">Chargement des clients...</p>
          <p className="mt-2 text-sm text-muted">
            Les donnees sont recuperees depuis votre base SSMS.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="panel-padding">
            <div className="mb-5 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-brand bg-primary-soft text-primary">
                <SlidersHorizontal className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold text-navy">Controleurs</h2>
                <p className="text-sm text-muted">Selection client et hypothese de simulation.</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="relative">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-navy">Recherche de client</span>
                  <div className="flex h-11 items-center gap-3 rounded-brand border border-border bg-page px-3">
                    <Search className="h-4 w-4 text-muted" />
                    <input
                      type="search"
                      value={searchQuery}
                      onChange={(event) => setSearchQuery(event.target.value)}
                      placeholder="Tapez 2 caracteres, un nom ou un ID"
                      className="h-full w-full bg-transparent text-sm text-navy outline-none"
                    />
                  </div>
                </label>

                {showSearchResults ? (
                  <div className="absolute left-0 right-0 top-[84px] z-10 rounded-card border border-border bg-white shadow-lg">
                    {isSearching ? (
                      <div className="px-4 py-3 text-sm text-muted">Recherche en cours...</div>
                    ) : searchResults.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-muted">Aucun client trouve.</div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto py-2">
                        {searchResults.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setSelectedClient(client);
                              setSearchQuery(client.fullName);
                            }}
                            className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-page"
                          >
                            <div>
                              <p className="font-medium text-navy">{client.fullName}</p>
                              <p className="text-xs text-muted">
                                ID {client.clientSK} - {client.segment} - {client.gouvernorat}
                              </p>
                            </div>
                            <Badge tone="default">{client.riskClass}</Badge>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>

              {defaultPage?.content.length ? (
                <div className="rounded-card border border-border bg-page p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                    Suggestions rapides
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {defaultPage.content.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => {
                          setSelectedClient(client);
                          setSearchQuery(client.fullName);
                        }}
                        className={`rounded-full border px-3 py-1.5 text-xs transition ${
                          selectedClient?.id === client.id
                            ? 'border-primary bg-primary text-white'
                            : 'border-border bg-white text-navy hover:bg-gray-50'
                        }`}
                      >
                        {client.fullName}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="rounded-card border border-border bg-page p-4">
                <p className="font-semibold text-navy">
                  {selectedClient?.fullName ?? 'Selectionnez un client'}
                </p>
                <p className="mt-1 text-sm text-muted">
                  {selectedClient
                    ? `${selectedClient.segment} - ${selectedClient.gouvernorat}`
                    : 'Aucun client charge pour la simulation.'}
                </p>
                {selectedClient ? (
                  <p className="mt-2 text-xs text-muted">
                    Score actuel: {formatPercent(selectedClient.riskScore)} - ID {selectedClient.clientSK}
                  </p>
                ) : null}
              </div>

              <label className="block space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-navy">Satisfaction</span>
                  <span className="text-sm font-semibold text-primary">{satisfaction}/100</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={satisfaction}
                  onChange={(event) => setSatisfaction(Number(event.target.value))}
                  disabled={!selectedClient}
                  className="w-full accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>

              <label className="block space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-navy">Nombre de produits</span>
                  <span className="text-sm font-semibold text-primary">{products}</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={products}
                  onChange={(event) => setProducts(Number(event.target.value))}
                  disabled={!selectedClient}
                  className="w-full accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                />
              </label>

              <label className="block space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-navy">Reclamations (cible 12 mois)</span>
                  <span
                    className={`text-sm font-semibold ${
                      complaints === 0
                        ? 'text-success'
                        : complaints <= 2
                          ? 'text-gold'
                          : 'text-danger'
                    }`}
                  >
                    {complaints}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={complaints}
                  onChange={(event) => setComplaints(Number(event.target.value))}
                  disabled={!selectedClient}
                  className="w-full accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                />
                <p className="text-xs text-muted">Reduire vers 0 = moins de friction client</p>
              </label>

              <div className="rounded-card border border-border bg-page p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-navy">Leviers avances</p>
                    <p className="mt-1 text-xs text-muted">
                      Options supplementaires utiles selon le profil du client.
                    </p>
                  </div>
                  <Badge tone="default">Optionnel</Badge>
                </div>

                <div className="mt-4 space-y-4">
                  <label className="block space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-navy">Connexions app / mois</span>
                      <span className="text-sm font-semibold text-primary">{appConnections}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={appConnections}
                      onChange={(event) => setAppConnections(Number(event.target.value))}
                      disabled={!selectedClient}
                      className="w-full accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>

                  <label className="block space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-navy">Fonctionnalites app</span>
                      <span className="text-sm font-semibold text-primary">{appFeatures}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="10"
                      value={appFeatures}
                      onChange={(event) => setAppFeatures(Number(event.target.value))}
                      disabled={!selectedClient}
                      className="w-full accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>

                  <label className="block space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-navy">Paiements carte / mois</span>
                      <span className="text-sm font-semibold text-primary">{cardPayments}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="40"
                      value={cardPayments}
                      onChange={(event) => setCardPayments(Number(event.target.value))}
                      disabled={!selectedClient}
                      className="w-full accent-primary disabled:cursor-not-allowed disabled:opacity-50"
                    />
                  </label>
                </div>
              </div>

              {selectedClient && isScenarioDirty ? (
                <div className="rounded-brand border border-gold/25 bg-gold/5 px-4 py-3 text-sm text-navy">
                  Les parametres ont change depuis le dernier calcul. Cliquez sur
                  {' '}
                  <span className="font-semibold">Calculer la simulation</span>
                  {' '}
                  pour mettre a jour le score et la recommandation.
                </div>
              ) : null}

              <button
                type="button"
                disabled={!selectedClient || isSimulationPending}
                onClick={runSimulation}
                className="flex w-full items-center justify-center gap-2 rounded-brand bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm shadow-primary/25 transition hover:bg-[#a01024] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSimulationPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Calcul en cours...
                  </>
                ) : (
                  <>
                    <Calculator className="h-4 w-4" />
                    {hasSimulationResult ? 'Recalculer la simulation' : 'Calculer la simulation'}
                  </>
                )}
              </button>

              {hasSimulationResult && result ? (
                <div className="mt-2 rounded-brand border border-border bg-page px-4 py-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Resultat simulation
                  </p>
                  <div className="mt-2 grid grid-cols-3 items-center gap-2 text-center">
                    <div>
                      <p className="text-xs text-muted">Avant</p>
                      <p className="text-xl font-bold text-navy">{result.before.toFixed(1)}%</p>
                    </div>
                    <ArrowRight className="mx-auto h-5 w-5 text-muted" />
                    <div>
                      <p className="text-xs text-muted">Apres</p>
                      <p
                        className={`text-xl font-bold ${
                          result.delta < 0
                            ? 'text-success'
                            : result.delta > 0
                              ? 'text-danger'
                              : 'text-navy'
                        }`}
                      >
                        {result.after.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                  <p className="mt-2 text-center text-sm">
                    <span
                      className={`font-semibold ${
                        result.delta < 0
                          ? 'text-success'
                          : result.delta > 0
                            ? 'text-danger'
                            : 'text-muted'
                      }`}
                    >
                      {result.delta > 0 ? '+' : ''}
                      {result.delta.toFixed(1)} pts
                    </span>
                    {' '}
                    <span className="text-muted">de variation</span>
                  </p>
                </div>
              ) : null}
            </div>
          </div>

          <div className="space-y-6">
            <div className="panel-padding">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-navy">Resultat</h2>
                  <p className="text-sm text-muted">
                    Les jauges affichent le score reel avant et apres simulation.
                  </p>
                </div>
                {hasSimulationResult && result ? (
                  <Badge tone={result.delta > 0 ? 'danger' : result.delta < 0 ? 'success' : 'default'}>
                    {result.delta > 0 ? '+' : ''}
                    {result.delta.toFixed(1)} pts
                  </Badge>
                ) : null}
              </div>

              {!selectedClient ? (
                <div className="rounded-card border border-border bg-page p-6 text-sm text-muted">
                  Selectionnez un client pour activer la simulation.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-4 lg:grid-cols-2">
                    <GaugeCard label="Avant" value={result?.before ?? 0} color="#1A1A2E" />
                    <GaugeCard label="Apres" value={result?.after ?? 0} color="#C8102E" />
                  </div>

                  {hasSimulationResult && isScenarioDirty ? (
                    <div className="rounded-brand border border-gold/25 bg-gold/5 px-4 py-3 text-sm text-muted">
                      Les jauges affichent le dernier scenario calcule. Recalculez pour voir vos
                      nouvelles modifications.
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {result && selectedClient ? (
              <FeatureImportanceChart
                data={result.features}
                height={280}
                title="Leviers du scenario"
                subtitle="Vue relative des changements saisis pour le scenario calcule."
                emptyMessage="Aucun levier n a encore ete modifie pour ce scenario."
              />
            ) : null}

            <div className="panel-padding">
              <div className="mb-5 flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-brand bg-gold-soft text-gold">
                  <Lightbulb className="h-5 w-5" />
                </span>
                <div>
                  <h2 className="text-xl font-semibold text-navy">Recommandations</h2>
                  <p className="text-sm text-muted">
                    Action prioritaire generee depuis le scenario simule.
                  </p>
                </div>
              </div>

              {selectedClient ? (
                <div className="space-y-3">
                  {hasSimulationResult && simulationMutation.data?.risk_category ? (
                    <div className="rounded-brand border border-border bg-white px-4 py-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                          Action prioritaire
                        </p>
                        <Badge tone={getRiskCategoryTone(simulationMutation.data.risk_category)}>
                          {getRiskCategoryLabel(simulationMutation.data.risk_category)}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-navy">
                        {simulationMutation.data.recommendation_action}
                      </p>
                      {simulationMutation.data.recommendation_reason ? (
                        <p className="mt-2 text-sm text-muted">
                          {simulationMutation.data.recommendation_reason}
                        </p>
                      ) : null}
                      <p className="mt-1 text-sm text-muted">
                        {simulationMutation.data.recommendation_offer}
                      </p>
                      {(simulationMutation.data.recommendation_budget ?? 0) > 0 ? (
                        <p className="mt-2 text-xs font-medium text-primary">
                          Budget max : {simulationMutation.data.recommendation_budget} TND
                        </p>
                      ) : null}
                    </div>
                  ) : (
                    <div className="rounded-brand border border-border bg-page px-4 py-4 text-sm text-muted">
                      Lancez une simulation pour generer une recommandation fiable.
                    </div>
                  )}

                  {result?.tips.map((tip) => (
                    <div
                      key={tip}
                      className="rounded-brand border border-border bg-page px-4 py-3 text-sm text-muted"
                    >
                      {tip}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-card border border-border bg-page p-6 text-sm text-muted">
                  Aucun client selectionne pour generer des recommandations.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
