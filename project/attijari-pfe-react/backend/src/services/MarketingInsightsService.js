const INSUFFICIENT_DATA_MESSAGE =
  'Données insuffisantes pour générer une recommandation fiable.';

function toNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function toText(value, fallback = '') {
  const text = String(value ?? '').trim();
  return text || fallback;
}

function hasPositiveNumber(value) {
  return Number.isFinite(Number(value)) && Number(value) > 0;
}

function buildMetric(label, value, unit, helperText = '') {
  return {
    label,
    value: unit === 'text' ? toText(value) : toNumber(value),
    unit,
    helperText,
  };
}

function resolveStatus(isAvailable) {
  return isAvailable ? 'available' : 'insufficient';
}

function buildBestCampaign(campaignContext) {
  const googleCampaigns = Array.isArray(campaignContext?.topGoogleCampaignsByClicks)
    ? campaignContext.topGoogleCampaignsByClicks.map((campaign) => ({
        name: toText(campaign.campaignName),
        platform: 'Google Ads',
        clicks: toNumber(campaign.clicks),
        ctrPct: toNumber(campaign.ctrPct),
        budgetUsd: toNumber(campaign.budgetUsd),
      }))
    : [];

  const metaCampaigns = Array.isArray(campaignContext?.topMetaCampaignsByClicks)
    ? campaignContext.topMetaCampaignsByClicks.map((campaign) => ({
        name: toText(campaign.campaignName),
        platform: 'Meta Ads',
        clicks: toNumber(campaign.clicks),
        ctrPct: toNumber(campaign.ctrPct),
        coverage: toNumber(campaign.coverage),
      }))
    : [];

  const candidates = [...googleCampaigns, ...metaCampaigns].filter(
    (campaign) => campaign.name && campaign.clicks > 0,
  );

  if (!candidates.length) {
    return {
      status: 'insufficient',
      title: 'Meilleure campagne',
      label: 'Campagne la plus performante',
      value: INSUFFICIENT_DATA_MESSAGE,
      explanation: INSUFFICIENT_DATA_MESSAGE,
      evidence: [],
    };
  }

  const bestCampaign = candidates.sort((left, right) => {
    const leftScore = left.clicks * Math.max(left.ctrPct, 0.01);
    const rightScore = right.clicks * Math.max(right.ctrPct, 0.01);
    return rightScore - leftScore;
  })[0];

  return {
    status: 'available',
    title: 'Meilleure campagne',
    label: 'Campagne la plus performante',
    value: bestCampaign.name,
    explanation:
      'Classement calculé à partir du volume de clics et du taux de clic disponibles dans les données campagnes.',
    evidence: [
      buildMetric('Canal', bestCampaign.platform, 'text'),
      buildMetric('Clics', bestCampaign.clicks, 'count'),
      buildMetric('CTR', bestCampaign.ctrPct, 'pct'),
    ],
  };
}

