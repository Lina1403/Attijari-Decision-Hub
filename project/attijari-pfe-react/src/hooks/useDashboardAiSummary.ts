import { useEffect, useRef, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { dashboardAiSummaryService, DashboardAiSummaryApiError } from '@/services/dashboardAiSummaryService';
import type {
  DashboardAiSummaryConfig,
  DashboardAiSummaryDashboardType,
  DashboardAiSummaryFilters,
  DashboardAiSummaryRequest,
  DashboardAiSummaryResponse,
} from '@/types/dashboardAiSummary';
import {
  createDashboardAiFingerprint,
  formatDashboardAiSummaryCopy,
} from '@/utils/dashboardAiSummary';

interface UseDashboardAiSummaryOptions {
  dashboardType: DashboardAiSummaryDashboardType;
  filters?: DashboardAiSummaryFilters;
}

export function useDashboardAiSummary({
  dashboardType,
  filters = {},
}: UseDashboardAiSummaryOptions) {
  const sourceFingerprint = createDashboardAiFingerprint({ dashboardType, filters });
  const hasMountedRef = useRef(false);
  const isVisibleRef = useRef(false);
  const latestFiltersRef = useRef(filters);
  const [isVisible, setIsVisible] = useState(false);
  const [response, setResponse] = useState<DashboardAiSummaryResponse | null>(null);
  const [error, setError] = useState<DashboardAiSummaryApiError | null>(null);
  const [activeFilters, setActiveFilters] = useState<DashboardAiSummaryFilters>(filters);
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'error'>('idle');
  const [needsRefresh, setNeedsRefresh] = useState(false);

  latestFiltersRef.current = filters;

  const mutation = useMutation({
    mutationFn: (request: DashboardAiSummaryRequest) => dashboardAiSummaryService.generate(request),
    onSuccess: (nextResponse) => {
      setResponse(nextResponse);
      setError(null);
      setNeedsRefresh(false);
    },
    onError: (nextError) => {
      if (nextError instanceof DashboardAiSummaryApiError) {
        setError(nextError);
      } else {
        setError(
          new DashboardAiSummaryApiError(
            'Une erreur inattendue empêche la génération du résumé IA.',
            {
              status: 'REQUEST_FAILED',
            },
          ),
        );
      }

      setResponse(null);
    },
  });

  const { isPending, mutateAsync, reset } = mutation;

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      setActiveFilters(latestFiltersRef.current);
      return;
    }

    setActiveFilters(latestFiltersRef.current);
    setResponse(null);
    setError(null);
    setCopyState('idle');
    reset();

    if (isVisibleRef.current) {
      setNeedsRefresh(true);
    }
  }, [reset, sourceFingerprint]);

  async function runGeneration(
    nextFilters: DashboardAiSummaryFilters,
    { bypassCache = false }: { bypassCache?: boolean } = {},
  ) {
    const { kpiSnapshot, ...requestFilters } = nextFilters as DashboardAiSummaryFilters & {
      kpiSnapshot?: Record<string, unknown>;
    };

    setIsVisible(true);
    setActiveFilters(nextFilters);
    setError(null);
    setNeedsRefresh(false);

    return mutateAsync({
      dashboardType,
      filters: requestFilters,
      forceRefresh: bypassCache,
      options: {
        bypassCache,
      },
      kpiSnapshot,
    });
  }

  async function copySummary(config: DashboardAiSummaryConfig) {
    if (!response) {
      return;
    }

    try {
      await navigator.clipboard.writeText(
        formatDashboardAiSummaryCopy(config, response, activeFilters),
      );
      setCopyState('copied');
    } catch {
      setCopyState('error');
    }

    window.setTimeout(() => {
      setCopyState('idle');
    }, 1800);
  }

  return {
    isVisible,
    isLoading: isPending,
    hasSummary: Boolean(response),
    response,
    summary: response?.summary ?? null,
    error,
    activeFilters,
    needsRefresh,
    copyState,
    setIsVisible,
    openAndGenerate(nextFilters: DashboardAiSummaryFilters = filters) {
      return runGeneration(nextFilters);
    },
    regenerate(nextFilters: DashboardAiSummaryFilters = activeFilters) {
      return runGeneration(nextFilters, { bypassCache: true });
    },
    retry(nextFilters: DashboardAiSummaryFilters = activeFilters) {
      return runGeneration(nextFilters);
    },
    copySummary,
  };
}
