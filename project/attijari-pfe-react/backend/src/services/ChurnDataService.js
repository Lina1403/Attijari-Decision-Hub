import fs from 'node:fs';
import path from 'node:path';

const SEGMENT_LABELS = Object.freeze({
  '1': 'VIP',
  '2': 'Premium',
  '3': 'Pro',
  '4': 'Particulier',
});

const RISK_LABELS = Object.freeze({
  faible: 'Faible',
  modere: 'Mod\u00E9r\u00E9',
  eleve: '\u00C9lev\u00E9',
  critique: 'Critique',
});

const AGE_BANDS = Object.freeze([
  { label: '18-25', min: 18, max: 25 },
  { label: '26-35', min: 26, max: 35 },
  { label: '36-50', min: 36, max: 50 },
  { label: '51-65', min: 51, max: 65 },
  { label: '66+', min: 66, max: Number.POSITIVE_INFINITY },
]);

function round(value, digits = 1) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return 0;
  }

  const precision = 10 ** digits;
  return Math.round(numericValue * precision) / precision;
}

function toNumber(value, fallback = 0) {
  const normalizedValue = String(value ?? '')
    .trim()
    .replace(',', '.');
  const numericValue = Number(normalizedValue);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function removeDiacritics(value) {
  return normalizeText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function normalizeRiskLabel(value) {
  const normalizedValue = removeDiacritics(value).toLowerCase();

  if (normalizedValue.includes('critique')) {
    return RISK_LABELS.critique;
  }

  if (normalizedValue.includes('eleve')) {
    return RISK_LABELS.eleve;
  }

  if (normalizedValue.includes('modere')) {
    return RISK_LABELS.modere;
  }

  return RISK_LABELS.faible;
}

function isHighRisk(riskLabel) {
  return riskLabel === RISK_LABELS.eleve || riskLabel === RISK_LABELS.critique;
}

function resolveSegmentLabel(segmentId) {
  const normalizedId = normalizeText(segmentId);
  return SEGMENT_LABELS[normalizedId] ?? `Segment ${normalizedId || 'Inconnu'}`;
}

function resolveAgeBand(age) {
  for (const band of AGE_BANDS) {
    if (age >= band.min && age <= band.max) {
      return band.label;
    }
  }

  return 'Inconnu';
}

function createSemicolonReader(filePath, label) {
  if (!fs.existsSync(filePath)) {
    throw new ChurnDataSourceError(
      `${label} introuvable. Verifiez le fichier ${path.basename(filePath)}.`,
    );
  }

  const rawContent = fs.readFileSync(filePath, 'utf-8').replace(/^\uFEFF/u, '');
  const lines = rawContent.split(/\r?\n/u).filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new ChurnDataSourceError(
      `${label} est vide ou ne contient pas de donnees exploitables.`,
    );
  }

  const headers = lines[0].split(';').map((header) => header.trim());

  return lines.slice(1).map((line) => {
    const values = line.split(';');

    return headers.reduce((row, header, index) => {
      row[header] = normalizeText(values[index]);
      return row;
    }, {});
  });
}

function buildStatsSignature(filePaths) {
  return filePaths
    .map((filePath) => {
      const stats = fs.statSync(filePath);
      return `${filePath}:${stats.mtimeMs}:${stats.size}`;
    })
    .join('|');
}

function sortByCountThenLabel(items, countKey) {
  return [...items].sort((left, right) => {
    const countDifference = Number(right[countKey] ?? 0) - Number(left[countKey] ?? 0);

    if (countDifference !== 0) {
      return countDifference;
    }

    return String(left.label ?? left.segment ?? '').localeCompare(
      String(right.label ?? right.segment ?? ''),
    );
  });
}

function buildSegmentOverview(clients) {
  const statsBySegment = new Map();

  for (const client of clients) {
    const key = client.segmentLabel;
    const current =
      statsBySegment.get(key) ??
      {
        segment: key,
        clientCount: 0,
        churnedCount: 0,
        satisfactionTotal: 0,
      };

    current.clientCount += 1;
    current.churnedCount += client.churned ? 1 : 0;
    current.satisfactionTotal += client.satisfactionScore;
    statsBySegment.set(key, current);
  }

  return sortByCountThenLabel(
    Array.from(statsBySegment.values()).map((item) => ({
      segment: item.segment,
      clientCount: item.clientCount,
      sharePct: round((item.clientCount / clients.length) * 100, 2),
      churnRatePct: round((item.churnedCount / item.clientCount) * 100, 2),
      averageSatisfaction: round(item.satisfactionTotal / item.clientCount, 2),
    })),
    'clientCount',
  );
}

function buildAgeBandOverview(clients) {
  const statsByAgeBand = new Map(
    AGE_BANDS.map((band) => [
      band.label,
      {
        label: band.label,
        clientCount: 0,
        churnedCount: 0,
      },
    ]),
  );

  for (const client of clients) {
    const ageBand = resolveAgeBand(client.age);
    const current =
      statsByAgeBand.get(ageBand) ??
      {
        label: ageBand,
        clientCount: 0,
        churnedCount: 0,
      };

    current.clientCount += 1;
    current.churnedCount += client.churned ? 1 : 0;
    statsByAgeBand.set(ageBand, current);
  }

  return Array.from(statsByAgeBand.values()).map((item) => ({
    ageBand: item.label,
    clientCount: item.clientCount,
    churnRatePct: round((item.churnedCount / Math.max(item.clientCount, 1)) * 100, 2),
  }));
}

function buildComplaintsImpact(clients) {
  const withComplaint = clients.filter((client) => client.complaintsCount > 0);
  const withoutComplaint = clients.filter((client) => client.complaintsCount === 0);
  const churnedWithComplaint = withComplaint.filter((client) => client.churned).length;
  const churnedWithoutComplaint = withoutComplaint.filter((client) => client.churned).length;

  return {
    clientsWithComplaint: withComplaint.length,
    churnRateWithComplaintPct: round(
      (churnedWithComplaint / Math.max(withComplaint.length, 1)) * 100,
      2,
    ),
    clientsWithoutComplaint: withoutComplaint.length,
    churnRateWithoutComplaintPct: round(
      (churnedWithoutComplaint / Math.max(withoutComplaint.length, 1)) * 100,
      2,
    ),
  };
}

function buildEngagementComparison(clients) {
  const churnedClients = clients.filter((client) => client.churned);
  const activeClients = clients.filter((client) => !client.churned);

  const average = (rows, field) =>
    round(
      rows.reduce((sum, row) => sum + Number(row[field] ?? 0), 0) / Math.max(rows.length, 1),
      2,
    );

  return {
    churnedAverageAppConnections: average(churnedClients, 'appConnections'),
    activeAverageAppConnections: average(activeClients, 'appConnections'),
    churnedAverageProductCount: average(churnedClients, 'productCount'),
    activeAverageProductCount: average(activeClients, 'productCount'),
  };
}

function buildRiskDistribution(scoredClients) {
  const order = [
    RISK_LABELS.faible,
    RISK_LABELS.modere,
    RISK_LABELS.eleve,
    RISK_LABELS.critique,
  ];
  const counts = new Map(order.map((label) => [label, 0]));

  for (const client of scoredClients) {
    counts.set(client.riskLabel, (counts.get(client.riskLabel) ?? 0) + 1);
  }

  return order.map((label) => ({
    riskClass: label,
    clientCount: counts.get(label) ?? 0,
    sharePct: round(((counts.get(label) ?? 0) / Math.max(scoredClients.length, 1)) * 100, 2),
  }));
}

function buildRiskBySegment(scoredClients) {
  const statsBySegment = new Map();

  for (const client of scoredClients) {
    const key = client.segmentLabel;
    const current =
      statsBySegment.get(key) ??
      {
        segment: key,
        scoredClients: 0,
        highRiskClients: 0,
        scoreTotal: 0,
      };

    current.scoredClients += 1;
    current.highRiskClients += isHighRisk(client.riskLabel) ? 1 : 0;
    current.scoreTotal += client.scoreChurn;
    statsBySegment.set(key, current);
  }

  return sortByCountThenLabel(
    Array.from(statsBySegment.values()).map((item) => ({
      segment: item.segment,
      scoredClients: item.scoredClients,
      highRiskClients: item.highRiskClients,
      highRiskSharePct: round((item.highRiskClients / item.scoredClients) * 100, 2),
      averageScoreChurnPct: round(item.scoreTotal / item.scoredClients, 2),
    })),
    'scoredClients',
  );
}

export class ChurnDataSourceError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ChurnDataSourceError';
    this.code = 'CHURN_DATA_UNAVAILABLE';
    this.statusCode = 503;
  }
}

