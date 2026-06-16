import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, TrendingDown, Users } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import { usePageTitle } from '@/hooks/usePageTitle';
import { intelligenceService } from '@/services/intelligenceService';
import type { RiskClientsQueryParams } from '@/types';
import { formatNumber, formatPercent } from '@/utils/format';

const PAGE_SIZES = [20, 40, 80] as const;

const RISK_COLORS = {
  Faible: { bg: 'bg-emerald-50', text: 'text-emerald-700', badge: 'bg-emerald-100' },
  ['Mod\u00E9r\u00E9']: { bg: 'bg-amber-50', text: 'text-amber-700', badge: 'bg-amber-100' },
  ['\u00C9lev\u00E9']: { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-100' },
  Critique: { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100' },
} as const;

const SORT_OPTIONS = [
  { value: 'probabiliteChurn-desc', label: 'Score churn décroissant' },
  { value: 'probabiliteChurn-asc', label: 'Score churn croissant' },
  { value: 'client-asc', label: 'Nom client' },
  { value: 'segment-asc', label: 'Segment' },
  { value: 'gouvernorat-asc', label: 'Gouvernorat' },
  { value: 'satisfaction-desc', label: 'Satisfaction' },
  { value: 'nombreProduits-desc', label: 'Nombre de produits' },
  { value: 'reclamations-desc', label: 'Réclamations' },
] as const;

function TableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-gray-50">
          <tr>
            {['Client', 'Segment', 'Gouvernorat', 'Score Churn', 'Classe Risque', 'Actions'].map(
              (header) => (
                <th
                  key={header}
                  className="px-6 py-3 text-left font-semibold text-navy"
                >
                  {header}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 8 }, (_, index) => (
            <tr key={index} className="border-b border-border">
              <td className="px-6 py-4">
                <div className="space-y-2">
                  <div className="h-4 w-40 animate-pulse rounded bg-gray-100" />
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-100" />
                </div>
              </td>
              <td className="px-6 py-4">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
              </td>
              <td className="px-6 py-4">
                <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
              </td>
              <td className="px-6 py-4">
                <div className="ml-auto h-4 w-24 animate-pulse rounded bg-gray-100" />
              </td>
              <td className="px-6 py-4">
                <div className="h-8 w-24 animate-pulse rounded-full bg-gray-100" />
              </td>
              <td className="px-6 py-4">
                <div className="h-4 w-16 animate-pulse rounded bg-gray-100" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PaginationButton({
  disabled,
  label,
  onClick,
  active = false,
}: {
  disabled?: boolean;
  label: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-brand border px-3 py-2 text-sm transition ${
        active
          ? 'border-primary bg-primary text-white'
          : 'border-border bg-white text-navy hover:bg-gray-50'
      } disabled:cursor-not-allowed disabled:opacity-50`}
    >
      {label}
    </button>
  );
}

export default function ClientsRisque() {
  usePageTitle('Clients a risque');

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState<(typeof PAGE_SIZES)[number]>(40);
  const [selectedRisk, setSelectedRisk] = useState('');
  const [segment, setSegment] = useState('');
  const [gouvernorat, setGouvernorat] = useState('');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('search') ?? '');
  const [debouncedSearch, setDebouncedSearch] = useState(() => searchParams.get('search') ?? '');
  const [sortOption, setSortOption] = useState<(typeof SORT_OPTIONS)[number]['value']>(
    'probabiliteChurn-desc',
  );

  useEffect(() => {
    const nextSearch = searchParams.get('search') ?? '';
    setSearchQuery(nextSearch);
    setDebouncedSearch(nextSearch);
    setPage(0);
  }, [searchParams]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(0);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [searchQuery]);

  const queryParams = useMemo<RiskClientsQueryParams>(() => {
    const [sortBy, direction = 'desc'] = sortOption.split('-');

    return {
      page,
      size,
      sortBy,
      direction: direction === 'asc' ? 'asc' : 'desc',
      search: debouncedSearch,
      segment,
      gouvernorat,
      riskClass: selectedRisk,
    };
  }, [debouncedSearch, gouvernorat, page, segment, selectedRisk, size, sortOption]);

  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['clients-risk-page', queryParams],
    queryFn: () => intelligenceService.getRiskClientsPage(queryParams),
    placeholderData: (previousData) => previousData,
  });

  const summary = data?.summary;
  const visiblePages = useMemo(() => {
    const totalPages = data?.totalPages ?? 0;
    if (totalPages <= 1) {
      return [];
    }

    const start = Math.max(0, page - 1);
    const end = Math.min(totalPages, start + 3);
    return Array.from({ length: end - start }, (_, index) => start + index);
  }, [data?.totalPages, page]);

  return (
    <section className="space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.12em] text-primary">
          Portefeuille
        </p>
        <h1 className="page-title mt-2">Clients à risque</h1>
        <p className="page-subtitle mt-2 max-w-3xl">
          Liste live paginee des clients avec leurs scores de churn ML. Triez,
          recherchez et explorez le portefeuille sans charger toute la base
          dans le navigateur.
        </p>
      </div>

      {error ? (
        <div className="rounded-card border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error instanceof Error
            ? error.message
            : 'Le chargement live des clients churn a echoue.'}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-card border border-border bg-page p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Total Clients</p>
              <p className="mt-2 text-2xl font-bold text-navy">
                {formatNumber(summary?.totalClients ?? 0)}
              </p>
            </div>
            <Users className="h-8 w-8 text-primary-soft" />
          </div>
        </div>

        <div className="rounded-card border border-border bg-page p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">À risque élevé</p>
              <p className="mt-2 text-2xl font-bold text-orange-700">
                {formatNumber(summary?.highRiskClients ?? 0)}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-400" />
          </div>
        </div>

        <div className="rounded-card border border-border bg-page p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Moyenne Churn</p>
              <p className="mt-2 text-2xl font-bold text-navy">
                {formatPercent(summary?.averageChurnScore ?? 0)}
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className="rounded-card border border-border bg-page p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted">Classe dominante</p>
              <p className="mt-2 text-sm font-semibold text-navy">
                {summary?.dominantRiskClass ?? 'Faible'}
              </p>
              <p className="text-xs text-muted">
                {formatNumber(summary?.dominantRiskCount ?? 0)} clients
              </p>
            </div>
            <div className="text-center text-lg font-bold text-amber-600">
              {formatPercent(
                summary?.totalClients
                  ? ((summary.dominantRiskCount ?? 0) / summary.totalClients) * 100
                  : 0,
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        <button
          type="button"
          onClick={() => {
            setSelectedRisk('');
            setPage(0);
          }}
          className={`rounded-brand px-4 py-2 text-sm font-medium transition ${
            selectedRisk === ''
              ? 'bg-primary text-white'
              : 'border border-border bg-white text-navy hover:bg-gray-50'
          }`}
        >
          Tous ({formatNumber(summary?.totalClients ?? 0)})
        </button>
        {Object.entries(summary?.distribution ?? {}).map(([risk, count]) => (
          <button
            key={risk}
            type="button"
            onClick={() => {
              setSelectedRisk(risk);
              setPage(0);
            }}
            className={`rounded-brand px-4 py-2 text-sm font-medium transition ${
              selectedRisk === risk
                ? `${RISK_COLORS[risk as keyof typeof RISK_COLORS].bg} ${RISK_COLORS[risk as keyof typeof RISK_COLORS].text}`
                : 'border border-border bg-white text-navy hover:bg-gray-50'
            }`}
          >
            {risk} ({formatNumber(Number(count))})
          </button>
        ))}
      </div>

      <div className="grid gap-4 rounded-card border border-border bg-white p-4 md:grid-cols-2 xl:grid-cols-[1.2fr_0.7fr_0.7fr_0.7fr_0.6fr]">
        <label className="block">
          <span className="text-sm font-medium text-navy">Recherche</span>
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Nom, ID, segment ou gouvernorat"
            className="mt-2 h-11 w-full rounded-brand border border-border bg-page px-3 text-sm text-navy outline-none transition focus:border-primary"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-navy">Segment</span>
          <select
            value={segment}
            onChange={(event) => {
              setSegment(event.target.value);
              setPage(0);
            }}
            className="mt-2 h-11 w-full rounded-brand border border-border bg-page px-3 text-sm text-navy outline-none transition focus:border-primary"
          >
            <option value="">Tous</option>
            {data?.filters.segments.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-navy">Gouvernorat</span>
          <select
            value={gouvernorat}
            onChange={(event) => {
              setGouvernorat(event.target.value);
              setPage(0);
            }}
            className="mt-2 h-11 w-full rounded-brand border border-border bg-page px-3 text-sm text-navy outline-none transition focus:border-primary"
          >
            <option value="">Tous</option>
            {data?.filters.gouvernorats.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-navy">Trier par</span>
          <select
            value={sortOption}
            onChange={(event) => {
              setSortOption(event.target.value as (typeof SORT_OPTIONS)[number]['value']);
              setPage(0);
            }}
            className="mt-2 h-11 w-full rounded-brand border border-border bg-page px-3 text-sm text-navy outline-none transition focus:border-primary"
          >
            {SORT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-navy">Par page</span>
          <select
            value={size}
            onChange={(event) => {
              setSize(Number(event.target.value) as (typeof PAGE_SIZES)[number]);
              setPage(0);
            }}
            className="mt-2 h-11 w-full rounded-brand border border-border bg-page px-3 text-sm text-navy outline-none transition focus:border-primary"
          >
            {PAGE_SIZES.map((pageSize) => (
              <option key={pageSize} value={pageSize}>
                {pageSize}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-card border border-border bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-6 py-4 text-sm text-muted">
          <p>
            {formatNumber(data?.totalElements ?? 0)} résultats
            {debouncedSearch ? ` pour "${debouncedSearch}"` : ''}
          </p>
          {isFetching && !isLoading ? <p>Mise a jour en cours...</p> : null}
        </div>

        {isLoading && !data ? (
          <TableSkeleton />
        ) : data?.content.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted">Aucun client trouvé</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold text-navy">Client</th>
                    <th className="px-6 py-3 text-left font-semibold text-navy">Segment</th>
                    <th className="px-6 py-3 text-left font-semibold text-navy">Gouvernorat</th>
                    <th className="px-6 py-3 text-right font-semibold text-navy">Score Churn</th>
                    <th className="px-6 py-3 text-left font-semibold text-navy">Classe Risque</th>
                    <th className="px-6 py-3 text-left font-semibold text-navy">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.content.map((client) => {
                    const colors =
                      (RISK_COLORS as Record<string, (typeof RISK_COLORS)[keyof typeof RISK_COLORS]>)[
                        client.riskClass
                      ] ?? RISK_COLORS.Faible;

                    return (
                      <tr key={client.id} className="border-b border-border hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <div>
                            <p className="font-medium text-navy">{client.fullName}</p>
                            <p className="text-xs text-muted">ID: {client.clientSK}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm text-navy">{client.segment}</td>
                        <td className="px-6 py-4 text-sm text-navy">{client.gouvernorat}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="h-2 w-12 overflow-hidden rounded-full bg-gray-200">
                              <div
                                className="h-full bg-gradient-to-r from-emerald-500 to-red-500"
                                style={{ width: `${client.riskScore}%` }}
                              />
                            </div>
                            <span className="w-12 text-right font-semibold text-navy">
                              {formatPercent(client.riskScore)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <Badge tone="default" className={`${colors.badge} ${colors.text}`}>
                            {client.riskClass}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/intelligence/simulateur?clientId=${client.clientSK}`)
                            }
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            Simuler
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-4 border-t border-border px-6 py-4 md:flex-row md:items-center md:justify-between">
              <p className="text-sm text-muted">
                Page {data ? data.page + 1 : 1} sur {Math.max(data?.totalPages ?? 1, 1)}
              </p>

              <div className="flex flex-wrap items-center gap-2">
                <PaginationButton
                  label="Précédent"
                  disabled={!data || data.page === 0}
                  onClick={() => setPage((current) => Math.max(current - 1, 0))}
                />

                {visiblePages.map((pageNumber) => (
                  <PaginationButton
                    key={pageNumber}
                    label={String(pageNumber + 1)}
                    active={pageNumber === (data?.page ?? 0)}
                    onClick={() => setPage(pageNumber)}
                  />
                ))}

                <PaginationButton
                  label="Suivant"
                  disabled={!data || data.page >= data.totalPages - 1}
                  onClick={() =>
                    setPage((current) =>
                      data ? Math.min(current + 1, Math.max(data.totalPages - 1, 0)) : current,
                    )
                  }
                />
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
