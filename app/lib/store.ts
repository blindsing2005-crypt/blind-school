'use client';
import { useEffect, useState } from 'react';

/* ============================================================
   BLIND SCHOOL — Données partagées
   ============================================================ */

export const STUDENT_STATUSES = ['Actif', 'Redoublant', 'Abandonné', 'Expulsé', 'Diplômé'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const STUDENT_STATUS_COLORS: Record<StudentStatus, string> = {
  Actif: 'bg-emerald-100 text-emerald-800',
  Redoublant: 'bg-amber-100 text-amber-800',
  Abandonné: 'bg-slate-200 text-slate-700',
  Expulsé: 'bg-red-100 text-red-800',
  Diplômé: 'bg-indigo-100 text-indigo-800',
};

export interface Student {
  id: string;
  matricule: string;
  nom: string;
  postnom: string;
  prenom: string;
  sexe: 'M' | 'F';
  dateNaissance: string;
  lieuNaissance: string;
  nomParent: string;
  telephoneParent: string;
  adresse: string;
  ecoleProvenance: string;
  professionResponsable: string;
  niveau: string;
  classe: string;
  option: string;
  dateInscription: string;
  statut: StudentStatus;
  anneeScolaireId: string;
  previousYearId?: string;
  previousStudentId?: string;
}

export interface Payment {
  id: string;
  studentId: string;
  amount: number;
  tranche: string;
  date: string;
  method: string;
  receiptNumber: string;
  note: string;
  createdAt: string;
  anneeScolaireId: string;
}

export interface TrancheSetting {
  id: string;
  label: string;
  amountMaternelle: number;
  amountPrimaire: number;
  amountSecondaire: number;
  amountOptions?: Record<string, number>; // 🆕 Tarifs par option
  startDate: string;
  endDate: string;
}

export interface SchoolYear {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'closed' | 'planned';
  createdAt: string;
  closedAt: string;
}

export interface SchoolSettings {
  schoolName: string;
  schoolLogo: string;
  allowOffPeriodPayment: boolean;
  tranches: TrancheSetting[];
  classes: Record<string, string[]>; // 🆕 Classes dynamiques
  options: string[];                 // 🆕 Options dynamiques
}

export const STORAGE_KEYS = {
  students: 'blind-school-students',
  payments: 'blind-school-payments',
  settings: 'blind-school-settings',
  tuition: 'blind-school-tuition',
  schoolYears: 'blind-school-years',
  activeYearId: 'blind-school-active-year',
} as const;

export const NIVEAUX = ['Maternelle', 'Primaire', 'Secondaire'] as const;
export type Niveau = (typeof NIVEAUX)[number];

// Valeurs par défaut si l'utilisateur n'a rien configuré
export const DEFAULT_CLASSES: Record<Niveau, string[]> = {
  Maternelle: ['1ère Maternelle', '2ème Maternelle', '3ème Maternelle'],
  Primaire: ['1ère Primaire', '2ème Primaire', '3ème Primaire', '4ème Primaire', '5ème Primaire', '6ème Primaire'],
  Secondaire: ['7ème A', '7ème B', '8ème A', '8ème B', '1ère A', '1ère B', '2ème A', '2ème B', '3ème A', '3ème B', '4ème A', '4ème B'],
};

export const DEFAULT_OPTIONS = [
  'Scientifique', 'Littéraire', 'Pédagogique', 'Mécanique Auto', 'Mécanique Générale', 
  'Électricité', 'Commerciale et Gestion', 'Coupe et Couture', 'Construction', 
  'Informatique', 'Électronique'
];

export const CLASSES_AVEC_OPTION = new Set([
  '1ère A', '1ère B', '2ème A', '2ème B', '3ème A', '3ème B', '4ème A', '4ème B',
]);

export const classeAvecOption = (classe: string) => CLASSES_AVEC_OPTION.has(classe);

export const TRANCHE_OPTIONS = ['1ère tranche', '2ème tranche', '3ème tranche', 'Solde final', 'Autre'] as const;
export const PAYMENT_METHODS = ['Espèces', 'Mobile Money', 'Virement', 'Chèque'] as const;

const ANNEE = new Date().getFullYear();

export const DEFAULT_TRANCHES: TrancheSetting[] = [
  { id: '1', label: '1ère tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, amountOptions: {}, startDate: `${ANNEE}-09-01`, endDate: `${ANNEE}-10-31` },
  { id: '2', label: '2ème tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, amountOptions: {}, startDate: `${ANNEE}-11-01`, endDate: `${ANNEE}-12-31` },
  { id: '3', label: '3ème tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, amountOptions: {}, startDate: `${ANNEE + 1}-01-01`, endDate: `${ANNEE + 1}-02-28` },
  { id: '4', label: '4ème tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, amountOptions: {}, startDate: `${ANNEE + 1}-03-01`, endDate: `${ANNEE + 1}-04-30` },
  { id: '5', label: '5ème tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, amountOptions: {}, startDate: `${ANNEE + 1}-05-01`, endDate: `${ANNEE + 1}-06-30` },
  { id: '6', label: '6ème tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, amountOptions: {}, startDate: '', endDate: '' },
  { id: '7', label: '7ème tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, amountOptions: {}, startDate: '', endDate: '' },
];

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: 'BLIND SCHOOL',
  schoolLogo: '',
  allowOffPeriodPayment: false,
  tranches: DEFAULT_TRANCHES,
  classes: DEFAULT_CLASSES,
  options: [...DEFAULT_OPTIONS],
};

/* ---------- Hook localStorage partagé ---------- */
function usePersistentState<T>(
  key: string,
  initial: T,
): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(initial);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (
          parsed &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          initial &&
          typeof initial === 'object' &&
          !Array.isArray(initial)
        ) {
          setValue({ ...(initial as object), ...parsed } as T);
        } else {
          setValue(parsed);
        }
      }
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

/* ---------- Étudiants ---------- */
export const useStudents = () => {
  const [students, setStudents] = usePersistentState<Student[]>(STORAGE_KEYS.students, []);
  return [students, setStudents] as const;
};

/* ---------- Paiements ---------- */
export const usePayments = () => {
  const [payments, setPayments] = usePersistentState<Payment[]>(STORAGE_KEYS.payments, []);
  return [payments, setPayments] as const;
};

/* ---------- École ---------- */
export const useSchoolSettings = () => {
  const [settings, setSettings] = usePersistentState<SchoolSettings>(
    STORAGE_KEYS.settings,
    DEFAULT_SCHOOL_SETTINGS,
  );

  // Migrations
  useEffect(() => {
    let needsMigration = false;
    const newSettings = { ...settings };

    if (!settings.classes) {
      newSettings.classes = DEFAULT_CLASSES;
      needsMigration = true;
    }
    if (!settings.options) {
      newSettings.options = [...DEFAULT_OPTIONS];
      needsMigration = true;
    }
    if (settings.tranches) {
      const tranchesMigrated = settings.tranches.map(t => {
        if (t.amountOptions === undefined) {
          needsMigration = true;
          return { ...t, amountOptions: {} };
        }
        return t;
      });
      newSettings.tranches = tranchesMigrated;
    }

    if (needsMigration) {
      setSettings(newSettings);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [settings, setSettings] as const;
};

/* ---------- Années scolaires ---------- */
export const useSchoolYears = () =>
  usePersistentState<SchoolYear[]>(STORAGE_KEYS.schoolYears, []);
export const useActiveYearId = () =>
  usePersistentState<string>(STORAGE_KEYS.activeYearId, '');

export const useActiveYear = (): SchoolYear | null => {
  const [years] = useSchoolYears();
  const [activeId] = useActiveYearId();
  return years.find((y) => y.id === activeId) || null;
};

/* ---------- Helpers ---------- */
export const formatMoney = (n: number) =>
  new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' FC';

export type PaymentStatus = {
  label: 'Payé' | 'Partiel' | 'Non payé' | 'N/A';
  color: 'emerald' | 'amber' | 'red' | 'slate';
};

export function getPaymentStatus(totalPaid: number, totalDue: number): PaymentStatus {
  if (totalDue <= 0) return { label: 'N/A', color: 'slate' };
  if (totalPaid >= totalDue) return { label: 'Payé', color: 'emerald' };
  if (totalPaid === 0) return { label: 'Non payé', color: 'red' };
  return { label: 'Partiel', color: 'amber' };
}

export function nextReceiptNumber(payments: Payment[]): string {
  const year = new Date().getFullYear();
  return `REC-${year}-${String(payments.length + 1).padStart(5, '0')}`;
}

export function trancheAmountFor(t: TrancheSetting, niveau: string, option?: string): number {
  if (niveau === 'Maternelle') return t.amountMaternelle || 0;
  if (niveau === 'Primaire') return t.amountPrimaire || 0;
  if (niveau === 'Secondaire') {
    if (option && t.amountOptions && t.amountOptions[option] !== undefined) {
      return t.amountOptions[option];
    }
    return t.amountSecondaire || 0;
  }
  return 0;
}

export function totalDue(tranches: TrancheSetting[], niveau?: string, option?: string): number {
  if (niveau) {
    return tranches.reduce((s, t) => s + trancheAmountFor(t, niveau, option), 0);
  }
  return tranches.reduce((s, t) => s + (t.amountPrimaire || 0), 0);
}

export function getActiveTranche(
  tranches: TrancheSetting[],
  today: string = new Date().toISOString().slice(0, 10),
): TrancheSetting | null {
  return tranches.find(
    (t) => t.startDate && t.endDate && today >= t.startDate && today <= t.endDate,
  ) || null;
}

export function getTranchePaid(
  payments: Payment[],
  studentId: string,
  trancheLabel: string,
): number {
  return payments
    .filter((p) => p.studentId === studentId && p.tranche === trancheLabel)
    .reduce((s, p) => s + p.amount, 0);
}

export function getStudentTotalPaid(payments: Payment[], studentId: string): number {
  return payments.filter((p) => p.studentId === studentId).reduce((s, p) => s + p.amount, 0);
}

export function nextClass(currentClasse: string, allClasses: Record<string, string[]>): string | null {
  const order: string[] = [];
  ['Maternelle', 'Primaire', 'Secondaire'].forEach(niv => {
    if (allClasses[niv]) order.push(...allClasses[niv]);
  });
  
  const i = order.indexOf(currentClasse);
  if (i === -1 || i === order.length - 1) return null;
  return order[i + 1];
}