function buildBestChannel(campaignContext) {
  const comparison = Array.isArray(campaignContext?.platformComparison)
    ? campaignContext.platformComparison
    : [];
  const googleFromComparison =
    comparison.find((item) => String(item.platform ?? '').toLowerCase().includes('google')) ?? {};
  const metaFromComparison =
    comparison.find((item) => String(item.platform ?? '').toLowerCase().includes('meta')) ?? {};
  const google = campaignContext?.googleMetrics ?? googleFromComparison;
  const meta = campaignContext?.metaMetrics ?? metaFromComparison;

  const googleClicks = toNumber(google.clicks);
  const metaClicks = toNumber(meta.clicks);
  const googleCtr = toNumber(google.ctrPct);
  const metaCtr = toNumber(meta.ctrPct);
  const googleCpc = toNumber(google.averageCpcUsd);
  const metaCpc = toNumber(meta.averageCpcUsd);

  if ((!googleClicks && !metaClicks) || (!googleCtr && !metaCtr)) {
    return {
      status: 'insufficient',
      title: 'Canal le plus performant',
      label: "Meilleur canal d'acquisition",
      value: INSUFFICIENT_DATA_MESSAGE,
      explanation: INSUFFICIENT_DATA_MESSAGE,
      evidence: [],
    };
  }

  const googleScore =
    googleCtr * 0.45 +
    googleClicks * 0.00001 +
    (hasPositiveNumber(googleCpc) ? 1 / googleCpc : 0) * 0.35;
  const metaScore =
    metaCtr * 0.45 +
    metaClicks * 0.00001 +
    (hasPositiveNumber(metaCpc) ? 1 / metaCpc : 0) * 0.35;
  const bestChannel = googleScore >= metaScore ? 'Google Ads' : 'Meta Ads';

  return {
    status: 'available',
    title: 'Canal le plus performant',
    label: "Meilleur canal d'acquisition",
    value: bestChannel,
    explanation:
      'Comparaison calculée à partir du CTR et du volume de clics disponibles. Le CPC ou le CPA est utilisé uniquement lorsqu’il existe pour les canaux comparés.',
    evidence: [
      buildMetric('CTR Google', googleCtr, 'pct'),
      buildMetric('CTR Meta', metaCtr, 'pct'),
      buildMetric('CPC moyen Google', googleCpc, 'usd'),
      buildMetric('CPC moyen Meta', metaCpc, 'usd'),
      buildMetric('Clics Google', googleClicks, 'count'),
      buildMetric('Clics Meta', metaClicks, 'count'),
    ],
  };
}

function buildBestOffer() {
  return {
    status: 'insufficient',
    title: 'Offre la plus performante',
    label: 'Produit ou offre marketing le plus rentable',
    value: 'ROI non calculable avec les données disponibles',
    explanation:
      'Les jeux de données marketing disponibles ne contiennent pas de champ offre/produit associé à une valeur de conversion ou à un revenu fiable.',
    evidence: [],
  };
}

function buildSocialPerformance(socialContext) {
  const topPosts = Array.isArray(socialContext?.topPosts) ? socialContext.topPosts : [];
  const postTypes = Array.isArray(socialContext?.postTypePerformance)
    ? socialContext.postTypePerformance
    : [];
  const benchmark = Array.isArray(socialContext?.competitiveBenchmark)
    ? socialContext.competitiveBenchmark
    : [];

  const topPost = topPosts[0];
  const topPostType = postTypes[0];
  const attijariBenchmark = benchmark.find((item) => item.brand === 'Attijari Bank');

  if (!topPost && !topPostType && !attijariBenchmark) {
    return {
      status: 'insufficient',
      title: 'Performance des réseaux sociaux',
      label: "Contenu générant le plus d'engagement",
      value: INSUFFICIENT_DATA_MESSAGE,
      explanation: INSUFFICIENT_DATA_MESSAGE,
      evidence: [],
    };
  }

  return {
    status: 'available',
    title: 'Performance des réseaux sociaux',
    label: "Contenu générant le plus d'engagement",
    value: toText(topPostType?.postType ?? topPost?.postType, 'Contenu social prioritaire'),
    explanation:
      'Lecture calculée à partir de l’engagement observé sur les publications social media disponibles.',
    evidence: [
      buildMetric('Engagement total', socialContext?.kpis?.[1]?.value, 'count'),
      buildMetric('Engagement moyen par post', socialContext?.kpis?.[2]?.value, 'count'),
      buildMetric('Engagement du meilleur contenu', topPost?.engagement, 'count'),
      buildMetric('Publications Attijari', attijariBenchmark?.postCount, 'count'),
    ],
  };
}

