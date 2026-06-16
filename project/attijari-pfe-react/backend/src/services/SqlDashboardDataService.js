function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function toInteger(value) {
  return Math.round(toNumber(value));
}

function toText(value, fallback = '') {
  return String(value ?? '').trim() || fallback;
}

function normalizeText(value) {
  return toText(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/gu, '')
    .toLowerCase();
}

function pct(part, total) {
  const denominator = toNumber(total);
  return denominator > 0 ? Number(((toNumber(part) / denominator) * 100).toFixed(2)) : 0;
}

function metric(label, value, unit) {
  return { label, value: toNumber(value), unit };
}

export class SqlDashboardDataService {
  constructor({ sqlClient, logger }) {
    this.sqlClient = sqlClient;
    this.logger = logger;
  }

  hasAllRequiredFiles() {
    return true;
  }

  getAvailableDashboards() {
    return ['overview', 'campaigns', 'complaints', 'agencies', 'social'];
  }

  async buildSummaryContext({ dashboardType, filters = {} }) {
    const builders = {
      overview: () => this.buildOverviewContext(),
      campaigns: () => this.buildCampaignsContext(filters),
      complaints: () => this.buildComplaintsContext(),
      agencies: () => this.buildAgenciesContext(),
      social: () => this.buildSocialContext(),
    };
    const builder = builders[dashboardType];

    if (!builder) {
      const error = new Error(`Dashboard SQL Server non supporte: ${dashboardType}`);
      error.code = 'SQL_DASHBOARD_UNSUPPORTED';
      error.statusCode = 400;
      throw error;
    }

    try {
      return await builder();
    } catch (error) {
      this.logger?.error?.('SQL dashboard context failed.', {
        dashboardType,
        message: error?.message,
      });
      throw error;
    }
  }

  async getCampaignMetrics() {
    const [summaryRows, platformRows, topRows] = await Promise.all([
      this.sqlClient.queryArray(`
        SELECT
          COUNT(*) AS totalCampaigns,
          SUM(ISNULL(Impressions, 0)) AS totalImpressions,
          SUM(ISNULL(Clics, 0)) AS totalClicks,
          SUM(ISNULL(Budget_USD, 0)) AS totalBudgetUsd,
          SUM(ISNULL(Couverture, 0)) AS totalCoverage
        FROM dbo.FACT_Campagnes_Unified;
      `),
      this.sqlClient.queryArray(`
        SELECT
          p.NomPlateforme AS platform,
          COUNT(*) AS campaignCount,
          SUM(ISNULL(f.Impressions, 0)) AS impressions,
          SUM(ISNULL(f.Clics, 0)) AS clicks,
          SUM(ISNULL(f.Budget_USD, 0)) AS budgetUsd,
          SUM(ISNULL(f.Couverture, 0)) AS coverage,
          AVG(CAST(ISNULL(f.CPC_USD, 0) AS decimal(18, 4))) AS averageCpcUsd,
          AVG(CAST(ISNULL(f.CPA_USD, 0) AS decimal(18, 4))) AS averageCpaUsd,
          SUM(ISNULL(f.Clics_Sur_Lien, 0)) AS linkClicks,
          SUM(ISNULL(f.Vues_Landing, 0)) AS landingPageViews,
          SUM(ISNULL(f.Lectures_Video, 0)) AS videoPlays
        FROM dbo.FACT_Campagnes_Unified f
        INNER JOIN dbo.DIM_Plateforme p ON p.PlateformeID = f.PlateformeID
        GROUP BY p.NomPlateforme;
      `),
      this.sqlClient.queryArray(`
        SELECT TOP 10
          p.NomPlateforme AS platform,
          c.Nom_Campagne AS campaignName,
          ISNULL(f.Clics, 0) AS clicks,
          ISNULL(f.CTR, 0) AS ctrPct,
          ISNULL(f.Budget_USD, 0) AS budgetUsd,
          ISNULL(f.Couverture, 0) AS coverage
        FROM dbo.FACT_Campagnes_Unified f
        INNER JOIN dbo.DIM_Campagne c ON c.CampagneID = f.CampagneID
        INNER JOIN dbo.DIM_Plateforme p ON p.PlateformeID = f.PlateformeID
        ORDER BY ISNULL(f.Clics, 0) DESC;
      `),
    ]);

    const summary = summaryRows[0] ?? {};
    const platforms = platformRows.map((row) => ({
      platform: toText(row.platform),
      campaignCount: toInteger(row.campaignCount),
      impressions: toInteger(row.impressions),
      clicks: toInteger(row.clicks),
      ctrPct: pct(row.clicks, row.impressions),
      budgetUsd: toNumber(row.budgetUsd),
      coverage: toInteger(row.coverage),
      averageCpcUsd: toNumber(row.averageCpcUsd),
      averageCpaUsd: toNumber(row.averageCpaUsd),
      linkCtrPct: pct(row.linkClicks, row.impressions),
      landingPageViews: toInteger(row.landingPageViews),
      videoPlays: toInteger(row.videoPlays),
    }));
    const google = platforms.find((row) => normalizeText(row.platform).includes('google')) ?? {};
    const meta = platforms.find((row) => normalizeText(row.platform).includes('meta')) ?? {};
    const topCampaigns = topRows.map((row) => ({
      platform: toText(row.platform),
      campaignName: toText(row.campaignName, 'Campagne sans libelle'),
      clicks: toInteger(row.clicks),
      ctrPct: toNumber(row.ctrPct),
      budgetUsd: toNumber(row.budgetUsd),
      coverage: toInteger(row.coverage),
    }));

    return {
      totalCampaigns: toInteger(summary.totalCampaigns),
      globalMetrics: {
        totalImpressions: toInteger(summary.totalImpressions),
        totalClicks: toInteger(summary.totalClicks),
        globalCtrPct: pct(summary.totalClicks, summary.totalImpressions),
        googleBudgetUsd: toNumber(google.budgetUsd),
        metaCoverage: toInteger(meta.coverage),
      },
      googleMetrics: google,
      metaMetrics: meta,
      platformComparison: platforms,
      topGoogleCampaignsByClicks: topCampaigns.filter((row) =>
        normalizeText(row.platform).includes('google'),
      ),
      topMetaCampaignsByClicks: topCampaigns.filter((row) =>
        normalizeText(row.platform).includes('meta'),
      ),
    };
  }

