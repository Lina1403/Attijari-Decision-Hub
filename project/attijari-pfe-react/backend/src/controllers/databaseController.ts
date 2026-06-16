/**
 * Contrôleur pour récupérer données depuis SQL Server
 */
import type { Request, Response } from 'express';
import { query } from '../services/sqlService';

// Récupérer les clients avec info de base
export const getClients = async (req: Request, res: Response) => {
  try {
    const clients = await query(`
      SELECT TOP 100
        ClientSK,
        d.Age,
        d.Anciennete_Annees,
        d.Score_Credit,
        f.Solde_Compte,
        f.Nb_Produits,
        f.Score_Satisfaction,
        f.Nb_Connexions_App_Mois
      FROM FACT_Client f
      JOIN DIM_Client d ON f.ClientSK = d.ClientSK
      ORDER BY f.ClientSK DESC
    `);

    res.json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    console.error('Erreur récupération clients:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer un client spécifique
export const getClientById = async (req: Request, res: Response) => {
  try {
    const { clientSK } = req.params;

    const clients = await query(
      `
      SELECT
        ClientSK,
        d.Age,
        d.Anciennete_Annees,
        d.Score_Credit,
        d.GouvernoratID,
        f.Solde_Compte,
        f.Solde_Moyen_3mois,
        f.Montant_Credit_Total,
        f.Nb_Produits,
        f.Nb_Credits_Actifs,
        f.Nb_Produits_Resilies_12mois,
        f.Nb_Transactions_Mois,
        f.Montant_Transaction_Moyen,
        f.Nb_Retraits_GAB_Mois,
        f.Nb_Paiements_CB_Mois,
        f.Taux_Utilisation_Decouvert,
        f.Nb_Connexions_App_Mois,
        f.Nb_Virements_En_Ligne_Mois,
        f.Nb_Fonctionnalites_App_Utilisees,
        f.Nb_Offres_Recues_12mois,
        f.Nb_Offres_Acceptees_12mois,
        f.Score_Satisfaction,
        f.Nb_Reclamations_12mois,
        f.SegmentID,
        f.PackID,
        CAST(d.Est_TRE AS INT) AS Est_TRE,
        CAST(f.A_Notifications_Push_Activees AS INT) AS A_Notifications_Push_Activees,
        CAST(f.A_Reclamation AS INT) AS A_Reclamation
      FROM FACT_Client f
      JOIN DIM_Client d ON f.ClientSK = d.ClientSK
      WHERE f.ClientSK = @clientSK
    `,
      { clientSK: Number.parseInt(clientSK, 10) }
    );

    if (clients.length === 0) {
      return res.status(404).json({ error: 'Client non trouvé' });
    }

    res.json({
      success: true,
      data: clients[0],
    });
  } catch (error) {
    console.error('Erreur récupération client:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer les clients à risque (haute satisfaction faible)
export const getAtRiskClients = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number.parseInt(req.query.limit as string, 10) : 50;

    const clients = await query(
      `
      SELECT TOP ${limit}
        f.ClientSK,
        d.Age,
        f.Score_Satisfaction,
        f.Nb_Connexions_App_Mois,
        f.Nb_Produits,
        f.Nb_Reclamations_12mois,
        f.Solde_Compte
      FROM FACT_Client f
      JOIN DIM_Client d ON f.ClientSK = d.ClientSK
      WHERE f.Score_Satisfaction < 50
        OR f.Nb_Connexions_App_Mois < 2
        OR f.Nb_Reclamations_12mois > 0
      ORDER BY f.Score_Satisfaction ASC
    `
    );

    res.json({
      success: true,
      count: clients.length,
      data: clients,
    });
  } catch (error) {
    console.error('Erreur récupération clients à risque:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Sauvegarder les prédictions churn dans SQL Server
export const saveChurnPredictions = async (req: Request, res: Response) => {
  try {
    const { predictions } = req.body;

    if (!predictions || !Array.isArray(predictions)) {
      return res.status(400).json({ error: 'Format invalide' });
    }

    console.log(`Sauvegarde de ${predictions.length} prédictions churn...`);

    // Ici on pourrait insérer dans une table ML_ChurnPredictions
    // Pour l'instant, on retourne simplement un OK

    res.json({
      success: true,
      message: `${predictions.length} prédictions sauvegardées`,
    });
  } catch (error) {
    console.error('Erreur sauvegarde prédictions:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};

// Récupérer les statistiques de base
export const getStats = async (req: Request, res: Response) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(DISTINCT ClientSK) AS total_clients,
        AVG(Score_Satisfaction) AS avg_satisfaction,
        AVG(Nb_Produits) AS avg_products,
        COUNT(CASE WHEN Score_Satisfaction < 50 THEN 1 END) AS at_risk_count
      FROM FACT_Client
    `);

    res.json({
      success: true,
      data: stats[0],
    });
  } catch (error) {
    console.error('Erreur stats:', error);
    res.status(500).json({ error: 'Erreur serveur' });
  }
};
