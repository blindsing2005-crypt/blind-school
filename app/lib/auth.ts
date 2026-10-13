'use client';
import { useEffect, useState } from 'react';

/* ============================================================
   BLIND SCHOOL — Authentification, Rôles & Permissions
   ============================================================ */

export const ROLES = ['Administrateur', 'Comptable', 'Enseignant', 'Secrétaire'] as const;
export type Role = (typeof ROLES)[number];

export type Permission =
  | 'dashboard.view'
  | 'eleves.view' | 'eleves.create' | 'eleves.edit' | 'eleves.delete'
  | 'paiements.view' | 'paiements.create' | 'paiements.delete'
  | 'rapports.view'
  | 'personnel.view' | 'personnel.create' | 'personnel.edit' | 'personnel.delete'
  | 'bulletins.view' | 'bulletins.notes' | 'bulletins.config'
  | 'vie.view' | 'vie.edit'
  | 'parametres.view' | 'parametres.edit'
  | 'utilisateurs.view' | 'utilisateurs.manage';

/** Liste lisible des permissions (pour l'UI) */
export const PERMISSION_LABELS: { perm: Permission; label: string; group: string }[] = [
  { perm: 'dashboard.view',      label: 'Voir le tableau de bord',       group: 'Général' },
  { perm: 'eleves.view',         label: 'Voir les élèves',               group: 'Élèves' },
  { perm: 'eleves.create',       label: 'Inscrire un élève',             group: 'Élèves' },
  { perm: 'eleves.edit',         label: 'Modifier un élève',             group: 'Élèves' },
  { perm: 'eleves.delete',       label: 'Supprimer un élève',            group: 'Élèves' },
  { perm: 'paiements.view',      label: 'Voir les paiements',            group: 'Paiements' },
  { perm: 'paiements.create',    label: 'Enregistrer un paiement',       group: 'Paiements' },
  { perm: 'paiements.delete',    label: 'Supprimer un paiement',         group: 'Paiements' },
  { perm: 'rapports.view',       label: 'Voir les rapports financiers',  group: 'Paiements' },
  { perm: 'personnel.view',      label: 'Voir le personnel',             group: 'Personnel' },
  { perm: 'personnel.create',    label: 'Ajouter un membre',             group: 'Personnel' },
  { perm: 'personnel.edit',      label: 'Modifier un membre',            group: 'Personnel' },
  { perm: 'personnel.delete',    label: 'Supprimer un membre',           group: 'Personnel' },
  { perm: 'bulletins.view',      label: 'Voir les bulletins',            group: 'Bulletins' },
  { perm: 'bulletins.notes',     label: 'Saisir des notes',              group: 'Bulletins' },
  { perm: 'bulletins.config',    label: 'Configurer les bulletins',      group: 'Bulletins' },
  { perm: 'vie.view',            label: 'Voir la vie scolaire',          group: 'Vie scolaire' },
  { perm: 'vie.edit',            label: 'Modifier la vie scolaire',      group: 'Vie scolaire' },
  { perm: 'parametres.view',     label: 'Voir les paramètres',           group: 'Paramètres' },
  { perm: 'parametres.edit',     label: 'Modifier les paramètres',       group: 'Paramètres' },
  { perm: 'utilisateurs.view',   label: 'Voir les utilisateurs',         group: 'Utilisateurs' },
  { perm: 'utilisateurs.manage', label: 'Gérer les utilisateurs',        group: 'Utilisateurs' },
];

/** Permissions accordées par défaut selon le rôle */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  Administrateur: PERMISSION_LABELS.map((p) => p.perm),
  Comptable: [
    'dashboard.view',
    'eleves.view',
    'paiements.view', 'paiements.create', 'paiements.delete',
    'rapports.view',
  ],
  Enseignant: [
    'dashboard.view',
    'eleves.view',
    'bulletins.view', 'bulletins.notes',
    'vie.view',
  ],
  Secrétaire: [
    'dashboard.view',
    'eleves.view', 'eleves.create', 'eleves.edit',
    'paiements.view',
    'personnel.view',
    'vie.view', 'vie.edit',
  ],
};

export interface UserAccount {
  id: string;
  username: string;
  fullName: string;
  email: string;
  role: Role;
  passwordHash: string;
  active: boolean;
  createdAt: string;
  lastLoginAt: string;
  customPermissions: Permission[] | null;
  resetCode: string | null;
  resetCodeExpiry: string | null;
}

export interface Session {
  userId: string;
  username: string;
  fullName: string;
  role: Role;
  loginAt: string;
}

const USERS_KEY = 'blind-school-users';
const SESSION_KEY = 'blind-school-session';
const RECOVERY_KEY = 'blind-school-recovery-code';

