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

export const CLASSES: Record<Niveau, string[]> = {
  Maternelle: ['1ère Maternelle', '2ème Maternelle', '3ème Maternelle'],
  Primaire: [
    '1ère Primaire', '2ème Primaire', '3ème Primaire',
    '4ème Primaire', '5ème Primaire', '6ème Primaire',
  ],
  Secondaire: [
    '7ème A', '7ème B', '8ème A', '8ème B',
    '1ère A', '1ère B', '2ème A', '2ème B',
    '3ème A', '3ème B', '4ème A', '4ème B',
  ],
};

export const OPTIONS = [
  'Scientifique', 'Littéraire', 'Pédagogique',
  'Mécanique Auto', 'Mécanique Générale', 'Électricité',
  'Commerciale et Gestion', 'Coupe et Couture', 'Construction',
  'Informatique', 'Électronique',
] as const;

export const CLASSES_AVEC_OPTION = new Set([
  '1ère A', '1ère B', '2ème A', '2ème B',
  '3ème A', '3ème B', '4ème A', '4ème B',
]);

export const classeAvecOption = (classe: string) => CLASSES_AVEC_OPTION.has(classe);

export const TRANCHE_OPTIONS = [
  '1ère tranche', '2ème tranche', '3ème tranche', 'Solde final', 'Autre',
] as const;

export const PAYMENT_METHODS = ['Espèces', 'Mobile Money', 'Virement', 'Chèque'] as const;

const ANNEE = new Date().getFullYear();

