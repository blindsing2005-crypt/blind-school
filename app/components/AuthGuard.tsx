'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  generateRecoveryCode,
  hashPassword,
  useRecoveryCode,
  useSession,
  useUsers,
  type UserAccount,
} from '../lib/auth';

const PUBLIC_ROUTES = ['/login'];

const USERS_KEY = 'blind-school-users';
const RECOVERY_KEY = 'blind-school-recovery-code';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [session] = useSession();
  const [, setUsers] = useUsers();
  const [, setRecoveryCode] = useRecoveryCode();
  const [ready, setReady] = useState(false);

  /* ============================================================
     INITIALISATION (une seule fois)
     On lit DIRECTEMENT dans localStorage — plus fiable que l'état React
     qui peut être vide au premier rendu.
     ============================================================ */
  useEffect(() => {
    let cancelled = false;

    (async () => {
      // 1) Lire la liste des utilisateurs DANS localStorage
      let storedUsers: UserAccount[] = [];
      try {
        const raw = window.localStorage.getItem(USERS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) storedUsers = parsed;
        }
      } catch { /* ignore */ }

      // 2) Lire le code de secours
      let storedCode: string | null = null;
      try {
        const raw = window.localStorage.getItem(RECOVERY_KEY);
        if (raw) storedCode = JSON.parse(raw);
      } catch { /* ignore */ }

      // 3) Migration douce : ajouter les champs manquants aux anciens comptes
      if (storedUsers.length > 0) {
        const needsMigration = storedUsers.some(
          (u) =>
            u.email === undefined ||
            u.customPermissions === undefined ||
            u.resetCode === undefined,
        );
        if (needsMigration) {
          storedUsers = storedUsers.map((u) => ({
            ...u,
            email: u.email ?? '',
            customPermissions: u.customPermissions ?? null,
            resetCode: u.resetCode ?? null,
            resetCodeExpiry: u.resetCodeExpiry ?? null,
          }));
          window.localStorage.setItem(USERS_KEY, JSON.stringify(storedUsers));
          if (!cancelled) setUsers(storedUsers);
        }
      }

      // 4) Créer l'admin par défaut UNIQUEMENT si la liste est vide
      if (storedUsers.length === 0) {
        const hash = await hashPassword('admin123');
        const admin: UserAccount = {
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
        };
        window.localStorage.setItem(USERS_KEY, JSON.stringify([admin]));
        if (!cancelled) setUsers([admin]);
      }

      // 5) Créer le code de secours s'il n'existe pas
      if (!storedCode) {
        const code = generateRecoveryCode();
        window.localStorage.setItem(RECOVERY_KEY, JSON.stringify(code));
        if (!cancelled) setRecoveryCode(code);
      }

      // 6) On est prêts
      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ============================================================
     REDIRECTIONS
     ============================================================ */
  useEffect(() => {
    if (!ready) return;
    const isPublic = PUBLIC_ROUTES.includes(path);
    if (!session && !isPublic) {
      router.replace('/login');
    } else if (session && path === '/login') {
      router.replace('/');
    }
  }, [ready, session, path, router]);

  /* ============================================================
     AFFICHAGE
     ============================================================ */
  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="text-sm text-slate-500">Chargement…</p>
        </div>
      </div>
    );
  }

  if (!session && !PUBLIC_ROUTES.includes(path)) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <p className="text-sm text-slate-500">Redirection…</p>
      </div>
    );
  }

  return <>{children}</>;
}