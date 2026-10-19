'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useSchoolSettings, useActiveYear } from '../lib/store';
import { useAuth, type Permission } from '../lib/auth';
import { useLicense, computeStatus } from '../lib/license';
import GlobalSearch from './GlobalSearch';

const NAV: { href: string; label: string; icon: string; perm: Permission }[] = [
  { href: '/', label: 'Tableau de bord', icon: '📊', perm: 'dashboard.view' },
  { href: '/eleves', label: 'Élèves & Inscriptions', icon: '👥', perm: 'eleves.view' },
  { href: '/paiements', label: 'Paiements & Minerval', icon: '💳', perm: 'paiements.view' },
  { href: '/rapports', label: 'Rapports financiers', icon: '💰', perm: 'rapports.view' },
  { href: '/personnel', label: 'Personnel & Enseignants', icon: '👨‍🏫', perm: 'personnel.view' },
  { href: '/bulletins', label: 'Bulletins & Notes', icon: '📄', perm: 'bulletins.view' },
  { href: '/vie-scolaire', label: 'Vie scolaire', icon: '📅', perm: 'vie.view' },
  { href: '/parametres', label: 'Configuration', icon: '⚙️', perm: 'parametres.view' },
  { href: '/utilisateurs', label: 'Utilisateurs & Rôles', icon: '🔐', perm: 'utilisateurs.view' },
  { href: '/abonnement', label: 'Abonnement & Licence', icon: '🎫', perm: 'dashboard.view' },
  { href: '/a-propos', label: 'Guide & À propos', icon: '📖', perm: 'dashboard.view' },
];

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const router = useRouter();
  const [settings] = useSchoolSettings();
  const activeYear = useActiveYear();
  const { session, can, logout } = useAuth();
  const { license } = useLicense();
  const schoolName = settings.schoolName || 'BLIND SCHOOL';
  const logo = settings.schoolLogo;

  const [anneeScolaire, setAnneeScolaire] = useState('');
  useEffect(() => {
    const y = new Date().getFullYear();
    setAnneeScolaire(`${y} – ${y + 1}`);
  }, []);

  const [licenseInfo, setLicenseInfo] = useState<{
    daysLeft: number;
    isExpired: boolean;
    isPaid: boolean;
    expiresAt: string;
  } | null>(null);

  useEffect(() => {
    if (!license) return;
    const s = computeStatus(license);
    setLicenseInfo({
      daysLeft: s.daysLeft,
      isExpired: s.isExpired,
      isPaid: s.isPaid,
      expiresAt: s.expiresAt,
    });
  }, [license]);

  useEffect(() => { setOpen(false); }, [path]);
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = () => {
    if (!confirm('Se déconnecter ?')) return;
    logout();
    router.replace('/login');
  };

  const visibleNav = NAV.filter((item) => can(item.perm));

  if (path === '/login' || path === '/licence' || path === '/super-admin') return null;

  return (
    <>
      {/* Barre supérieure mobile */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/95 px-3 backdrop-blur lg:hidden">
        <button
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {logo ? (
          <img src={logo} alt="" className="h-8 w-8 shrink-0 rounded-lg object-cover" />
        ) : (
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 text-[11px] font-bold text-white">
            {schoolName.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold">{schoolName}</p>
        </div>

        {/* 🆕 Bouton Recherche sur mobile */}
        <div className="shrink-0">
          <GlobalSearch />
        </div>

        {/* Badge mini licence */}
        {licenseInfo && (
          <Link
            href="/abonnement"
            className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${
              licenseInfo.isExpired
                ? 'bg-red-100 text-red-700'
                : licenseInfo.daysLeft <= 7
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {licenseInfo.isExpired ? '🔒' : `${licenseInfo.daysLeft}j`}
          </Link>
        )}
      </header>

      {/* Overlay sombre */}
      {open && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 lg:hidden" onClick={() => setOpen(false)} />
      )}

      {/* Tiroir */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 lg:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-5 py-4">
          {logo ? <img src={logo} alt="" className="h-10 w-10 rounded-xl object-cover shadow-md" /> : <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-sm font-bold text-white shadow-md">{schoolName.slice(0, 2).toUpperCase()}</div>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{schoolName}</p>
            <p className="text-[11px] text-slate-500">Gestion scolaire</p>
          </div>
          <button onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
          </button>
        </div>

        {activeYear && (
          <div className="border-b border-slate-200 bg-emerald-50 px-4 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-emerald-700">Année active</p>
            <p className="text-sm font-bold text-emerald-900">{activeYear.label}</p>
          </div>
        )}

        {session && (
          <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Connecté(e) en tant que</p>
            <p className="truncate text-sm font-semibold">{session.fullName}</p>
            <p className="mt-0.5 inline-block rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-medium text-indigo-800">{session.role}</p>
          </div>
        )}

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {visibleNav.map((item) => {
            const active = path === item.href;
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${active ? 'bg-indigo-50 font-semibold text-indigo-700' : 'text-slate-700 hover:bg-slate-50'}`}>
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {licenseInfo && (
          <div className="border-t border-slate-200 p-3">
            <Link href="/abonnement" className={`block rounded-xl border-2 px-3 py-3 transition ${licenseInfo.isExpired ? 'border-red-300 bg-red-50' : licenseInfo.daysLeft <= 7 ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50'}`}>
              <p className={`text-[10px] font-semibold uppercase tracking-wider ${licenseInfo.isExpired ? 'text-red-700' : licenseInfo.daysLeft <= 7 ? 'text-amber-700' : 'text-emerald-700'}`}>
                {licenseInfo.isExpired ? '🔒 Licence expirée' : licenseInfo.isPaid ? '✅ Licence' : '⏱️ Essai gratuit'}
              </p>
              <p className={`mt-0.5 text-sm font-bold ${licenseInfo.isExpired ? 'text-red-900' : licenseInfo.daysLeft <= 7 ? 'text-amber-900' : 'text-emerald-900'}`}>
                {licenseInfo.isExpired ? 'Cliquez pour réactiver' : `${licenseInfo.daysLeft} j restants`}
              </p>
            </Link>
          </div>
        )}

        <div className="space-y-2 border-t border-slate-200 p-4">
          <p className="text-xs text-slate-500">Année {anneeScolaire || '...'}</p>
          <button onClick={handleLogout} className="w-full rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100">🚪 Se déconnecter</button>
        </div>
      </aside>
    </>
  );
}