  async buildCampaignsContext(filters) {
    const metrics = await this.getCampaignMetrics();
    const selectedView = normalizeText(filters.view ?? filters.platform ?? 'all');
    const source = 'sqlserver-live-campaigns';

    if (selectedView.includes('google')) {
      return {
        source,
        title: 'Campagnes Google',
        selectedView: 'google',
        extractedAt: new Date().toISOString(),
        kpis: [
          metric('Campagnes Google', metrics.googleMetrics.campaignCount, 'count'),
          metric('Impressions', metrics.googleMetrics.impressions, 'count'),
          metric('Clics', metrics.googleMetrics.clicks, 'count'),
          metric('CTR', metrics.googleMetrics.ctrPct, 'pct'),
          metric('CPA moyen', metrics.googleMetrics.averageCpaUsd, 'usd'),
          metric('Budget', metrics.googleMetrics.budgetUsd, 'usd'),
        ],
        googleMetrics: metrics.googleMetrics,
        topCampaignsByClicks: metrics.topGoogleCampaignsByClicks,
      };
    }

    if (selectedView.includes('meta')) {
      return {
        source,
        title: 'Campagnes Meta',
        selectedView: 'meta',
        extractedAt: new Date().toISOString(),
        kpis: [
          metric('Campagnes Meta', metrics.metaMetrics.campaignCount, 'count'),
          metric('Impressions', metrics.metaMetrics.impressions, 'count'),
          metric('Couverture', metrics.metaMetrics.coverage, 'count'),
          metric('Clics', metrics.metaMetrics.clicks, 'count'),
          metric('CTR', metrics.metaMetrics.ctrPct, 'pct'),
          metric('CTR lien', metrics.metaMetrics.linkCtrPct, 'pct'),
        ],
        metaMetrics: metrics.metaMetrics,
        topCampaignsByClicks: metrics.topMetaCampaignsByClicks,
      };
    }

    return {
      source,
      title: 'Campagnes',
      selectedView: 'global',
      extractedAt: new Date().toISOString(),
      kpis: [
        metric('Campagnes totales', metrics.totalCampaigns, 'count'),
        metric('Impressions totales', metrics.globalMetrics.totalImpressions, 'count'),
        metric('Clics totaux', metrics.globalMetrics.totalClicks, 'count'),
        metric('CTR global', metrics.globalMetrics.globalCtrPct, 'pct'),
        metric('Budget Google', metrics.globalMetrics.googleBudgetUsd, 'usd'),
        metric('Couverture Meta', metrics.globalMetrics.metaCoverage, 'count'),
      ],
      ...metrics,
    };
  }

