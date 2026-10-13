'use client';
import { useEffect, useState } from 'react';

/* ============================================================
   BLIND SCHOOL — Gestion des dépenses
   ============================================================ */

export const EXPENSE_CATEGORIES = [
  'Salaire',
  'Fournitures',
  'Loyer',
  'Électricité / Eau',
  'Internet / Téléphone',
  'Entretien / Réparation',
  'Transport',
  'Frais administratifs',
  'Imprévu',
  'Autre',
] as const;
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  'Salaire': 'bg-blue-100 text-blue-800',
  'Fournitures': 'bg-emerald-100 text-emerald-800',
  'Loyer': 'bg-purple-100 text-purple-800',
  'Électricité / Eau': 'bg-amber-100 text-amber-800',
  'Internet / Téléphone': 'bg-cyan-100 text-cyan-800',
  'Entretien / Réparation': 'bg-orange-100 text-orange-800',
  'Transport': 'bg-pink-100 text-pink-800',
  'Frais administratifs': 'bg-slate-200 text-slate-700',
  'Imprévu': 'bg-red-100 text-red-800',
  'Autre': 'bg-slate-100 text-slate-600',
};

export interface Expense {
  id: string;
  category: ExpenseCategory;
  beneficiary: string;        // Nom du bénéficiaire (personne ou entreprise)
  amount: number;
  date: string;               // YYYY-MM-DD
  method: string;             // Espèces, Mobile Money...
  note: string;
  anneeScolaireId: string;
  createdAt: string;
}

export const EXPENSE_METHODS = ['Espèces', 'Mobile Money', 'Virement', 'Chèque'] as const;

const EXPENSES_KEY = 'blind-school-expenses';

/* ---------- Hook localStorage ---------- */
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
        setValue(parsed);
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

export const useExpenses = () => {
  const [expenses, setExpenses] = usePersistentState<Expense[]>(EXPENSES_KEY, []);
  // Migration auto
  useEffect(() => {
    if (expenses.some((e) => e.anneeScolaireId === undefined)) {
      setExpenses((list) =>
        list.map((e) => ({ ...e, anneeScolaireId: e.anneeScolaireId ?? '' })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return [expenses, setExpenses] as const;
};

/* Helpers */
export function nextExpenseRef(expenses: Expense[]): string {
  const year = new Date().getFullYear();
  return `DEP-${year}-${String(expenses.length + 1).padStart(5, '0')}`;
}