export const DEFAULT_TRANCHES: TrancheSetting[] = [
  { id: '1', label: '1ère tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, startDate: `${ANNEE}-09-01`, endDate: `${ANNEE}-10-31` },
  { id: '2', label: '2ème tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, startDate: `${ANNEE}-11-01`, endDate: `${ANNEE}-12-31` },
  { id: '3', label: '3ème tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, startDate: `${ANNEE + 1}-01-01`, endDate: `${ANNEE + 1}-02-28` },
  { id: '4', label: '4ème tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, startDate: `${ANNEE + 1}-03-01`, endDate: `${ANNEE + 1}-04-30` },
  { id: '5', label: '5ème tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, startDate: `${ANNEE + 1}-05-01`, endDate: `${ANNEE + 1}-06-30` },
  { id: '6', label: '6ème tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, startDate: '', endDate: '' },
  { id: '7', label: '7ème tranche', amountMaternelle: 30000, amountPrimaire: 50000, amountSecondaire: 70000, startDate: '', endDate: '' },
];

export const DEFAULT_TUITION: Record<string, number> = {
  Maternelle: 210000,
  Primaire: 350000,
  Secondaire: 490000,
};

export const DEFAULT_SCHOOL_SETTINGS: SchoolSettings = {
  schoolName: 'BLIND SCHOOL',
  schoolLogo: '',
  allowOffPeriodPayment: false,
  tranches: DEFAULT_TRANCHES,
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

/* ---------- Étudiants (migration auto) ---------- */
export const useStudents = () => {
  const [students, setStudents] = usePersistentState<Student[]>(STORAGE_KEYS.students, []);
  useEffect(() => {
    if (students.some((s) => !s.statut || s.anneeScolaireId === undefined || s.ecoleProvenance === undefined)) {
      setStudents((list) =>
        list.map((s) => ({
          ...s,
          statut: s.statut || ('Actif' as StudentStatus),
          anneeScolaireId: s.anneeScolaireId ?? '',
          ecoleProvenance: s.ecoleProvenance ?? '',
          professionResponsable: s.professionResponsable ?? '',
        })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [students, setStudents] as const;
};

/* ---------- Paiements ---------- */
export const usePayments = () => {
  const [payments, setPayments] = usePersistentState<Payment[]>(STORAGE_KEYS.payments, []);
  useEffect(() => {
    if (payments.some((p) => p.anneeScolaireId === undefined)) {
      setPayments((list) => list.map((p) => ({ ...p, anneeScolaireId: p.anneeScolaireId ?? '' })));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [payments, setPayments] as const;
};

/* ---------- École + migration tranches ---------- */
export const useSchoolSettings = () => {
  const [settings, setSettings] = usePersistentState<SchoolSettings>(
    STORAGE_KEYS.settings,
    DEFAULT_SCHOOL_SETTINGS,
  );

  useEffect(() => {
    if (!settings.tranches || settings.tranches.length === 0) return;
    const needsMigration = settings.tranches.some(
      (t) => {
        const legacy = t as unknown as { amountMaternelle?: number; amount?: number };
        return legacy.amountMaternelle === undefined;
      },
    );
    if (!needsMigration) return;
    setSettings((s) => ({
      ...s,
      tranches: s.tranches.map((t) => {
        const legacy = t as unknown as { amount?: number };
        const fallback = legacy.amount ?? 50000;
        return {
          id: t.id,
          label: t.label,
          amountMaternelle: t.amountMaternelle ?? fallback,
          amountPrimaire: t.amountPrimaire ?? fallback,
          amountSecondaire: t.amountSecondaire ?? fallback,
          startDate: t.startDate ?? '',
          endDate: t.endDate ?? '',
        };
      }),
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return [settings, setSettings] as const;
};

/* ---------- useTuition (par niveau) ---------- */
export const useTuition = (): [
  Record<string, number>,
  (v: Record<string, number> | ((p: Record<string, number>) => Record<string, number>)) => void,
] => {
  const [settings] = useSchoolSettings();
  const tuition: Record<string, number> = {
    Maternelle: settings.tranches.reduce((s, t) => s + (t.amountMaternelle || 0), 0),
    Primaire: settings.tranches.reduce((s, t) => s + (t.amountPrimaire || 0), 0),
    Secondaire: settings.tranches.reduce((s, t) => s + (t.amountSecondaire || 0), 0),
  };
  const setTuition = () => { /* no-op */ };
  return [tuition, setTuition];
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

export function trancheAmountFor(t: TrancheSetting, niveau: string): number {
  if (niveau === 'Maternelle') return t.amountMaternelle || 0;
  if (niveau === 'Primaire') return t.amountPrimaire || 0;
  if (niveau === 'Secondaire') return t.amountSecondaire || 0;
  return 0;
}

export function totalDue(tranches: TrancheSetting[], niveau?: string): number {
  if (niveau) {
    return tranches.reduce((s, t) => s + trancheAmountFor(t, niveau), 0);
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

export function getStudentStatus(paid: number, due: number): PaymentStatus {
  return getPaymentStatus(paid, due);
}

export function getTrancheStatus(paid: number, due: number): PaymentStatus {
  return getPaymentStatus(paid, due);
}

export function nextClass(currentClasse: string): string | null {
  const order: string[] = [
    '1ère Maternelle', '2ème Maternelle', '3ème Maternelle',
    '1ère Primaire', '2ème Primaire', '3ème Primaire', '4ème Primaire', '5ème Primaire', '6ème Primaire',
    '7ème A', '7ème B', '8ème A', '8ème B',
    '1ère A', '1ère B', '2ème A', '2ème B',
    '3ème A', '3ème B', '4ème A', '4ème B',
  ];
  const i = order.indexOf(currentClasse);
  if (i === -1 || i === order.length - 1) return null;
  return order[i + 1];
}

export function formatYearLabel(start: string, end: string): string {
  if (!start || !end) return 'Année scolaire';
  const y1 = new Date(start).getFullYear();
  const y2 = new Date(end).getFullYear();
  return `${y1} - ${y2}`;
}

export function getPrevYearLabel(
  student: Student,
  years: SchoolYear[],
): string {
  if (!student.previousYearId) return '—';
  const y = years.find((x) => x.id === student.previousYearId);
  return y?.label || '—';
}