  async buildSocialContext() {
    const [summaryRows, typeRows, sourceRows, topRows] = await Promise.all([
      this.sqlClient.queryArray(`
        SELECT
          COUNT(*) AS totalPosts,
          SUM(ISNULL(Nb_Likes, 0)) AS totalLikes,
          SUM(ISNULL(Nb_Commentaires, 0)) AS totalComments,
          SUM(ISNULL(Nb_Partages, 0)) AS totalShares,
          SUM(ISNULL(Engagement_Total, 0)) AS totalEngagement,
          AVG(CAST(ISNULL(Engagement_Total, 0) AS decimal(18, 2))) AS averageEngagement
        FROM dbo.FACT_PostSocialMedia;
      `),
      this.sqlClient.queryArray(`
        SELECT TOP 5
          t.Type AS postType,
          COUNT(*) AS postCount,
          AVG(CAST(ISNULL(f.Engagement_Total, 0) AS decimal(18, 2))) AS averageEngagementPerPost
        FROM dbo.FACT_PostSocialMedia f
        INNER JOIN dbo.DIM_TypePost t ON t.TypePostID = f.TypePostID
        GROUP BY t.Type
        ORDER BY averageEngagementPerPost DESC;
      `),
      this.sqlClient.queryArray(`
        SELECT
          r.NomReseau AS source,
          COUNT(*) AS postCount,
          SUM(ISNULL(f.Engagement_Total, 0)) AS totalEngagement,
          AVG(CAST(ISNULL(f.Engagement_Total, 0) AS decimal(18, 2))) AS averageEngagementPerPost
        FROM dbo.FACT_PostSocialMedia f
        INNER JOIN dbo.DIM_ReseauSocial r ON r.ReseauID = f.ReseauID
        GROUP BY r.NomReseau
        ORDER BY totalEngagement DESC;
      `),
      this.sqlClient.queryArray(`
        SELECT TOP 5
          r.NomReseau AS source,
          t.Type AS postType,
          ISNULL(f.Engagement_Total, 0) AS engagement,
          ISNULL(f.Nb_Likes, 0) AS likes,
          ISNULL(f.Nb_Commentaires, 0) AS comments,
          ISNULL(f.Nb_Partages, 0) AS shares
        FROM dbo.FACT_PostSocialMedia f
        INNER JOIN dbo.DIM_ReseauSocial r ON r.ReseauID = f.ReseauID
        INNER JOIN dbo.DIM_TypePost t ON t.TypePostID = f.TypePostID
        ORDER BY ISNULL(f.Engagement_Total, 0) DESC;
      `),
    ]);
    const summary = summaryRows[0] ?? {};

    return {
      source: 'sqlserver-live-social',
      title: 'Social Media',
      extractedAt: new Date().toISOString(),
      kpis: [
        metric('Posts Attijari', summary.totalPosts, 'count'),
        metric('Engagement total', summary.totalEngagement, 'count'),
        metric('Engagement moyen par post', summary.averageEngagement, 'count'),
        metric('Likes', summary.totalLikes, 'count'),
        metric('Commentaires', summary.totalComments, 'count'),
        metric('Partages', summary.totalShares, 'count'),
      ],
      channelMix: sourceRows.map((row) => ({
        source: toText(row.source),
        postCount: toInteger(row.postCount),
        totalEngagement: toInteger(row.totalEngagement),
        averageEngagementPerPost: toNumber(row.averageEngagementPerPost),
      })),
      postTypePerformance: typeRows.map((row) => ({
        postType: toText(row.postType),
        postCount: toInteger(row.postCount),
        averageEngagementPerPost: toNumber(row.averageEngagementPerPost),
      })),
      competitiveBenchmark: [
        {
          brand: 'Attijari Bank',
          postCount: toInteger(summary.totalPosts),
          totalEngagement: toInteger(summary.totalEngagement),
          averageEngagementPerPost: toNumber(summary.averageEngagement),
        },
      ],
      topPosts: topRows.map((row) => ({
        source: toText(row.source),
        postType: toText(row.postType),
        engagement: toInteger(row.engagement),
        likes: toInteger(row.likes),
        comments: toInteger(row.comments),
        shares: toInteger(row.shares),
      })),
    };
  }

