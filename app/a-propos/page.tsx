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
    intro: 'La première étape avant toute chose : définir le nom, le logo et l\'année scolaire en cours.',
    href: '/parametres',
    steps: [
      {
        title: 'Créer l\'année scolaire',
        description: 'Onglet 📅 Année scolaire → remplir le libellé (ex : 2025 - 2026), les dates de début et de fin, puis cliquer sur « Créer l\'année ». Elle devient automatiquement ACTIVE.',
        tips: [
          'Une seule année peut être active à la fois.',
          'Chaque année, créez-en une nouvelle sans supprimer l\'ancienne.',
        ],
      },
      {
        title: 'Personnaliser l\'école',
        description: 'Onglet 🏫 École & Minerval → cliquer sur 📷 Choisir un logo (max 1 Mo), saisir le nom officiel de l\'école.',
        tips: ['Ce nom et ce logo apparaissent partout : menu, reçus, bulletins.'],
      },
      {
        title: 'Définir les tranches de paiement',
        description: 'Toujours dans 🏫 École & Minerval → remplir les 7 tranches avec les montants par niveau (Maternelle, Primaire, Secondaire) et les dates d\'ouverture/fermeture.',
        tips: [
          'La colonne Statut montre quelle tranche est ACTIVE aujourd\'hui.',
          'La tranche active active automatiquement le bouton « + Payer » dans Paiements.',
        ],
      },
    ],
  },
  {
    id: 'eleves',
    icon: '👥',
    title: '2. Élèves & Inscriptions',
    intro: 'Inscrivez de nouveaux élèves ou réinscrivez ceux de l\'année précédente.',
    href: '/eleves',
    steps: [
      {
        title: 'Nouvelle inscription',
        description: 'Onglet ➕ Nouvelle inscription → remplir identité, parent/tuteur, affectation (Niveau → Classe → Option si applicable). Le matricule est généré automatiquement.',
      },
      {
        title: 'Réinscription en masse',
        description: 'Onglet 🔄 Réinscription → la liste des élèves des années précédentes s\'affiche. Cliquez sur 🔄 Réinscrire : le système propose automatiquement la classe suivante (ou le redoublement si l\'élève était marqué Redoublant).',
        tips: [
          'Un élève marqué « Redoublant » restera dans la même classe.',
          'Un élève en fin de cycle sera proposé comme Diplômé.',
        ],
      },
      {
        title: 'Changer le statut d\'un élève',
        description: 'Cliquez sur le badge de statut dans la liste (Actif ▾) → choisir Actif / Redoublant / Abandonné / Expulsé / Diplômé.',
        tips: ['Ne supprimez jamais un élève qui abandonne : marquez-le « Abandonné » pour garder son historique.'],
      },
    ],
  },
  {
    id: 'paiements',
    icon: '💳',
    title: '3. Paiements & Minerval',
    intro: 'Suivez ce que chaque élève a payé, ce qu\'il reste, et générez des reçus.',
    href: '/paiements',
    steps: [
      {
        title: 'Enregistrer un paiement',
        description: 'Onglet 💰 Suivi → trouver l\'élève → cliquer sur « + Paiement » → saisir le montant (boutons Moitié / Tout disponibles) → valider. Le reçu s\'affiche immédiatement.',
      },
      {
        title: 'Payer depuis la recherche (Ctrl+K)',
        description: 'Appuyez sur Ctrl+K, tapez le nom de l\'élève, cliquez sur son nom → un mini-panneau s\'ouvre avec ses coordonnées, son statut financier et un bouton « + Payer » sur chaque tranche.',
        tips: ['C\'est la méthode la plus rapide pour encaisser au guichet.'],
      },
      {
        title: 'Imprimer le suivi',
        description: 'Filtrez par classe ou par statut → bouton 🖨️ Imprimer le suivi → PDF A4 prêt à distribuer aux enseignants pour relancer les parents.',
      },
    ],
  },
  {
    id: 'rapports',
    icon: '💰',
    title: '4. Rapports financiers & Dépenses',
    intro: 'Vue complète des encaissements et des dépenses — combien il reste en caisse.',
    href: '/rapports',
    steps: [
      {
        title: 'Voir le bilan global',
        description: 'En haut : 3 cartes (Encaissé, Dépenses, Solde net). Choisir la période (aujourd\'hui, semaine, mois, année, ou personnalisée).',
      },
      {
        title: 'Enregistrer une dépense',
        description: 'Onglet 💸 Dépenses → catégorie (Salaire, Fournitures, Imprévu…) → bénéficiaire → montant → date → valider.',
        tips: [
          'Utilisez « Salaire » pour payer les agents.',
          'Utilisez « Imprévu » pour les urgences (réparation, achat non prévu).',
        ],
      },
      {
        title: 'Consulter le bilan net',
        description: 'Onglet 📈 Bilan → voit le Solde net (Encaissé − Dépenses) sur la période choisie et l\'historique global.',
      },
    ],
  },
  {
    id: 'personnel',
    icon: '👨‍🏫',
    title: '5. Personnel & Enseignants',
    intro: 'Gérez les enseignants, la direction et tous les agents.',
    href: '/personnel',
    steps: [
      {
        title: 'Ajouter un membre',
        description: 'Onglet ➕ Nouveau membre → photo, identité, coordonnées, rôle, contrat, diplôme, classes et cours assignés.',
      },
      {
        title: 'Signaler un départ & remplaçant',
        description: 'Dans la liste, cliquer sur « 🔄 Départ » sur la ligne d\'un membre → choisir le motif (Démission, Retraite…) → remplir la fiche du remplaçant (les classes et cours sont copiés automatiquement).',
        tips: [
          'Le partant devient « Parti » (grisé), son historique est conservé.',
          'Le remplaçant est automatiquement ajouté à la liste.',
        ],
      },
    ],
  },
  {
    id: 'bulletins',
    icon: '📄',
    title: '6. Bulletins & Notes',
    intro: 'Notes par période, bulletins officiels RDC imprimables.',
    href: '/bulletins',
    steps: [
      {
        title: 'Configurer les branches par classe',
        description: 'Onglet 🧩 Modèles → choisir la classe → créer ou modifier le modèle par défaut (branches, coefficients).',
      },
      {
        title: 'Saisir les notes',
        description: 'Onglet ✍️ Saisie des notes → choisir classe + période → saisir chaque note dans le tableau.',
        tips: ['Les notes se sauvegardent automatiquement dès que vous tapez.'],
      },
      {
        title: 'Imprimer un bulletin',
        description: 'Onglet 📄 Bulletins → choisir la classe → cliquer sur « Voir / Imprimer » sur l\'élève. Le bulletin s\'affiche en A4 Portrait, prêt à imprimer.',
      },
      {
        title: 'Espace enseignant',
        description: 'Onglet 👨‍🏫 Espace enseignant → chaque prof choisit sa classe, sa branche et la période → il ne saisit que ses propres notes.',
      },
    ],
  },
  {
    id: 'vie',
    icon: '📅',
    title: '7. Vie scolaire',
    intro: 'Calendrier des événements et parcours de l\'école.',
    href: '/vie-scolaire',
    steps: [
      {
        title: 'Créer un événement',
        description: 'Onglet 📝 Événements → titre, type (Examen, Congé, Réunion, Activité), dates, description. Il apparaît immédiatement dans le calendrier.',
      },
      {
        title: 'Voir le calendrier',
        description: 'Onglet 📅 Calendrier → navigation mois par mois → clic sur un jour pour voir ses événements.',
      },
      {
        title: 'Parcours de l\'école',
        description: 'Onglet 🏫 Parcours → rédiger la présentation générale + ajouter les grandes étapes (année, titre, description).',
      },
    ],
  },
  {
    id: 'utilisateurs',
    icon: '🔐',
    title: '8. Utilisateurs & Rôles',
    intro: 'Créez des comptes pour vos collègues et contrôlez leurs permissions.',
    href: '/utilisateurs',
    steps: [
      {
        title: 'Créer un compte',
        description: 'Onglet (page) → Nouveau compte → nom d\'utilisateur, nom complet, email, rôle (Administrateur / Comptable / Enseignant / Secrétaire), mot de passe.',
      },
      {
        title: 'Modifier les permissions',
        description: 'Cliquer sur 🔐 Permissions sur une ligne → cocher/décocher chaque module auquel cette personne a accès.',
        tips: ['Utile pour n\'autoriser qu\'un seul module à quelqu\'un (ex : Élèves uniquement).'],
      },
      {
        title: 'Code de secours',
        description: 'En haut de la page Utilisateurs : un code de secours permet de réinitialiser le mot de passe de l\'administrateur en cas d\'oubli.',
        tips: ['Notez ce code quelque part de sûr (papier, gestionnaire de mots de passe).'],
      },
    ],
  },
  {
    id: 'sauvegarde',
    icon: '💾',
    title: '9. Sauvegarde (Important)',
    intro: 'Vos données sont locales au navigateur. Sauvegardez régulièrement !',
    href: '/parametres',
    steps: [
      {
        title: 'Exporter',
        description: 'Configuration → 💾 Sauvegarde → bouton « ⬇️ Exporter tout maintenant » → un fichier .json est téléchargé.',
        tips: [
          'Faites-le au moins une fois par semaine.',
          'Conservez au moins 3 sauvegardes différentes.',
          'Stockez-en une hors de l\'ordinateur (clé USB, Google Drive…).',
        ],
      },
      {
        title: 'Restaurer',
        description: 'Configuration → 💾 Sauvegarde → section 📥 Restaurer → choisir le fichier .json. Deux modes : Remplacer tout (écrase) ou Fusionner (ajoute).',
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
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Guide d&apos;utilisation</h1>
        <p className="text-sm text-slate-500">
          Apprenez à utiliser {schoolName} pas à pas
        </p>
      </header>

      {/* Bandeau de bienvenue */}
      <section className="mb-6 rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-2xl text-white shadow-lg">
            📖
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-bold text-indigo-900">
              Bienvenue sur {schoolName} !
            </h2>
            <p className="text-sm text-indigo-800">
              Ce guide vous explique en 9 étapes comment utiliser l&apos;application au quotidien.
              {activeYear && (
                <>
                  {' '}Année scolaire en cours : <b>{activeYear.label}</b>.
                </>
              )}
            </p>
          </div>
        </div>
      </section>

      {/* Actions rapides */}
      <div className="mb-4 flex flex-wrap justify-end gap-2">
        <button
          onClick={expandAll}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          ⬇️ Tout développer
        </button>
        <button
          onClick={collapseAll}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
        >
          ⬆️ Tout replier
        </button>
      </div>

      {/* Guide accordéon */}
      <div className="space-y-3">
        {GUIDE.map((section) => {
          const isOpen = openSections.has(section.id);
          return (
            <section
              key={section.id}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              {/* Header */}
              <button
                onClick={() => toggleSection(section.id)}
                className="flex w-full items-center gap-3 px-5 py-4 text-left transition hover:bg-slate-50"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-xl">
                  {section.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-800">{section.title}</h3>
                  <p className="text-xs text-slate-500 truncate">{section.intro}</p>
                </div>
                <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg text-slate-400 transition ${isOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              {/* Contenu */}
              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                  <p className="mb-4 text-sm italic text-slate-600">{section.intro}</p>

                  <ol className="space-y-4">
                    {section.steps.map((step, i) => (
                      <li key={i} className="flex gap-3">
                        <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                          <p className="mt-0.5 text-sm text-slate-600">{step.description}</p>
                          {step.tips && step.tips.length > 0 && (
                            <ul className="mt-2 space-y-1">
                              {step.tips.map((tip, j) => (
                                <li key={j} className="flex items-start gap-2 text-xs text-amber-800">
                                  <span className="mt-0.5">💡</span>
                                  <span>{tip}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </li>
                    ))}
                  </ol>

                  <div className="mt-5 flex justify-end">
                    <Link
                      href={section.href}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
                    >
                      Aller au module →
                    </Link>
                  </div>
                </div>
              )}
            </section>
          );
        })}
      </div>

      {/* Astuces générales */}
      <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
        <h2 className="mb-3 text-base font-bold text-emerald-900">🎯 Astuces générales</h2>
        <ul className="space-y-2 text-sm text-emerald-900">
          <li className="flex gap-2"><span>⌨️</span><span><b>Ctrl + K</b> : recherche rapide partout (élève, reçu, personnel, événement).</span></li>
          <li className="flex gap-2"><span>🖨️</span><span>Tous les tableaux ont un bouton <b>Imprimer</b> qui génère un PDF A4 propre.</span></li>
          <li className="flex gap-2"><span>💾</span><span><b>Sauvegardez régulièrement</b> dans Configuration → Sauvegarde (fichier .json).</span></li>
          <li className="flex gap-2"><span>📱</span><span>L&apos;application fonctionne aussi sur téléphone (menu ☰ en haut à gauche).</span></li>
          <li className="flex gap-2"><span>🔐</span><span>Chaque utilisateur ne voit que les modules auxquels il a accès.</span></li>
          <li className="flex gap-2"><span>🆘</span><span>Code de secours disponible dans <b>Utilisateurs &amp; Rôles</b> pour réinitialiser l&apos;admin.</span></li>
        </ul>
      </section>

      {/* Bandeau de contact discret */}
      <section className="mt-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50/50 px-4 py-3 text-[11px] text-slate-500">
        <span>Besoin d&apos;aide supplémentaire ? Contactez votre administrateur.</span>
        <span className="font-mono">v1.0</span>
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
            <p className="mt-2 text-[10px] text-slate-300">
              © {new Date().getFullYear()} — Tous droits réservés
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}