'use client';
import Link from 'next/link';
import { useSchoolSettings } from './lib/store';

export default function LandingPage() {
  const [settings] = useSchoolSettings();
  const schoolName = settings.schoolName || 'BLIND SCHOOL';
  // Si un logo est configuré dans les paramètres, on l'utilise. Sinon, on prend ton icône par défaut.
  const logo = settings.schoolLogo || '/icon-512.png';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      
      {/* ================= NAVBAR ================= */}
      <nav className="fixed w-full z-50 top-0 border-b border-white/10 bg-slate-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 relative overflow-hidden rounded-xl border border-blue-500/30 bg-slate-900 flex items-center justify-center">
                <img src={logo} alt="Logo" className="object-cover h-full w-full" />
              </div>
              <span className="font-bold text-xl tracking-tight text-white uppercase">{schoolName}</span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition hidden sm:block">
                Se connecter
              </Link>
              <Link href="/login" className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition">
                S&apos;inscrire
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ================= HERO SECTION ================= */}
      <main className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="text-center max-w-3xl mx-auto">
          
          {/* Logo Central */}
          <div className="mx-auto mb-8 relative h-36 w-36 rounded-3xl overflow-hidden border-2 border-blue-500/20 shadow-[0_0_60px_rgba(37,99,235,0.25)] bg-slate-900 flex items-center justify-center">
            <img src={logo} alt="Logo École" className="object-cover h-full w-full" />
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight mb-6">
            Gérez votre école <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-300">intelligemment.</span>
          </h1>
          
          <p className="text-lg text-slate-400 mb-10 leading-relaxed">
            La plateforme tout-en-un pour gérer les élèves, suivre les paiements en temps réel, 
            gérer le personnel et générer des bulletins. Accédez à vos données à distance, où que vous soyez.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="rounded-xl bg-blue-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 transition flex items-center justify-center gap-2">
              🚀 Accéder à mon espace
            </Link>
            <Link href="/a-propos" className="rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-base font-semibold text-white hover:bg-white/10 transition flex items-center justify-center">
              📖 En savoir plus
            </Link>
          </div>

        </div>

        {/* ================= FEATURES (CARTES) ================= */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 hover:bg-slate-900 transition hover:border-blue-500/30">
            <div className="h-12 w-12 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-4 text-2xl">
              💳
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Suivi des Paiements</h3>
            <p className="text-sm text-slate-400">Sachez instantanément qui a payé, qui n&apos;a pas payé et combien il reste à percevoir.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 hover:bg-slate-900 transition hover:border-cyan-500/30">
            <div className="h-12 w-12 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-4 text-2xl">
              🌍
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Accès à Distance</h3>
            <p className="text-sm text-slate-400">Connectez-vous depuis n&apos;importe quel appareil et voyez les données se mettre à jour en temps réel.</p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-900/50 p-6 hover:bg-slate-900 transition hover:border-indigo-500/30">
            <div className="h-12 w-12 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-4 text-2xl">
              🔐
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Gestion des Utilisateurs</h3>
            <p className="text-sm text-slate-400">Créez des comptes pour vos secrétaires, comptables et enseignants avec des droits précis.</p>
          </div>

        </div>
      </main>

      {/* ================= FOOTER ================= */}
      <footer className="border-t border-white/10 py-8 text-center text-sm text-slate-500">
        <p>© {new Date().getFullYear()} {schoolName} — Tous droits réservés.</p>
      </footer>
    </div>
  );
}