'use client';
import { Fragment, useMemo, useState, type ReactNode } from 'react';
import {
  CLASSES,
  NIVEAUX,
  OPTIONS,
  classeAvecOption,
  useSchoolSettings,
  useStudents,
  type Niveau,
  type Student,
} from '../lib/store';
import {
  appreciationFor,
  buildClassBulletins,
  computeGroupMaxima,
  computeStudentBulletin,
  getExamMax,
  getPeriodMax,
  gradeKey,
  grandMaxima,
  makeDefaultTemplate,
  templateKey,
  useBulletinConfig,
  useBulletinTemplates,
  useConduite,
  useGrades,
  type BulletinConfig,
  type BulletinTemplate,
  type ConduiteEntry,
  type Grade,
  type SemesterConfig,
  type Subject,
  type SubjectGroup,
} from '../lib/bulletins';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

export default function BulletinsPage() {
  const [students] = useStudents();
  const [templates, setTemplates] = useBulletinTemplates();
  const [grades, setGrades] = useGrades();
  const [conduite, setConduite] = useConduite();
  const [config, setConfig] = useBulletinConfig();
  const [settings] = useSchoolSettings();

  const [tab, setTab] = useState<'modeles' | 'notes' | 'bulletins' | 'enseignant'>('modeles');
  const [previewStudent, setPreviewStudent] = useState<Student | null>(null);

  const getTemplate = (classe: string, option: string): BulletinTemplate | undefined =>
    templates.find((t) => t.id === templateKey(classe, option));

  const saveTemplate = (tpl: BulletinTemplate) => {
    setTemplates((list) => {
      const exists = list.find((x) => x.id === tpl.id);
      return exists ? list.map((x) => (x.id === tpl.id ? tpl : x)) : [...list, tpl];
    });
  };

  const saveGrades = (newGrades: Grade[]) => {
    setGrades((list) => {
      const map = new Map(list.map((g) => [g.id, g]));
      newGrades.forEach((g) => map.set(g.id, g));
      return Array.from(map.values());
    });
  };

  const saveConduite = (entry: ConduiteEntry) => {
    setConduite((list) => {
      const map = new Map(list.map((c) => [c.id, c]));
      map.set(entry.id, entry);
      return Array.from(map.values());
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Bulletins &amp; Notes</h1>
        <p className="text-sm text-slate-500">
          Format officiel RDC — semestres, groupes de branches, examens et repêchage
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        <TabBtn active={tab === 'modeles'}   onClick={() => setTab('modeles')}>🧩 Modèles</TabBtn>
        <TabBtn active={tab === 'notes'}     onClick={() => setTab('notes')}>✍️ Saisie des notes</TabBtn>
        <TabBtn active={tab === 'bulletins'} onClick={() => setTab('bulletins')}>📄 Bulletins</TabBtn>
        <TabBtn active={tab === 'enseignant'} onClick={() => setTab('enseignant')}>👨‍🏫 Espace enseignant</TabBtn>
      </div>

      {tab === 'modeles' && (
        <ModelesTab
          config={config}
          setConfig={setConfig}
          getTemplate={getTemplate}
          saveTemplate={saveTemplate}
        />
      )}

      {tab === 'notes' && (
        <NotesTab
          students={students}
          grades={grades}
          saveGrades={saveGrades}
          conduite={conduite}
          saveConduite={saveConduite}
          getTemplate={getTemplate}
        />
      )}

      {tab === 'bulletins' && (
        <BulletinsTab
          students={students}
          grades={grades}
          conduite={conduite}
          config={config}
          getTemplate={getTemplate}
          onPreview={setPreviewStudent}
        />
      )}

      {tab === 'enseignant' && (
        <TeacherTab
          students={students}
          grades={grades}
          saveGrades={saveGrades}
          getTemplate={getTemplate}
        />
      )}

      {previewStudent && (
        <BulletinPrintModal
          student={previewStudent}
          allStudents={students.filter(
            (s) => s.classe === previewStudent.classe && s.option === previewStudent.option,
          )}
          template={getTemplate(previewStudent.classe, previewStudent.option)}
          grades={grades}
          conduite={conduite}
          config={config}
          schoolName={settings.schoolName}
          onClose={() => setPreviewStudent(null)}
        />
      )}
    </div>
  );
}

/* ============================================================
   TAB 1 — MODÈLES
   ============================================================ */
function ModelesTab({
  config, setConfig, getTemplate, saveTemplate,
}: {
  config: BulletinConfig;
  setConfig: ReturnType<typeof useBulletinConfig>[1];
  getTemplate: (c: string, o: string) => BulletinTemplate | undefined;
  saveTemplate: (t: BulletinTemplate) => void;
}) {
  const [niveau, setNiveau] = useState<Niveau | ''>('');
  const [classe, setClasse] = useState('');
  const [option, setOption] = useState('');

  const classesDispo = niveau ? CLASSES[niveau] : [];
  const besoinOption = classe ? classeAvecOption(classe) : false;
  const tpl = classe && (!besoinOption || option)
    ? getTemplate(classe, besoinOption ? option : '')
    : undefined;

  const setTpl = (patch: Partial<BulletinTemplate>) => {
    if (!tpl) return;
    saveTemplate({ ...tpl, ...patch, updatedAt: new Date().toISOString() });
  };

  const createDefault = () => {
    if (!classe) return;
    const t = makeDefaultTemplate(classe, besoinOption ? option : '', '');
    t.title = `BULLETIN DE LA ${classe.toUpperCase()}`;
    saveTemplate(t);
  };

  const addGroup = () => {
    if (!tpl) return;
    const uid = `g_${Date.now()}`;
    setTpl({
      groups: [...tpl.groups, { id: uid, label: '', maxPerPeriod: 20, subjects: [] }],
    });
  };
  const updateGroup = (id: string, patch: Partial<SubjectGroup>) => {
    if (!tpl) return;
    setTpl({ groups: tpl.groups.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  };
  const removeGroup = (id: string) => {
    if (!tpl) return;
    if (!confirm('Supprimer ce groupe et ses branches ?')) return;
    setTpl({ groups: tpl.groups.filter((g) => g.id !== id) });
  };
  const addSubject = (gid: string) => {
    if (!tpl) return;
    setTpl({
      groups: tpl.groups.map((g) =>
        g.id === gid
          ? { ...g, subjects: [...g.subjects, { id: `sub_${Date.now()}`, name: 'Nouvelle branche' }] }
          : g,
      ),
    });
  };
  const updateSubject = (gid: string, sid: string, patch: Partial<Subject>) => {
    if (!tpl) return;
    setTpl({
      groups: tpl.groups.map((g) =>
        g.id === gid
          ? { ...g, subjects: g.subjects.map((s) => (s.id === sid ? { ...s, ...patch } : s)) }
          : g,
      ),
    });
  };
  const removeSubject = (gid: string, sid: string) => {
    if (!tpl) return;
    setTpl({
      groups: tpl.groups.map((g) =>
        g.id === gid ? { ...g, subjects: g.subjects.filter((s) => s.id !== sid) } : g,
      ),
    });
  };

  const updateSemester = (sid: string, patch: Partial<SemesterConfig>) => {
    if (!tpl) return;
    setTpl({ semesters: tpl.semesters.map((s) => (s.id === sid ? { ...s, ...patch } : s)) });
  };
  const addPeriod = (sid: string) => {
    if (!tpl) return;
    const sem = tpl.semesters.find((s) => s.id === sid);
    if (!sem) return;
    const n = sem.periods.length + 1;
    updateSemester(sid, {
      periods: [...sem.periods, { id: `P${Date.now()}`, label: `${n}°P` }],
    });
  };
  const updatePeriod = (sid: string, pid: string, label: string) => {
    if (!tpl) return;
    const sem = tpl.semesters.find((s) => s.id === sid);
    if (!sem) return;
    updateSemester(sid, {
      periods: sem.periods.map((p) => (p.id === pid ? { ...p, label } : p)),
    });
  };
  const removePeriod = (sid: string, pid: string) => {
    if (!tpl) return;
    const sem = tpl.semesters.find((s) => s.id === sid);
    if (!sem) return;
    updateSemester(sid, { periods: sem.periods.filter((p) => p.id !== pid) });
  };

  const uploadImage = (field: keyof BulletinConfig['etablissement'], file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { alert('Fichier image requis.'); return; }
    if (file.size > 1024 * 1024) { alert('Image trop lourde (max 1 Mo).'); return; }
    const r = new FileReader();
    r.onload = (e) =>
      setConfig((c) => ({
        ...c,
        etablissement: { ...c.etablissement, [field]: e.target?.result as string },
      }));
    r.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">🏫 Établissement (apparaît sur tous les bulletins)</h2>
        <p className="mb-5 text-sm text-slate-500">
          Ces informations viennent du ministère. Remplissez-les une seule fois.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Province">
            <input className={inputCls} value={config.etablissement.province} onChange={(e) => setConfig((c) => ({ ...c, etablissement: { ...c.etablissement, province: e.target.value } }))} />
          </Field>
          <Field label="École">
            <input className={inputCls} value={config.etablissement.ecole} onChange={(e) => setConfig((c) => ({ ...c, etablissement: { ...c.etablissement, ecole: e.target.value } }))} />
          </Field>
          <Field label="Lieu d'implantation">
            <input className={inputCls} value={config.etablissement.lieuImplantation} onChange={(e) => setConfig((c) => ({ ...c, etablissement: { ...c.etablissement, lieuImplantation: e.target.value } }))} />
          </Field>
          <Field label="Commune / Territoire">
            <input className={inputCls} value={config.etablissement.commune} onChange={(e) => setConfig((c) => ({ ...c, etablissement: { ...c.etablissement, commune: e.target.value } }))} />
          </Field>
          <Field label="Ville">
            <input className={inputCls} value={config.etablissement.ville} onChange={(e) => setConfig((c) => ({ ...c, etablissement: { ...c.etablissement, ville: e.target.value } }))} />
          </Field>
          <Field label="Code">
            <input className={inputCls} value={config.etablissement.code} onChange={(e) => setConfig((c) => ({ ...c, etablissement: { ...c.etablissement, code: e.target.value } }))} />
          </Field>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-3">
          <ImageUpload label="Drapeau RDC" value={config.etablissement.drapeau} onChange={(f) => uploadImage('drapeau', f)} onClear={() => setConfig((c) => ({ ...c, etablissement: { ...c.etablissement, drapeau: '' } }))} />
          <ImageUpload label="Armoiries RDC" value={config.etablissement.armoiries} onChange={(f) => uploadImage('armoiries', f)} onClear={() => setConfig((c) => ({ ...c, etablissement: { ...c.etablissement, armoiries: '' } }))} />
          <ImageUpload label="Logo de l'école (optionnel)" value={config.etablissement.schoolLogo} onChange={(f) => uploadImage('schoolLogo', f)} onClear={() => setConfig((c) => ({ ...c, etablissement: { ...c.etablissement, schoolLogo: '' } }))} />
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">🧩 Modèle par classe</h2>
        <p className="mb-5 text-sm text-slate-500">
          Définissez le titre, les semestres, les groupes de branches et leurs maxima.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Niveau">
            <select className={inputCls} value={niveau} onChange={(e) => { setNiveau(e.target.value as Niveau | ''); setClasse(''); setOption(''); }}>
              <option value="">— Choisir —</option>
              {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Classe">
            <select className={inputCls} value={classe} onChange={(e) => { setClasse(e.target.value); setOption(''); }} disabled={!niveau}>
              <option value="">— Choisir —</option>
              {classesDispo.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label={`Option ${besoinOption ? '*' : ''}`}>
            <select className={inputCls} value={option} onChange={(e) => setOption(e.target.value)} disabled={!besoinOption}>
              <option value="">{besoinOption ? '— Choisir —' : '— Non applicable —'}</option>
              {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </div>

        {classe && (!besoinOption || option) && !tpl && (
          <div className="mt-5 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
            Aucun modèle pour cette classe.
            <button onClick={createDefault} className="ml-3 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
              ➕ Créer le modèle par défaut
            </button>
          </div>
        )}

        {tpl && (
          <div className="mt-5 space-y-5">
            <Field label="Titre du bulletin">
              <input className={inputCls} value={tpl.title} onChange={(e) => setTpl({ title: e.target.value })} />
            </Field>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">📅 Semestres &amp; périodes</h3>
              </div>
              <div className="space-y-4">
                {tpl.semesters.map((sem) => (
                  <div key={sem.id} className="rounded-lg border border-slate-200 bg-white p-3">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <input className={inputCls + ' max-w-xs'} value={sem.label} onChange={(e) => updateSemester(sem.id, { label: e.target.value })} />
                      <label className="text-xs text-slate-600">Examen :</label>
                      <input className={inputCls + ' w-24'} value={sem.examLabel} onChange={(e) => updateSemester(sem.id, { examLabel: e.target.value })} />
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                      {sem.periods.map((p) => (
                        <div key={p.id} className="flex items-center gap-1">
                          <input className={inputCls + ' w-24'} value={p.label} onChange={(e) => updatePeriod(sem.id, p.id, e.target.value)} />
                          <button onClick={() => removePeriod(sem.id, p.id)} className="text-xs text-red-500 hover:underline">✕</button>
                        </div>
                      ))}
                      <button onClick={() => addPeriod(sem.id)} className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium hover:bg-slate-200">➕ Période</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-700">📚 Groupes de branches</h3>
                <button onClick={addGroup} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700">
                  ➕ Ajouter un groupe
                </button>
              </div>

              <div className="space-y-4">
                {tpl.groups.map((g) => (
                  <div key={g.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <label className="text-xs font-medium text-slate-600">Max par période :</label>
                      <input type="number" className={inputCls + ' w-24'} value={g.maxPerPeriod} onChange={(e) => updateGroup(g.id, { maxPerPeriod: Number(e.target.value) })} />
                      <div className="ml-auto">
                        <button onClick={() => removeGroup(g.id)} className="text-xs font-medium text-red-500 hover:underline">Supprimer le groupe</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {g.subjects.map((s) => (
                        <div key={s.id} className="flex items-center gap-2">
                          <input className={inputCls} value={s.name} onChange={(e) => updateSubject(g.id, s.id, { name: e.target.value })} />
                          <button onClick={() => removeSubject(g.id, s.id)} className="text-xs text-red-500 hover:underline">Retirer</button>
                        </div>
                      ))}
                      <button onClick={() => addSubject(g.id)} className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium hover:bg-slate-200">➕ Ajouter une branche</button>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">
                ✅ Total maxima généraux pour cette classe : <b>{grandMaxima(tpl)}</b> — Max par période : <b>{getPeriodMax(tpl)}</b> — Max examen : <b>{getExamMax(tpl)}</b>
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   TAB 2 — SAISIE DES NOTES
   ============================================================ */
function NotesTab({
  students, grades, saveGrades, conduite, saveConduite, getTemplate,
}: {
  students: Student[];
  grades: Grade[];
  saveGrades: (g: Grade[]) => void;
  conduite: ConduiteEntry[];
  saveConduite: (c: ConduiteEntry) => void;
  getTemplate: (c: string, o: string) => BulletinTemplate | undefined;
}) {
  const [niveau, setNiveau] = useState<Niveau | ''>('');
  const [classe, setClasse] = useState('');
  const [option, setOption] = useState('');
  const [periodKey, setPeriodKey] = useState('');

  const classesDispo = niveau ? CLASSES[niveau] : [];
  const besoinOption = classe ? classeAvecOption(classe) : false;
  const tpl = classe && (!besoinOption || option)
    ? getTemplate(classe, besoinOption ? option : '')
    : undefined;

  const classStudents = tpl
    ? students.filter((s) => s.classe === classe && (besoinOption ? s.option === option : true))
    : [];

  const allPeriodOptions = useMemo(() => {
    if (!tpl) return [];
    const out: { key: string; label: string }[] = [];
    tpl.semesters.forEach((sem) => {
      sem.periods.forEach((p) => out.push({ key: `${sem.id}__${p.id}`, label: `${sem.id} • ${p.label}` }));
      out.push({ key: `${sem.id}__EXAM`, label: `${sem.id} • ${sem.examLabel}` });
    });
    out.push({ key: 'REPECHAGE', label: 'EXAMEN DE REPÊCHAGE' });
    return out;
  }, [tpl]);

  const currentPeriodKey = periodKey || allPeriodOptions[0]?.key || '';

  const handleGrade = (studentId: string, subjectId: string, raw: string) => {
    if (!tpl) return;
    const value = raw === '' ? null : Number(raw);
    saveGrades([{
      id: gradeKey(studentId, subjectId, currentPeriodKey),
      studentId,
      subjectId,
      periodKey: currentPeriodKey,
      points: value === null || isNaN(value) ? null : value,
      updatedAt: new Date().toISOString(),
    }]);
  };

  const handleConduite = (studentId: string, value: string) => {
    if (!tpl) return;
    const semesterId = currentPeriodKey.split('__')[0];
    if (!semesterId || semesterId === 'REPECHAGE') return;
    saveConduite({
      id: `${studentId}__${semesterId}`,
      studentId,
      semesterId,
      value,
      updatedAt: new Date().toISOString(),
    });
  };

  const flatSubjects: { subject: Subject; group: SubjectGroup }[] = [];
  tpl?.groups.forEach((g) => {
    g.subjects.forEach((s) => flatSubjects.push({ subject: s, group: g }));
  });

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">✍️ Saisie des notes</h2>
        <p className="mb-5 text-sm text-slate-500">
          Sélectionnez classe + période, puis saisissez les notes. Sauvegarde automatique.
        </p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Niveau">
            <select className={inputCls} value={niveau} onChange={(e) => { setNiveau(e.target.value as Niveau | ''); setClasse(''); setOption(''); setPeriodKey(''); }}>
              <option value="">— Choisir —</option>
              {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Classe">
            <select className={inputCls} value={classe} onChange={(e) => { setClasse(e.target.value); setOption(''); setPeriodKey(''); }} disabled={!niveau}>
              <option value="">— Choisir —</option>
              {classesDispo.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Option">
            <select className={inputCls} value={option} onChange={(e) => { setOption(e.target.value); setPeriodKey(''); }} disabled={!besoinOption}>
              <option value="">{besoinOption ? '— Choisir —' : '— Non applicable —'}</option>
              {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Période">
            <select className={inputCls} value={currentPeriodKey} onChange={(e) => setPeriodKey(e.target.value)} disabled={!tpl}>
              {allPeriodOptions.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {classe && (!besoinOption || option) && !tpl && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-800">
          ⚠️ Aucun modèle pour cette classe. Créez-en un dans l&apos;onglet 🧩 Modèles.
        </div>
      )}

      {tpl && classStudents.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-slate-600">
              <b>{classStudents.length}</b> élève(s) • {tpl.title}
            </p>
            <p className="text-xs text-slate-500">💾 Auto</p>
          </div>
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-left uppercase text-slate-500">
                  <th className="px-2 py-2 sticky left-0 bg-slate-50 z-10">Élève</th>
                  {flatSubjects.map((f) => (
                    <th key={f.subject.id} className="px-1 py-2 text-center whitespace-nowrap">
                      {f.subject.name}
                      <div className="text-[10px] font-normal text-slate-400">/{f.group.maxPerPeriod}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {classStudents.map((st) => (
                  <tr key={st.id} className="border-b border-slate-100">
                    <td className="px-2 py-1 font-medium sticky left-0 bg-white z-10 whitespace-nowrap">
                      {st.nom} {st.prenom}
                      <div className="font-mono text-[10px] text-slate-400">{st.matricule}</div>
                    </td>
                    {flatSubjects.map((f) => {
                      const g = grades.find(
                        (x) => x.studentId === st.id && x.subjectId === f.subject.id && x.periodKey === currentPeriodKey,
                      );
                      return (
                        <td key={f.subject.id} className="px-0.5 py-0.5">
                          <input
                            type="number"
                            step="0.5"
                            min={0}
                            max={f.group.maxPerPeriod}
                            value={g?.points ?? ''}
                            onChange={(e) => handleGrade(st.id, f.subject.id, e.target.value)}
                            className="w-14 rounded border border-slate-300 px-1 py-0.5 text-center focus:border-indigo-500 outline-none"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tpl && currentPeriodKey.endsWith('__EXAM') && classStudents.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">Conduite (semestre {currentPeriodKey.split('__')[0]})</h3>
          <ul className="divide-y divide-slate-100">
            {classStudents.map((st) => {
              const semId = currentPeriodKey.split('__')[0];
              const c = conduite.find((x) => x.studentId === st.id && x.semesterId === semId);
              return (
                <li key={st.id} className="flex items-center justify-between py-2">
                  <span className="text-sm">{st.nom} {st.prenom}</span>
                  <select
                    className={inputCls + ' w-24'}
                    value={c?.value || ''}
                    onChange={(e) => handleConduite(st.id, e.target.value)}
                  >
                    <option value="">—</option>
                    {tpl.conduiteLabels.map((l) => <option key={l} value={l}>{l}</option>)}
                  </select>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ============================================================
   TAB 3 — BULLETINS
   ============================================================ */
function BulletinsTab({
  students, grades, conduite, config, getTemplate, onPreview,
}: {
  students: Student[];
  grades: Grade[];
  conduite: ConduiteEntry[];
  config: BulletinConfig;
  getTemplate: (c: string, o: string) => BulletinTemplate | undefined;
  onPreview: (s: Student) => void;
}) {
  const [niveau, setNiveau] = useState<Niveau | ''>('');
  const [classe, setClasse] = useState('');
  const [option, setOption] = useState('');

  const classesDispo = niveau ? CLASSES[niveau] : [];
  const besoinOption = classe ? classeAvecOption(classe) : false;
  const tpl = classe && (!besoinOption || option)
    ? getTemplate(classe, besoinOption ? option : '')
    : undefined;

  const classStudents = tpl
    ? students.filter((s) => s.classe === classe && (besoinOption ? s.option === option : true))
    : [];

  const rows = tpl
    ? buildClassBulletins(classStudents.map((s) => s.id), tpl, grades, conduite, config)
    : [];

  const sorted = [...rows].sort((a, b) => a.rank - b.rank);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">📄 Bulletins par classe</h2>
        <p className="mb-5 text-sm text-slate-500">Vue d&apos;ensemble — cliquez pour imprimer.</p>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Field label="Niveau">
            <select className={inputCls} value={niveau} onChange={(e) => { setNiveau(e.target.value as Niveau | ''); setClasse(''); setOption(''); }}>
              <option value="">— Choisir —</option>
              {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Classe">
            <select className={inputCls} value={classe} onChange={(e) => { setClasse(e.target.value); setOption(''); }} disabled={!niveau}>
              <option value="">— Choisir —</option>
              {classesDispo.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Option">
            <select className={inputCls} value={option} onChange={(e) => setOption(e.target.value)} disabled={!besoinOption}>
              <option value="">{besoinOption ? '— Choisir —' : '— Non applicable —'}</option>
              {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
        </div>
      </section>

      {tpl && sorted.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="px-3 py-2 font-semibold">Place</th>
                  <th className="px-3 py-2 font-semibold">Élève</th>
                  <th className="px-3 py-2 font-semibold text-right">Total</th>
                  <th className="px-3 py-2 font-semibold text-right">Maxima</th>
                  <th className="px-3 py-2 font-semibold text-right">%</th>
                  <th className="px-3 py-2 font-semibold">Application</th>
                  <th className="px-3 py-2 font-semibold">Décision</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const st = classStudents.find((s) => s.id === r.studentId);
                  if (!st) return null;
                  return (
                    <tr key={r.studentId} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2 font-semibold">
                        {r.data.isComplete ? `${r.rank}/${sorted.length}` : '—'}
                      </td>
                      <td className="px-3 py-2 font-medium">{st.nom} {st.postnom} {st.prenom}</td>
                      <td className="px-3 py-2 text-right">{r.data.studentTotal}</td>
                      <td className="px-3 py-2 text-right text-slate-500">{r.data.grandMaxima}</td>
                      <td className="px-3 py-2 text-right font-semibold">
                        {r.data.isComplete ? `${r.data.percent.toFixed(1)}%` : '—'}
                      </td>
                      <td className="px-3 py-2">{r.data.isComplete ? r.data.appreciation : '—'}</td>
                      <td className="px-3 py-2">
                        <DecisionBadge decision={r.data.decision} />
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          onClick={() => onPreview(st)}
                          className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                        >
                          Voir / Imprimer
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

/* ============================================================
   TAB 4 — ESPACE ENSEIGNANT
   ============================================================ */
function TeacherTab({
  students, grades, saveGrades, getTemplate,
}: {
  students: Student[];
  grades: Grade[];
  saveGrades: (g: Grade[]) => void;
  getTemplate: (c: string, o: string) => BulletinTemplate | undefined;
}) {
  const [niveau, setNiveau] = useState<Niveau | ''>('');
  const [classe, setClasse] = useState('');
  const [option, setOption] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [periodKey, setPeriodKey] = useState('');

  const classesDispo = niveau ? CLASSES[niveau] : [];
  const besoinOption = classe ? classeAvecOption(classe) : false;
  const tpl = classe && (!besoinOption || option)
    ? getTemplate(classe, besoinOption ? option : '')
    : undefined;

  const classStudents = tpl
    ? students.filter((s) => s.classe === classe && (besoinOption ? s.option === option : true))
    : [];

  const allPeriodOptions = useMemo(() => {
    if (!tpl) return [];
    const out: { key: string; label: string }[] = [];
    tpl.semesters.forEach((sem) => {
      sem.periods.forEach((p) => out.push({ key: `${sem.id}__${p.id}`, label: `${sem.id} • ${p.label}` }));
      out.push({ key: `${sem.id}__EXAM`, label: `${sem.id} • ${sem.examLabel}` });
    });
    return out;
  }, [tpl]);

  const currentPeriodKey = periodKey || allPeriodOptions[0]?.key || '';
  const allSubjects = tpl?.groups.flatMap((g) => g.subjects.map((s) => ({ subject: s, group: g }))) || [];
  const selected = allSubjects.find((x) => x.subject.id === subjectId);

  const handleGrade = (studentId: string, raw: string) => {
    if (!tpl || !selected) return;
    const value = raw === '' ? null : Number(raw);
    saveGrades([{
      id: gradeKey(studentId, selected.subject.id, currentPeriodKey),
      studentId,
      subjectId: selected.subject.id,
      periodKey: currentPeriodKey,
      points: value === null || isNaN(value) ? null : value,
      updatedAt: new Date().toISOString(),
    }]);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5">
        <h2 className="mb-1 text-lg font-semibold text-indigo-900">👨‍🏫 Espace enseignant</h2>
        <p className="text-sm text-indigo-700">
          Sélectionnez votre classe, votre branche et la période. Vos notes remontent automatiquement au bulletin.
        </p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Niveau">
            <select className={inputCls} value={niveau} onChange={(e) => { setNiveau(e.target.value as Niveau | ''); setClasse(''); setOption(''); setSubjectId(''); }}>
              <option value="">— Choisir —</option>
              {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Classe">
            <select className={inputCls} value={classe} onChange={(e) => { setClasse(e.target.value); setOption(''); setSubjectId(''); }} disabled={!niveau}>
              <option value="">— Choisir —</option>
              {classesDispo.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Option">
            <select className={inputCls} value={option} onChange={(e) => { setOption(e.target.value); setSubjectId(''); }} disabled={!besoinOption}>
              <option value="">{besoinOption ? '— Choisir —' : '— Non applicable —'}</option>
              {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Période">
            <select className={inputCls} value={currentPeriodKey} onChange={(e) => setPeriodKey(e.target.value)} disabled={!tpl}>
              {allPeriodOptions.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </Field>
        </div>

        {tpl && (
          <div className="mt-4">
            <Field label="Ma branche" required>
              <select className={inputCls} value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>
                <option value="">— Sélectionner la branche que j&apos;enseigne —</option>
                {allSubjects.map((x) => (
                  <option key={x.subject.id} value={x.subject.id}>
                    {x.subject.name} (/{x.group.maxPerPeriod})
                  </option>
                ))}
              </select>
            </Field>
          </div>
        )}
      </section>

      {tpl && selected && classStudents.length > 0 && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800">
              {selected.subject.name} — {classe}{besoinOption ? ` • ${option}` : ''} — {currentPeriodKey}
            </p>
            <p className="text-xs text-slate-500">💾 Auto</p>
          </div>
          <ul className="divide-y divide-slate-100">
            {classStudents.map((st) => {
              const g = grades.find(
                (x) => x.studentId === st.id && x.subjectId === selected.subject.id && x.periodKey === currentPeriodKey,
              );
              return (
                <li key={st.id} className="flex items-center justify-between py-2.5">
                  <div>
                    <p className="text-sm font-medium">{st.nom} {st.postnom} {st.prenom}</p>
                    <p className="font-mono text-[11px] text-slate-400">{st.matricule}</p>
                  </div>
                  <input
                    type="number"
                    step="0.5"
                    min={0}
                    max={selected.group.maxPerPeriod}
                    value={g?.points ?? ''}
                    onChange={(e) => handleGrade(st.id, e.target.value)}
                    className="w-20 rounded-md border border-slate-300 px-2 py-1.5 text-center text-sm focus:border-indigo-500 outline-none"
                    placeholder="—"
                  />
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

/* ============================================================
   MODALE BULLETIN IMPRIMABLE (format officiel RDC — A4 Portrait)
   ============================================================ */
function BulletinPrintModal({
  student, allStudents, template, grades, conduite, config, schoolName, onClose,
}: {
  student: Student;
  allStudents: Student[];
  template: BulletinTemplate | undefined;
  grades: Grade[];
  conduite: ConduiteEntry[];
  config: BulletinConfig;
  schoolName: string;
  onClose: () => void;
}) {
  if (!template) {
    return (
      <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
        <div className="rounded-2xl bg-white p-6 text-center shadow-xl">
          <p className="mb-4 text-slate-700">Aucun modèle de bulletin défini pour cette classe.</p>
          <button onClick={onClose} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm text-white">Fermer</button>
        </div>
      </div>
    );
  }

  const data = computeStudentBulletin(student.id, template, grades, conduite, config);
  const rows = buildClassBulletins(allStudents.map((s) => s.id), template, grades, conduite, config);
  const myRank = rows.find((r) => r.studentId === student.id)?.rank || 1;
  const groupMaxima = computeGroupMaxima(template);
  const maximaGen = grandMaxima(template);
  const periodMax = getPeriodMax(template);
  const examMax = getExamMax(template);

  const etab = config.etablissement;
  const anneeScolaire = `${new Date().getFullYear()} - ${new Date().getFullYear() + 1}`;

  const fmt = (v: number | null | undefined) =>
    v === null || v === undefined ? '' : v;

  const semestres = template.semesters;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 print:bg-white print:p-0">
      <div className="max-h-[95vh] w-full max-w-[900px] overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:max-w-none print:rounded-none print:shadow-none">
        <div className="flex justify-end gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3 print:hidden">
          <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Fermer
          </button>
          <button onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            🖨️ Imprimer (A4 Portrait)
          </button>
        </div>

        <div className="bulletin-print">
          {/* En-tête */}
          <table style={headerTable}>
            <tbody>
              <tr>
                <td style={{ ...headerCell, width: '22%', textAlign: 'left' }}>
                  {etab.drapeau ? (
                    <img src={etab.drapeau} alt="Drapeau" style={{ height: '54px', objectFit: 'contain' }} />
                  ) : (
                    <div style={placeholderBox}>Drapeau RDC</div>
                  )}
                </td>
                <td style={{ ...headerCell, width: '56%', textAlign: 'center' }}>
                  <div style={{ fontWeight: 'bold', fontSize: '10px' }}>
                    REPUBLIQUE DEMOCRATIQUE DU CONGO
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '9px' }}>
                    MINISTERE DE L&apos;ENSEIGNEMENT PRIMAIRE,
                  </div>
                  <div style={{ fontWeight: 'bold', fontSize: '9px' }}>
                    SECONDAIRE ET TECHNIQUE
                  </div>
                </td>
                <td style={{ ...headerCell, width: '22%', textAlign: 'right' }}>
                  {etab.armoiries ? (
                    <img src={etab.armoiries} alt="Armoiries" style={{ height: '54px', objectFit: 'contain' }} />
                  ) : (
                    <div style={placeholderBox}>Armoiries</div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Bandeau de code */}
          <div style={codeBand}>
            {Array.from({ length: 14 }).map((_, i) => (
              <span key={i} style={codeBox}></span>
            ))}
          </div>

          {/* Bloc Province / École / Élève */}
          <table style={blockTable}>
            <tbody>
              <tr>
                <td style={{ ...blockCell, width: '55%', verticalAlign: 'top' }}>
                  <div style={lineRow}><b>PROVINCE :</b> <span style={fillLine}>{etab.province || '...................................................'}</span></div>
                  <div style={lineRow}><b>ECOLE :</b> <span style={fillLine}>{etab.ecole || schoolName || '...................................................'}</span></div>
                  <div style={lineRow}><b>LIEU D&apos;IMPLANTATION :</b> <span style={fillLine}>{etab.lieuImplantation || '.......................'}</span></div>
                  <div style={lineRow}><b>COMMUNE/TER. (1) :</b> <span style={fillLine}>{etab.commune || '.......................'}</span></div>
                  <div style={lineRow}><b>VILLE :</b> <span style={fillLine}>{etab.ville || '.......................'}</span></div>
                  <div style={lineRow}>
                    <b>CODE :</b>{' '}
                    {etab.code.split('').map((c, i) => (
                      <span key={i} style={smallCodeBox}>{c}</span>
                    ))}
                    {Array.from({ length: Math.max(0, 8 - etab.code.length) }).map((_, i) => (
                      <span key={`e${i}`} style={smallCodeBox}></span>
                    ))}
                  </div>
                </td>
                <td style={{ ...blockCell, width: '45%', verticalAlign: 'top' }}>
                  <div style={lineRow}>
                    <b>ELEVE :</b> {student.nom} {student.postnom} {student.prenom}
                    <span style={{ marginLeft: 'auto' }}><b>SEXE :</b> {student.sexe}</span>
                  </div>
                  <div style={lineRow}>
                    <b>NE (E) A :</b> {student.lieuNaissance}
                    <span style={{ marginLeft: 'auto' }}>
                      <b>LE :</b> {student.dateNaissance || '..../..../......'}
                    </span>
                  </div>
                  <div style={lineRow}>
                    <b>CLASSE :</b> {student.classe}{student.option ? ` — ${student.option}` : ''}
                  </div>
                  <div style={lineRow}>
                    <b>N° PERM. :</b>{' '}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span key={i} style={smallCodeBox}></span>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Titre */}
          <table style={blockTable}>
            <tbody>
              <tr>
                <td style={{ ...blockCell, width: '55%', textAlign: 'center', fontWeight: 'bold', background: '#f3f4f6' }}>
                  {template.title.toUpperCase()}
                </td>
                <td style={{ ...blockCell, width: '45%', textAlign: 'center', fontWeight: 'bold', background: '#f3f4f6' }}>
                  {template.semesterTitle} {anneeScolaire}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Tableau principal */}
          <table style={bigTable}>
            <thead>
              <tr>
                <th rowSpan={3} style={{ ...thCell, width: '26%', textAlign: 'left', verticalAlign: 'bottom' }}>
                  BRANCHES
                </th>
                <th colSpan={4} style={{ ...thCell, textAlign: 'center' }}>
                  {semestres[0]?.label || 'PREMIER SEMESTRE'}
                </th>
                <th colSpan={5} style={{ ...thCell, textAlign: 'center' }}>
                  {semestres[1]?.label || 'SECOND SEMESTRE'}
                </th>
                <th rowSpan={3} style={{ ...thCell, textAlign: 'center', width: '10%' }}>
                  EXAMEN DE<br />REPECHAGE
                </th>
              </tr>
              <tr>
                <th colSpan={2} style={{ ...thCell, textAlign: 'center' }}>TR JOURNAL</th>
                <th rowSpan={2} style={{ ...thCell, textAlign: 'center' }}>
                  {semestres[0]?.examLabel || 'EXAM'}
                </th>
                <th rowSpan={2} style={{ ...thCell, textAlign: 'center' }}>TOT.</th>
                <th colSpan={2} style={{ ...thCell, textAlign: 'center' }}>TR JOURNAL</th>
                <th rowSpan={2} style={{ ...thCell, textAlign: 'center' }}>
                  {semestres[1]?.examLabel || 'EXAM'}
                </th>
                <th rowSpan={2} style={{ ...thCell, textAlign: 'center' }}>TOT.</th>
                <th rowSpan={2} style={{ ...thCell, textAlign: 'center' }}>T.G</th>
              </tr>
              <tr>
                {semestres[0]?.periods.map((p) => (
                  <th key={p.id} style={{ ...thCell, textAlign: 'center' }}>{p.label}</th>
                ))}
                {semestres[1]?.periods.map((p) => (
                  <th key={p.id} style={{ ...thCell, textAlign: 'center' }}>{p.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {groupMaxima.map((gm) => (
                <Fragment key={gm.group.id}>
                  {/* Ligne MAXIMA du groupe */}
                  <tr style={{ background: '#e5e7eb', fontWeight: 'bold' }}>
                    <td style={cellLeft}>MAXIMA</td>
                    {semestres.map((sem) => {
                      const ms = gm.maxSemester.find((x) => x.semesterId === sem.id);
                      return (
                        <Fragment key={`${gm.group.id}-${sem.id}`}>
                          {sem.periods.map((p) => (
                            <td key={`${sem.id}-${p.id}`} style={cellCenter}>{gm.maxPerPeriod}</td>
                          ))}
                          <td key={`${sem.id}-exam`} style={cellCenter}>{ms?.examMax ?? 0}</td>
                          <td key={`${sem.id}-tot`} style={cellCenter}>{ms?.maxTotal ?? 0}</td>
                        </Fragment>
                      );
                    })}
                    <td style={cellCenter}>{gm.grandMax}</td>
                    {template.showRepêchage && <td style={cellCenter}></td>}
                  </tr>

                  {/* Branches du groupe */}
                  {gm.group.subjects.map((sub) => {
                    const row = data.rows.find((r) => r.subject.id === sub.id);
                    return (
                      <tr key={sub.id}>
                        <td style={cellLeft}>{sub.name}</td>
                        {semestres.map((sem) => {
                          const rep = (k: string) => row?.periods[`${sem.id}__${k}`];
                          return (
                            <Fragment key={`${sub.id}-${sem.id}`}>
                              {sem.periods.map((p) => (
                                <td key={`${sem.id}-${p.id}`} style={cellCenter}>{fmt(rep(p.id))}</td>
                              ))}
                              <td key={`${sem.id}-exam`} style={cellCenter}>{fmt(rep('EXAM'))}</td>
                              <td key={`${sem.id}-tot`} style={cellCenter}>{row?.semesterTotals[sem.id] || 0}</td>
                            </Fragment>
                          );
                        })}
                        <td style={cellCenter}>{row?.grandTotal || 0}</td>
                        {template.showRepêchage && (
                          <td style={cellCenter}>{row?.repechage ?? ''}</td>
                        )}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}

              {/* MAXIMA GÉNÉRAUX */}
              <tr style={{ background: '#d1d5db', fontWeight: 'bold' }}>
                <td style={cellLeft}>MAXIMA GENERAUX</td>
                {semestres.map((sem) => {
                  const semMax = periodMax * sem.periods.length + examMax;
                  return (
                    <Fragment key={`mg-${sem.id}`}>
                      {sem.periods.map((p) => (
                        <td key={`${sem.id}-${p.id}`} style={cellCenter}>{periodMax}</td>
                      ))}
                      <td key={`${sem.id}-exam`} style={cellCenter}>{examMax}</td>
                      <td key={`${sem.id}-tot`} style={cellCenter}>{semMax}</td>
                    </Fragment>
                  );
                })}
                <td style={cellCenter}>{maximaGen}</td>
                {template.showRepêchage && <td style={cellCenter}></td>}
              </tr>

              {/* TOTAUX */}
              <tr>
                <td style={cellLeft}><b>TOTAUX</b></td>
                {semestres.map((sem) => (
                  <Fragment key={`tot-${sem.id}`}>
                    {sem.periods.map((p) => {
                      const key = `${sem.id}__${p.id}`;
                      const t = data.periodStudentTotals[key];
                      return (
                        <td key={`${sem.id}-${p.id}`} style={cellCenter}>
                          {t === null || t === undefined ? '' : t}
                        </td>
                      );
                    })}
                    <td style={cellCenter}>
                      {fmt(data.periodStudentTotals[`${sem.id}__EXAM`])}
                    </td>
                    <td style={cellCenter}>
                      {data.semesterTotals[sem.id].total}
                    </td>
                  </Fragment>
                ))}
                <td style={cellCenter}><b>{data.tgTotal ?? ''}</b></td>
                {template.showRepêchage && (
                  <td style={cellCenter}>
                    {data.rows.reduce((s, r) => s + (r.repechage || 0), 0) || ''}
                  </td>
                )}
              </tr>

              {/* POURCENTAGE */}
              <tr>
                <td style={cellLeft}><b>POURCENTAGE</b></td>
                {semestres.map((sem) => (
                  <Fragment key={`pct-${sem.id}`}>
                    {sem.periods.map((p) => {
                      const key = `${sem.id}__${p.id}`;
                      const pct = data.periodPercentages[key];
                      return (
                        <td key={`${sem.id}-${p.id}`} style={cellCenter}>
                          {pct === null || pct === undefined ? '/' : `${pct.toFixed(0)}%`}
                        </td>
                      );
                    })}
                    <td style={cellCenter}>
                      {(() => {
                        const pct = data.periodPercentages[`${sem.id}__EXAM`];
                        return pct === null || pct === undefined ? '/' : `${pct.toFixed(0)}%`;
                      })()}
                    </td>
                    <td style={cellCenter}>
                      {(() => {
                        const st = data.semesterTotals[sem.id];
                        return st.percent === null ? '/' : `${st.percent.toFixed(0)}%`;
                      })()}
                    </td>
                  </Fragment>
                ))}
                <td style={cellCenter}>
                  <b>{data.tgPercent === null ? '/' : `${data.tgPercent.toFixed(0)}%`}</b>
                </td>
                {template.showRepêchage && <td style={cellCenter}></td>}
              </tr>

              {/* PLACE / NBRE ELEVES */}
              <tr>
                <td style={cellLeft}><b>PLACE / NBRE ELEVES</b></td>
                {semestres.map((sem) => (
                  <Fragment key={`place-${sem.id}`}>
                    {sem.periods.map((p) => (
                      <td key={`${sem.id}-${p.id}`} style={cellCenter}>/</td>
                    ))}
                    <td style={cellCenter}>/</td>
                    <td style={cellCenter}>/</td>
                  </Fragment>
                ))}
                <td style={cellCenter}>
                  <b>{data.isComplete ? `${myRank}/${allStudents.length}` : '/'}</b>
                </td>
                {template.showRepêchage && <td style={cellCenter}></td>}
              </tr>

              {/* APPLICATION */}
              <tr>
                <td style={cellLeft}><b>APPLICATION</b></td>
                <td colSpan={9} style={{ ...cellCenter, height: '16px' }}></td>
                <td style={cellCenter}>
                  <b>{data.isComplete ? data.appreciation : ''}</b>
                </td>
                {template.showRepêchage && <td style={cellCenter}></td>}
              </tr>

              {/* CONDUITE */}
              <tr>
                <td style={cellLeft}><b>CONDUITE</b></td>
                <td colSpan={9} style={{ ...cellCenter, fontSize: '8px' }}>
                  {semestres.map((sem) => `${sem.id} : ${data.conduite[sem.id] || '—'}`).join('   |   ')}
                </td>
                <td style={cellCenter}></td>
                {template.showRepêchage && <td style={cellCenter}></td>}
              </tr>
            </tbody>
          </table>

          {/* Décision */}
          <table style={{ ...blockTable, marginTop: '4px' }}>
            <tbody>
              <tr>
                <td style={{ ...blockCell, width: '60%', verticalAlign: 'top', fontSize: '8px' }}>
                  <div style={{ marginBottom: '3px' }}>
                    - L&apos;élève ne pourra passer en classe supérieure s&apos;il n&apos;a subi avec succès un examen de repêchage en : ....................................
                  </div>
                  <div style={{ marginBottom: '3px', textAlign: 'center' }}>
                    .....................................................................................(1)
                  </div>
                  <div>- L&apos;élève passe dans la classe supérieure (1)</div>
                  <div>- L&apos;élève double sa classe (1)</div>
                </td>
                <td style={{ ...blockCell, width: '40%', verticalAlign: 'top', fontSize: '8px' }}>
                  <div style={{ marginBottom: '3px' }}>
                    {config.decisionLabels.passe} (1) : {data.isComplete && data.decision === 'Passe' ? '✔' : '.........'}
                  </div>
                  <div style={{ marginBottom: '3px' }}>
                    {config.decisionLabels.double} (1) : {data.isComplete && data.decision === 'Double' ? '✔' : '.........'}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    {config.decisionLabels.echoue} : {data.isComplete && data.decision === 'A échoué' ? '✔' : '.........'}
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '6px' }}>
                    <b>Le Chef d&apos;Etablissement</b>
                    <div style={{ height: '24px' }}></div>
                    <div>Nom et Signature</div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          {/* Pied */}
          <div style={{ marginTop: '2px', fontSize: '7px' }}>
            <div>(1) Biffer la mention inutile.</div>
            <div>Note importante : Le bulletin est sans valeur s&apos;il est raturé ou surchargé.</div>
            <div style={{ textAlign: 'right' }}>IGE/PS/026</div>
            <div style={{ textAlign: 'center', fontStyle: 'italic', fontWeight: 'bold' }}>
              Interdiction formelle de reproduire ce bulletin sous peine des sanctions prévues par la loi
            </div>
          </div>

          {/* Signatures bas */}
          <table style={{ ...blockTable, marginTop: '8px' }}>
            <tbody>
              <tr>
                <td style={{ ...blockCell, textAlign: 'center', fontSize: '9px', verticalAlign: 'bottom', height: '46px' }}>
                  <b>Signature de l&apos;élève</b>
                </td>
                <td style={{ ...blockCell, textAlign: 'center', fontSize: '9px', verticalAlign: 'bottom' }}>
                  <b>Sceau de l&apos;école</b>
                </td>
                <td style={{ ...blockCell, textAlign: 'center', fontSize: '9px', verticalAlign: 'bottom' }}>
                  <b>Le Chef d&apos;Etablissement</b>
                  <div style={{ fontSize: '8px' }}>Nom et Signature</div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Styles d'impression A4 Portrait */}
      <style jsx global>{`
        .bulletin-print {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9px;
          color: #000;
          background: #fff;
          padding: 4mm;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 6mm;
          }
          html, body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          body * { visibility: hidden; }
          .bulletin-print, .bulletin-print * { visibility: visible; }
          .bulletin-print {
            position: absolute;
            left: 0; top: 0;
            width: 100%;
            padding: 0 !important;
            font-size: 8.5px !important;
          }
          .bulletin-print table { page-break-inside: auto; }
          .bulletin-print tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   STYLES INLINE POUR LE BULLETIN
   ============================================================ */
const headerTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  border: '2px solid #000',
};

const headerCell: React.CSSProperties = {
  padding: '4px 6px',
  verticalAlign: 'middle',
};

const placeholderBox: React.CSSProperties = {
  display: 'grid',
  placeItems: 'center',
  height: '50px',
  border: '1px dashed #999',
  fontSize: '8px',
  color: '#999',
};

const codeBand: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  gap: '2px',
  padding: '3px 6px',
  border: '2px solid #000',
  borderTop: 'none',
  background: '#fff',
};

const codeBox: React.CSSProperties = {
  display: 'inline-block',
  width: '16px',
  height: '14px',
  border: '1px solid #000',
};

const smallCodeBox: React.CSSProperties = {
  display: 'inline-block',
  width: '12px',
  height: '12px',
  border: '1px solid #000',
  verticalAlign: 'middle',
  marginRight: '1px',
};

const blockTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  border: '2px solid #000',
  borderTop: 'none',
};

const blockCell: React.CSSProperties = {
  padding: '4px 6px',
  borderRight: '2px solid #000',
  verticalAlign: 'top',
};

const lineRow: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '4px',
  padding: '1px 0',
  flexWrap: 'wrap',
};

const fillLine: React.CSSProperties = {
  flex: 1,
  borderBottom: '1px dotted #666',
  minWidth: '60px',
};

const bigTable: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  border: '2px solid #000',
  borderTop: 'none',
  tableLayout: 'fixed',
};

const thCell: React.CSSProperties = {
  border: '1px solid #000',
  padding: '2px 3px',
  fontSize: '8px',
  fontWeight: 'bold',
  background: '#f3f4f6',
  verticalAlign: 'middle',
};

const cellLeft: React.CSSProperties = {
  border: '1px solid #000',
  padding: '2px 4px',
  fontSize: '8px',
  textAlign: 'left',
};

const cellCenter: React.CSSProperties = {
  border: '1px solid #000',
  padding: '2px 3px',
  fontSize: '8px',
  textAlign: 'center',
};

/* ============================================================
   PETITS COMPOSANTS
   ============================================================ */
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

function DecisionBadge({ decision }: { decision: string }) {
  const map: Record<string, string> = {
    'Passe': 'bg-emerald-100 text-emerald-800',
    'Double': 'bg-amber-100 text-amber-800',
    'A échoué': 'bg-red-100 text-red-800',
    'En cours': 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${map[decision] || map['En cours']}`}>
      {decision}
    </span>
  );
}

function ImageUpload({
  label, value, onChange, onClear,
}: { label: string; value: string; onChange: (f: File | undefined) => void; onClear: () => void }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-slate-600">{label}</p>
      <div className="flex items-center gap-3">
        {value ? (
          <img src={value} alt="" className="h-14 w-14 rounded border border-slate-200 object-contain bg-white" />
        ) : (
          <div className="grid h-14 w-14 place-items-center rounded border border-dashed border-slate-300 text-slate-400">—</div>
        )}
        <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
          📷 Choisir
          <input type="file" accept="image/*" className="hidden" onChange={(e) => onChange(e.target.files?.[0])} />
        </label>
        {value && (
          <button onClick={onClear} className="text-xs font-medium text-red-500 hover:underline">Retirer</button>
        )}
      </div>
    </div>
  );
}