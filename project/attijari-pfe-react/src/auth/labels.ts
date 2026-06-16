import type { AccessSpace } from '@/types';

export function getRoleLabel(role?: string | null) {
  const normalized = String(role ?? '').trim().toUpperCase();

  if (normalized === 'ADMIN') return 'Administrateur';
  if (normalized === 'MARKETING') return 'Direction Marketing';
  if (normalized === 'COMMERCIAL') return 'Direction Marche';
  return 'Utilisateur';
}

export function getRoleBadgeLabel(role?: string | null) {
  const normalized = String(role ?? '').trim().toUpperCase();

  if (normalized === 'ADMIN') return 'Administrateur';
  if (normalized === 'MARKETING') return 'Utilisateur Direction Marketing';
  if (normalized === 'COMMERCIAL') return 'Utilisateur Direction Marche';
  return 'Utilisateur';
}

export function getSpaceLabel(space?: AccessSpace | string | null) {
  const normalized = String(space ?? '').trim().toLowerCase();

  if (normalized === 'admin') return 'Administrateur';
  if (normalized === 'marketing') return 'Direction Marketing';
  if (normalized === 'commercial') return 'Direction Marche';
  return 'Espace plateforme';
}

export function getSpaceDescription(space?: AccessSpace | string | null) {
  const normalized = String(space ?? '').trim().toLowerCase();

  if (normalized === 'admin') {
    return "Validation des demandes d'acces et supervision de la plateforme.";
  }

  if (normalized === 'marketing') {
    return 'Campagnes, social media et intelligence marketing.';
  }

  if (normalized === 'commercial') {
    return 'Clients, churn, reclamations et pilotage reseau.';
  }

  return 'Choisissez votre espace de travail Attijari Decision Hub.';
}