/* ---------- Hash SHA-256 ---------- */
export async function hashPassword(pwd: string): Promise<string> {
  const enc = new TextEncoder().encode(pwd + '::blind-school');
  const buf = await crypto.subtle.digest('SHA-256', enc);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- Génération code de secours global ---------- */
export function generateRecoveryCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let raw = '';
  for (let i = 0; i < 12; i++) {
    raw += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}`;
}

/* ---------- Génération code de réinitialisation (6 chiffres) ---------- */
export function generateResetCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

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

export const useUsers = () => usePersistentState<UserAccount[]>(USERS_KEY, []);
export const useSession = () =>
  usePersistentState<Session | null>(SESSION_KEY, null);
export const useRecoveryCode = () =>
  usePersistentState<string | null>(RECOVERY_KEY, null);

/* ---------- Initialisation ---------- */
export async function ensureDefaultAdmin(
  users: UserAccount[],
  recoveryCode: string | null,
): Promise<{ users: UserAccount[] | null; recoveryCode: string | null }> {
  let updatedUsers: UserAccount[] | null = null;
  let updatedCode: string | null = null;

  if (users.length === 0) {
    const hash = await hashPassword('admin123');
    updatedUsers = [
      {
        id: crypto.randomUUID(),
        username: 'admin',
        fullName: 'Administrateur',
        email: '',
        role: 'Administrateur',
        passwordHash: hash,
        active: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: '',
        customPermissions: null,
        resetCode: null,
        resetCodeExpiry: null,
      },
    ];
  }

  if (!recoveryCode) updatedCode = generateRecoveryCode();

  return { users: updatedUsers, recoveryCode: updatedCode };
}

/* ---------- Vérification login ---------- */
export async function verifyLogin(
  users: UserAccount[],
  username: string,
  password: string,
): Promise<UserAccount | null> {
  const user = users.find(
    (u) => u.username.toLowerCase() === username.trim().toLowerCase(),
  );
  if (!user || !user.active) return null;
  const hash = await hashPassword(password);
  return hash === user.passwordHash ? user : null;
}

/* ---------- Vérification code de secours global ---------- */
export function checkRecoveryCode(
  stored: string | null,
  entered: string,
): boolean {
  if (!stored) return false;
  const clean = (s: string) => s.replace(/[\s-]/g, '').toUpperCase();
  return clean(stored) === clean(entered);
}

/* ============================================================
   PERMISSIONS EFFECTIVES D'UN UTILISATEUR
   ============================================================ */
export function getUserPermissions(user: UserAccount | null): Permission[] {
  if (!user) return [];
  // L'admin garde toujours TOUTES les permissions (pour éviter l'auto-blocage)
  if (user.role === 'Administrateur' && user.customPermissions === null) {
    return ROLE_PERMISSIONS.Administrateur;
  }
  // Si l'admin a personnalisé ses propres permissions, elles s'appliquent
  if (user.customPermissions !== null) return user.customPermissions;
  return ROLE_PERMISSIONS[user.role];
}

export function hasPermission(session: Session | null, perm: Permission, users: UserAccount[]): boolean {
  if (!session) return false;
  const user = users.find((u) => u.id === session.userId);
  if (!user) return false;
  return getUserPermissions(user).includes(perm);
}

/* ============================================================
   HOOK PRATIQUE (corrigé : ne bloque plus au premier rendu)
   ============================================================ */
export function useAuth() {
  const [session, setSession] = useSession();
  const [users] = useUsers();

  const usersLoaded = users.length > 0;
  const currentUser =
    session && usersLoaded
      ? users.find((u) => u.id === session.userId) || null
      : null;
  const permissions = getUserPermissions(currentUser);

  return {
    session,
    currentUser,
    permissions,
    isAuthenticated: !!session,
    isLoading: !!session && !usersLoaded,
    can: (perm: Permission) => {
      // ⚠️ Si une session existe mais que les users ne sont pas encore chargés,
      // on autorise temporairement (le filtrage réel se fera au prochain rendu).
      if (session && !usersLoaded) return true;
      return permissions.includes(perm);
    },
    login: (s: Session) => setSession(s),
    logout: () => setSession(null),
  };
}

/* ============================================================
   RÉINITIALISATION PAR EMAIL (ou par identifiant)
   ⚠️ Sans backend, le code s'affiche à l'écran au lieu d'être envoyé.
   ============================================================ */

/** Étape 1 : l'utilisateur demande une réinitialisation */
export function requestReset(
  users: UserAccount[],
  identifier: string,
): { user: UserAccount; code: string } | { error: string } {
  const clean = identifier.trim().toLowerCase();
  const user = users.find(
    (u) =>
      u.username.toLowerCase() === clean ||
      (u.email && u.email.toLowerCase() === clean),
  );
  if (!user) return { error: 'Aucun compte ne correspond à cet identifiant ou email.' };
  if (!user.active) return { error: 'Ce compte est désactivé.' };

  const code = generateResetCode();
  const expiry = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 minutes
  return { user, code };
}

/** Étape 2 : l'utilisateur entre le code reçu + son nouveau mot de passe */
export async function verifyResetCode(
  user: UserAccount,
  enteredCode: string,
): Promise<{ ok: boolean; error?: string }> {
  if (!user.resetCode) return { ok: false, error: 'Aucun code de réinitialisation actif.' };
  if (user.resetCode !== enteredCode.trim()) return { ok: false, error: 'Code incorrect.' };
  if (user.resetCodeExpiry && new Date(user.resetCodeExpiry) < new Date()) {
    return { ok: false, error: 'Ce code a expiré. Demandez-en un nouveau.' };
  }
  return { ok: true };
}