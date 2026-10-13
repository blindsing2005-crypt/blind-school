'use client';
import { useEffect, useState } from 'react';

/* ============================================================
   BLIND SCHOOL — Système de licence flexible (1 à 12 mois)
   ============================================================ */

/** ⚠️ À CHANGER — Mot de passe pour accéder au générateur de codes */
export const ADMIN_MASTER_PASSWORD = 'BLIND2025ADMIN';

/** ⚠️ À CHANGER — Secret interne (ne jamais communiquer) */
const LICENSE_SECRET = 'BS-RDC::AMISI::BLESSING::v2025';

/** Durée de l'essai gratuit en jours */
export const TRIAL_DAYS = 30;

/** Durées proposées au générateur (en mois) */
export const LICENSE_DURATIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

const LICENSE_KEY = 'blind-school-license';
const HISTORY_KEY = 'blind-school-license-history';

export interface License {
  machineId: string;
  installedAt: string;
  trialEndsAt: string;
  paidUntil: string | null;
  lastUnlockedAt: string | null;
}

export interface GeneratedCode {
  id: string;
  machineId: string;
  code: string;
  durationMonths: number;
  generatedAt: string;
  expiresAt: string;
  note: string;
}

/* ---------- Hook localStorage partagé ---------- */
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

/* ---------- Générateur d'ID machine ---------- */
export function generateMachineId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let raw = '';
  for (let i = 0; i < 12; i++) {
    raw += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

/* ---------- Hash 32-bit ---------- */
function hashString(s: string): string {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let h2 = 5381;
  for (let i = 0; i < s.length; i++) {
    h2 = ((h2 << 5) + h2 + s.charCodeAt(i)) >>> 0;
  }
  const combined = (h >>> 0).toString(36).toUpperCase() + (h2 >>> 0).toString(36).toUpperCase();
  return combined.slice(0, 8).padEnd(8, 'X');
}

/* ---------- Calcule la date d'expiration à partir d'une durée en mois ---------- */
export function computeExpiryFromMonths(months: number): {
  year: number;
  month: number;
  expiresAt: string;
  label: string;
} {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth() + months, 1);
  const year = target.getFullYear();
  const month = target.getMonth() + 1;
  const lastDay = new Date(year, month, 0).getDate();
  const expiresAt = new Date(year, month - 1, lastDay, 23, 59, 59).toISOString();
  const label = target.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return { year, month, expiresAt, label };
}

/* ---------- Génération d'un code de déblocage ---------- */
export function generateUnlockCode(machineId: string, year: number, month: number): string {
  const cleanId = machineId.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const expiry = `${year}${String(month).padStart(2, '0')}`;
  const check = hashString(`${cleanId}|${expiry}|${LICENSE_SECRET}`).slice(0, 4);
  return `${expiry}-${check}`;
}

/* ---------- Vérification d'un code ---------- */
export function verifyUnlockCode(
  machineId: string,
  code: string,
): { valid: boolean; expiresAt?: string } {
  const cleanCode = code.trim().toUpperCase().replace(/\s/g, '');
  const match = cleanCode.match(/^(\d{6})-([A-Z0-9]{4})$/);
  if (!match) return { valid: false };

  const [, expiry, check] = match;
  const year = Number(expiry.slice(0, 4));
  const month = Number(expiry.slice(4, 6));

  if (year < 2020 || year > 2100 || month < 1 || month > 12) {
    return { valid: false };
  }

  const expected = generateUnlockCode(machineId, year, month);
  if (expected !== cleanCode) return { valid: false };

  const lastDay = new Date(year, month, 0).getDate();
  const expiresAt = new Date(year, month - 1, lastDay, 23, 59, 59).toISOString();
  return { valid: true, expiresAt };
}

/* ---------- État de la licence ---------- */
export interface LicenseStatus {
  license: License;
  isTrial: boolean;
  isPaid: boolean;
  isExpired: boolean;
  daysLeft: number;
  expiresAt: string;
}

export function computeStatus(license: License): LicenseStatus {
  const now = Date.now();
  const trialEnd = new Date(license.trialEndsAt).getTime();
  const paidEnd = license.paidUntil ? new Date(license.paidUntil).getTime() : 0;
  const isPaid = paidEnd > now;
  const isExpired = !isPaid && now > trialEnd;
  const expiresAt = isPaid ? license.paidUntil! : license.trialEndsAt;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(expiresAt).getTime() - now) / (1000 * 60 * 60 * 24)),
  );

  return { license, isTrial: !isPaid, isPaid, isExpired, daysLeft, expiresAt };
}

/* ---------- Hooks ---------- */
export function useLicenseHistory() {
  return usePersistentState<GeneratedCode[]>(HISTORY_KEY, []);
}

export function useLicense(): {
  status: LicenseStatus | null;
  license: License | null;
  setLicense: (v: License | null | ((p: License | null) => License | null)) => void;
  unlock: (code: string) => { success: boolean; message: string };
} {
  const [license, setLicense] = usePersistentState<License | null>(LICENSE_KEY, null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;
    if (typeof window === 'undefined') return;

    const raw = localStorage.getItem(LICENSE_KEY);
    if (!raw) {
      const now = new Date();
      const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000);
      const fresh: License = {
        machineId: generateMachineId(),
        installedAt: now.toISOString(),
        trialEndsAt: trialEnd.toISOString(),
        paidUntil: null,
        lastUnlockedAt: null,
      };
      localStorage.setItem(LICENSE_KEY, JSON.stringify(fresh));
      setLicense(fresh);
    }
    setReady(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const unlock = (code: string) => {
    if (!license) return { success: false, message: 'Licence introuvable.' };
    const result = verifyUnlockCode(license.machineId, code);
    if (!result.valid || !result.expiresAt) {
      return { success: false, message: 'Code invalide. Vérifiez et réessayez.' };
    }
    const currentPaid = license.paidUntil ? new Date(license.paidUntil).getTime() : 0;
    const newPaid = new Date(result.expiresAt).getTime();
    const finalPaid = Math.max(currentPaid, newPaid);

    const updated: License = {
      ...license,
      paidUntil: new Date(finalPaid).toISOString(),
      lastUnlockedAt: new Date().toISOString(),
    };
    setLicense(updated);
    const dateStr = new Date(finalPaid).toLocaleDateString('fr-FR', { dateStyle: 'long' });
    return { success: true, message: `✅ Débloqué jusqu'au ${dateStr}.` };
  };

  return {
    status: license ? computeStatus(license) : null,
    license,
    setLicense,
    unlock,
  };
}