export class ChurnDataService {
  constructor({ clientsFilePath, predictionsFilePath }) {
    this.clientsFilePath = clientsFilePath;
    this.predictionsFilePath = predictionsFilePath;
    this.cachedSignature = null;
    this.cachedDataset = null;
  }

  hasRequiredFiles() {
    return (
      fs.existsSync(this.clientsFilePath) && fs.existsSync(this.predictionsFilePath)
    );
  }

  getDataset() {
    if (!this.hasRequiredFiles()) {
      throw new ChurnDataSourceError(
        'Les fichiers churn live sont introuvables. Verifiez clients_ml.csv et ML_ChurnPredictions.csv.',
      );
    }

    const filePaths = [this.clientsFilePath, this.predictionsFilePath];
    const nextSignature = buildStatsSignature(filePaths);

    if (this.cachedDataset && this.cachedSignature === nextSignature) {
      return this.cachedDataset;
    }

    const clientRows = createSemicolonReader(
      this.clientsFilePath,
      'Le dataset clients churn',
    );
    const predictionRows = createSemicolonReader(
      this.predictionsFilePath,
      'Le dataset de predictions churn',
    );

    const clients = clientRows.map((row) => ({
      clientSK: normalizeText(row.ClientSK),
      age: toNumber(row.Age),
      segmentLabel: resolveSegmentLabel(row.SegmentID),
      satisfactionScore: toNumber(row.Score_Satisfaction),
      appConnections: toNumber(row.Nb_Connexions_App_Mois),
      productCount: toNumber(row.Nb_Produits),
      complaintsCount: toNumber(row.Nb_Reclamations_12mois),
      churned: toNumber(row.A_Quitte) === 1,
    }));

    const clientsById = new Map(clients.map((client) => [client.clientSK, client]));
    const scoredClients = predictionRows.map((row) => {
      const clientSK = normalizeText(row.ClientSK);
      const linkedClient = clientsById.get(clientSK);

      return {
        clientSK,
        scoreChurn: round(toNumber(row.Score_Churn), 1),
        riskLabel: normalizeRiskLabel(row.Classe_Risque),
        segmentLabel: linkedClient?.segmentLabel ?? 'Segment inconnu',
        age: linkedClient?.age ?? null,
      };
    });

    this.cachedSignature = nextSignature;
    this.cachedDataset = {
      clients,
      scoredClients,
      predictionMeta: {
        predictionDate: normalizeText(predictionRows[0]?.Date_Prediction),
        modelName: normalizeText(predictionRows[0]?.Modele),
        auc: round(toNumber(predictionRows[0]?.AUC), 4),
      },
    };

    return this.cachedDataset;
  }