  async buildComplaintsContext() {
    const rows = await this.sqlClient.queryArray(`
      SELECT
        COUNT(*) AS totalComplaints,
        COUNT(DISTINCT ClientSK) AS uniqueComplainants,
        AVG(CAST(ISNULL(Temps_Resolution_Days, 0) AS decimal(18, 2))) AS averageResolutionDays,
        AVG(CAST(ISNULL(Satisfaction_Post_Resolution, 0) AS decimal(18, 2))) AS averageSatisfaction
      FROM dbo.FACT_Reclamation;
    `);
    const summary = rows[0] ?? {};

    return {
      source: 'sqlserver-live-complaints',
      title: 'Reclamations',
      extractedAt: new Date().toISOString(),
      kpis: [
        metric('Total reclamations', summary.totalComplaints, 'count'),
        metric('Reclamants uniques', summary.uniqueComplainants, 'count'),
        metric('Delai moyen de resolution', summary.averageResolutionDays, 'days'),
        metric('Satisfaction post-resolution', summary.averageSatisfaction, 'score'),
      ],
      serviceQuality: {
        averageResolutionDays: toNumber(summary.averageResolutionDays),
        averagePostResolutionSatisfaction: toNumber(summary.averageSatisfaction),
      },
    };
  }

  async buildAgenciesContext() {
    const rows = await this.sqlClient.queryArray(`
      SELECT
        COUNT(DISTINCT AgenceSK) AS totalAgencies,
        SUM(ISNULL(Nb_Avis, 0)) AS totalReviews,
        AVG(CAST(ISNULL(Note_Google, 0) AS decimal(18, 2))) AS averageRating,
        AVG(CAST(ISNULL(Satisfaction_Score, 0) AS decimal(18, 2))) AS averageSatisfaction,
        SUM(CASE WHEN ISNULL(Note_Google, 0) < 3 THEN 1 ELSE 0 END) AS criticalAgencies
      FROM dbo.FACT_AvisAgence;
    `);
    const summary = rows[0] ?? {};

    return {
      source: 'sqlserver-live-agencies',
      title: 'Agences',
      extractedAt: new Date().toISOString(),
      kpis: [
        metric('Agences evaluees', summary.totalAgencies, 'count'),
        metric('Avis Google', summary.totalReviews, 'count'),
        metric('Note Google moyenne', summary.averageRating, 'score'),
        metric('Satisfaction moyenne', summary.averageSatisfaction, 'score'),
        metric('Agences critiques', summary.criticalAgencies, 'count'),
      ],
      ratingOverview: {
        averageGoogleRating: toNumber(summary.averageRating),
        averageSatisfactionScore: toNumber(summary.averageSatisfaction),
        criticalAgencies: toInteger(summary.criticalAgencies),
      },
    };
  }

  async buildOverviewContext() {
    const [campaigns, social, complaints, agencies] = await Promise.all([
      this.getCampaignMetrics(),
      this.buildSocialContext(),
      this.buildComplaintsContext(),
      this.buildAgenciesContext(),
    ]);

    return {
      source: 'sqlserver-live-overview',
      title: 'Vue globale',
      extractedAt: new Date().toISOString(),
      kpis: [
        metric('Campagnes totales', campaigns.totalCampaigns, 'count'),
        metric('Clics campagnes', campaigns.globalMetrics.totalClicks, 'count'),
        metric('Engagement social', social.kpis[1].value, 'count'),
        metric('Reclamations', complaints.kpis[0].value, 'count'),
        metric('Note Google agences', agencies.kpis[2].value, 'score'),
      ],
      marketingReach: campaigns.globalMetrics,
      socialReputation: {
        totalPosts: social.kpis[0].value,
        totalEngagement: social.kpis[1].value,
      },
      serviceQuality: complaints.serviceQuality,
      networkPerception: agencies.ratingOverview,
    };
  }
}