function buildRecommendations({ bestCampaign, bestChannel, socialPerformance }) {
  const recommendations = [];

  if (bestChannel.status === 'available') {
    const cpcMetrics = bestChannel.evidence.filter((metric) => metric.label.includes('CPC'));
    const hasCpc = cpcMetrics.some((metric) => hasPositiveNumber(metric.value));

    recommendations.push({
      title: 'Réallouer le budget vers le canal le plus efficace',
      recommendation: hasCpc
        ? `Prioriser ${bestChannel.value} sur les prochaines vagues, car ce canal présente le meilleur équilibre observé entre coût, clics et taux de clic.`
        : `Prioriser ${bestChannel.value} avec prudence, car la décision repose sur le CTR et le volume de clics disponibles, sans lecture complète du CPA.`,
      confidence: hasCpc ? 'Élevée' : 'Moyenne',
      basedOn: bestChannel.evidence,
    });
  }

  if (bestCampaign.status === 'available') {
    recommendations.push({
      title: 'Renforcer la campagne la plus performante',
      recommendation: `Analyser la campagne « ${bestCampaign.value} » comme référence opérationnelle et répliquer ses leviers sur les campagnes comparables.`,
      confidence: 'Moyenne',
      basedOn: bestCampaign.evidence,
    });
  }

  if (socialPerformance.status === 'available') {
    recommendations.push({
      title: 'Capitaliser sur les contenus à fort engagement',
      recommendation: `Renforcer les formats proches de « ${socialPerformance.value} », car ils concentrent le meilleur engagement observé dans les données social media.`,
      confidence: 'Moyenne',
      basedOn: socialPerformance.evidence,
    });
  }

  return recommendations.length
    ? recommendations
    : [
        {
          title: 'Recommandation indisponible',
          recommendation: INSUFFICIENT_DATA_MESSAGE,
          confidence: 'Données insuffisantes',
          basedOn: [],
        },
      ];
}

function buildDecisionRecommendations({ bestCampaign, bestChannel, socialPerformance }) {
  const recommendations = [];

  if (bestChannel.status === 'available') {
    const cpcMetrics = bestChannel.evidence.filter((metric) => metric.label.includes('CPC'));
    const hasCpc = cpcMetrics.some((metric) => hasPositiveNumber(metric.value));

    recommendations.push({
      title: 'Comparer les canaux avant arbitrage budgetaire',
      recommendation: hasCpc
        ? `Etudier un renforcement progressif de ${bestChannel.value}, car ce canal presente le meilleur equilibre observe entre cout, clics et taux de clic.`
        : `${bestChannel.value} ressort favorablement sur les indicateurs disponibles. La decision doit rester prudente, car la lecture repose sur le CTR et le volume de clics, sans CPA complet.`,
      confidence: hasCpc ? 'Elevee' : 'Moyenne',
      basedOn: bestChannel.evidence,
    });
  }

  if (bestCampaign.status === 'available') {
    recommendations.push({
      title: 'Analyser la campagne de reference',
      recommendation: `Examiner la campagne "${bestCampaign.value}" comme reference de performance, puis identifier les leviers reproductibles avant toute extension a d'autres campagnes.`,
      confidence: 'Moyenne',
      basedOn: bestCampaign.evidence,
    });
  }

  if (socialPerformance.status === 'available') {
    recommendations.push({
      title: "Orienter les contenus selon l'engagement observe",
      recommendation: `Tester davantage de contenus proches de "${socialPerformance.value}" et suivre leur engagement avant de generaliser ce format sur le calendrier editorial.`,
      confidence: 'Moyenne',
      basedOn: socialPerformance.evidence,
    });
  }

  return recommendations.length
    ? recommendations
    : [
        {
          title: 'Recommandation indisponible',
          recommendation: INSUFFICIENT_DATA_MESSAGE,
          confidence: 'Donnees insuffisantes',
          basedOn: [],
        },
      ];
}

export class MarketingInsightsService {
  constructor({ dashboardDataService }) {
    this.dashboardDataService = dashboardDataService;
  }

