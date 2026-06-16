export class DashboardPromptFactory {
  createMessages({ dashboardType, summaryContext }) {
    const responseShape = {
      globalSummary: 'string',
      strengths: ['string'],
      watchouts: ['string'],
    };

    const systemMessage = [
      'Tu es un analyste decisionnel senior dans un contexte bancaire.',
      'Tu produis un resume executif a partir de donnees structurees de dashboards BI.',
      'Regles imperatives :',
      '- utilise exclusivement les donnees fournies dans le contexte',
      '- n invente jamais de chiffres, de causes ni de comparaisons non presentes dans les donnees',
      '- reste factuel, synthetique, professionnel et utile pour un decideur',
      '- identifie les points forts observes dans les donnees',
      '- identifie les signaux d attention observes dans les donnees',
      '- reponds en francais',
      '- si une information manque, reste prudent et ne la complete pas par hypothese',
      '- globalSummary : un seul paragraphe clair de 80 a 120 mots',
      '- strengths : 2 a 4 points courts bases sur les donnees positives ou stables',
      '- watchouts : 2 a 4 points courts bases sur les alertes, risques ou variations negatives',
      '- si le contexte contient un snapshot live Power BI avec filtres, pages, visuels et exports resumes, appuie-toi dessus en priorite',
      '- renvoie uniquement un JSON valide, sans markdown, sans commentaire',
      `Structure attendue : ${JSON.stringify(responseShape)}`,
    ].join('\n');

    const userMessage = [
      `Dashboard cible : ${dashboardType}`,
      'Contexte metier structure :',
      JSON.stringify(summaryContext, null, 2),
      '\nAnalyse les donnees avec une perspective bancaire, management et aide a la decision.',
    ].join('\n\n');

    return [
      {
        role: 'system',
        content: systemMessage,
      },
      {
        role: 'user',
        content: userMessage,
      },
    ];
  }
}
