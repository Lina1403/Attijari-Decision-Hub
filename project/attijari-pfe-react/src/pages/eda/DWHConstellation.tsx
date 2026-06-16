import React, { useState } from 'react';

const FACTS = [
  {
    key: 'client',
    name: 'FACT_Client',
    rows: '10 000',
    color: '#3b82f6',
    bg: '#1e3a5f',
    fks: ['ClientSK', 'TempID', 'SegmentID', 'PackID', 'MotifDepartID', 'AgenceSK'],
    measures: [
      'Solde_Compte',
      'Solde_Moyen_3mois',
      'Nb_Produits',
      'Nb_Credits_Actifs',
      'Montant_Credit_Total',
      'Nb_Produits_Resilies_12mois',
      'Nb_Transactions_Mois',
      'Montant_Transaction_Moyen',
      'Nb_Retraits_GAB_Mois',
      'Nb_Paiements_CB_Mois',
      'Taux_Utilisation_Decouvert',
      'Nb_Connexions_App_Mois',
      'Nb_Virements_En_Ligne_Mois',
      'A_Notifications_Push_Activees',
      'Nb_Fonctionnalites_App_Utilisees',
      'Nb_Offres_Recues_12mois',
      'Nb_Offres_Acceptees_12mois',
      'Score_Satisfaction',
      'Est_Client_Actif',
      'Nb_Reclamations_12mois',
      'A_Reclamation',
      'A_Quitte ← TARGET ML',
    ],
    note: 'Table centrale ML — churn prediction. AgenceSK nullable.',
    dims: ['DIM_Temps', 'DIM_Client', 'DIM_Segment', 'DIM_Pack', 'DIM_MotifDepart', 'DIM_Agence'],
  },
  {
    key: 'campagnes',
    name: 'FACT_Campagnes_Unified',
    rows: '393',
    color: '#06b6d4',
    bg: '#0c3344',
    fks: ['TempID', 'CampagneID', 'PlateformeID', 'TypeCampagneID', 'ProduitMKTID', 'StrategyEncheresID'],
    measures: [
      'Impressions',
      'Clics',
      'CTR (calculé)',
      'CPC_USD (calculé)',
      'CPM_USD',
      'CPA_USD (calculé)',
      'Budget_USD',
      'Conversions',
      'Couverture',
      'Video_Vues',
    ],
    note: '256 Google + 137 Meta. CPA Google 2,0$ vs Meta 3,3$.',
    dims: ['DIM_Temps', 'DIM_Campagne', 'DIM_Plateforme', 'DIM_TypeCampagne', 'DIM_ProduitMKT', 'DIM_StrategyEncheres'],
  },
  {
    key: 'social',
    name: 'FACT_PostSocialMedia',
    rows: '787',
    color: '#8b5cf6',
    bg: '#2d1b69',
    fks: ['ReseauID', 'TypePostID', 'TempID', 'Banque (dénormalisé)'],
    measures: [
      'Nb_Likes',
      'Nb_Commentaires',
      'Nb_Partages',
      'Vues',
      'Nb_Hashtags',
      'Engagement_Total (calculé)',
      'CTR_Social (calculé)',
    ],
    note: '392 Attijari + 395 concurrents. Banque stocké en NVARCHAR (dénormalisé).',
    dims: ['DIM_Temps', 'DIM_ReseauSocial', 'DIM_TypePost', 'DIM_Banque'],
  },
  {
    key: 'avis',
    name: 'FACT_AvisAgence',
    rows: '177',
    color: '#f59e0b',
    bg: '#3d2700',
    fks: ['AgenceSK', 'TempID', 'TypeAvisID', 'GouvernoratID'],
    measures: ['Note_Google (1–5)', 'Nb_Avis', 'Satisfaction_Score = Note/5×100'],
    note: 'Snapshot Google Maps. TypeAvisID: <2→Mauvais, 2-4→Moyen, ≥4→Excellent.',
    dims: ['DIM_Temps', 'DIM_Agence', 'DIM_TypeAvis', 'DIM_Gouvernorat'],
  },
  {
    key: 'reclamation',
    name: 'FACT_Reclamation',
    rows: '1 075',
    color: '#10b981',
    bg: '#0c3322',
    fks: ['ClientSK', 'AgenceSK', 'TempID (ouv.)', 'TempID (clôt.)', 'MotifReclamationID', 'StatutReclamationID', 'GouvernoratID'],
    measures: ['Satisfaction_Post_Resolution (1–5)', 'Temps_Resolution_Days'],
    note: '5 motifs: Lenteur, Frais, Erreur, Courtoisie, Autre. 3 statuts: Résolu, En cours, Escaladé.',
    dims: ['DIM_Temps', 'DIM_Client', 'DIM_Agence', 'DIM_MotifReclamation', 'DIM_StatutReclamation', 'DIM_Gouvernorat'],
  },
];

