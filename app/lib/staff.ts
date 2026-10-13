'use client';
import { useEffect, useState } from 'react';

/* ============================================================
   BLIND SCHOOL — Module Personnel & Enseignants
   ============================================================ */

export const STAFF_ROLES = [
  'Directeur / Directrice',
  'Préfet des études',
  'Enseignant',
  'Comptable',
  'Secrétaire',
  'Surveillant',
  'Bibliothécaire',
  'Agent d\'entretien',
  'Autre',
] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const CONTRACT_TYPES = [
  'CDI',
  'CDD',
  'Vacataire',
  'Stage',
  'Bénévole',
] as const;
export type ContractType = (typeof CONTRACT_TYPES)[number];

export const DIPLOMAS = [
  'Brevet',
  'Diplôme d\'État',
  'Graduat',
  'Licence',
  'Master',
  'Doctorat',
  'Autre',
] as const;

export const STAFF_STATUS = ['Actif', 'En congé', 'Inactif', 'Parti'] as const;
export type StaffStatus = (typeof STAFF_STATUS)[number];

export const STAFF_STATUS_COLORS: Record<StaffStatus, string> = {
  'Actif': 'bg-emerald-100 text-emerald-800',
  'En congé': 'bg-amber-100 text-amber-800',
  'Inactif': 'bg-slate-100 text-slate-600',
  'Parti': 'bg-red-100 text-red-800',
};

export const DEPARTURE_REASONS = [
  'Démission',
  'Retraite',
  'Fin de contrat',
  'Mutation',
  'Décès',
  'Abandon de poste',
  'Autre',
] as const;
export type DepartureReason = (typeof DEPARTURE_REASONS)[number];

export const SUBJECTS = [
  'Mathématiques', 'Français', 'Anglais', 'Sciences',
  'Histoire', 'Géographie', 'Éducation civique',
  'Éducation physique', 'Religion', 'Informatique',
  'Dessin', 'Musique', 'Autre',
] as const;

export interface Staff {
  id: string;
  matricule: string;
  photo: string;

  // Identité
  nom: string;
  postnom: string;
  prenom: string;
  sexe: 'M' | 'F';
  dateNaissance: string;
  lieuNaissance: string;
  etatCivil: 'Célibataire' | 'Marié(e)' | 'Divorcé(e)' | 'Veuf(ve)';

  // Coordonnées
  telephone: string;
  email: string;
  adresse: string;
  contactUrgence: string;

  // Professionnel
  role: StaffRole;
  dateEmbauche: string;
  typeContrat: ContractType;
  diplome: string;
  specialite: string;
  statut: StaffStatus;

  // Affectation
  classesAssignees: string[];
  coursAssignes: string[];

  // Notes
  notes: string;

  // 🆕 Départ / Remplacement
  departureDate?: string;
  departureReason?: DepartureReason;
  departureNote?: string;
  replacedById?: string;   // ID de la personne qui a remplacé
  replacesId?: string;     // ID de la personne remplacée

  createdAt: string;
}

const STORAGE_KEY = 'blind-school-staff';

/* ---------- Hook localStorage ---------- */
function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) setValue(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [key]);

  useEffect(() => {
    const onStore = (e: Event) => {
      const ce = e as CustomEvent<{ key: string; value: T }>;
      if (ce.detail?.key === key) setValue(ce.detail.value);
    };
    window.addEventListener('bs-store', onStore);
    return () => window.removeEventListener('bs-store', onStore);
  }, [key]);

  const set = (v: T | ((p: T) => T)) => {
    setValue((prev) => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v;
      try {
        localStorage.setItem(key, JSON.stringify(next));
        window.dispatchEvent(
          new CustomEvent('bs-store', { detail: { key, value: next } }),
        );
      } catch { /* ignore */ }
      return next;
    });
  };

  return [value, set];
}

export const useStaff = () => usePersistentState<Staff[]>(STORAGE_KEY, []);

/* ---------- Helpers ---------- */
export function nextStaffMatricule(staff: Staff[]): string {
  const year = new Date().getFullYear();
  return `EMP-${year}-${String(staff.length + 1).padStart(3, '0')}`;
}

export function seniority(dateEmbauche: string, dateDepart?: string): string {
  if (!dateEmbauche) return '—';
  const start = new Date(dateEmbauche);
  const end = dateDepart ? new Date(dateDepart) : new Date();
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return '—';
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  if (end.getDate() < start.getDate()) months--;
  if (months < 0) { years--; months += 12; }
  if (years <= 0 && months <= 0) return 'Nouveau';
  if (years === 0) return `${months} mois`;
  return `${years} an${years > 1 ? 's' : ''}${months > 0 ? ` ${months} mois` : ''}`;
}