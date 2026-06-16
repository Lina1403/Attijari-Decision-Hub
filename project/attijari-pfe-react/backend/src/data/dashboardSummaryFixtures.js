import { DashboardType } from '../enums/DashboardType.js';

function resolveAnalysisWindow(filters) {
  const dateFrom = typeof filters?.dateFrom === 'string' ? filters.dateFrom : null;
  const dateTo = typeof filters?.dateTo === 'string' ? filters.dateTo : null;

  if (dateFrom && dateTo) {
    return `${dateFrom} -> ${dateTo}`;
  }

  if (dateFrom) {
    return `Depuis ${dateFrom}`;
  }

  if (dateTo) {
    return `Jusqu au ${dateTo}`;
  }

  return 'Fenetre glissante recente';
}

function buildOverviewContext(filters) {
  return {
    summaryTone: 'Synthèse exécutive transversale pour comité de direction',
    analysisWindow: resolveAnalysisWindow(filters),
    executiveGoal:
      'Qualifier rapidement la dynamique globale du portefeuille, les zones de performance et les signaux de vigilance.',
    overview: {
      scope: 'Portefeuille retail consolidé, revenus, réseau et qualité de service',
      decisionRhythm: 'Lecture management hebdomadaire',
    },
    kpis: [
      {
        label: 'Portefeuille actif',
        value: '124 580 clients',
        variation: '+3,8% vs mois précédent',
        signal: 'positive',
      },
      {
        label: 'Revenu net piloté',
        value: '67,4 M TND',
        variation: '+4,6% vs budget',
        signal: 'positive',
      },
      {
        label: 'Churn prédit',
        value: '8,4%',
        variation: '-1,2 pt sur 30 jours',
        signal: 'positive',
      },
      {
        label: 'Satisfaction consolidée',
        value: '87 / 100',
        variation: '+5 points sur le trimestre',
        signal: 'positive',
      },
    ],
    topPerformers: [
      {
        entity: 'Tunis Centre',
        metric: 'Production commerciale',
        value: '+14% vs plan',
      },
      {
        entity: 'La Marsa',
        metric: 'Satisfaction relationnelle',
        value: '91 / 100',
      },
      {
        entity: 'Pack digital retail',
        metric: 'Adoption',
        value: '+22% sur 8 semaines',
      },
    ],
    alerts: [
      {
        priority: 'Haute',
        title: 'Segment Premium Tunis Centre',
        detail: 'Churn prédit à 12,7%, au-dessus du seuil de vigilance interne.',
      },
      {
        priority: 'Haute',
        title: 'Réclamations cartes bancaires Sfax Sud',
        detail: 'Volumes en hausse de 9% avec tension sur les délais de reprise.',
      },
      {
        priority: 'Modérée',
        title: 'Jeunes actifs digitaux',
        detail: 'Connexions mobile en retrait de 6% sur les 6 dernières semaines.',
      },
    ],
    trendSignals: [
      {
        axis: 'Réseau',
        observation: '61% des agences sont au-dessus du plan commercial mensuel.',
      },
      {
        axis: 'Relation client',
        observation: 'Le service recovery reste performant sur les incidents simples.',
      },
      {
        axis: 'Digital',
        observation: 'L usage des parcours mobiles ralentit sur certaines cohortes à forte valeur.',
      },
    ],
    aggregates: [
      'Le portefeuille gagne en volume tout en conservant un niveau de satisfaction élevé.',
      'Le pilotage réseau contribue positivement à la performance consolidée.',
      'Les irritants service et les signaux churn premium restent les principaux points de vigilance.',
    ],
  };
}

