'use client';
import { useEffect, useState } from 'react';

/* ============================================================
   BLIND SCHOOL — Vie Scolaire & Parcours de l'École
   ============================================================ */

export const EVENT_TYPES = ['Examen', 'Congé', 'Réunion', 'Activité', 'Autre'] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export const EVENT_COLORS: Record<EventType, { bg: string; text: string; dot: string }> = {
  Examen:   { bg: 'bg-red-50',     text: 'text-red-800',     dot: 'bg-red-500' },
  Congé:    { bg: 'bg-emerald-50', text: 'text-emerald-800', dot: 'bg-emerald-500' },
  Réunion:  { bg: 'bg-amber-50',   text: 'text-amber-800',   dot: 'bg-amber-500' },
  Activité: { bg: 'bg-indigo-50',  text: 'text-indigo-800',  dot: 'bg-indigo-500' },
  Autre:    { bg: 'bg-slate-50',   text: 'text-slate-700',   dot: 'bg-slate-400' },
};

export interface SchoolEvent {
  id: string;
  title: string;
  type: EventType;
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD (optionnel — vide = même jour)
  description: string;
  createdAt: string;
}

export interface HistoryEntry {
  id: string;
  year: string;         // ex: "1990" ou "2005-2010"
  title: string;        // "Fondation de l'école"
  description: string;
  order: number;
}

export interface SchoolJourney {
  presentation: string;   // texte long de présentation
  entries: HistoryEntry[];
}

const EVENTS_KEY = 'blind-school-events';
const JOURNEY_KEY = 'blind-school-journey';

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

export const useEvents = () => usePersistentState<SchoolEvent[]>(EVENTS_KEY, []);

export const DEFAULT_JOURNEY: SchoolJourney = {
  presentation: '',
  entries: [],
};

export const useJourney = () =>
  usePersistentState<SchoolJourney>(JOURNEY_KEY, DEFAULT_JOURNEY);

/* ---------- Helpers calendrier ---------- */
export const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
];

export const DAYS_FR_SHORT = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

/** Grille du mois : 6 semaines × 7 jours, commençant le lundi */
export function buildMonthGrid(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  // Lundi = 1 dans getDay() → on ramène à 0
  const shift = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - shift);

  const grid: Date[][] = [];
  for (let w = 0; w < 6; w++) {
    const row: Date[] = [];
    for (let d = 0; d < 7; d++) {
      const cur = new Date(start);
      cur.setDate(start.getDate() + w * 7 + d);
      row.push(cur);
    }
    grid.push(row);
  }
  return grid;
}

/** Retourne true si la date est dans l'intervalle de l'événement */
export function eventCoversDay(ev: SchoolEvent, day: string): boolean {
  const end = ev.endDate || ev.startDate;
  return day >= ev.startDate && day <= end;
}

/** Événements triés par date */
export function sortEventsByDate(events: SchoolEvent[]): SchoolEvent[] {
  return [...events].sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/** Prochains événements (à partir d'aujourd'hui) */
export function upcomingEvents(events: SchoolEvent[], limit = 5): SchoolEvent[] {
  const today = ymd(new Date());
  return sortEventsByDate(events.filter((e) => (e.endDate || e.startDate) >= today)).slice(0, limit);
}