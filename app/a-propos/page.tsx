'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useSchoolSettings, useActiveYear } from '../lib/store';

/* ============================================================
   BLIND SCHOOL — Guide d'utilisation & À propos
   ============================================================ */

interface GuideStep {
  title: string;
  description: string;
  tips?: string[];
}

interface GuideSection {
  id: string;
  icon: string;
  title: string;
  intro: string;
  href: string;
  steps: GuideStep[];
}

const GUIDE: GuideSection[] = [
  {
    id: 'config',
    icon: '⚙️',
    title: '1. Configuration de l\'école',
    intro: 'La base de tout : définir l\'année, le nom, les classes et les options de l\'école.',
    href: '/parametres',
    steps: [
      {
        title: 'Créer l\'année scolaire',
        description: 'Onglet 📅 Année → remplir le libellé, les dates et créer. Elle devient automatiquement ACTIVE.',
        tips: ['Une seule année peut être active à la fois.', 'Chaque année, créez-en une nouvelle.']
      },
      {
        title: 'Définir les classes et options',
        description: 'Onglet 🎓 Classes & Options → Ajoutez ou supprimez des classes pour la Maternelle, le Primaire et le Secondaire. Ajoutez les options pour le secondaire (Mécanique, Scientifique...).',
        tips: ['Les classes que vous ajoutez ici apparaîtront partout dans l\'application.']
      },
      {
        title: 'Définir le Minerval',
        description: 'Onglet 🏫 École & Minerval → Saisissez les montants de base. Pour le secondaire, remplissez le tableau du bas pour donner un prix différent selon l\'option choisie.',
      },
    ],
  },
  {
    id: 'eleves',
    icon: '👥',
    title: '2. Élèves & Inscriptions',
    intro: 'Inscrivez les élèves et gérez leurs dossiers.',
    href: '/eleves',
    steps: [
      {
        title: 'Nouvelle inscription',
        description: 'Onglet ➕ Nouvelle inscription → Remplissez les infos. Le bouton est bloqué s\'il n\'y a pas d\'année active.',
        tips: ['Les champs École de provenance et Profession du responsable sont obligatoires pour un bon suivi.']
      },
      {
        title: 'Réinscription',
        description: 'Onglet 🔄 Réinscription → Le système détecte les anciens élèves et propose automatiquement la classe suivante.',
      },
    ],
  },
  {
    id: 'paiements',
    icon: '💳',
    title: '3. Paiements & Minerval',
    intro: 'Suivi financier et génération de reçus.',
    href: '/paiements',
    steps: [
      {
        title: 'Enregistrer un paiement',
        description: 'Onglet 💰 Suivi → Trouver l\'élève → cliquez sur « + Paiement ».',
        tips: ['Le montant à payer s\'adapte automatiquement si l\'élève est au Secondaire avec une option spécifique.']
      },
      {
        title: 'Imprimer',
        description: 'Filtrez par classe ou statut, puis cliquez sur 🖨️ Imprimer pour obtenir un PDF.'
      }
    ],
  },
  {
    id: 'personnel',
    icon: '👨‍🏫',
    title: '4. Personnel & Enseignants',
    intro: 'Gérez votre équipe et les remplacements.',
    href: '/personnel',
    steps: [
      {
        title: 'Signaler un départ',
        description: 'Dans la liste, cliquez sur « 🔄 Départ ». Remplissez la fiche du remplaçant, il sera automatiquement ajouté.',
      },
    ],
  },
  {
    id: 'bulletins',
    icon: '📄',
    title: '5. Bulletins & Notes',
    intro: 'Notes par période et impression des bulletins officiels.',
    href: '/bulletins',
    steps: [
      {
        title: 'Configurer les branches',
        description: 'Onglet 🧩 Modèles → Choisir la classe → Créer le modèle par défaut.',
      },
      {
        title: 'Espace enseignant (Restreint)',
        description: 'Si un enseignant a des classes assignées par l\'Administrateur, il ne verra QUE ces classes ici.',
        tips: ['Pratique pour que chaque prof ne s\'occupe que de ses élèves.']
      },
    ],
  },
  {
    id: 'utilisateurs',
    icon: '🔐',
    title: '6. Utilisateurs & Rôles',
    intro: 'Sécurisez l\'accès et attribuez les classes.',
    href: '/utilisateurs',
    steps: [
      {
        title: 'Assigner des classes',
        description: 'Quand vous créez un Enseignant, cochez les classes qu\'il gère. Il ne verra que celles-ci.',
      },
      {
        title: 'Redirection intelligente',
        description: 'Si vous créez un compte Secrétaire (sans accès au Dashboard), il sera directement redirigé vers Élèves à la connexion.',
      },
    ],
  },
];