function buildCampaignsContext(filters) {
  const view = String(filters?.view ?? filters?.platform ?? 'ALL')
    .trim()
    .toLowerCase();

  if (view === 'google') {
    return {
      summaryTone: 'Pilotage ROI et acquisition Google Ads',
      analysisWindow: resolveAnalysisWindow(filters),
      executiveGoal:
        'Mesurer la qualité de l acquisition Google, la pression budgétaire et la conversion commerciale.',
      campaigns: {
        channel: 'Google Ads',
        primaryObjective: 'Acquisition qualifiée et coût d entrée maîtrisé',
      },
      kpis: [
        {
          label: 'Budget engagé',
          value: '1,84 M TND',
          variation: '-3% vs plan média',
          signal: 'positive',
        },
        {
          label: 'CTR moyen',
          value: '4,7%',
          variation: '+0,6 pt',
          signal: 'positive',
        },
        {
          label: 'Taux de conversion',
          value: '13,4%',
          variation: '+1,1 pt',
          signal: 'positive',
        },
        {
          label: 'Coût par acquisition',
          value: '24,8 TND',
          variation: '-8% vs période précédente',
          signal: 'positive',
        },
      ],
      topPerformers: [
        {
          entity: 'Campagne Crédit Immo',
          metric: 'Taux de conversion',
          value: '18,2%',
        },
        {
          entity: 'Brand Search',
          metric: 'Taux de clic',
          value: '8,1%',
        },
        {
          entity: 'Audience intention forte',
          metric: 'Coût par lead',
          value: '19,5 TND',
        },
      ],
      alerts: [
        {
          priority: 'Haute',
          title: 'Display réactivation',
          detail: 'Volume de clics stable mais conversion en retrait sur la dernière vague.',
        },
        {
          priority: 'Modérée',
          title: 'Mots-clés génériques',
          detail: 'CPC en tension sur les requêtes les plus concurrentielles.',
        },
      ],
      trendSignals: [
        {
          axis: 'Qualité du trafic',
          observation: 'Les audiences intention fortes convertissent mieux que les audiences larges.',
        },
        {
          axis: 'Efficacité budgétaire',
          observation: 'Le budget est mieux maîtrisé malgré une pression concurrentielle persistante.',
        },
      ],
      aggregates: [
        'Google reste le canal le plus rentable sur les campagnes d acquisition à intention élevée.',
        'La pression média doit être mieux arbitrée sur les segments moins qualifiés.',
      ],
    };
  }

  if (view === 'meta') {
    return {
      summaryTone: 'Pilotage couverture, engagement et génération de leads Meta',
      analysisWindow: resolveAnalysisWindow(filters),
      executiveGoal:
        'Qualifier l efficacité des audiences Meta et la qualité des leads produits.',
      campaigns: {
        channel: 'Meta Ads',
        primaryObjective: 'Reach qualifié et génération de leads retail',
      },
      kpis: [
        {
          label: 'Reach utile',
          value: '5,2 M impressions qualifiées',
          variation: '+9% vs vague précédente',
          signal: 'positive',
        },
        {
          label: 'Taux d engagement',
          value: '3,8%',
          variation: '+0,4 pt',
          signal: 'positive',
        },
        {
          label: 'Coût par lead',
          value: '17,2 TND',
          variation: '+6%',
          signal: 'watch',
        },
        {
          label: 'Taux de conversion commerciale',
          value: '10,1%',
          variation: '-0,7 pt',
          signal: 'watch',
        },
      ],
      topPerformers: [
        {
          entity: 'Audience jeunes actifs',
          metric: 'Taux d engagement',
          value: '4,9%',
        },
        {
          entity: 'Créa offre épargne',
          metric: 'Coût par lead',
          value: '14,6 TND',
        },
      ],
      alerts: [
        {
          priority: 'Haute',
          title: 'Fatigue créative',
          detail: 'Les visuels de la troisième vague perdent en efficacité sur les audiences larges.',
        },
        {
          priority: 'Modérée',
          title: 'Lead nurturing',
          detail: 'Le délai de rappel commercial pénalise la conversion sur certaines campagnes.',
        },
      ],
      trendSignals: [
        {
          axis: 'Haut de funnel',
          observation: 'Meta soutient bien la notoriété et l engagement de marque.',
        },
        {
          axis: 'Bas de funnel',
          observation: 'La transformation commerciale reste inférieure à Google sur les audiences froides.',
        },
      ],
      aggregates: [
        'Meta joue surtout un rôle d alimentation du pipeline et de couverture premium.',
        'Le rendement commercial dépend fortement de la fraîcheur créative et de la vitesse de traitement.',
      ],
    };
  }

  return {
    summaryTone: 'Pilotage marketing global multi-canal',
    analysisWindow: resolveAnalysisWindow(filters),
    executiveGoal:
      'Evaluer la contribution des campagnes à l acquisition, au ROI et à la conversion commerciale.',
    campaigns: {
      channel: 'Vue globale campagnes',
      primaryObjective: 'Arbitrage budgétaire et rentabilité cross-canal',
    },
    kpis: [
      {
        label: 'Budget média consommé',
        value: '3,92 M TND',
        variation: '-2% vs budget',
        signal: 'positive',
      },
      {
        label: 'Leads générés',
        value: '18 460',
        variation: '+11% vs période précédente',
        signal: 'positive',
      },
      {
        label: 'Taux de conversion global',
        value: '11,9%',
        variation: '+0,8 pt',
        signal: 'positive',
      },
      {
        label: 'ROI marketing',
        value: 'x3,4',
        variation: '+0,3',
        signal: 'positive',
      },
    ],
    topPerformers: [
      {
        entity: 'Google Search',
        metric: 'Rentabilité',
        value: 'x4,1',
      },
      {
        entity: 'Offre Crédit Immo',
        metric: 'Conversion',
        value: '16,8%',
      },
      {
        entity: 'Campagne activation digitale',
        metric: 'Leads incrémentaux',
        value: '+19%',
      },
    ],
    alerts: [
      {
        priority: 'Haute',
        title: 'Vague 3 réactivation',
        detail: 'La conversion descend sous 12% malgré une pression média constante.',
      },
      {
        priority: 'Modérée',
        title: 'Meta audiences larges',
        detail: 'Le coût par lead se dégrade plus vite que la moyenne du portefeuille.',
      },
    ],
    trendSignals: [
      {
        axis: 'Acquisition',
        observation: 'Les campagnes à intention forte restent les plus efficaces en conversion.',
      },
      {
        axis: 'Rentabilité',
        observation: 'Le ROI global progresse grâce à un meilleur arbitrage entre Google et Meta.',
      },
    ],
    aggregates: [
      'Le pilotage budgétaire est globalement maîtrisé.',
      'La dynamique d acquisition est positive, avec une vigilance sur les campagnes de réactivation.',
    ],
  };
}

