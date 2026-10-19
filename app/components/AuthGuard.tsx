'use client';
import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  generateRecoveryCode,
  hashPassword,
  ROLE_PERMISSIONS,
  useRecoveryCode,
  useSession,
  useUsers,
  type UserAccount,
} from '../lib/auth';
import { useLicense } from '../lib/license';

const PUBLIC_ROUTES = ['/login', '/licence'];
const USERS_KEY = 'blind-school-users';
const RECOVERY_KEY = 'blind-school-recovery-code';

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [session] = useSession();
  const [, setUsers] = useUsers();
  const [, setRecoveryCode] = useRecoveryCode();
  const { status } = useLicense();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let storedUsers: UserAccount[] = [];
      try {
        const raw = window.localStorage.getItem(USERS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) storedUsers = parsed;
        }
      } catch { /* ignore */ }

      let storedCode: string | null = null;
      try {
        const raw = window.localStorage.getItem(RECOVERY_KEY);
        if (raw) storedCode = JSON.parse(raw);
      } catch { /* ignore */ }

      if (storedUsers.length > 0) {
        const needsMigration = storedUsers.some(
          (u) =>
            u.email === undefined ||
            u.customPermissions === undefined ||
            u.resetCode === undefined ||
            u.assignedClasses === undefined,
        );
        if (needsMigration) {
          storedUsers = storedUsers.map((u) => ({
            ...u,
            email: u.email ?? '',
            customPermissions: u.customPermissions ?? null,
            resetCode: u.resetCode ?? null,
            resetCodeExpiry: u.resetCodeExpiry ?? null,
            assignedClasses: u.assignedClasses ?? [],
          }));
          window.localStorage.setItem(USERS_KEY, JSON.stringify(storedUsers));
          if (!cancelled) setUsers(storedUsers);
        }
      }

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
          assignedClasses: [],
        };
        window.localStorage.setItem(USERS_KEY, JSON.stringify([admin]));
        if (!cancelled) setUsers([admin]);
      }

      if (!storedCode) {
        const code = generateRecoveryCode();
        window.localStorage.setItem(RECOVERY_KEY, JSON.stringify(code));
        if (!cancelled) setRecoveryCode(code);
      }

      if (!cancelled) setReady(true);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready || !status) return;

    const isPublic = PUBLIC_ROUTES.includes(path);

    if (status.isExpired && path !== '/licence') {
      router.replace('/licence');
      return;
    }

    if (!status.isExpired && path === '/licence') {
      router.replace('/');
      return;
    }

    if (!status.isExpired) {
      if (!session && !isPublic) {
        router.replace('/login');
      } else if (session && path === '/login') {
        router.replace('/');
      } else if (session && path === '/') {
        // 🆕 Redirection si pas accès au Dashboard
        const perms = ROLE_PERMISSIONS[session.role];
        if (!perms.includes('dashboard.view')) {
          if (perms.includes('eleves.view')) router.replace('/eleves');
          else if (perms.includes('paiements.view')) router.replace('/paiements');
          else if (perms.includes('bulletins.view')) router.replace('/bulletins');
          else if (perms.includes('personnel.view')) router.replace('/personnel');
          else if (perms.includes('vie.view')) router.replace('/vie-scolaire');
          else if (perms.includes('parametres.view')) router.replace('/parametres');
        }
      }
    }
  }, [ready, status, session, path, router]);

  if (!ready || !status) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <div className="text-center">
          <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="text-sm text-slate-500">Chargement…</p>
        </div>
      </div>
    );
  }

  if (status.isExpired && path !== '/licence') {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <p className="text-sm text-slate-500">Licence expirée — redirection…</p>
      </div>
    );
  }

  if (!status.isExpired && !session && !PUBLIC_ROUTES.includes(path)) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <p className="text-sm text-slate-500">Redirection…</p>
      </div>
    );
  }

  return <>{children}</>;
}