'use client';
import Link from 'next/link';
import { useSchoolSettings } from './lib/store';

export default function LandingPage() {
  const [settings] = useSchoolSettings();
  const schoolName = settings.schoolName || 'BLIND SCHOOL';
  const logo = settings.schoolLogo;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
        
        {/* En-tête */}
        <div className="bg-indigo-600 p-10 text-center text-white">
          {logo ? (
            <img src={logo} alt="Logo" className="h-24 w-24 mx-auto rounded-2xl object-cover shadow-lg mb-4" />
          ) : (
            <div className="mx-auto mb-4 grid h-24 w-24 place-items-center rounded-2xl bg-white/20 text-3xl font-bold shadow-lg">
              {schoolName.slice(0, 2).toUpperCase()}
            </div>
          )}
          <h1 className="text-3xl font-bold tracking-tight mb-2">{schoolName}</h1>
          <p className="text-indigo-200">La plateforme de gestion scolaire tout-en-un.</p>
        </div>

        {/* Contenu */}
        <div className="p-10 text-center">
          <h2 className="text-xl font-semibold text-slate-800 mb-4">Bienvenue sur votre espace sécurisé</h2>
          <p className="text-slate-600 mb-8">
            Gérez vos élèves, vos paiements, vos bulletins et votre personnel en toute simplicité depuis un seul endroit.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              href="/login" 
              className="rounded-xl bg-indigo-600 px-8 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
            >
              🔐 Se connecter
            </Link>
            <Link 
              href="/a-propos" 
              className="rounded-xl border border-slate-300 bg-white px-8 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              📖 En savoir plus
            </Link>
          </div>
        </div>
        
        {/* Pied de page */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 text-center text-xs text-slate-400">
          © {new Date().getFullYear()} {schoolName} — Tous droits réservés.
        </div>
      </div>
    </div>
  );
}