function buildComplaintsContext(filters) {
  return {
    summaryTone: 'Pilotage qualité de service et réduction du churn post-incident',
    analysisWindow: resolveAnalysisWindow(filters),
    executiveGoal:
      'Identifier les irritants majeurs, la tension sur les SLA et les risques de dégradation relationnelle.',
    complaints: {
      scope: 'Réclamations service client retail',
      escalationFocus: 'Incidents critiques et récurrents',
    },
    kpis: [
      {
        label: 'Volume total',
        value: '4 260 réclamations',
        variation: '+6% vs période précédente',
        signal: 'watch',
      },
      {
        label: 'Respect SLA',
        value: '84%',
        variation: '-3 points',
        signal: 'watch',
      },
      {
        label: 'Réclamations critiques',
        value: '6,8%',
        variation: '+1,1 pt',
        signal: 'watch',
      },
      {
        label: 'Taux de résolution au premier contact',
        value: '58%',
        variation: '+2 points',
        signal: 'positive',
      },
    ],
    topPerformers: [
      {
        entity: 'Back-office moyens de paiement',
        metric: 'Réduction délai moyen',
        value: '-11%',
      },
      {
        entity: 'Canal agence',
        metric: 'Résolution au premier contact',
        value: '64%',
      },
    ],
    alerts: [
      {
        priority: 'Haute',
        title: 'Cartes bancaires',
        detail: 'La catégorie pèse 31% du volume total et concentre la majorité des retards.',
      },
      {
        priority: 'Haute',
        title: 'Sfax Sud',
        detail: 'Hausse continue des incidents de service avec réouvertures supérieures à la moyenne.',
      },
      {
        priority: 'Modérée',
        title: 'Clients Premium',
        detail: 'Le temps de reprise reste trop long sur les incidents à forte sensibilité relationnelle.',
      },
    ],
    trendSignals: [
      {
        axis: 'Backlog',
        observation: 'Le stock de dossiers anciens reste sous tension malgré une meilleure productivité.',
      },
      {
        axis: 'Expérience',
        observation: 'Les dossiers simples sont mieux absorbés que les incidents techniques récurrents.',
      },
    ],
    aggregates: [
      'La hausse des volumes n est pas encore compensée par le niveau de service cible.',
      'Le risque principal porte sur les incidents cartes et les dossiers Premium sensibles.',
    ],
  };
}

