import type { StrategicRecommendation } from '@/types';

export const mockRecommendations: StrategicRecommendation[] = [
  {
    id: 'REC-001',
    title: 'Relancer les clients a forte valeur dormants',
    description:
      'Prioriser un parcours outbound sur 320 clients premium avec baisse recente de connexions et NPS faible.',
    impact: 92,
    roi: 'x4.3',
    priority: 'Haute',
    owner: 'Direction Relation Client',
    eta: '7 jours',
    actionLabel: 'Appliquer',
    category: 'Retention premium',
  },
  {
    id: 'REC-002',
    title: 'Pack epargne + carte pour le segment mass affluent',
    description:
      'Combiner produit d epargne et avantage carte afin d augmenter la profondeur de relation sur le segment mass affluent.',
    impact: 84,
    roi: 'x3.7',
    priority: 'Haute',
    owner: 'Marketing Retail',
    eta: '10 jours',
    actionLabel: 'Appliquer',
    category: 'Cross-sell',
  },
  {
    id: 'REC-003',
    title: 'Rappel conseiller automatise apres reclamation critique',
    description:
      'Declencher automatiquement un rappel conseiller sur les reclamations de severite critique pour reduire le churn post-incident.',
    impact: 79,
    roi: 'x3.2',
    priority: 'Haute',
    owner: 'Qualite de Service',
    eta: '48 h',
    actionLabel: 'Appliquer',
    category: 'Service recovery',
  },
  {
    id: 'REC-004',
    title: 'Campagne d activation digitale jeunes actifs',
    description:
      'Pousser un scenario multicanal pour rebooster l usage mobile des clients recemment moins engages.',
    impact: 71,
    roi: 'x2.8',
    priority: 'Moyenne',
    owner: 'Digital Factory',
    eta: '14 jours',
    actionLabel: 'Appliquer',
    category: 'Engagement',
  },
  {
    id: 'REC-005',
    title: 'Offre de retention agence par agence',
    description:
      'Adapter la prime commerciale de retention selon la criticite churn et la valeur potentielle perdue par agence.',
    impact: 66,
    roi: 'x2.4',
    priority: 'Moyenne',
    owner: 'Animation Reseau',
    eta: '21 jours',
    actionLabel: 'Appliquer',
    category: 'Pilotage reseau',
  },
  {
    id: 'REC-006',
    title: 'Script relationnel pour les clients mono-produit',
    description:
      'Outiller les conseillers avec un script court centre usage et valeur pour limiter la sortie des clients mono-produits.',
    impact: 54,
    roi: 'x1.9',
    priority: 'Basse',
    owner: 'Academie Commerciale',
    eta: '30 jours',
    actionLabel: 'Appliquer',
    category: 'Equipement',
  },
];
