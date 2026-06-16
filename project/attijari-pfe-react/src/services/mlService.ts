/**
 * Service pour appeler l'API ML (churn + recommandations)
 * Donnees live depuis SQL Server.
 */
import { apiClient } from '@/services/api';

const ML_API_BASE = import.meta.env.VITE_ML_API_BASE_URL ?? 'http://localhost:5001/api';

export interface ChurnPrediction {
  ClientSK: number;
  Score_Churn: number;
  Classe_Risque: 'Faible' | 'Modéré' | 'Élevé' | 'Critique' | 'Modere' | 'Eleve';
  Age: number;
  Score_Satisfaction: number;
  Nb_Produits: number;
  Solde_Compte: number;
}

export interface DashboardChurn {
  total_clients: number;
  distribution: {
    Faible: number;
    'Modéré'?: number;
    Modere?: number;
    'Élevé'?: number;
    Eleve?: number;
    Critique: number;
  };
  score_churn_moyen: number;
  clients_a_risque: number;
  pourcentage_risque: number;
  timestamp: string;
}

export interface ClientAtRisk {
  ClientSK: number;
  Score_Churn: number;
  Classe_Risque: string;
}

export interface SimulationResult {
  score_before: number;
  score_after: number;
  impact: number;
  impact_percentage: number;
  recommendation: string;
  // Structured fields from the new model
  risk_category?: string;
  recommendation_action?: string;
  recommendation_budget?: number;
  recommendation_offer?: string;
  recommendation_reason?: string;
}

export const checkMLHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${ML_API_BASE}/health`);
    const data = await response.json();
    return data.status === 'ok' && data.sql_server;
  } catch (error) {
    console.error('ML API not available:', error);
    return false;
  }
};

export const loadDataFromSQL = async (): Promise<unknown> => {
  const response = await fetch(`${ML_API_BASE}/load-data`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Erreur chargement donnees');
  }

  return response.json();
};

export const getDashboardChurn = async (): Promise<DashboardChurn> => {
  const { data } = await apiClient.get<DashboardChurn>('/dashboard-churn');
  return data;
};

export const getTopAtRisk = async (limit = 10): Promise<ClientAtRisk[]> => {
  const { data } = await apiClient.get<{ clients?: ClientAtRisk[] }>(
    `/top-at-risk?limit=${limit}`,
  );
  return data.clients || [];
};

export const predictClientChurn = async (
  clientSK: number,
): Promise<ChurnPrediction> => {
  const response = await fetch(`${ML_API_BASE}/predict-churn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ClientSK: clientSK }),
  });

  if (!response.ok) {
    throw new Error('Erreur prediction');
  }

  return response.json();
};

export const simulateChurn = async (
  baseProfile: Record<string, number>,
  changes: Record<string, number>,
  scenarioName?: string,
): Promise<SimulationResult> => {
  const response = await fetch(`${ML_API_BASE}/simulate-churn`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      base_profile: baseProfile,
      changes,
      scenario_name: scenarioName,
    }),
  });

  if (!response.ok) {
    throw new Error('Erreur simulation');
  }

  return response.json();
};

export const simulateClientChurn = async (
  clientSK: number,
  changes: Record<string, number>,
  scenarioName?: string,
): Promise<SimulationResult> => {
  const { data } = await apiClient.post<SimulationResult>('/simulate-churn', {
      client_id: clientSK,
      changes,
      scenario_name: scenarioName,
  });
  return data;
};