function buildAgenciesContext(filters) {
  return {
    summaryTone: 'Pilotage réseau et arbitrage de performance territoriale',
    analysisWindow: resolveAnalysisWindow(filters),
    executiveGoal:
      'Mesurer la contribution du réseau, repérer les écarts territoriaux et orienter l animation commerciale.',
    agencies: {
      footprint: '211 agences et centres d affaires',
      managementLens: 'Performance commerciale et satisfaction locale',
    },
    kpis: [
      {
        label: 'Agences au-dessus du plan',
        value: '61%',
        variation: '+5 points',
        signal: 'positive',
      },
      {
        label: 'Production commerciale réseau',
        value: '92,6 M TND',
        variation: '+7% vs période précédente',
        signal: 'positive',
      },
      {
        label: 'Indice satisfaction agences',
        value: '85 / 100',
        variation: '+2 points',
        signal: 'positive',
      },
      {
        label: 'Agences en tension',
        value: '18 agences',
        variation: 'stable',
        signal: 'watch',
      },
    ],
    topPerformers: [
      {
        entity: 'La Marsa',
        metric: 'Dépassement du plan',
        value: '+14%',
      },
      {
        entity: 'Tunis Centre',
        metric: 'Cross-sell',
        value: '+11%',
      },
      {
        entity: 'Sousse Nord',
        metric: 'Satisfaction',
        value: '90 / 100',
      },
    ],
    alerts: [
      {
        priority: 'Haute',
        title: 'Sud-Est',
        detail: 'La production reste sous le plan avec une montée des réclamations locales.',
      },
      {
        priority: 'Modérée',
        title: 'Agences mono-produit',
        detail: 'L équipement client progresse moins vite dans plusieurs zones à potentiel.',
      },
    ],
    trendSignals: [
      {
        axis: 'Animation réseau',
        observation: 'Les agences avec rituels de pilotage hebdomadaires dépassent plus souvent le plan.',
      },
      {
        axis: 'Expérience locale',
        observation: 'La satisfaction soutient mieux la production dans les agences urbaines denses.',
      },
    ],
    aggregates: [
      'Le réseau contribue positivement à la croissance, avec un écart de performance encore marqué entre territoires.',
      'Les zones en tension exigent un plan d accompagnement plus ciblé.',
    ],
  };
}

function buildSocialContext(filters) {
  return {
    summaryTone: 'Pilotage réputation, sentiment et signaux faibles externes',
    analysisWindow: resolveAnalysisWindow(filters),
    executiveGoal:
      'Identifier les thématiques sensibles de réputation et leur impact potentiel sur la relation client.',
    social: {
      perimeter: 'Réseaux sociaux et conversations publiques',
      priority: 'Réputation, réactivité et irritants visibles',
    },
    kpis: [
      {
        label: 'Mentions suivies',
        value: '18 400',
        variation: '+12%',
        signal: 'watch',
      },
      {
        label: 'Sentiment positif',
        value: '62%',
        variation: '+3 points',
        signal: 'positive',
      },
      {
        label: 'Sentiment négatif',
        value: '21%',
        variation: '+2 points',
        signal: 'watch',
      },
      {
        label: 'Temps moyen de réponse',
        value: '1 h 42',
        variation: '-18 minutes',
        signal: 'positive',
      },
    ],
    topPerformers: [
      {
        entity: 'Contenus pédagogiques mobile',
        metric: 'Engagement positif',
        value: '78%',
      },
      {
        entity: 'Réponses SAV sociales',
        metric: 'Délai',
        value: 'moins de 90 minutes',
      },
    ],
    alerts: [
      {
        priority: 'Haute',
        title: 'Incidents app mobile',
        detail: 'Les conversations négatives montent fortement après les ralentissements de connexion.',
      },
      {
        priority: 'Modérée',
        title: 'Cartes et paiements',
        detail: 'Les thèmes cartes reviennent dans les commentaires à tonalité critique.',
      },
    ],
    trendSignals: [
      {
        axis: 'Réputation',
        observation: 'La marque reste globalement bien perçue, mais les incidents digitaux amplifient vite le bruit négatif.',
      },
      {
        axis: 'Social care',
        observation: 'La réactivité progresse et limite l escalade sur les irritants simples.',
      },
    ],
    aggregates: [
      'Le climat conversationnel reste maîtrisé mais sensible aux incidents digitaux visibles.',
      'La coordination entre digital care et équipes produit reste clé pour éviter une propagation réputationnelle.',
    ],
  };
}