const DIMS = [
  {
    name: 'DIM_Temps',
    rows: '2 557',
    color: '#64748b',
    bg: '#1e293b',
    pk: 'SK_TEMPS (YYYYMMDD)',
    cols: [
      'Date_Complete',
      'Annee',
      'Mois',
      'Mois_Nom (FR)',
      'Trimestre',
      'Semestre',
      'Semaine_Num',
      'Jour_Nom',
      'Est_Weekend BIT',
      'Est_Jour_Ferie BIT',
      'Periode_Fiscale',
    ],
    used: ['FACT_Client', 'FACT_Campagnes_Unified', 'FACT_PostSocialMedia', 'FACT_AvisAgence', 'FACT_Reclamation'],
    note: 'Partagée par les 5 FACTS — dimension hub temporelle',
  },
  {
    name: 'DIM_Client',
    rows: '10 000',
    color: '#3b82f6',
    bg: '#1e3a5f',
    pk: 'ClientSK (IDENTITY)',
    cols: [
      'ID_Client (NK source)',
      'Nom, Prénom',
      'Genre M/F',
      'Date_Naissance',
      'Tranche_Age',
      'Gouvernorat_Residence',
      'Segment_Client',
      'Pack_Compte',
      'Canal_Preference',
      'Date_Entree_Relation',
      'Anciennete_Banque_Annees',
    ],
    used: ['FACT_Client', 'FACT_Reclamation'],
    note: 'Type 1 statique (pas SCD2)',
  },
  {
    name: 'DIM_Agence',
    rows: '177',
    color: '#f59e0b',
    bg: '#3d2700',
    pk: 'AgenceSK (IDENTITY)',
    cols: [
      'Code_Agence',
      'Nom_Agence',
      'Gouvernorat',
      'Region',
      'Nb_Guichets',
      'Note_Google_Actuelle',
      'Latitude',
      'Longitude',
    ],
    used: ['FACT_Client', 'FACT_AvisAgence', 'FACT_Reclamation'],
    note: '177 agences Tunisie — dimension géographique agence',
  },
  {
    name: 'DIM_Gouvernorat',
    rows: '24',
    color: '#ec4899',
    bg: '#3d0c2a',
    pk: 'GouvernoratID (IDENTITY)',
    cols: [
      'Code_Gouvernorat (INS)',
      'Nom_Gouvernorat',
      'Region',
      'Population_Estimee',
      'Nb_Agences_Attijari',
      'Latitude',
      'Longitude',
    ],
    used: ['DIM_Agence', 'FACT_AvisAgence', 'FACT_Reclamation'],
    note: 'Hub géographique — reliée à 4 tables',
  },
  {
    name: 'DIM_Segment',
    rows: '4',
    color: '#06b6d4',
    bg: '#0c3344',
    pk: 'SegmentID',
    cols: ['Code_Segment', 'Libelle_Segment', 'Seuil_Revenu_Min', 'Seuil_Revenu_Max', 'Taux_Commission_Standard', 'Gestionnaire_Dedie BIT'],
    used: ['FACT_Client'],
    note: 'VIP, Premium, Professionnel, Particulier',
  },
  {
    name: 'DIM_Pack',
    rows: '7',
    color: '#06b6d4',
    bg: '#0c3344',
    pk: 'PackID',
    cols: ['Code_Pack', 'Nom_Pack', 'Prix_Mensuel', 'Nb_Services_Inclus', 'Canal_Cible'],
    used: ['FACT_Client'],
    note: 'Aveo, AddMore, Signature, Classic, Gold, Platinum, TRE',
  },
  {
    name: 'DIM_MotifDepart',
    rows: '6',
    color: '#06b6d4',
    bg: '#0c3344',
    pk: 'MotifDepartID',
    cols: ['Code_Motif', 'Libelle_Motif'],
    used: ['FACT_Client'],
    note: '0=Non applicable, 1=Offre concurrente, 2=Service, 3=Frais, 4=Inactivité, 5=Autre',
  },
  {
    name: 'DIM_Campagne',
    rows: '393',
    color: '#8b5cf6',
    bg: '#2d1b69',
    pk: 'CampagneID (IDENTITY)',
    cols: [
      'Code_Campagne_Source',
      'Nom_Campagne',
      'Objectif_Marketing',
      'Produit_Cible',
      'Date_Debut',
      'Date_Fin',
      'Budget_Prevu',
      'Statut_Campagne',
      'PlateformeID (FK)',
    ],
    used: ['FACT_Campagnes_Unified'],
    note: 'Snowflake: DIM_Campagne → DIM_Plateforme',
  },
  {
    name: 'DIM_Plateforme',
    rows: '2',
    color: '#8b5cf6',
    bg: '#2d1b69',
    pk: 'PlateformeID',
    cols: ['Nom_Plateforme', 'Type_Plateforme', 'URL_Plateforme'],
    used: ['FACT_Campagnes_Unified', 'DIM_Campagne'],
    note: 'Google, Meta',
  },
  {
    name: 'DIM_TypeCampagne',
    rows: '5',
    color: '#8b5cf6',
    bg: '#2d1b69',
    pk: 'TypeCampagneID',
    cols: ['Libelle_Type'],
    used: ['FACT_Campagnes_Unified'],
    note: 'Search, Display, Video, Performance Max, Shopping',
  },
  {
    name: 'DIM_StrategyEncheres',
    rows: '5',
    color: '#8b5cf6',
    bg: '#2d1b69',
    pk: 'StrategyEncheresID',
    cols: ['Libelle_Strategy'],
    used: ['FACT_Campagnes_Unified'],
    note: 'CPC Manuel, CPC Amélioré, CPA Cible, ROAS, Maximiser clics',
  },
  {
    name: 'DIM_ProduitMKT',
    rows: 'variable',
    color: '#8b5cf6',
    bg: '#2d1b69',
    pk: 'ProduitMKTID',
    cols: ['Nom_Produit', 'Categorie_Produit'],
    used: ['FACT_Campagnes_Unified'],
    note: 'Crédit Conso, Immobilier, Épargne, Assurance, Carte...',
  },
  {
    name: 'DIM_ReseauSocial',
    rows: '3',
    color: '#a855f7',
    bg: '#2d1b69',
    pk: 'ReseauID',
    cols: ['Nom_Reseau', 'Type_Reseau'],
    used: ['FACT_PostSocialMedia'],
    note: 'Instagram, Facebook, LinkedIn',
  },
  {
    name: 'DIM_TypePost',
    rows: '4',
    color: '#a855f7',
    bg: '#2d1b69',
    pk: 'TypePostID',
    cols: ['Libelle_TypePost'],
    used: ['FACT_PostSocialMedia'],
    note: 'Vidéo, Photo, Partage, Statut',
  },
  {
    name: 'DIM_Banque',
    rows: '3',
    color: '#a855f7',
    bg: '#2d1b69',
    pk: 'BanqueID',
    cols: ['Nom_Banque', 'Type_Banque'],
    used: ['FACT_PostSocialMedia'],
    note: 'Attijari, BH Bank, BIAT',
  },
  {
    name: 'DIM_TypeAvis',
    rows: '3',
    color: '#f59e0b',
    bg: '#3d2700',
    pk: 'TypeAvisID',
    cols: ['Libelle_TypeAvis'],
    used: ['FACT_AvisAgence'],
    note: 'Mauvais (1-2⭐), Moyen (3-4⭐), Excellent (5⭐)',
  },
  {
    name: 'DIM_MotifReclamation',
    rows: '5',
    color: '#10b981',
    bg: '#0c3322',
    pk: 'MotifReclamationID',
    cols: ['Libelle_Motif'],
    used: ['FACT_Reclamation'],
    note: 'Lenteur, Frais Élevé, Erreur Transaction, Courtoisie, Autre',
  },
  {
    name: 'DIM_StatutReclamation',
    rows: '3',
    color: '#10b981',
    bg: '#0c3322',
    pk: 'StatutReclamationID',
    cols: ['Libelle_Statut'],
    used: ['FACT_Reclamation'],
    note: 'Résolu, En cours, Escaladé',
  },
];