  getDashboardStats() {
    const { scoredClients } = this.getDataset();
    const totalClients = scoredClients.length;
    const distribution = {
      [RISK_LABELS.faible]: 0,
      [RISK_LABELS.modere]: 0,
      [RISK_LABELS.eleve]: 0,
      [RISK_LABELS.critique]: 0,
    };
    let scoreTotal = 0;
    let highRiskClients = 0;

    for (const client of scoredClients) {
      distribution[client.riskLabel] += 1;
      scoreTotal += client.scoreChurn;
      highRiskClients += isHighRisk(client.riskLabel) ? 1 : 0;
    }

    return {
      total_clients: totalClients,
      distribution,
      score_churn_moyen: round(scoreTotal / Math.max(totalClients, 1), 2),
      clients_a_risque: highRiskClients,
      pourcentage_risque: round((highRiskClients / Math.max(totalClients, 1)) * 100, 2),
    };
  }

  getTopAtRisk(limit = 10) {
    const safeLimit = Math.max(1, Math.min(Number(limit) || 10, 100));
    const { scoredClients } = this.getDataset();

    return [...scoredClients]
      .sort((left, right) => right.scoreChurn - left.scoreChurn)
      .slice(0, safeLimit)
      .map((client) => ({
        ClientSK: Number(client.clientSK),
        Score_Churn: client.scoreChurn,
        Classe_Risque: client.riskLabel,
      }));
  }