export default function AProposPage() {
  const [settings] = useSchoolSettings();
  const activeYear = useActiveYear();
  const [openSections, setOpenSections] = useState<Set<string>>(new Set(['config']));

  const toggleSection = (id: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setOpenSections(new Set(GUIDE.map((g) => g.id)));
  const collapseAll = () => setOpenSections(new Set());

  const schoolName = settings.schoolName || 'BLIND SCHOOL';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Guide d&apos;utilisation</h1>
        <p className="text-sm text-slate-500">
          Apprenez à utiliser {schoolName} pas à pas
        </p>
      </header>

      <section className="mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-2xl text-white shadow-lg">📖</div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-indigo-900">Bienvenue sur {schoolName} !</h2>
            <p className="text-sm text-indigo-800">
              Ce guide vous explique comment gérer l&apos;application au quotidien.
              {activeYear && <> Année scolaire en cours : <b>{activeYear.label}</b>.</>}
            </p>
          </div>
        </div>
      </section>

      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <button onClick={expandAll} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">⬇️ Tout développer</button>
        <button onClick={collapseAll} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">⬆️ Tout replier</button>
      </div>

      <div className="space-y-3">
        {GUIDE.map((section) => {
          const isOpen = openSections.has(section.id);
          return (
            <section key={section.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <button onClick={() => toggleSection(section.id)} className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xl">{section.icon}</span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-800">{section.title}</h3>
                  <p className="text-xs text-slate-500 truncate">{section.intro}</p>
                </div>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`}>▼</span>
              </button>

              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                  <ol className="space-y-4">
                    {section.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">{i + 1}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                          <p className="mt-0.5 text-sm text-slate-600">{step.description}</p>
                          {step.tips && (
                            <ul className="mt-2 space-y-1">
                              {step.tips.map((tip, j) => (
                                <li key={j} className="flex items-start gap-2 text-xs text-amber-800">
                                  <span className="mt-0.5">💡</span><span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-5 flex justify-end">
                    <Link href={section.href} className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">Aller au module →</Link>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <h2 className="mb-3 text-base font-bold text-emerald-900">🎯 Astuces générales</h2>
        <ul className="space-y-2 text-sm text-emerald-900">
          <li className="flex gap-2"><span>⌨️</span><span><b>Ctrl + K</b> : recherche rapide (élève, reçu, personnel...).</span></li>
          <li className="flex gap-2"><span>🖨️</span><span>Tous les tableaux ont un bouton <b>Imprimer</b> (PDF A4).</span></li>
          <li className="flex gap-2"><span>💾</span><span><b>Sauvegardez régulièrement</b> dans Configuration → Sauvegarde.</span></li>
          <li className="flex gap-2"><span>📱</span><span>Fonctionne aussi sur téléphone (menu ☰).</span></li>
        </ul>
      </section>

      {/* ============================================================
          FOOTER DISCRET — À propos
          Volontairement petit et discret
          ============================================================ */}
      <footer className="mt-16 border-t border-slate-100 pt-6 pb-4">
        <div className="flex flex-wrap items-start justify-between gap-4 text-[11px] leading-relaxed text-slate-400">
          <div className="min-w-0">
            <p className="font-semibold tracking-wider text-slate-500">GROUPE BLIND</p>
            <p className="mt-1">
              <span className="text-slate-400">Fondateur &amp; Développeur Lead :</span>{' '}
              <span className="text-slate-500">AMISI FATAKI OLIVIER</span>
              <span className="text-slate-400"> (Blessing)</span>
            </p>
            <p className="mt-1 max-w-xl">
              Expertise en réseaux, cybersécurité et développement d&apos;applications web
              (Next.js, Supabase, interfaces UI/UX).
            </p>
          </div>
          <div className="text-right">
            <p>🇨🇩 République Démocratique du Congo</p>
            <p className="mt-1 font-mono text-[10px]">blindsing2005@gmail.com</p>
            <p className="mt-2 text-[10px] text-slate-300">© {new Date().getFullYear()} — Tous droits réservés</p>
          </div>
        </div>
      </footer>
    </div>
  );
}