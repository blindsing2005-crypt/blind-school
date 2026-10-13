'use client';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  CLASSES,
  NIVEAUX,
  OPTIONS,
  STUDENT_STATUSES,
  STUDENT_STATUS_COLORS,
  classeAvecOption,
  formatMoney,
  getPaymentStatus,
  getStudentTotalPaid,
  nextClass,
  useActiveYear,
  usePayments,
  useSchoolSettings,
  useSchoolYears,
  useStudents,
  useTuition,
  type Niveau,
  type Payment,
  type Student,
  type StudentStatus,
} from '../lib/store';
import PrintListModal from '../components/PrintListModal';

type FormState = {
  nom: string; postnom: string; prenom: string;
  sexe: 'M' | 'F';
  dateNaissance: string; lieuNaissance: string;
  nomParent: string; telephoneParent: string; adresse: string;
  niveau: Niveau | ''; classe: string; option: string; dateInscription: string;
  statut: StudentStatus;
};

const today = () => new Date().toISOString().slice(0, 10);

const emptyForm: FormState = {
  nom: '', postnom: '', prenom: '', sexe: 'M',
  dateNaissance: '', lieuNaissance: '',
  nomParent: '', telephoneParent: '', adresse: '',
  niveau: '', classe: '', option: '', dateInscription: today(),
  statut: 'Actif',
};

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

