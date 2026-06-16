const numberFormatter = new Intl.NumberFormat('fr-FR', {
  maximumFractionDigits: 0,
});

const percentageFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const decimalFormatter = new Intl.NumberFormat('fr-FR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

const HOME_CACHE_KEY = 'home-snapshot-live';

const riskBaseCte = `
WITH base AS (
  SELECT
    f.ClientSK,
    CAST(ISNULL(f.Est_Client_Actif, 0) AS int) AS Est_Client_Actif,
    CAST(ISNULL(f.A_Quitte, 0) AS int) AS A_Quitte,
    ISNULL(f.Score_Satisfaction, 0) AS Score_Satisfaction,
    ISNULL(f.Nb_Connexions_App_Mois, 0) AS Nb_Connexions_App_Mois,
    ISNULL(f.Nb_Produits, 0) AS Nb_Produits,
    ISNULL(f.Nb_Reclamations_12mois, 0) AS Nb_Reclamations_12mois,
    ISNULL(d.Anciennete_Annees, 0) AS Anciennete_Annees,
    f.SegmentID
  FROM FACT_Client f
  INNER JOIN DIM_Client d ON d.ClientSK = f.ClientSK
),
risk AS (
  SELECT
    *,
    CAST(
      CASE
        WHEN A_Quitte = 1 THEN 100
        ELSE
          (CASE WHEN Score_Satisfaction <= 2 THEN 38 WHEN Score_Satisfaction = 3 THEN 20 ELSE 0 END) +
          (CASE WHEN Nb_Connexions_App_Mois <= 2 THEN 24 WHEN Nb_Connexions_App_Mois <= 5 THEN 12 ELSE 0 END) +
          (CASE WHEN Nb_Reclamations_12mois >= 2 THEN 18 WHEN Nb_Reclamations_12mois = 1 THEN 9 ELSE 0 END) +
          (CASE WHEN Nb_Produits <= 1 THEN 12 WHEN Nb_Produits = 2 THEN 6 ELSE 0 END) +
          (CASE WHEN Anciennete_Annees <= 1 THEN 8 ELSE 0 END)
      END AS decimal(10, 2)
    ) AS risk_score
  FROM base
)
`;

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function formatInteger(value) {
  return numberFormatter.format(Math.round(toNumber(value)));
}

function formatPercentage(value, digits = 1) {
  const numericValue = toNumber(value);

  if (digits === 0) {
    return `${numberFormatter.format(Math.round(numericValue))}%`;
  }

  return `${percentageFormatter.format(numericValue)}%`;
}

function formatDecimal(value) {
  return decimalFormatter.format(toNumber(value));
}

function toSatisfactionOnHundred(scoreOnFive) {
  return Math.max(0, Math.min(100, toNumber(scoreOnFive) * 20));
}

function mapSeverityFromRisk(riskScore) {
  if (riskScore >= 60) {
    return 'Critique';
  }

  if (riskScore >= 45) {
    return 'Elevee';
  }

  if (riskScore >= 30) {
    return 'Moderee';
  }

  return 'Information';
}

function mapSeverityFromSatisfaction(score) {
  if (score < 45) {
    return 'Critique';
  }

  if (score < 60) {
    return 'Elevee';
  }

  if (score < 75) {
    return 'Moderee';
  }

  return 'Information';
}

function buildAlertTimestamp(index) {
  return new Date(Date.now() - index * 12 * 60 * 1000).toISOString();
}

function nonEmptyLabel(value, fallback) {
  return String(value ?? '').trim() || fallback;
}

export class HomeSnapshotService {
  constructor({ sqlClient, cache, logger }) {
    this.sqlClient = sqlClient;
    this.cache = cache;
    this.logger = logger;
  }

  async getSnapshot() {
    const cachedSnapshot = this.cache?.get(HOME_CACHE_KEY);

    if (cachedSnapshot) {
      return cachedSnapshot;
    }

    const [summary, topRiskSegment, complaintHotspot, weakestAgency, lowEngagement] =
      await Promise.all([
        this.getSummary(),
        this.getTopRiskSegment(),
        this.getComplaintHotspot(),
        this.getWeakestAgency(),
        this.getLowEngagementSegment(),
      ]);

    const snapshot = {
      source: 'sqlserver-live',
      collectedAt: new Date().toISOString(),
      kpis: this.buildKpis(summary),
      alerts: this.buildAlerts({
        summary,
        topRiskSegment,
        complaintHotspot,
        weakestAgency,
        lowEngagement,
      }),
      recommendations: this.buildRecommendations({
        summary,
        topRiskSegment,
        complaintHotspot,
        weakestAgency,
        lowEngagement,
      }),
    };

    this.cache?.set(HOME_CACHE_KEY, snapshot);
    this.logger?.info?.('Home snapshot loaded from SQL Server.', {
      source: snapshot.source,
      kpis: snapshot.kpis.length,
      alerts: snapshot.alerts.length,
      recommendations: snapshot.recommendations.length,
    });

    return snapshot;
  }

  async getSummary() {
    return this.sqlClient.queryObject(`
      ${riskBaseCte}
      SELECT
        COUNT(*) AS totalClients,
        SUM(CASE WHEN Est_Client_Actif = 1 THEN 1 ELSE 0 END) AS activeClients,
        SUM(CASE WHEN A_Quitte = 1 THEN 1 ELSE 0 END) AS churnedClients,
        CAST(AVG(CAST(Score_Satisfaction AS decimal(10, 2))) AS decimal(10, 2)) AS averageSatisfactionFive,
        CAST(AVG(CAST(CASE WHEN Est_Client_Actif = 1 THEN risk_score END AS decimal(10, 2))) AS decimal(10, 2)) AS averageRiskScore,
        SUM(CASE WHEN Est_Client_Actif = 1 AND risk_score >= 60 THEN 1 ELSE 0 END) AS highRiskClients,
        CAST(
          100.0 * SUM(CASE WHEN Est_Client_Actif = 1 AND risk_score >= 60 THEN 1 ELSE 0 END) /
          NULLIF(SUM(CASE WHEN Est_Client_Actif = 1 THEN 1 ELSE 0 END), 0)
          AS decimal(10, 2)
        ) AS predictedChurnRate,
        SUM(CASE WHEN Est_Client_Actif = 1 AND Score_Satisfaction >= 4 THEN 1 ELSE 0 END) AS highSatisfactionClients,
        SUM(CASE WHEN Est_Client_Actif = 1 AND Nb_Produits <= 1 THEN 1 ELSE 0 END) AS monoProductActiveClients,
        SUM(CASE WHEN Est_Client_Actif = 1 AND Nb_Connexions_App_Mois <= 2 THEN 1 ELSE 0 END) AS lowDigitalEngagementClients,
        (SELECT COUNT(*) FROM DIM_Agence) AS agencyCount,
        (SELECT COUNT(DISTINCT GouvernoratID) FROM DIM_Agence) AS coveredGovernorates,
        (SELECT COUNT(*) FROM FACT_Reclamation) AS totalComplaints
      FROM risk
    `);
  }

  async getTopRiskSegment() {
    return this.sqlClient.queryObject(`
      ${riskBaseCte}
      SELECT TOP 1
        ISNULL(s.NomSegment, 'Portefeuille global') AS segmentName,
        CAST(AVG(CAST(risk_score AS decimal(10, 2))) AS decimal(10, 2)) AS averageRiskScore,
        SUM(CASE WHEN risk_score >= 60 THEN 1 ELSE 0 END) AS highRiskClients,
        COUNT(*) AS clientCount
      FROM risk r
      LEFT JOIN DIM_Segment s ON s.SegmentID = r.SegmentID
      WHERE Est_Client_Actif = 1
      GROUP BY s.NomSegment
      ORDER BY AVG(risk_score) DESC, COUNT(*) DESC
    `);
  }

  async getComplaintHotspot() {
    return this.sqlClient.queryObject(`
      SELECT TOP 1
        ISNULL(g.Nom, 'Non renseigne') AS gouvernoratName,
        COUNT(*) AS complaintCount,
        CAST(AVG(CAST(r.Temps_Resolution_Days AS decimal(10, 2))) AS decimal(10, 2)) AS averageResolutionDays,
        CAST(AVG(CAST(r.Satisfaction_Post_Resolution AS decimal(10, 2))) AS decimal(10, 2)) AS averageResolutionSatisfaction
      FROM FACT_Reclamation r
      LEFT JOIN DIM_Gouvernorat g ON g.GouvernoratID = r.GouvernoratID
      GROUP BY g.Nom
      ORDER BY COUNT(*) DESC, AVG(CAST(r.Temps_Resolution_Days AS decimal(10, 2))) DESC
    `);
  }

  async getWeakestAgency() {
    return this.sqlClient.queryObject(`
      SELECT TOP 1
        a.Nom_Propre AS agencyName,
        ISNULL(g.Nom, 'Non renseigne') AS gouvernoratName,
        CAST(AVG(CAST(aa.Satisfaction_Score AS decimal(10, 2))) AS decimal(10, 2)) AS averageSatisfactionScore,
        CAST(AVG(CAST(aa.Note_Google AS decimal(10, 2))) AS decimal(10, 2)) AS averageGoogleScore,
        SUM(ISNULL(aa.Nb_Reclamations, 0)) AS totalComplaints,
        SUM(ISNULL(aa.Nb_Avis, 0)) AS totalReviews
      FROM FACT_AvisAgence aa
      INNER JOIN DIM_Agence a ON a.AgenceSK = aa.AgenceSK
      LEFT JOIN DIM_Gouvernorat g ON g.GouvernoratID = aa.GouvernoratID
      GROUP BY a.Nom_Propre, g.Nom
      HAVING SUM(ISNULL(aa.Nb_Avis, 0)) > 0
      ORDER BY AVG(CAST(aa.Satisfaction_Score AS decimal(10, 2))) ASC, SUM(ISNULL(aa.Nb_Reclamations, 0)) DESC
    `);
  }

  async getLowEngagementSegment() {
    return this.sqlClient.queryObject(`
      SELECT TOP 1
        ISNULL(s.NomSegment, 'Portefeuille global') AS segmentName,
        CAST(AVG(CAST(f.Nb_Connexions_App_Mois AS decimal(10, 2))) AS decimal(10, 2)) AS averageAppConnections,
        COUNT(*) AS clientCount,
        SUM(CASE WHEN ISNULL(f.Nb_Produits, 0) <= 1 THEN 1 ELSE 0 END) AS monoProductClients
      FROM FACT_Client f
      LEFT JOIN DIM_Segment s ON s.SegmentID = f.SegmentID
      WHERE CAST(ISNULL(f.Est_Client_Actif, 0) AS int) = 1
      GROUP BY s.NomSegment
      ORDER BY AVG(CAST(f.Nb_Connexions_App_Mois AS decimal(10, 2))) ASC, COUNT(*) DESC
    `);
  }

  buildKpis(summary) {
    const totalClients = toNumber(summary?.totalClients);
    const activeClients = toNumber(summary?.activeClients);
    const activeRatio = totalClients > 0 ? (activeClients / totalClients) * 100 : 0;
    const predictedChurnRate = toNumber(summary?.predictedChurnRate);
    const averageSatisfaction = toSatisfactionOnHundred(summary?.averageSatisfactionFive);
    const satisfiedClients = toNumber(summary?.highSatisfactionClients);
    const satisfiedShare = activeClients > 0 ? (satisfiedClients / activeClients) * 100 : 0;
    const agencies = toNumber(summary?.agencyCount);
    const coveredGovernorates = toNumber(summary?.coveredGovernorates);

    return [
      {
        id: 'clients',
        label: 'Total Clients',
        value: formatInteger(totalClients),
        change: `${formatPercentage(activeRatio)} actifs dans le portefeuille`,
        trend: activeRatio >= 80 ? 'up' : 'neutral',
        accentColor: 'primary',
        helperText: 'Volume consolide directement depuis le DWH SSMS',
        icon: 'users',
      },
      {
        id: 'churn',
        label: 'Churn Predictif',
        value: formatPercentage(predictedChurnRate),
        change: `${formatInteger(summary?.highRiskClients)} clients en vigilance`,
        trend: predictedChurnRate <= 10 ? 'down' : 'up',
        accentColor: 'gold',
        helperText: 'Score live calcule a partir des signaux relationnels et digitaux',
        icon: 'userMinus',
      },
      {
        id: 'satisfaction',
        label: 'Satisfaction',
        value: `${formatInteger(averageSatisfaction)} / 100`,
        change: `${formatPercentage(satisfiedShare)} des actifs notent 4 ou 5`,
        trend: averageSatisfaction >= 80 ? 'up' : 'neutral',
        accentColor: 'success',
        helperText: 'Indice relationnel moyen issu du score satisfaction client',
        icon: 'smile',
      },
      {
        id: 'reseau',
        label: 'Reseau',
        value: `${formatInteger(agencies)} agences`,
        change: `${formatInteger(coveredGovernorates)} gouvernorats couverts`,
        trend: 'neutral',
        accentColor: 'navy',
        helperText: 'Maillage physique extrait du referentiel agences',
        icon: 'building2',
      },
    ];
  }

  buildAlerts({ summary, topRiskSegment, complaintHotspot, weakestAgency, lowEngagement }) {
    const weakestAgencySatisfaction = toNumber(weakestAgency?.averageSatisfactionScore);
    const weakestAgencySatisfactionOnHundred = Math.max(
      0,
      Math.min(100, weakestAgencySatisfaction),
    );
    const monoProductActiveClients = toNumber(summary?.monoProductActiveClients);
    const activeClients = toNumber(summary?.activeClients);
    const monoProductShare = activeClients > 0 ? (monoProductActiveClients / activeClients) * 100 : 0;
    const segmentRiskScore = toNumber(topRiskSegment?.averageRiskScore);
    const averageAppConnections = toNumber(lowEngagement?.averageAppConnections);

    return [
      {
        id: 'ALR-SQL-001',
        title:
          segmentRiskScore >= 45
            ? `Risque churn eleve sur le segment ${nonEmptyLabel(topRiskSegment?.segmentName, 'prioritaire')}`
            : `Segment a surveiller pour le churn : ${nonEmptyLabel(topRiskSegment?.segmentName, 'prioritaire')}`,
        description: `${formatInteger(topRiskSegment?.highRiskClients)} clients sont en vigilance sur ${formatInteger(topRiskSegment?.clientCount)} clients, avec un risque moyen de ${formatPercentage(topRiskSegment?.averageRiskScore, 0)}.`,
        severity: mapSeverityFromRisk(segmentRiskScore),
        timestamp: buildAlertTimestamp(1),
      },
      {
        id: 'ALR-SQL-002',
        title: `Pic de reclamations sur ${nonEmptyLabel(complaintHotspot?.gouvernoratName, 'le gouvernorat leader')}`,
        description: `${formatInteger(complaintHotspot?.complaintCount)} reclamations, resolution moyenne en ${formatDecimal(complaintHotspot?.averageResolutionDays)} jours.`,
        severity:
          toNumber(complaintHotspot?.averageResolutionDays) >= 20 ? 'Elevee' : 'Moderee',
        timestamp: buildAlertTimestamp(2),
      },
      {
        id: 'ALR-SQL-003',
        title: `Experience agence a surveiller sur ${nonEmptyLabel(weakestAgency?.agencyName, 'une agence du reseau')}`,
        description: `Le score satisfaction moyen descend a ${formatInteger(weakestAgencySatisfactionOnHundred)} / 100 pour ${formatInteger(weakestAgency?.totalReviews)} avis.`,
        severity: mapSeverityFromSatisfaction(weakestAgencySatisfactionOnHundred),
        timestamp: buildAlertTimestamp(3),
      },
      {
        id: 'ALR-SQL-004',
        title:
          averageAppConnections <= 5
            ? `Engagement digital faible sur ${nonEmptyLabel(lowEngagement?.segmentName, 'un segment actif')}`
            : `Segment le moins engage digitalement : ${nonEmptyLabel(lowEngagement?.segmentName, 'un segment actif')}`,
        description: `${formatDecimal(lowEngagement?.averageAppConnections)} connexions app par mois en moyenne sur ${formatInteger(lowEngagement?.clientCount)} clients.`,
        severity: averageAppConnections <= 5 ? 'Moderee' : 'Information',
        timestamp: buildAlertTimestamp(4),
      },
      {
        id: 'ALR-SQL-005',
        title: 'Poids important des clients mono-produit',
        description: `${formatInteger(monoProductActiveClients)} clients actifs restent mono-produit, soit ${formatPercentage(monoProductShare)} du portefeuille actif.`,
        severity: monoProductShare >= 30 ? 'Moderee' : 'Information',
        timestamp: buildAlertTimestamp(5),
      },
    ];
  }

  buildRecommendations({ topRiskSegment, complaintHotspot, weakestAgency, lowEngagement }) {
    const segmentRisk = toNumber(topRiskSegment?.averageRiskScore);
    const complaintCount = toNumber(complaintHotspot?.complaintCount);
    const weakestAgencySatisfaction = Math.max(
      0,
      Math.min(100, toNumber(weakestAgency?.averageSatisfactionScore)),
    );

    return [
      {
        id: 'REC-SQL-001',
        title: `Lancer une retention ciblee sur ${nonEmptyLabel(topRiskSegment?.segmentName, 'le segment le plus expose')}`,
        description: `${formatInteger(topRiskSegment?.highRiskClients)} clients actifs cumulent un risque moyen de ${formatPercentage(segmentRisk, 0)}. Prioriser les parcours conseiller et offres de retention.`,
        impact: Math.min(95, Math.max(60, Math.round(segmentRisk))),
        roi: `x${formatDecimal(2.5 + segmentRisk / 40)}`,
        priority: 'Haute',
        owner: 'Direction Relation Client',
        eta: '7 jours',
        actionLabel: 'Voir le plan',
        category: 'Retention segment',
      },
      {
        id: 'REC-SQL-002',
        title: `Traiter le foyer de reclamations de ${nonEmptyLabel(complaintHotspot?.gouvernoratName, 'la zone la plus chargee')}`,
        description: `${formatInteger(complaintCount)} reclamations sont concentrees dans cette zone. Mettre en place une cellule service recovery et raccourcir les delais de resolution.`,
        impact: Math.min(92, Math.max(58, Math.round(55 + complaintCount / 200))),
        roi: `x${formatDecimal(2.2 + complaintCount / 5000)}`,
        priority: 'Haute',
        owner: 'Qualite de Service',
        eta: '72 h',
        actionLabel: 'Voir le plan',
        category: 'Service recovery',
      },
      {
        id: 'REC-SQL-003',
        title: `Renforcer le plan d action reseau sur ${nonEmptyLabel(weakestAgency?.agencyName, 'l agence la moins bien notee')}`,
        description: `${formatInteger(weakestAgencySatisfaction)} / 100 de satisfaction moyenne pour ${formatInteger(weakestAgency?.totalReviews)} avis et ${formatInteger(weakestAgency?.totalComplaints)} reclamations rattachees. Prioriser un plan terrain local.`,
        impact: Math.min(88, Math.max(52, Math.round(100 - weakestAgencySatisfaction))),
        roi: `x${formatDecimal(1.9 + Math.max(0, 80 - weakestAgencySatisfaction) / 100)}`,
        priority: 'Moyenne',
        owner: 'Animation Reseau',
        eta: '14 jours',
        actionLabel: 'Voir le plan',
        category: 'Pilotage reseau',
      },
    ];
  }
}
