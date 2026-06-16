import React, { useEffect, useState } from 'react';
import { AlertTriangle, Target, TrendingDown, Users } from 'lucide-react';
import {
  type ClientAtRisk,
  type DashboardChurn,
  getDashboardChurn,
  getTopAtRisk,
} from '../../services/mlService';

const ChurnDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dashboard, setDashboard] = useState<DashboardChurn | null>(null);
  const [topAtRisk, setTopAtRisk] = useState<ClientAtRisk[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);

      const [dashData, riskClients] = await Promise.all([
        getDashboardChurn(),
        getTopAtRisk(10),
      ]);

      setDashboard(dashData);
      setTopAtRisk(riskClients);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-center rounded-lg bg-white p-8 shadow">
          <div className="text-center">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-red-600" />
            <p className="text-gray-600">Chargement des données SQL Server...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 p-6">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-red-700">
          <h3 className="mb-2 font-semibold">Erreur</h3>
          <p>{error}</p>
          <button
            onClick={loadData}
            className="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if (!dashboard) {
    return null;
  }

  const distribution = {
    Faible: dashboard.distribution.Faible ?? 0,
    Modéré: dashboard.distribution['Modéré'] ?? dashboard.distribution.Modere ?? 0,
    Élevé: dashboard.distribution['Élevé'] ?? dashboard.distribution.Eleve ?? 0,
    Critique: dashboard.distribution.Critique ?? 0,
  };

  const highRiskClients = distribution.Élevé + distribution.Critique;

  const getRiskBadgeColor = (label: string) => {
    switch (label) {
      case 'Faible':
        return 'bg-green-100 text-green-800';
      case 'Modéré':
      case 'Modere':
        return 'bg-yellow-100 text-yellow-800';
      case 'Élevé':
      case 'Eleve':
        return 'bg-orange-100 text-orange-800';
      case 'Critique':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900">Analyse Prédiction Churn</h1>
        <button
          onClick={loadData}
          disabled={refreshing}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {refreshing ? 'Actualisation...' : 'Rafraichir les KPI'}
        </button>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="border-l-4 border-blue-500 bg-white p-6 shadow rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Clients</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboard.total_clients.toLocaleString()}
              </p>
            </div>
            <Users className="h-8 w-8 text-blue-500 opacity-50" />
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-orange-500 bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Score Churn Moyen</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboard.score_churn_moyen.toFixed(1)}%
              </p>
            </div>
            <TrendingDown className="h-8 w-8 text-orange-500 opacity-50" />
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-red-500 bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Clients à Risque</p>
              <p className="text-2xl font-bold text-gray-900">
                {highRiskClients.toLocaleString()}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                {dashboard.pourcentage_risque.toFixed(1)}%
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500 opacity-50" />
          </div>
        </div>

        <div className="rounded-lg border-l-4 border-green-500 bg-white p-6 shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Clients Fidèles</p>
              <p className="text-2xl font-bold text-gray-900">
                {(dashboard.total_clients - highRiskClients).toLocaleString()}
              </p>
            </div>
            <Target className="h-8 w-8 text-green-500 opacity-50" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Distribution par Classe
          </h3>
          <div className="space-y-4">
            {[
              { label: 'Faible', value: distribution.Faible, color: '#10B981' },
              { label: 'Modéré', value: distribution.Modéré, color: '#F59E0B' },
              { label: 'Élevé', value: distribution.Élevé, color: '#EF4444' },
              { label: 'Critique', value: distribution.Critique, color: '#991B1B' },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className="text-sm font-bold text-gray-900">
                    {item.value.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200">
                  <div
                    className="h-2 rounded-full"
                    style={{
                      width: `${(item.value / Math.max(dashboard.total_clients, 1)) * 100}%`,
                      backgroundColor: item.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 rounded-lg bg-white p-6 shadow">
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            Top 10 Clients à Risque Immédiat
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Client ID
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Score Churn
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-700">
                    Classe
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {topAtRisk.map((client) => (
                  <tr key={client.ClientSK} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-sm text-gray-900">{client.ClientSK}</td>
                    <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                      {client.Score_Churn.toFixed(1)}%
                    </td>
                    <td className="px-6 py-3 text-sm">
                      <span
                        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${getRiskBadgeColor(client.Classe_Risque)}`}
                      >
                        {client.Classe_Risque}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChurnDashboard;