export default function DWHConstellation() {
  const [selFact, setSelFact] = useState<string | null>(null);
  const [selDim, setSelDim] = useState<string | null>(null);
  const [view, setView] = useState<'schema' | 'dims' | 'relations' | 'etl'>('schema');

  const activeFact = FACTS.find((f) => f.key === selFact);
  const activeDim = DIMS.find((d) => d.name === selDim);

  const highlightedDims = activeFact
    ? activeFact.dims
    : selDim
    ? DIMS.filter((d) => d.name === selDim).map((d) => d.name)
    : [];

  return (
    <div style={{ background: '#0a0f1e', minHeight: '100vh', color: '#e2e8f0', fontFamily: "'Segoe UI', system-ui, sans-serif", padding: '20px' }}>
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{ width: 8, height: 32, background: 'linear-gradient(180deg,#3b82f6,#8b5cf6)', borderRadius: 4 }} />
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9' }}>Data Warehouse — Attijari Bank Tunisie</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Schéma en Constellation · 5 FACTS · 17 DIMENSIONS · 28 FK · Digital Center 2025–2026</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0' }}>
          {[
            { l: 'FACT_Client', v: '10K', c: '#3b82f6' },
            { l: 'FACT_Campagnes', v: '393', c: '#06b6d4' },
            { l: 'FACT_Social', v: '787', c: '#8b5cf6' },
            { l: 'FACT_Avis', v: '177', c: '#f59e0b' },
            { l: 'FACT_Reclam.', v: '1 075', c: '#10b981' },
            { l: 'Total lignes DWH', v: '~12K', c: '#ec4899' },
            { l: 'Dimensions', v: '17', c: '#64748b' },
            { l: 'FK Relations', v: '28', c: '#94a3b8' },
          ].map((s, i) => (
            <div key={i} style={{ background: `${s.c}18`, border: `1px solid ${s.c}40`, borderRadius: 8, padding: '6px 12px', textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: s.c }}>{s.v}</div>
              <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{s.l}</div>
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 4, background: '#1e293b', borderRadius: 8, padding: 3, width: 'fit-content' }}>
          {[
            ['schema', 'Schéma Constellation'],
            ['dims', '17 Dimensions'],
            ['relations', '28 Relations FK'],
            ['etl', 'Flux ETL'],
          ].map(([id, lbl]) => (
            <button
              key={id}
              onClick={() => setView(id as 'schema' | 'dims' | 'relations' | 'etl')}
              style={{
                padding: '6px 14px',
                background: view === id ? '#334155' : 'transparent',
                border: 'none',
                color: view === id ? '#f1f5f9' : '#64748b',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 12,
                borderRadius: 6,
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {view === 'schema' && (
        <div>
          <div style={{ fontSize: 11, color: '#64748b', marginBottom: 12 }}>
            Cliquer sur une table de faits pour voir ses dimensions. Cliquer sur une dimension pour voir les faits reliés.
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div style={{ gridColumn: '1 / 2' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Tables de Faits (5)</div>
              {FACTS.map((f) => (
                <div
                  key={f.key}
                  onClick={() => {
                    setSelFact(selFact === f.key ? null : f.key);
                    setSelDim(null);
                  }}
                  style={{
                    background: selFact === f.key ? f.bg : '#111827',
                    border: `1px solid ${selFact === f.key ? f.color : '#1f2937'}`,
                    borderRadius: 10,
                    padding: '12px',
                    marginBottom: 8,
                    cursor: 'pointer',
                    transition: 'all .2s',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: f.color }}>{f.name}</div>
                    <div style={{ fontSize: 11, color: '#64748b', background: '#1e293b', padding: '2px 7px', borderRadius: 20 }}>{f.rows} lignes</div>
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6 }}>
                    FK: {f.fks.slice(0, 3).join(', ')}{f.fks.length > 3 ? ` +${f.fks.length - 3}` : ''}
                  </div>
                  <div style={{ fontSize: 10, color: '#94a3b8' }}>{f.note}</div>
                </div>
              ))}
            </div>

            <div style={{ gridColumn: '2 / 3' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Détail</div>
              {activeFact && (
                <div style={{ background: activeFact.bg, border: `1px solid ${activeFact.color}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: activeFact.color, marginBottom: 10 }}>{activeFact.name}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>
                    CLÉS ÉTRANGÈRES ({activeFact.fks.length})
                  </div>
                  {activeFact.fks.map((fk) => (
                    <div key={fk} style={{ fontSize: 11, color: '#60a5fa', marginBottom: 3, paddingLeft: 8, borderLeft: '2px solid #3b82f640' }}>
                      → {fk}
                    </div>
                  ))}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 600, marginTop: 10 }}>
                    MESURES ({activeFact.measures.length})
                  </div>
                  {activeFact.measures.map((m) => (
                    <div key={m} style={{ fontSize: 10, color: m.includes('TARGET') ? '#f59e0b' : '#94a3b8', marginBottom: 2, paddingLeft: 8 }}>
                      {m.includes('TARGET') ? '⭐ ' : '• '}{m}
                    </div>
                  ))}
                  <div style={{ marginTop: 10, padding: '6px 8px', background: '#00000040', borderRadius: 6, fontSize: 10, color: '#64748b' }}>{activeFact.note}</div>
                </div>
              )}
              {activeDim && (
                <div style={{ background: activeDim.bg, border: `1px solid ${activeDim.color}`, borderRadius: 10, padding: 14 }}>
                  <div style={{ fontSize: 14, fontWeight: 800, color: activeDim.color, marginBottom: 6 }}>{activeDim.name}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>{activeDim.rows} lignes · PK: {activeDim.pk}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 600 }}>COLONNES</div>
                  {activeDim.cols.map((c) => (
                    <div key={c} style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2, paddingLeft: 8 }}>• {c}</div>
                  ))}
                  <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 6, fontWeight: 600, marginTop: 10 }}>UTILISÉE DANS</div>
                  {activeDim.used.map((u) => (
                    <div key={u} style={{ fontSize: 10, color: '#60a5fa', marginBottom: 2, paddingLeft: 8 }}>→ {u}</div>
                  ))}
                  <div style={{ marginTop: 10, padding: '6px 8px', background: '#00000040', borderRadius: 6, fontSize: 10, color: '#64748b' }}>{activeDim.note}</div>
                </div>
              )}
              {!activeFact && !activeDim && (
                <div style={{ background: '#111827', border: '1px dashed #1f2937', borderRadius: 10, padding: 20, textAlign: 'center', color: '#374151' }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>👈</div>
                  <div style={{ fontSize: 12 }}>Sélectionner une table</div>
                </div>
              )}
            </div>

            <div style={{ gridColumn: '3 / 4' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Dimensions (17)</div>
              <div style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {DIMS.map((d) => {
                  const isHighlighted = highlightedDims.includes(d.name);
                  const isSelected = selDim === d.name;
                  return (
                    <div
                      key={d.name}
                      onClick={() => {
                        setSelDim(isSelected ? null : d.name);
                        setSelFact(null);
                      }}
                      style={{
                        background: isSelected ? d.bg : isHighlighted ? `${d.color}15` : '#111827',
                        border: `1px solid ${isSelected || isHighlighted ? d.color : '#1f2937'}`,
                        borderRadius: 8,
                        padding: '8px 10px',
                        marginBottom: 6,
                        cursor: 'pointer',
                        transition: 'all .2s',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: isSelected || isHighlighted ? d.color : '#64748b' }}>{d.name}</div>
                        <div style={{ fontSize: 10, color: '#374151' }}>{d.rows}</div>
                      </div>
                      <div style={{ fontSize: 9, color: '#374151', marginTop: 2 }}>{d.note.substring(0, 45)}{d.note.length > 45 ? '…' : ''}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {view === 'dims' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {DIMS.map((d) => (
            <div key={d.name} style={{ background: '#111827', border: `1px solid ${d.color}40`, borderRadius: 10, padding: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: d.color }}>{d.name}</div>
                <div style={{ fontSize: 10, color: '#64748b', background: '#1e293b', padding: '2px 6px', borderRadius: 20 }}>{d.rows}</div>
              </div>
              <div style={{ fontSize: 10, color: '#64748b', marginBottom: 6, fontFamily: 'monospace' }}>PK: {d.pk}</div>
              {d.cols.slice(0, 5).map((c) => (
                <div key={c} style={{ fontSize: 10, color: '#94a3b8', marginBottom: 1 }}>• {c}</div>
              ))}
              {d.cols.length > 5 && <div style={{ fontSize: 10, color: '#374151' }}>+{d.cols.length - 5} autres colonnes</div>}
              <div style={{ marginTop: 8, fontSize: 10, color: '#374151', borderTop: '1px solid #1f2937', paddingTop: 6 }}>
                Utilisée dans : {d.used.join(', ')}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'relations' && (
        <div>
          {FACTS.map((f) => (
            <div key={f.key} style={{ background: '#111827', border: `1px solid ${f.color}40`, borderRadius: 10, padding: 14, marginBottom: 12 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: f.color, marginBottom: 10 }}>
                {f.name} ({f.fks.length} FK)
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {f.dims.map((dim) => {
                  const d = DIMS.find((x) => x.name === dim);
                  return (
                    <div key={dim} style={{ background: d ? `${d.color}18` : '#1e293b', border: `1px solid ${d ? d.color + '40' : '#374151'}`, borderRadius: 8, padding: '6px 10px' }}>
                      <div style={{ fontSize: 11, fontWeight: 600, color: d ? d.color : '#64748b' }}>{dim}</div>
                      <div style={{ fontSize: 10, color: '#374151' }}>{d ? `${d.rows} lignes` : ''}</div>
                      <div style={{ fontSize: 9, color: '#64748b', marginTop: 2 }}>1:N →</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
          <div style={{ background: '#1e293b', borderRadius: 10, padding: 14, border: '1px solid #334155' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#ec4899', marginBottom: 8 }}>Relation Snowflake</div>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>DIM_Plateforme (2 lignes) → DIM_Campagne (393 lignes) → FACT_Campagnes_Unified</div>
            <div style={{ fontSize: 10, color: '#64748b', marginTop: 4 }}>La seule relation snowflake du modèle — DIM_Campagne référence PlateformeID</div>
          </div>
        </div>
      )}

      {view === 'etl' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Sources de données</div>
            {[
              { src: 'Google Ads Excel', detail: '257 campagnes — données réelles', c: '#3b82f6' },
              { src: 'Meta Ads Excel', detail: '139 campagnes — données réelles', c: '#06b6d4' },
              { src: 'Extract Rapports Meta', detail: '34 rapports — données réelles', c: '#06b6d4' },
              { src: 'Dataset Clients CSV', detail: '500K lignes × 39 colonnes', c: '#8b5cf6' },
              { src: 'Réclamations CSV', detail: 'Données simulées sur patterns réels', c: '#10b981' },
              { src: 'Apify — Instagram/FB/LI', detail: '392 posts Attijari scrapés', c: '#a855f7' },
              { src: 'Apify — Concurrents', detail: '395 posts BH Bank + BIAT', c: '#a855f7' },
              { src: 'Apify — Google Maps', detail: '1 460 avis, 177 agences', c: '#f59e0b' },
            ].map((s) => (
              <div key={s.src} style={{ background: `${s.c}12`, border: `1px solid ${s.c}30`, borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: s.c }}>{s.src}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{s.detail}</div>
              </div>
            ))}
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Staging Area (SQL Server)</div>
            {[
              'SA_Clients (500K)',
              'SA_Campagnes_Google (257)',
              'SA_Campagnes_Meta (139)',
              'SA_Meta_Extract (34)',
              'SA_Reclamations (1 075)',
              'SA_SocialMedia_Attijari (392)',
              'SA_Concurrents (395)',
              'SA_AvisAgences (1 460)',
            ].map((t) => (
              <div key={t} style={{ background: '#111827', border: '1px solid #1f2937', borderRadius: 8, padding: '8px 10px', marginBottom: 6, fontFamily: 'monospace', fontSize: 11, color: '#94a3b8' }}>
                {t}
              </div>
            ))}
            <div style={{ marginTop: 8, fontSize: 10, color: '#374151', background: '#0c0f1a', borderRadius: 6, padding: 8 }}>
              Nettoyage : Python pandas · Power Query M · Talend tMap · StringHandling
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', marginBottom: 8 }}>Data Warehouse (Constellation)</div>
            {FACTS.map((f) => (
              <div key={f.key} style={{ background: f.bg, border: `1px solid ${f.color}40`, borderRadius: 8, padding: '8px 10px', marginBottom: 6 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: f.color }}>{f.name}</div>
                <div style={{ fontSize: 10, color: '#64748b' }}>{f.rows} lignes · {f.fks.length} FK</div>
              </div>
            ))}
            <div style={{ background: '#1e293b', borderRadius: 8, padding: 8, marginTop: 4 }}>
              {DIMS.slice(0, 8).map((d) => (
                <div key={d.name} style={{ fontSize: 10, color: '#64748b', marginBottom: 2 }}>• {d.name} ({d.rows})</div>
              ))}
              <div style={{ fontSize: 10, color: '#374151' }}>+9 autres dimensions…</div>
            </div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 20, padding: '8px 12px', background: '#111827', borderRadius: 8, fontSize: 10, color: '#374151', display: 'flex', gap: 20 }}>
        <span>Schéma en Constellation — 5 FACTS partagent des dimensions communes</span>
        <span>DIM_Temps = reliée aux 5 FACTS · DIM_Gouvernorat = hub géographique (4 tables)</span>
        <span>28 FK · 0 orphelins · Type 1 statique (pas SCD2)</span>
      </div>
    </div>
  );
}