export default function ElevesPage() {
  const [students, setStudents] = useStudents();
  const [payments] = usePayments();
  const [tuition] = useTuition();
  const [settings] = useSchoolSettings();
  const activeYear = useActiveYear();

  const [tab, setTab] = useState<'inscription' | 'liste' | 'reinscription'>('liste');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [fNiveau, setFNiveau] = useState<Niveau | ''>('');
  const [fClasse, setFClasse] = useState('');
  const [fOption, setFOption] = useState('');
  const [fStatut, setFStatut] = useState<StudentStatus | ''>('');
  const [search, setSearch] = useState('');

  const [statusEdit, setStatusEdit] = useState<Student | null>(null);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [reinscriptionTarget, setReinscriptionTarget] = useState<Student | null>(null);

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

  /* ============================================================
     Filtrage par année scolaire
     ============================================================ */
  const activeYearId = activeYear?.id || '';

  // Élèves de l'année active (ou non assignés si aucune année)
  const activeStudents = useMemo(() => {
    return students.filter((s) => {
      if (!activeYearId) return true;
      return s.anneeScolaireId === activeYearId || s.anneeScolaireId === '';
    });
  }, [students, activeYearId]);

  // Élèves des années passées, non réinscrits dans l'année active
  const pastStudentsToReinscrire = useMemo(() => {
    if (!activeYearId) return [];
    // Récupère les matricules déjà présents dans l'année active
    const matActifs = new Set(activeStudents.map((s) => s.matricule));
    // Élèves des autres années, pas diplômés, pas abandonnés/expulsés
    return students
      .filter((s) => s.anneeScolaireId && s.anneeScolaireId !== activeYearId)
      .filter((s) => !matActifs.has(s.matricule))
      .filter((s) => s.statut === 'Actif' || s.statut === 'Redoublant')
      // Ne garde que la plus récente inscription par matricule
      .sort((a, b) => (b.dateInscription || '').localeCompare(a.dateInscription || ''))
      .filter((s, i, arr) => arr.findIndex((x) => x.matricule === s.matricule) === i);
  }, [students, activeStudents, activeYearId]);

  /* ============================================================
     Formulaire nouvelle inscription
     ============================================================ */
  const classesDisponibles = form.niveau ? CLASSES[form.niveau] : [];
  const besoinOption = form.classe ? classeAvecOption(form.classe) : false;

  const updateForm = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const handleNiveauChange = (niveau: Niveau | '') => updateForm({ niveau, classe: '', option: '' });
  const handleClasseChange = (classe: string) =>
    updateForm({ classe, option: classeAvecOption(classe) ? form.option : '' });

  const genererMatricule = () => {
    const year = new Date().getFullYear();
    return `BS-${year}-${String(students.length + 1).padStart(4, '0')}`;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.prenom || !form.niveau || !form.classe) {
      setMessage({ type: 'error', text: 'Veuillez remplir : Nom, Prénom, Niveau et Classe.' });
      return;
    }
    if (classeAvecOption(form.classe) && !form.option) {
      setMessage({ type: 'error', text: 'Cette classe nécessite une option.' });
      return;
    }
    const nouveau: Student = {
      id: crypto.randomUUID(),
      matricule: genererMatricule(),
      nom: form.nom.trim(), postnom: form.postnom.trim(), prenom: form.prenom.trim(),
      sexe: form.sexe,
      dateNaissance: form.dateNaissance, lieuNaissance: form.lieuNaissance.trim(),
      nomParent: form.nomParent.trim(), telephoneParent: form.telephoneParent.trim(),
      adresse: form.adresse.trim(),
      niveau: form.niveau as Niveau, classe: form.classe, option: form.option,
      dateInscription: form.dateInscription,
      statut: form.statut,
      anneeScolaireId: activeYearId,
    };
    setStudents((s) => [nouveau, ...s]);
    setForm({ ...emptyForm, dateInscription: today() });
    setMessage({ type: 'success', text: `Élève inscrit — Matricule ${nouveau.matricule}` });
    setTab('liste');
  };

  /* ============================================================
     Filtres liste
     ============================================================ */
  const classesFiltre = fNiveau ? CLASSES[fNiveau] : Object.values(CLASSES).flat();
  const optionFiltreDispo = fClasse ? classeAvecOption(fClasse) : false;

  const resetFiltres = () => {
    setFNiveau(''); setFClasse(''); setFOption(''); setFStatut(''); setSearch('');
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return activeStudents.filter((s) => {
      if (fNiveau && s.niveau !== fNiveau) return false;
      if (fClasse && s.classe !== fClasse) return false;
      if (fOption && s.option !== fOption) return false;
      if (fStatut && s.statut !== fStatut) return false;
      if (q) {
        const hay = `${s.nom} ${s.postnom} ${s.prenom} ${s.matricule}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [activeStudents, fNiveau, fClasse, fOption, fStatut, search]);

  const stats = useMemo(() => {
    const byStatut: Record<StudentStatus, number> = {
      Actif: 0, Redoublant: 0, Abandonné: 0, Expulsé: 0, Diplômé: 0,
    };
    activeStudents.forEach((s) => {
      const st = s.statut || 'Actif';
      byStatut[st] = (byStatut[st] || 0) + 1;
    });
    return { total: activeStudents.length, byStatut };
  }, [activeStudents]);

  const supprimer = (id: string) => {
    if (!confirm('Supprimer définitivement cet élève ? (Préférez le statut « Abandonné » pour garder l\'historique)')) return;
    setStudents((s) => s.filter((x) => x.id !== id));
  };

  const changerStatut = (id: string, statut: StudentStatus) => {
    setStudents((list) => list.map((s) => (s.id === id ? { ...s, statut } : s)));
    setStatusEdit(null);
    setMessage({ type: 'success', text: `Statut mis à jour : ${statut}` });
  };

  /* ============================================================
     Impression
     ============================================================ */
  const printColumns = useMemo(() => [
    { key: 'num', label: 'N°', width: '6%', align: 'center' as const },
    { key: 'matricule', label: 'Matricule', width: '14%' },
    { key: 'nom', label: 'Nom complet', width: '34%' },
    { key: 'sexe', label: 'Sexe', width: '8%', align: 'center' as const },
    { key: 'classe', label: 'Classe', width: '18%' },
    { key: 'statut', label: 'Statut', width: '20%' },
  ], []);

  const printRows = useMemo(() => {
    return [...filtered]
      .sort((a, b) => `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`))
      .map((s, i) => ({
        num: i + 1,
        matricule: s.matricule,
        nom: `${s.nom} ${s.postnom} ${s.prenom}`,
        sexe: s.sexe,
        classe: s.classe + (s.option ? ` • ${s.option}` : ''),
        statut: s.statut || 'Actif',
      }));
  }, [filtered]);

  const printSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (activeYear) parts.push(`Année : ${activeYear.label}`);
    if (fNiveau) parts.push(`Niveau : ${fNiveau}`);
    if (fClasse) parts.push(`Classe : ${fClasse}`);
    if (fOption) parts.push(`Option : ${fOption}`);
    if (fStatut) parts.push(`Statut : ${fStatut}`);
    return parts.join(' • ') || 'Tous les élèves';
  }, [activeYear, fNiveau, fClasse, fOption, fStatut]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Élèves &amp; Inscriptions</h1>
        <p className="text-sm text-slate-500">
          {activeYear
            ? `Année scolaire active : ${activeYear.label}`
            : 'Aucune année active — configurez-la dans Configuration'}
        </p>
      </header>

      {/* Alerte si pas d'année active */}
      {!activeYear && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ <b>Aucune année scolaire active.</b> Allez dans <b>Configuration → 📅 Année scolaire</b> pour en créer une avant d&apos;inscrire des élèves.
        </div>
      )}

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total" value={stats.total} accent="indigo" />
        <StatCard label="Actifs" value={stats.byStatut.Actif} accent="emerald" />
        <StatCard label="Redoublants" value={stats.byStatut.Redoublant} accent="amber" />
        <StatCard label="Abandonnés" value={stats.byStatut.Abandonné} accent="slate" />
        <StatCard label="Diplômés" value={stats.byStatut.Diplômé} accent="purple" />
      </section>

      {message && (
        <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        <TabBtn active={tab === 'liste'} onClick={() => setTab('liste')}>
          📋 Liste des élèves
          <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{activeStudents.length}</span>
        </TabBtn>
        <TabBtn active={tab === 'inscription'} onClick={() => setTab('inscription')}>
          ➕ Nouvelle inscription
        </TabBtn>
        <TabBtn active={tab === 'reinscription'} onClick={() => setTab('reinscription')}>
          🔄 Réinscription
          {pastStudentsToReinscrire.length > 0 && (
            <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
              {pastStudentsToReinscrire.length}
            </span>
          )}
        </TabBtn>
      </div>

      {/* ============ TAB LISTE ============ */}
      {tab === 'liste' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-5">
            <Field label="Niveau">
              <select className={inputCls} value={fNiveau} onChange={(e) => { setFNiveau(e.target.value as Niveau | ''); setFClasse(''); setFOption(''); }}>
                <option value="">Tous les niveaux</option>
                {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Classe">
              <select className={inputCls} value={fClasse} onChange={(e) => { setFClasse(e.target.value); if (!classeAvecOption(e.target.value)) setFOption(''); }}>
                <option value="">Toutes les classes</option>
                {classesFiltre.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Option">
              <select className={inputCls} value={fOption} onChange={(e) => setFOption(e.target.value)} disabled={!optionFiltreDispo}>
                <option value="">{optionFiltreDispo ? 'Toutes les options' : '— Non applicable —'}</option>
                {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Statut">
              <select className={inputCls} value={fStatut} onChange={(e) => setFStatut(e.target.value as StudentStatus | '')}>
                <option value="">Tous les statuts</option>
                {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Recherche">
              <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom ou matricule..." />
            </Field>
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">{filtered.length}</span> élève(s)
              {fClasse && <span className="ml-1 text-slate-500">— {fClasse}{fOption ? ` • ${fOption}` : ''}</span>}
              {fStatut && <span className="ml-1 text-slate-500">— {fStatut}</span>}
            </p>
            <div className="flex gap-2">
              {(fNiveau || fClasse || fOption || fStatut || search) && (
                <button onClick={resetFiltres} className="text-xs font-medium text-indigo-600 hover:underline">
                  Réinitialiser les filtres
                </button>
              )}
              <button
                onClick={() => setShowPrint(true)}
                disabled={filtered.length === 0}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300"
              >
                🖨️ Imprimer la liste
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <div className="mb-2 text-4xl">🗂️</div>
              <p className="font-medium text-slate-700">Aucun élève trouvé</p>
            </div>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2 font-semibold">Matricule</th>
                    <th className="px-3 py-2 font-semibold">Nom complet</th>
                    <th className="px-3 py-2 font-semibold">Sexe</th>
                    <th className="px-3 py-2 font-semibold">Niveau</th>
                    <th className="px-3 py-2 font-semibold">Classe</th>
                    <th className="px-3 py-2 font-semibold">Option</th>
                    <th className="px-3 py-2 font-semibold">Statut</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => {
                    const statut = s.statut || 'Actif';
                    return (
                      <tr key={s.id} className={`border-b border-slate-100 hover:bg-slate-50 ${statut === 'Abandonné' || statut === 'Expulsé' ? 'opacity-70' : ''}`}>
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">{s.matricule}</td>
                        <td className="px-3 py-2 font-medium">
                          <button onClick={() => setDetailStudent(s)} className="text-left text-indigo-700 hover:underline">
                            {s.nom} {s.postnom} {s.prenom}
                          </button>
                          <div className="text-xs text-slate-400">{s.telephoneParent || '—'}</div>
                        </td>
                        <td className="px-3 py-2">{s.sexe}</td>
                        <td className="px-3 py-2">
                          <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{s.niveau}</span>
                        </td>
                        <td className="px-3 py-2">{s.classe}</td>
                        <td className="px-3 py-2 text-slate-600">{s.option || '—'}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => setStatusEdit(s)}
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium transition hover:opacity-80 ${STUDENT_STATUS_COLORS[statut]}`}
                            title="Changer le statut"
                          >
                            {statut} ▾
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button onClick={() => setDetailStudent(s)} className="mr-3 text-xs font-medium text-indigo-600 hover:underline">
                            Fiche
                          </button>
                          <button onClick={() => supprimer(s.id)} className="text-xs font-medium text-red-500 hover:text-red-700">
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============ TAB INSCRIPTION ============ */}
      {tab === 'inscription' && (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Identité de l&apos;élève
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Nom" required>
                <input className={inputCls} value={form.nom} onChange={(e) => updateForm({ nom: e.target.value })} placeholder="Ex : KABILA" />
              </Field>
              <Field label="Postnom">
                <input className={inputCls} value={form.postnom} onChange={(e) => updateForm({ postnom: e.target.value })} placeholder="Ex : MUTOMBO" />
              </Field>
              <Field label="Prénom" required>
                <input className={inputCls} value={form.prenom} onChange={(e) => updateForm({ prenom: e.target.value })} placeholder="Ex : Jean" />
              </Field>
              <Field label="Sexe">
                <select className={inputCls} value={form.sexe} onChange={(e) => updateForm({ sexe: e.target.value as 'M' | 'F' })}>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </Field>
              <Field label="Date de naissance">
                <input type="date" className={inputCls} value={form.dateNaissance} onChange={(e) => updateForm({ dateNaissance: e.target.value })} />
              </Field>
              <Field label="Lieu de naissance">
                <input className={inputCls} value={form.lieuNaissance} onChange={(e) => updateForm({ lieuNaissance: e.target.value })} placeholder="Ex : Kinshasa" />
              </Field>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Parent / Tuteur
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Nom complet du parent">
                <input className={inputCls} value={form.nomParent} onChange={(e) => updateForm({ nomParent: e.target.value })} placeholder="Ex : KABILA MUTOMBO" />
              </Field>
              <Field label="Téléphone">
                <input className={inputCls} value={form.telephoneParent} onChange={(e) => updateForm({ telephoneParent: e.target.value })} placeholder="+243 8XX XXX XXX" />
              </Field>
              <Field label="Adresse">
                <input className={inputCls} value={form.adresse} onChange={(e) => updateForm({ adresse: e.target.value })} placeholder="Av. Lumumba, Q. Matonge" />
              </Field>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              Affectation scolaire
            </h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Niveau" required>
                <select className={inputCls} value={form.niveau} onChange={(e) => handleNiveauChange(e.target.value as Niveau | '')}>
                  <option value="">— Choisir un niveau —</option>
                  {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Classe" required>
                <select className={inputCls} value={form.classe} onChange={(e) => handleClasseChange(e.target.value)} disabled={!form.niveau}>
                  <option value="">{form.niveau ? '— Choisir une classe —' : "Sélectionnez d'abord un niveau"}</option>
                  {classesDisponibles.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label={`Option ${besoinOption ? '*' : '(non applicable)'}`}>
                <select className={inputCls} value={form.option} onChange={(e) => updateForm({ option: e.target.value })} disabled={!besoinOption}>
                  <option value="">{besoinOption ? '— Choisir une option —' : '— Aucune option requise —'}</option>
                  {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Statut de l'élève">
                <select className={inputCls} value={form.statut} onChange={(e) => updateForm({ statut: e.target.value as StudentStatus })}>
                  {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="Matricule (auto)">
                <input className={inputCls} value={genererMatricule()} disabled />
              </Field>
              <Field label="Date d'inscription">
                <input type="date" className={inputCls} value={form.dateInscription} onChange={(e) => updateForm({ dateInscription: e.target.value })} />
              </Field>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setForm({ ...emptyForm, dateInscription: today() })} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Réinitialiser
            </button>
            <button type="submit" disabled={!activeYear} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:bg-slate-300">
              Enregistrer l&apos;inscription
            </button>
          </div>
        </form>
      )}

      {/* ============ TAB RÉINSCRIPTION ============ */}
      {tab === 'reinscription' && (
        <ReinscriptionTab
          pastStudents={pastStudentsToReinscrire}
          activeYear={activeYear}
          onReinscrire={(s) => setReinscriptionTarget(s)}
        />
      )}

      {/* ============ MODALS ============ */}
      {statusEdit && (
        <StatusModal
          student={statusEdit}
          onClose={() => setStatusEdit(null)}
          onSave={(statut) => changerStatut(statusEdit.id, statut)}
        />
      )}

      {detailStudent && (
        <FicheEleveModal
          student={detailStudent}
          payments={payments}
          tuition={tuition}
          schoolName={settings.schoolName || 'BLIND SCHOOL'}
          schoolLogo={settings.schoolLogo}
          onClose={() => setDetailStudent(null)}
        />
      )}

      {reinscriptionTarget && activeYear && (
        <ReinscriptionModal
          student={reinscriptionTarget}
          activeYear={activeYear}
          onClose={() => setReinscriptionTarget(null)}
          onConfirm={(nouveau) => {
            setStudents((list) => [nouveau, ...list]);
            setReinscriptionTarget(null);
            setMessage({ type: 'success', text: `${nouveau.nom} ${nouveau.prenom} réinscrit(e) en ${nouveau.classe}` });
            setTab('liste');
          }}
        />
      )}

      {showPrint && (
        <PrintListModal
          title="Liste des élèves"
          subtitle={printSubtitle}
          columns={printColumns}
          rows={printRows}
          extraInfo={`${printRows.length} élève(s) — Document généré automatiquement`}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

/* ============================================================
   Onglet Réinscription
   ============================================================ */
function ReinscriptionTab({
  pastStudents, activeYear, onReinscrire,
}: {
  pastStudents: Student[];
  activeYear: { id: string; label: string } | null;
  onReinscrire: (s: Student) => void;
}) {
  const [years] = useSchoolYears();
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return pastStudents;
    return pastStudents.filter((s) => {
      const hay = `${s.nom} ${s.postnom} ${s.prenom} ${s.matricule}`.toLowerCase();
      return hay.includes(q);
    });
  }, [pastStudents, search]);

  if (!activeYear) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center text-amber-800">
        <p className="mb-1 text-3xl">📅</p>
        <p className="font-semibold">Aucune année scolaire active</p>
        <p className="mt-1 text-sm">Créez une année scolaire dans Configuration pour pouvoir réinscrire des élèves.</p>
      </div>
    );
  }

  if (pastStudents.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        <div className="mb-2 text-4xl">🔄</div>
        <p className="font-medium text-slate-700">Aucun élève à réinscrire</p>
        <p className="mt-1 text-sm">
          Tous les élèves des années passées sont déjà inscrits dans l&apos;année <b>{activeYear.label}</b>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        🎯 <b>{pastStudents.length} élève(s)</b> issu(s) d&apos;années précédentes peuvent être réinscrits en <b>{activeYear.label}</b>.
        Le système propose automatiquement la classe suivante (ou le redoublement si l&apos;élève était redoublant).
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4">
          <input
            className={inputCls}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par nom, matricule..."
          />
        </div>

        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-slate-500">Aucun élève ne correspond à la recherche.</p>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="px-3 py-2 font-semibold">Matricule</th>
                  <th className="px-3 py-2 font-semibold">Nom complet</th>
                  <th className="px-3 py-2 font-semibold">Dernière classe</th>
                  <th className="px-3 py-2 font-semibold">Année</th>
                  <th className="px-3 py-2 font-semibold">Statut</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => {
                  const prevYear = years.find((y) => y.id === s.anneeScolaireId);
                  const statut = s.statut || 'Actif';
                  return (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">{s.matricule}</td>
                      <td className="px-3 py-2 font-medium">
                        {s.nom} {s.postnom} {s.prenom}
                      </td>
                      <td className="px-3 py-2">{s.classe}{s.option ? ` • ${s.option}` : ''}</td>
                      <td className="px-3 py-2 text-slate-600">{prevYear?.label || '—'}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STUDENT_STATUS_COLORS[statut]}`}>
                          {statut}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onReinscrire(s)}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700"
                        >
                          🔄 Réinscrire
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================================
   Modal Réinscription
   ============================================================ */
function ReinscriptionModal({
  student, activeYear, onClose, onConfirm,
}: {
  student: Student;
  activeYear: { id: string; label: string };
  onClose: () => void;
  onConfirm: (s: Student) => void;
}) {
  const [years] = useSchoolYears();

  // Détection automatique
  const suggested = useMemo(() => {
    const wasRedoublant = student.statut === 'Redoublant';
    if (wasRedoublant) {
      return { classe: student.classe, niveau: student.niveau, action: 'redouble' as const };
    }
    const next = nextClass(student.classe);
    if (!next) {
      return { classe: '', niveau: '', action: 'fin-cycle' as const };
    }
    // Retrouver le niveau de la nouvelle classe
    let newNiveau: Niveau | '' = '';
    for (const [niv, classes] of Object.entries(CLASSES)) {
      if (classes.includes(next)) { newNiveau = niv as Niveau; break; }
    }
    return { classe: next, niveau: newNiveau, action: 'passe' as const };
  }, [student]);

  const [niveau, setNiveau] = useState<Niveau | ''>(suggested.niveau as Niveau);
  const [classe, setClasse] = useState(suggested.classe);
  const [option, setOption] = useState(student.option || '');
  const [statut, setStatut] = useState<StudentStatus>('Actif');
  const [error, setError] = useState('');

  const besoinOption = classe ? classeAvecOption(classe) : false;
  const classesDispo = niveau ? CLASSES[niveau] : [];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!niveau || !classe) {
      setError('Veuillez sélectionner un niveau et une classe.');
      return;
    }
    if (classeAvecOption(classe) && !option) {
      setError('Cette classe nécessite une option.');
      return;
    }

    const nouveau: Student = {
      id: crypto.randomUUID(),
      matricule: student.matricule,
      nom: student.nom,
      postnom: student.postnom,
      prenom: student.prenom,
      sexe: student.sexe,
      dateNaissance: student.dateNaissance,
      lieuNaissance: student.lieuNaissance,
      nomParent: student.nomParent,
      telephoneParent: student.telephoneParent,
      adresse: student.adresse,
      niveau,
      classe,
      option: classeAvecOption(classe) ? option : '',
      dateInscription: new Date().toISOString().slice(0, 10),
      statut,
      anneeScolaireId: activeYear.id,
      previousYearId: student.anneeScolaireId,
      previousStudentId: student.id,
    };
    onConfirm(nouveau);
  };

  const prevYearLabel = years.find((y) => y.id === student.anneeScolaireId)?.label || '—';

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-200 bg-gradient-to-br from-indigo-50 to-purple-50 px-5 py-4">
          <h3 className="font-semibold text-indigo-900">🔄 Réinscription</h3>
          <p className="text-xs text-slate-600">
            {student.nom} {student.postnom} {student.prenom}
          </p>
        </div>

        <div className="space-y-4 p-5">
          {/* Info élève */}
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
            <div>
              <p className="text-slate-500">Matricule</p>
              <p className="font-mono font-semibold">{student.matricule}</p>
            </div>
            <div>
              <p className="text-slate-500">Année précédente</p>
              <p className="font-semibold">{prevYearLabel}</p>
            </div>
            <div>
              <p className="text-slate-500">Classe précédente</p>
              <p className="font-semibold">{student.classe}{student.option ? ` • ${student.option}` : ''}</p>
            </div>
            <div>
              <p className="text-slate-500">Statut précédent</p>
              <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STUDENT_STATUS_COLORS[student.statut]}`}>
                {student.statut}
              </span>
            </div>
          </div>

          {/* Proposition auto */}
          <div className={`rounded-lg border p-3 text-sm ${
            suggested.action === 'redouble'
              ? 'border-amber-200 bg-amber-50 text-amber-800'
              : suggested.action === 'passe'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
          }`}>
            {suggested.action === 'redouble' && (
              <p>
                🔄 <b>Redoublement détecté</b> — l&apos;élève reste en <b>{suggested.classe}</b>.
                Vous pouvez modifier ci-dessous.
              </p>
            )}
            {suggested.action === 'passe' && (
              <p>
                ✅ <b>Passage automatique</b> — l&apos;élève passe de <b>{student.classe}</b> à <b>{suggested.classe}</b>.
                Vous pouvez modifier ci-dessous.
              </p>
            )}
            {suggested.action === 'fin-cycle' && (
              <p>
                🎓 <b>Fin de cycle détecté</b> — l&apos;élève a terminé sa dernière classe. Sélectionnez une option ci-dessous
                ou marquez-le <b>Diplômé</b>.
              </p>
            )}
          </div>

          {/* Formulaire */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label="Nouveau niveau" required>
              <select
                className={inputCls}
                value={niveau}
                onChange={(e) => {
                  const n = e.target.value as Niveau | '';
                  setNiveau(n);
                  setClasse('');
                  setOption('');
                }}
              >
                <option value="">— Choisir —</option>
                {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </Field>
            <Field label="Nouvelle classe" required>
              <select
                className={inputCls}
                value={classe}
                onChange={(e) => {
                  setClasse(e.target.value);
                  if (!classeAvecOption(e.target.value)) setOption('');
                }}
                disabled={!niveau}
              >
                <option value="">— Choisir —</option>
                {classesDispo.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={`Option ${besoinOption ? '*' : '(non applicable)'}`}>
              <select
                className={inputCls}
                value={option}
                onChange={(e) => setOption(e.target.value)}
                disabled={!besoinOption}
              >
                <option value="">{besoinOption ? '— Choisir —' : '— Non applicable —'}</option>
                {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </Field>
            <Field label="Nouveau statut">
              <select
                className={inputCls}
                value={statut}
                onChange={(e) => setStatut(e.target.value as StudentStatus)}
              >
                {STUDENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">❌ {error}</div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            💡 Une <b>nouvelle inscription</b> sera créée pour l&apos;année <b>{activeYear.label}</b>.
            L&apos;historique de l&apos;année précédente est conservé.
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            ✓ Valider la réinscription
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Modal Statut (raccourci)
   ============================================================ */
function StatusModal({
  student, onClose, onSave,
}: {
  student: Student;
  onClose: () => void;
  onSave: (statut: StudentStatus) => void;
}) {
  const current = student.statut || 'Actif';
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h3 className="font-semibold">Changer le statut</h3>
          <p className="text-xs text-slate-500">
            {student.nom} {student.postnom} {student.prenom} — {student.classe}
          </p>
        </div>
        <div className="space-y-2 p-5">
          {STUDENT_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => onSave(s)}
              className={`flex w-full items-center justify-between rounded-lg border-2 px-4 py-3 text-sm font-medium transition ${
                current === s
                  ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                  : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50'
              }`}
            >
              <span>{s}</span>
              {current === s && <span className="text-xs">✓ Actuel</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   Modal Fiche élève
   ============================================================ */
function FicheEleveModal({
  student, payments, tuition, schoolName, schoolLogo, onClose,
}: {
  student: Student;
  payments: Payment[];
  tuition: Record<string, number>;
  schoolName: string;
  schoolLogo: string;
  onClose: () => void;
}) {
  const studentPayments = useMemo(
    () => payments.filter((p) => p.studentId === student.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [payments, student.id],
  );
  const totalPaid = useMemo(() => getStudentTotalPaid(payments, student.id), [payments, student.id]);
  const totalDue = tuition[student.niveau] || 0;
  const balance = Math.max(totalDue - totalPaid, 0);
  const status = getPaymentStatus(totalPaid, totalDue);
  const statut = student.statut || 'Actif';

  const [ageText, setAgeText] = useState('');
  useEffect(() => {
    if (!student.dateNaissance) return;
    const birth = new Date(student.dateNaissance);
    if (isNaN(birth.getTime())) return;
    const now = new Date();
    let age = now.getFullYear() - birth.getFullYear();
    const m = now.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) age--;
    setAgeText(`${age} an${age > 1 ? 's' : ''}`);
  }, [student.dateNaissance]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4">
      <div className="max-h-[95vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="flex justify-end gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3">
          <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Fermer
          </button>
          <button onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            🖨️ Imprimer la fiche
          </button>
        </div>

        <div className="fiche-print p-6">
          <div className="mb-5 flex items-center gap-4 border-b-2 border-slate-800 pb-4">
            {schoolLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={schoolLogo} alt="Logo" className="h-16 w-16 rounded-xl object-cover" />
            ) : (
              <div className="grid h-16 w-16 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-lg font-bold text-white">
                {schoolName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-xl font-bold">{schoolName}</h1>
              <p className="text-sm text-slate-600">Fiche individuelle de l&apos;élève</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-xs text-slate-500">{student.matricule}</p>
              <span className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STUDENT_STATUS_COLORS[statut]}`}>
                {statut}
              </span>
            </div>
          </div>

          <Section title="👤 Identité">
            <Info label="Nom" value={student.nom} />
            <Info label="Postnom" value={student.postnom || '—'} />
            <Info label="Prénom" value={student.prenom} />
            <Info label="Sexe" value={student.sexe === 'M' ? 'Masculin' : 'Féminin'} />
            <Info label="Date de naissance" value={student.dateNaissance || '—'} />
            <Info label="Lieu de naissance" value={student.lieuNaissance || '—'} />
            <Info label="Âge" value={ageText || '—'} />
          </Section>

          <Section title="👨‍👩‍👧 Parent / Tuteur">
            <Info label="Nom complet" value={student.nomParent || '—'} />
            <Info label="Téléphone" value={student.telephoneParent || '—'} />
            <Info label="Adresse" value={student.adresse || '—'} span />
          </Section>

          <Section title="🏫 Scolarité">
            <Info label="Niveau" value={student.niveau} />
            <Info label="Classe" value={student.classe} />
            <Info label="Option" value={student.option || '—'} />
            <Info label="Date d'inscription" value={student.dateInscription || '—'} />
          </Section>

          <div className="mb-5">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">💰 Situation financière</h3>
            <div className="grid grid-cols-3 gap-3">
              <MoneyBox label="Total attendu" value={formatMoney(totalDue)} tone="slate" />
              <MoneyBox label="Total payé" value={formatMoney(totalPaid)} tone="emerald" />
              <MoneyBox label="Solde restant" value={formatMoney(balance)} tone="red" />
            </div>
          </div>

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              🧾 Historique des paiements ({studentPayments.length})
            </h3>
            {studentPayments.length === 0 ? (
              <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-6 text-center text-sm text-slate-500">
                Aucun paiement enregistré
              </p>
            ) : (
              <table className="w-full border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-slate-300 bg-slate-50">
                    <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold">N° Reçu</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold">Date</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold">Tranche</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-left font-semibold">Mode</th>
                    <th className="border border-slate-200 px-2 py-1.5 text-right font-semibold">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {studentPayments.map((p) => (
                    <tr key={p.id}>
                      <td className="border border-slate-200 px-2 py-1.5 font-mono text-[11px] text-slate-600">{p.receiptNumber}</td>
                      <td className="border border-slate-200 px-2 py-1.5">{p.date}</td>
                      <td className="border border-slate-200 px-2 py-1.5">{p.tranche}</td>
                      <td className="border border-slate-200 px-2 py-1.5 text-slate-600">{p.method}</td>
                      <td className="border border-slate-200 px-2 py-1.5 text-right font-semibold text-emerald-700">+{formatMoney(p.amount)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan={4} className="border border-slate-200 px-2 py-1.5 text-right">Total payé</td>
                    <td className="border border-slate-200 px-2 py-1.5 text-right text-emerald-800">{formatMoney(totalPaid)}</td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
      <div className="grid grid-cols-1 gap-x-4 gap-y-2 rounded-lg border border-slate-200 bg-slate-50/50 p-3 sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function Info({ label, value, span }: { label: string; value: string; span?: boolean }) {
  return (
    <div className={span ? 'sm:col-span-2' : ''}>
      <p className="text-[11px] text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800">{value}</p>
    </div>
  );
}

function MoneyBox({ label, value, tone }: { label: string; value: string; tone: 'slate' | 'emerald' | 'red' }) {
  const tones: Record<string, string> = {
    slate: 'from-slate-500 to-slate-600',
    emerald: 'from-emerald-500 to-emerald-600',
    red: 'from-red-500 to-red-600',
  };
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 bg-gradient-to-r ${tones[tone]}`} />
      <div className="p-3">
        <p className="text-[11px] text-slate-500">{label}</p>
        <p className="mt-0.5 text-base font-bold">{value}</p>
      </div>
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition ${
      active ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
    }`}>
      {children}
    </button>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: 'indigo' | 'emerald' | 'amber' | 'slate' | 'purple' }) {
  const colors: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    slate: 'from-slate-400 to-slate-500',
    purple: 'from-purple-500 to-purple-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-2 h-1.5 w-10 rounded-full bg-gradient-to-r ${colors[accent]}`} />
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}