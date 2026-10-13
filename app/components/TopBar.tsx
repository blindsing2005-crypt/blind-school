'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../lib/auth';
import GlobalSearch from './GlobalSearch';

export default function TopBar() {
  const path = usePathname();
  const { session } = useAuth();
  const [initiales, setInitiales] = useState('');

  useEffect(() => {
    if (!session?.fullName) return;
    const parts = session.fullName.trim().split(/\s+/);
    const ini = (parts[0]?.[0] || '') + (parts[1]?.[0] || '');
    setInitiales(ini.toUpperCase());
  }, [session]);

  // Ne pas afficher sur la page de connexion
  if (path === '/login') return null;
  // Sur mobile, la barre est déjà prise par le burger → on cache
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-30 hidden justify-end p-4 lg:flex lg:pl-64">
      <div className="pointer-events-auto flex items-center gap-3">
        <GlobalSearch />
        {session && (
          <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-sm">
            <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-[11px] font-bold text-white">
              {initiales || '?'}
            </div>
            <div className="hidden xl:block">
              <p className="text-xs font-semibold leading-tight">{session.fullName}</p>
              <p className="text-[10px] text-slate-500 leading-tight">{session.role}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}