  async buildSummaryContext() {
    const { clients, scoredClients, predictionMeta } = this.getDataset();
    const totalClients = clients.length;
    const churnedClients = clients.filter((client) => client.churned).length;
    const highRiskClients = scoredClients.filter((client) => isHighRisk(client.riskLabel)).length;
    const averageScoreChurn = round(
      scoredClients.reduce((sum, client) => sum + client.scoreChurn, 0) /
        Math.max(scoredClients.length, 1),
      2,
    );

    return {
      source: 'live-churn-ml-exports',
      title: 'Clients & Churn',
      extractedAt: new Date().toISOString(),
      dataOrigin: {
        clientsDataset: path.basename(this.clientsFilePath),
        predictionsDataset: path.basename(this.predictionsFilePath),
        scoredCoveragePct: round((scoredClients.length / Math.max(totalClients, 1)) * 100, 2),
        note: 'Les scores ML couvrent le jeu exporte de prediction churn actuellement disponible.',
      },
      portfolio: {
        totalClients,
        churnedClients,
        actualChurnRatePct: round((churnedClients / Math.max(totalClients, 1)) * 100, 2),
      },
      scoring: {
        scoredClients: scoredClients.length,
        averageScoreChurnPct: averageScoreChurn,
        highRiskClients,
        highRiskSharePct: round((highRiskClients / Math.max(scoredClients.length, 1)) * 100, 2),
      },
      model: {
        name: predictionMeta.modelName || 'Modele churn',
        auc: predictionMeta.auc,
        predictionDate: predictionMeta.predictionDate || null,
      },
      segmentOverview: buildSegmentOverview(clients),
      ageBandOverview: buildAgeBandOverview(clients),
      segmentSatisfactionVsChurn: buildSegmentOverview(clients).map((segment) => ({
        segment: segment.segment,
        averageSatisfaction: segment.averageSatisfaction,
        churnRatePct: segment.churnRatePct,
      })),
      complaintsImpact: buildComplaintsImpact(clients),
      engagementComparison: buildEngagementComparison(clients),
      riskDistribution: buildRiskDistribution(scoredClients),
      riskBySegment: buildRiskBySegment(scoredClients),
      topRiskClients: this.getTopAtRisk(8).map((client) => ({
        clientSK: client.ClientSK,
        scoreChurnPct: client.Score_Churn,
        riskClass: client.Classe_Risque,
      })),
    };
  }

  getAllClientsWithScores() {
    const { scoredClients } = this.getDataset();
    
    return scoredClients.map((client, index) => ({
      id: String(client.clientSK),
      clientSK: Number(client.clientSK),
      fullName: `Client ${client.clientSK}`,
      segment: client.segmentLabel,
      gouvernorat: 'Tunis',
      age: client.age || 0,
      satisfaction: 70,
      products: 2,
      appConnections: 5,
      riskScore: client.scoreChurn,
      riskClass: client.riskLabel,
      churnProbability: client.scoreChurn,
    }));
  }
}