function buildClientsChurnContext(filters) {
  return {
    summaryTone: 'Pilotage rétention et priorisation des actions anti-churn',
    analysisWindow: resolveAnalysisWindow(filters),
    executiveGoal:
      'Qualifier les segments à risque, les facteurs de désengagement et la meilleure action prioritaire.',
    clientsChurn: {
      scope: 'Portefeuille clients retail à risque',
      businessQuestion: 'Où concentrer l effort commercial et relationnel immédiatement ?',
    },
    kpis: [
      {
        label: 'Clients à risque',
        value: '9 850',
        variation: '-4% vs mois précédent',
        signal: 'positive',
      },
      {
        label: 'Churn prédit moyen',
        value: '8,4%',
        variation: '-1,2 pt',
        signal: 'positive',
      },
      {
        label: 'Clients haute valeur en vigilance',
        value: '320',
        variation: '+5%',
        signal: 'watch',
      },
      {
        label: 'Clients mono-produit',
        value: '42%',
        variation: 'stable',
        signal: 'watch',
      },
    ],
    topPerformers: [
      {
        entity: 'Campagne rappel conseiller',
        metric: 'Réduction churn sur cible',
        value: '-2,1 pts',
      },
      {
        entity: 'Segment mass affluent équipé',
        metric: 'Risque moyen',
        value: '5,6%',
      },
    ],
    alerts: [
      {
        priority: 'Haute',
        title: 'Premium Tunis Centre',
        detail: 'La baisse de satisfaction et les réclamations récentes poussent le risque au-dessus de la moyenne.',
      },
      {
        priority: 'Haute',
        title: 'Clients mono-produit',
        detail: 'Le faible équipement reste un facteur structurel de fragilité relationnelle.',
      },
      {
        priority: 'Modérée',
        title: 'Usage mobile en recul',
        detail: 'Le désengagement digital précède souvent la baisse d activité transactionnelle.',
      },
    ],
    trendSignals: [
      {
        axis: 'Fidélisation',
        observation: 'Les actions relationnelles rapides restent les plus efficaces après incident ou baisse d usage.',
      },
      {
        axis: 'Valeur',
        observation: 'Le portefeuille haute valeur nécessite une approche plus fine et plus précoce.',
      },
    ],
    aggregates: [
      'La tendance globale s améliore, mais le risque se concentre sur des poches de valeur sensibles.',
      'L équipement, la satisfaction et l usage digital restent les trois leviers majeurs de rétention.',
    ],
  };
}

export const dashboardSummaryFixtureBuilders = {
  [DashboardType.OVERVIEW]: buildOverviewContext,
  [DashboardType.CAMPAIGNS]: buildCampaignsContext,
  [DashboardType.COMPLAINTS]: buildComplaintsContext,
  [DashboardType.AGENCIES]: buildAgenciesContext,
  [DashboardType.SOCIAL]: buildSocialContext,
  [DashboardType.CLIENTS_CHURN]: buildClientsChurnContext,
};
