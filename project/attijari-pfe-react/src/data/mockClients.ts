import type { FeatureImportance, RiskClient } from '@/types';

const firstNames = [
  'Amine',
  'Ines',
  'Yassine',
  'Sarra',
  'Nour',
  'Marwen',
  'Ons',
  'Moez',
  'Rania',
  'Sofiene',
  'Meriem',
  'Bilel',
  'Amina',
  'Hatem',
  'Rahma',
  'Skander',
  'Aya',
  'Walid',
  'Maha',
  'Omar',
  'Asma',
  'Ghassen',
  'Leila',
  'Nidhal',
  'Sabrine',
];

const lastNames = [
  'Ben Salah',
  'Trabelsi',
  'Mansouri',
  'Ben Ali',
  'Gharbi',
  'Jaziri',
  'Kefi',
  'Chaabane',
  'Masmoudi',
  'Bouzid',
];

const segments = ['Retail', 'Mass affluent', 'Premium', 'Professionnel'];
const governorates = ['Tunis', 'Sfax', 'Sousse', 'Ariana', 'Nabeul', 'Monastir', 'Bizerte'];
const managers = [
  'Sami Ben Salem',
  'Mouna Khelifi',
  'Rim Kammoun',
  'Hichem Gharsalli',
  'Imen Jerbi',
  'Firas Ben Amor',
];
const featurePool = [
  'Satisfaction en baisse',
  'Usage mobile faible',
  'Mono-produit',
  'Reclamation recente',
  'Solde en recul',
  'Inactivite transactionnelle',
  'Dernier contact ancien',
  'Sensibilite au prix',
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export const mockClients: RiskClient[] = Array.from({ length: 50 }, (_, index) => {
  const firstName = firstNames[index % firstNames.length]!;
  const lastName = lastNames[Math.floor(index / 5) % lastNames.length]!;
  const segment = segments[index % segments.length]!;
  const gouvernorat = governorates[index % governorates.length]!;
  const score = clamp(58 + ((index * 7) % 35) + Math.floor(index / 8), 54, 96);
  const satisfaction = clamp(86 - ((index * 3) % 41), 41, 88);
  const products = 1 + (index % 5);
  const complaints = (index * 3) % 8;
  const appConnections = 3 + ((index * 5) % 28);
  const appFeatures = 1 + (index % 8);
  const cardPayments = 4 + ((index * 4) % 22);
  const annualValue = 18_000 + (index % 6) * 8_500 + Math.floor(index / 5) * 4_000;
  const churnProbability = clamp(score - 9 + (index % 6), 38, 97);
  const topFeatures = [
    featurePool[index % featurePool.length]!,
    featurePool[(index + 2) % featurePool.length]!,
    featurePool[(index + 5) % featurePool.length]!,
  ];
  const riskClass =
    score >= 80 ? 'Critique' : score >= 65 ? 'Élevé' : score >= 45 ? 'Modéré' : 'Faible';

  return {
    id: `CL-${String(index + 1).padStart(4, '0')}`,
    clientSK: index + 1,
    fullName: `${firstName} ${lastName}`,
    segment,
    gouvernorat,
    age: 25 + (index % 35),
    score,
    riskScore: score,
    riskClass,
    satisfaction,
    products,
    complaints,
    appConnections,
    appFeatures,
    cardPayments,
    annualValue,
    churnProbability,
    topFeatures,
    lastContact: new Date(Date.now() - (index + 1) * 36 * 60 * 60_000).toISOString(),
    manager: managers[index % managers.length]!,
  };
});

export const portfolioFeatureImportance: FeatureImportance[] = [
  { feature: 'Satisfaction relationnelle', importance: 27, direction: 'positive' },
  { feature: 'Usage application mobile', importance: 22, direction: 'positive' },
  { feature: 'Nombre de produits detenus', importance: 18, direction: 'negative' },
  { feature: 'Recence reclamation', importance: 14, direction: 'positive' },
  { feature: 'Frequence transactionnelle', importance: 11, direction: 'negative' },
  { feature: 'Valeur monetaire annuelle', importance: 8, direction: 'negative' },
];