  async buildInsights() {
    const [campaignContext, socialContext] = await Promise.all([
      this.dashboardDataService.buildSummaryContext({
        dashboardType: 'campaigns',
        filters: {},
      }),
      this.dashboardDataService.buildSummaryContext({
        dashboardType: 'social',
        filters: {},
      }),
    ]);

    const bestCampaign = buildBestCampaign(campaignContext);
    const bestChannel = buildBestChannel(campaignContext);
    const bestOffer = buildBestOffer();
    const socialPerformance = buildSocialPerformance(socialContext);

    return {
      source: 'live-marketing-datasets',
      generatedAt: new Date().toISOString(),
      dataAvailable: true,
      message: '',
      kpis: [
        buildMetric(
          'Campagnes totales',
          campaignContext?.globalMetrics?.totalCampaigns ?? campaignContext?.kpis?.[0]?.value,
          'count',
        ),
        buildMetric('Impressions totales', campaignContext?.globalMetrics?.totalImpressions, 'count'),
        buildMetric('Clics totaux', campaignContext?.globalMetrics?.totalClicks, 'count'),
        buildMetric('CTR global', campaignContext?.globalMetrics?.globalCtrPct, 'pct'),
        buildMetric('Engagement social total', socialContext?.kpis?.[1]?.value, 'count'),
        buildMetric('Engagement moyen par post', socialContext?.kpis?.[2]?.value, 'count'),
      ],
      insights: {
        bestCampaign,
        bestChannel,
        bestOffer,
        socialPerformance,
      },
      recommendations: buildDecisionRecommendations({
        bestCampaign,
        bestChannel,
        socialPerformance,
      }),
      aiSnapshot: {
        source: 'marketing-insights-live-kpis',
        title: 'Intelligence Marketing',
        extractedAt: new Date().toISOString(),
        kpis: campaignContext?.kpis ?? [],
        campaigns: {
          globalMetrics: campaignContext?.globalMetrics,
          googleMetrics: campaignContext?.googleMetrics,
          metaMetrics: campaignContext?.metaMetrics,
          platformComparison: campaignContext?.platformComparison,
          topGoogleCampaignsByClicks: campaignContext?.topGoogleCampaignsByClicks,
          topMetaCampaignsByClicks: campaignContext?.topMetaCampaignsByClicks,
        },
        social: {
          kpis: socialContext?.kpis ?? [],
          channelMix: socialContext?.channelMix,
          postTypePerformance: socialContext?.postTypePerformance,
          competitiveBenchmark: socialContext?.competitiveBenchmark,
          topPosts: socialContext?.topPosts,
        },
        calculatedInsights: {
          bestCampaign,
          bestChannel,
          bestOffer,
          socialPerformance,
        },
      },
    };
  }

  buildUnavailablePayload(error) {
    return {
      source: 'live-marketing-datasets',
      generatedAt: new Date().toISOString(),
      dataAvailable: false,
      message:
        error?.message ||
        'Aucune donnée disponible pour générer une lecture marketing fiable.',
      kpis: [],
      insights: {
        bestCampaign: {
          status: resolveStatus(false),
          title: 'Meilleure campagne',
          label: 'Campagne la plus performante',
          value: INSUFFICIENT_DATA_MESSAGE,
          explanation: INSUFFICIENT_DATA_MESSAGE,
          evidence: [],
        },
        bestChannel: {
          status: resolveStatus(false),
          title: 'Canal le plus performant',
          label: "Meilleur canal d'acquisition",
          value: INSUFFICIENT_DATA_MESSAGE,
          explanation: INSUFFICIENT_DATA_MESSAGE,
          evidence: [],
        },
        bestOffer: buildBestOffer(),
        socialPerformance: {
          status: resolveStatus(false),
          title: 'Performance des réseaux sociaux',
          label: "Contenu générant le plus d'engagement",
          value: INSUFFICIENT_DATA_MESSAGE,
          explanation: INSUFFICIENT_DATA_MESSAGE,
          evidence: [],
        },
      },
      recommendations: [
        {
          title: 'Recommandation indisponible',
          recommendation: INSUFFICIENT_DATA_MESSAGE,
          confidence: 'Données insuffisantes',
          basedOn: [],
        },
      ],
      aiSnapshot: null,
    };
  }
}
