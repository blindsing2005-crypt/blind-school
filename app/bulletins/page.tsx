'use client';
import { Fragment, useEffect, useMemo, useState, type ReactNode } from 'react';
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
import { useAuth } from '../lib/auth';

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
  saveTemplate: (tpl: BulletinTemplate) => void;
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
                ✅ Total maxima généraux : <b>{grandMaxima(tpl)}</b> — Max par période : <b>{getPeriodMax(tpl)}</b> — Max examen : <b>{getExamMax(tpl)}</b>
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
   TAB 4 — ESPACE ENSEIGNANT (avec classes assignées)
   ============================================================ */
function TeacherTab({
  students, grades, saveGrades, getTemplate,
}: {
  students: Student[];
  grades: Grade[];
  saveGrades: (g: Grade[]) => void;
  getTemplate: (c: string, o: string) => BulletinTemplate | undefined;
}) {
  const { currentUser } = useAuth();
  const [niveau, setNiveau] = useState<Niveau | ''>('');
  const [classe, setClasse] = useState('');
  const [option, setOption] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [periodKey, setPeriodKey] = useState('');

  /** 🆕 Classes assignées à l'enseignant (vide = toutes) */
  const assignedClasses = currentUser?.assignedClasses || [];
  const hasRestriction = assignedClasses.length > 0;

  /** 🆕 Vérifie si l'utilisateur peut accéder à une classe */
  const canAccessClass = (c: string, opt?: string) => {
    if (!hasRestriction) return true;
    if (assignedClasses.includes(c)) return true;
    if (opt && assignedClasses.includes(`${c} • ${opt}`)) return true;
    return false;
  };

  /** 🆕 Niveaux autorisés selon les classes assignées */
  const allowedNiveaux = useMemo<Niveau[]>(() => {
    if (!hasRestriction) return [...NIVEAUX];
    const set = new Set<Niveau>();
    assignedClasses.forEach((ac) => {
      const baseClass = ac.split(' • ')[0];
      for (const [niv, list] of Object.entries(CLASSES)) {
        if (list.includes(baseClass)) set.add(niv as Niveau);
      }
    });
    return Array.from(set);
  }, [assignedClasses, hasRestriction]);

  const classesDispo = niveau
    ? CLASSES[niveau].filter((c) => canAccessClass(c))
    : [];

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

  // Si enseignant avec restriction → pré-sélectionner la 1ère classe assignée
  useEffect(() => {
    if (!hasRestriction) return;
    if (classe) return;
    const firstNiveau = allowedNiveaux[0];
    if (!firstNiveau) return;
    const classes = CLASSES[firstNiveau].filter((c) => canAccessClass(c));
    if (classes.length === 0) return;
    setNiveau(firstNiveau);
    setClasse(classes[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasRestriction, allowedNiveaux]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5">
        <h2 className="mb-1 text-lg font-semibold text-indigo-900">👨‍🏫 Espace enseignant</h2>
        <p className="text-sm text-indigo-700">
          Sélectionnez votre classe, votre branche et la période. Vos notes remontent automatiquement au bulletin.
        </p>
        {hasRestriction && (
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs">
            <span className="font-semibold text-indigo-700">🎓 Vos classes autorisées :</span>
            {assignedClasses.map((c) => (
              <span key={c} className="rounded-full bg-indigo-100 px-2 py-0.5 font-medium text-indigo-800">
                {c}
              </span>
            ))}
          </div>
        )}
      </section>

      {hasRestriction && allowedNiveaux.length === 0 && (
        <div className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-sm text-amber-800">
          ⚠️ Aucune classe ne vous a été assignée. Contactez l&apos;administrateur.
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <Field label="Niveau">
            <select
              className={inputCls}
              value={niveau}
              onChange={(e) => {
                setNiveau(e.target.value as Niveau | '');
                setClasse('');
                setOption('');
                setSubjectId('');
              }}
              disabled={hasRestriction && allowedNiveaux.length <= 1}
            >
              <option value="">— Choisir —</option>
              {(hasRestriction ? allowedNiveaux : NIVEAUX).map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </Field>
          <Field label="Classe">
            <select
              className={inputCls}
              value={classe}
              onChange={(e) => { setClasse(e.target.value); setOption(''); setSubjectId(''); }}
              disabled={!niveau}
            >
              <option value="">— Choisir —</option>
              {classesDispo.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Option">
            <select
              className={inputCls}
              value={option}
              onChange={(e) => { setOption(e.target.value); setSubjectId(''); }}
              disabled={!besoinOption}
            >
              <option value="">{besoinOption ? '— Choisir —' : '— Non applicable —'}</option>
              {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
          </Field>
          <Field label="Période">
            <select
              className={inputCls}
              value={currentPeriodKey}
              onChange={(e) => setPeriodKey(e.target.value)}
              disabled={!tpl}
            >
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

  const fmt = (v: number | null | undefined) => (v === null || v === undefined ? '' : v);

  const sem1 = template.semesters[0];
  const sem2 = template.semesters[1];

  const s1PeriodsCount = sem1?.periods.length || 0;
  const s2PeriodsCount = sem2?.periods.length || 0;
  const totalDataCols = s1PeriodsCount + 2 + s2PeriodsCount + 3;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4 print:bg-white print:p-0">
      <div className="max-h-[95vh] w-full max-w-[820px] overflow-y-auto rounded-2xl bg-white shadow-2xl print:max-h-none print:max-w-none print:rounded-none print:shadow-none">
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
          <table className="bp-header">
            <tbody>
              <tr>
                <td className="bp-header-flag">
                  {etab.drapeau ? (
                    <img src={etab.drapeau} alt="Drapeau" style={{ height: '58px', objectFit: 'contain' }} />
                  ) : (
                    <div className="bp-placeholder">Drapeau RDC</div>
                  )}
                </td>
                <td className="bp-header-title">
                  <div>REPUBLIQUE DEMOCRATIQUE DU CONGO</div>
                  <div>MINISTERE DE L&apos;ENSEIGNEMENT PRIMAIRE,</div>
                  <div>SECONDAIRE ET TECHNIQUE</div>
                </td>
                <td className="bp-header-armoiries">
                  {etab.armoiries ? (
                    <img src={etab.armoiries} alt="Armoiries" style={{ height: '58px', objectFit: 'contain' }} />
                  ) : (
                    <div className="bp-placeholder">Armoiries</div>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="bp-codeband">
            {Array.from({ length: 15 }).map((_, i) => (
              <span key={i} className="bp-codebox"></span>
            ))}
          </div>

          <table className="bp-info">
            <tbody>
              <tr>
                <td className="bp-info-left">
                  <div className="bp-line"><b>PROVINCE :</b> <span className="bp-fill">{etab.province || '..................................................'}</span></div>
                  <div className="bp-line"><b>ECOLE :</b> <span className="bp-fill">{etab.ecole || schoolName || '...........................................'}</span></div>
                  <div className="bp-line"><b>LIEU D&apos;IMPLANTATION :</b> <span className="bp-fill">{etab.lieuImplantation || '.......................'}</span></div>
                  <div className="bp-line"><b>COMMUNE/TER. (1) :</b> <span className="bp-fill">{etab.commune || '.......................'}</span></div>
                  <div className="bp-line"><b>VILLE :</b> <span className="bp-fill">{etab.ville || '.......................'}</span></div>
                  <div className="bp-line">
                    <b>CODE :</b>
                    {etab.code.split('').map((c, i) => (
                      <span key={i} className="bp-smallbox">{c}</span>
                    ))}
                    {Array.from({ length: Math.max(0, 8 - etab.code.length) }).map((_, i) => (
                      <span key={`e${i}`} className="bp-smallbox"></span>
                    ))}
                  </div>
                </td>
                <td className="bp-info-right">
                  <div className="bp-line bp-line-between">
                    <span><b>ELEVE :</b> {student.nom} {student.postnom} {student.prenom}</span>
                    <span><b>SEXE :</b> {student.sexe}</span>
                  </div>
                  <div className="bp-line bp-line-between">
                    <span><b>NE (E) A :</b> {student.lieuNaissance}</span>
                    <span><b>LE :</b> {student.dateNaissance || '..../..../......'}</span>
                  </div>
                  <div className="bp-line">
                    <b>CLASSE :</b> {student.classe}{student.option ? ` — ${student.option}` : ''}
                  </div>
                  <div className="bp-line">
                    <b>N° PERM. :</b>{' '}
                    {Array.from({ length: 10 }).map((_, i) => (
                      <span key={i} className="bp-smallbox"></span>
                    ))}
                  </div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="bp-title-table">
            <tbody>
              <tr>
                <td className="bp-title-left">{template.title.toUpperCase()}</td>
                <td className="bp-title-right">{template.semesterTitle} {anneeScolaire}</td>
              </tr>
            </tbody>
          </table>

          <table className="bp-big">
            <colgroup>
              <col style={{ width: '24%' }} />
              {sem1?.periods.map((p) => <col key={`c1-${p.id}`} style={{ width: '4.6%' }} />)}
              <col style={{ width: '4.6%' }} />
              <col style={{ width: '4.6%' }} />
              <col style={{ width: '8px' }} />
              {sem2?.periods.map((p) => <col key={`c2-${p.id}`} style={{ width: '4.6%' }} />)}
              <col style={{ width: '4.6%' }} />
              <col style={{ width: '4.6%' }} />
              <col style={{ width: '5.2%' }} />
              <col style={{ width: '10%' }} />
            </colgroup>
            <thead>
              <tr>
                <th rowSpan={3} className="bp-th bp-th-left">BRANCHES</th>
                <th colSpan={s1PeriodsCount + 2} className="bp-th">{sem1?.label || 'PREMIER SEMESTRE'}</th>
                <th rowSpan={3} className="bp-th bp-black"></th>
                <th colSpan={s2PeriodsCount + 3} className="bp-th">{sem2?.label || 'SECOND SEMESTRE'}</th>
                <th rowSpan={3} className="bp-th bp-th-repechage">EXAMEN DE<br />REPECHAGE</th>
              </tr>
              <tr>
                <th colSpan={s1PeriodsCount} className="bp-th">TR JOURNAL</th>
                <th rowSpan={2} className="bp-th">{sem1?.examLabel || 'EXAM'}</th>
                <th rowSpan={2} className="bp-th">TOT.</th>
                <th colSpan={s2PeriodsCount} className="bp-th">TR JOURNAL</th>
                <th rowSpan={2} className="bp-th">{sem2?.examLabel || 'EXAM'}</th>
                <th rowSpan={2} className="bp-th">TOT.</th>
                <th rowSpan={2} className="bp-th">T.G</th>
              </tr>
              <tr>
                {sem1?.periods.map((p) => <th key={`h1-${p.id}`} className="bp-th">{p.label}</th>)}
                {sem2?.periods.map((p) => <th key={`h2-${p.id}`} className="bp-th">{p.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {groupMaxima.map((gm) => (
                <Fragment key={gm.group.id}>
                  <tr className="bp-row-maxima">
                    <td className="bp-td bp-td-left bp-bold">MAXIMA</td>
                    {sem1 && (
                      <>
                        {sem1.periods.map((p) => (
                          <td key={`m1-${p.id}`} className="bp-td bp-bold bp-center">{gm.maxPerPeriod}</td>
                        ))}
                        <td className="bp-td bp-bold bp-center">{gm.maxPerPeriod * 2}</td>
                        <td className="bp-td bp-bold bp-center">{gm.maxPerPeriod * (sem1.periods.length + 2)}</td>
                      </>
                    )}
                    <td className="bp-td bp-black"></td>
                    {sem2 && (
                      <>
                        {sem2.periods.map((p) => (
                          <td key={`m2-${p.id}`} className="bp-td bp-bold bp-center">{gm.maxPerPeriod}</td>
                        ))}
                        <td className="bp-td bp-bold bp-center">{gm.maxPerPeriod * 2}</td>
                        <td className="bp-td bp-bold bp-center">{gm.maxPerPeriod * (sem2.periods.length + 2)}</td>
                        <td className="bp-td bp-bold bp-center">{gm.grandMax}</td>
                      </>
                    )}
                    {template.showRepêchage && <td className="bp-td bp-black-cell"></td>}
                  </tr>

                  {gm.group.subjects.map((sub) => {
                    const row = data.rows.find((r) => r.subject.id === sub.id);
                    return (
                      <tr key={sub.id}>
                        <td className="bp-td bp-td-left">{sub.name}</td>
                        {sem1 && (
                          <>
                            {sem1.periods.map((p) => (
                              <td key={`s1-${p.id}`} className="bp-td bp-center">{fmt(row?.periods[`${sem1.id}__${p.id}`])}</td>
                            ))}
                            <td className="bp-td bp-center">{fmt(row?.periods[`${sem1.id}__EXAM`])}</td>
                            <td className="bp-td bp-center">{row?.semesterTotals[sem1.id] || 0}</td>
                          </>
                        )}
                        <td className="bp-td bp-black"></td>
                        {sem2 && (
                          <>
                            {sem2.periods.map((p) => (
                              <td key={`s2-${p.id}`} className="bp-td bp-center">{fmt(row?.periods[`${sem2.id}__${p.id}`])}</td>
                            ))}
                            <td className="bp-td bp-center">{fmt(row?.periods[`${sem2.id}__EXAM`])}</td>
                            <td className="bp-td bp-center">{row?.semesterTotals[sem2.id] || 0}</td>
                            <td className="bp-td bp-center">{row?.grandTotal || 0}</td>
                          </>
                        )}
                        {template.showRepêchage && (
                          <td className="bp-td bp-center">{row?.repechage ?? ''}</td>
                        )}
                      </tr>
                    );
                  })}
                </Fragment>
              ))}

              <tr className="bp-row-maxgen">
                <td className="bp-td bp-td-left bp-bold">MAXIMA GENERAUX</td>
                {sem1 && (
                  <>
                    {sem1.periods.map((p) => (
                      <td key={`mg1-${p.id}`} className="bp-td bp-bold bp-center">{periodMax}</td>
                    ))}
                    <td className="bp-td bp-bold bp-center">{examMax}</td>
                    <td className="bp-td bp-bold bp-center">{periodMax * (sem1.periods.length + 2)}</td>
                  </>
                )}
                <td className="bp-td bp-black"></td>
                {sem2 && (
                  <>
                    {sem2.periods.map((p) => (
                      <td key={`mg2-${p.id}`} className="bp-td bp-bold bp-center">{periodMax}</td>
                    ))}
                    <td className="bp-td bp-bold bp-center">{examMax}</td>
                    <td className="bp-td bp-bold bp-center">{periodMax * (sem2.periods.length + 2)}</td>
                    <td className="bp-td bp-bold bp-center">{maximaGen}</td>
                  </>
                )}
                {template.showRepêchage && <td className="bp-td bp-black-cell"></td>}
              </tr>

              <tr>
                <td className="bp-td bp-td-left bp-bold">TOTAUX</td>
                {sem1 && (
                  <>
                    {sem1.periods.map((p) => {
                      const t = data.periodStudentTotals[`${sem1.id}__${p.id}`];
                      return <td key={`t1-${p.id}`} className="bp-td bp-center">{t === null || t === undefined ? '' : t}</td>;
                    })}
                    <td className="bp-td bp-center">{fmt(data.periodStudentTotals[`${sem1.id}__EXAM`])}</td>
                    <td className="bp-td bp-center">{data.semesterTotals[sem1.id].total}</td>
                  </>
                )}
                <td className="bp-td bp-black"></td>
                {sem2 && (
                  <>
                    {sem2.periods.map((p) => {
                      const t = data.periodStudentTotals[`${sem2.id}__${p.id}`];
                      return <td key={`t2-${p.id}`} className="bp-td bp-center">{t === null || t === undefined ? '' : t}</td>;
                    })}
                    <td className="bp-td bp-center">{fmt(data.periodStudentTotals[`${sem2.id}__EXAM`])}</td>
                    <td className="bp-td bp-center">{data.semesterTotals[sem2.id].total}</td>
                    <td className="bp-td bp-center bp-bold">{data.tgTotal ?? ''}</td>
                  </>
                )}
                {template.showRepêchage && (
                  <td className="bp-td bp-center">
                    {data.rows.reduce((s, r) => s + (r.repechage || 0), 0) || ''}
                  </td>
                )}
              </tr>

              <tr>
                <td className="bp-td bp-td-left bp-bold">POURCENTAGE</td>
                {sem1 && (
                  <>
                    {sem1.periods.map((p) => {
                      const pct = data.periodPercentages[`${sem1.id}__${p.id}`];
                      return <td key={`p1-${p.id}`} className="bp-td bp-center">{pct === null || pct === undefined ? '/' : `${pct.toFixed(0)}%`}</td>;
                    })}
                    <td className="bp-td bp-center">
                      {(() => { const pct = data.periodPercentages[`${sem1.id}__EXAM`]; return pct === null || pct === undefined ? '/' : `${pct.toFixed(0)}%`; })()}
                    </td>
                    <td className="bp-td bp-center">
                      {(() => { const st = data.semesterTotals[sem1.id]; return st.percent === null ? '/' : `${st.percent.toFixed(0)}%`; })()}
                    </td>
                  </>
                )}
                <td className="bp-td bp-black"></td>
                {sem2 && (
                  <>
                    {sem2.periods.map((p) => {
                      const pct = data.periodPercentages[`${sem2.id}__${p.id}`];
                      return <td key={`p2-${p.id}`} className="bp-td bp-center">{pct === null || pct === undefined ? '/' : `${pct.toFixed(0)}%`}</td>;
                    })}
                    <td className="bp-td bp-center">
                      {(() => { const pct = data.periodPercentages[`${sem2.id}__EXAM`]; return pct === null || pct === undefined ? '/' : `${pct.toFixed(0)}%`; })()}
                    </td>
                    <td className="bp-td bp-center">
                      {(() => { const st = data.semesterTotals[sem2.id]; return st.percent === null ? '/' : `${st.percent.toFixed(0)}%`; })()}
                    </td>
                    <td className="bp-td bp-center bp-bold">{data.tgPercent === null ? '/' : `${data.tgPercent.toFixed(0)}%`}</td>
                  </>
                )}
                {template.showRepêchage && <td className="bp-td bp-black-cell"></td>}
              </tr>

              <tr>
                <td className="bp-td bp-td-left bp-bold">PLACE / NBRE ELEVES</td>
                {sem1 && (
                  <>
                    {sem1.periods.map((p) => <td key={`pl1-${p.id}`} className="bp-td bp-center">/</td>)}
                    <td className="bp-td bp-center">/</td>
                    <td className="bp-td bp-center">/</td>
                  </>
                )}
                <td className="bp-td bp-black"></td>
                {sem2 && (
                  <>
                    {sem2.periods.map((p) => <td key={`pl2-${p.id}`} className="bp-td bp-center">/</td>)}
                    <td className="bp-td bp-center">/</td>
                    <td className="bp-td bp-center">/</td>
                    <td className="bp-td bp-center bp-bold">{data.isComplete ? `${myRank}/${allStudents.length}` : '/'}</td>
                  </>
                )}
                {template.showRepêchage && <td className="bp-td bp-black-cell"></td>}
              </tr>

              <tr>
                <td className="bp-td bp-td-left bp-bold">APPLICATION</td>
                <td colSpan={totalDataCols} className="bp-td"></td>
                <td className="bp-td bp-center bp-bold">{data.isComplete ? data.appreciation : ''}</td>
                {template.showRepêchage && <td className="bp-td bp-black-cell"></td>}
              </tr>

              <tr>
                <td className="bp-td bp-td-left bp-bold">CONDUITE</td>
                <td colSpan={totalDataCols} className="bp-td bp-center" style={{ fontSize: '8px' }}>
                  {template.semesters.map((sem) => `${sem.id} : ${data.conduite[sem.id] || '—'}`).join('   |   ')}
                </td>
                <td className="bp-td bp-black-cell"></td>
                {template.showRepêchage && <td className="bp-td bp-black-cell"></td>}
              </tr>
            </tbody>
          </table>

          <table className="bp-decision">
            <tbody>
              <tr>
                <td className="bp-decision-left">
                  <div>-L&apos;élève ne pourra passer en classe supérieure s&apos;il n&apos;a subi avec succès un examen de repêchage en : .......................................</div>
                  <div style={{ textAlign: 'center', margin: '2px 0' }}>................................................................(1)</div>
                  <div>-L&apos;élève passe dans la classe supérieure (1)</div>
                  <div>-L&apos;élève double sa classe(1)</div>
                </td>
                <td className="bp-decision-right">
                  <div>{config.decisionLabels.passe}(1) : ................</div>
                  <div>{config.decisionLabels.double}(1) : ................</div>
                  <div>{config.decisionLabels.echoue} : ................</div>
                  <div style={{ marginTop: '14px', textAlign: 'center', fontWeight: 'bold' }}>
                    Le Chef d&apos;Etablissement
                  </div>
                  <div style={{ textAlign: 'center', marginTop: '4px' }}>Nom et Signature</div>
                </td>
              </tr>
            </tbody>
          </table>

          <table className="bp-signatures">
            <tbody>
              <tr>
                <td className="bp-sign-cell"><b>Signature de l&apos;élève</b></td>
                <td className="bp-sign-cell"><b>Sceau de l&apos;école</b></td>
                <td className="bp-sign-cell">
                  <b>Le Chef d&apos;Etablissement</b>
                  <div style={{ fontSize: '7px' }}>Nom et Signature</div>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="bp-footer">
            <div>(1) Biffer la mention inutile.</div>
            <div>Note importante : Le bulletin est sans valeur s&apos;il est raturé ou surchargé.</div>
            <div className="bp-footer-right">IGE/PS/026</div>
            <div className="bp-footer-center">Interdiction formelle de reproduire ce bulletin sous peine des sanctions prévues par la loi</div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .bulletin-print {
          font-family: Arial, Helvetica, sans-serif;
          font-size: 8px;
          color: #000;
          background: #fff;
          padding: 4mm;
        }
        .bulletin-print table { border-collapse: collapse; width: 100%; }
        .bulletin-print td, .bulletin-print th { box-sizing: border-box; }

        .bp-header { border: 2px solid #000; }
        .bp-header td { padding: 4px; vertical-align: middle; }
        .bp-header-flag { width: 22%; text-align: left; }
        .bp-header-title { width: 56%; text-align: center; font-weight: bold; font-size: 9px; line-height: 1.35; }
        .bp-header-armoiries { width: 22%; text-align: right; }
        .bp-placeholder {
          display: grid; place-items: center;
          height: 50px; border: 1px dashed #999;
          font-size: 7px; color: #999;
        }

        .bp-codeband {
          display: flex; justify-content: center; gap: 2px;
          padding: 3px 4px;
          border: 2px solid #000; border-top: none;
        }
        .bp-codebox {
          display: inline-block; width: 15px; height: 13px;
          border: 1px solid #000;
        }
        .bp-smallbox {
          display: inline-block; width: 11px; height: 11px;
          border: 1px solid #000; vertical-align: middle; margin-right: 1px;
        }

        .bp-info { border: 2px solid #000; border-top: none; }
        .bp-info td { padding: 3px 5px; vertical-align: top; font-size: 8px; }
        .bp-info-left { width: 55%; border-right: 2px solid #000; }
        .bp-info-right { width: 45%; }
        .bp-line {
          display: flex; align-items: center; gap: 3px;
          padding: 1px 0; flex-wrap: wrap; min-height: 13px;
        }
        .bp-line-between { justify-content: space-between; }
        .bp-fill { flex: 1; border-bottom: 1px dotted #555; min-width: 50px; }

        .bp-title-table { border: 2px solid #000; border-top: none; }
        .bp-title-table td {
          padding: 3px 5px; text-align: center;
          font-weight: bold; background: #f3f4f6; font-size: 8.5px;
        }
        .bp-title-left { width: 55%; border-right: 2px solid #000; }
        .bp-title-right { width: 45%; }

        .bp-big {
          border: 2px solid #000; border-top: none;
          table-layout: fixed;
        }
        .bp-th {
          border: 1px solid #000;
          padding: 2px 1px;
          font-size: 7.5px; font-weight: bold;
          background: #f3f4f6;
          text-align: center;
          vertical-align: middle;
          line-height: 1.1;
        }
        .bp-th-left { text-align: left; padding-left: 4px; }
        .bp-th-repechage {
          background: #000; color: #fff;
          font-size: 7.5px;
        }
        .bp-black { background: #000; }
        .bp-black-cell { background: #000; }
        .bp-td {
          border: 1px solid #000;
          padding: 1px 2px;
          font-size: 7.5px;
          height: 12px;
          vertical-align: middle;
        }
        .bp-td-left { text-align: left; padding-left: 4px; }
        .bp-center { text-align: center; }
        .bp-bold { font-weight: bold; }
        .bp-row-maxima td { background: #e5e7eb; }
        .bp-row-maxgen td { background: #d1d5db; }

        .bp-decision { border: 2px solid #000; border-top: none; }
        .bp-decision td { padding: 4px 6px; font-size: 7.5px; vertical-align: top; }
        .bp-decision-left { width: 62%; border-right: 2px solid #000; line-height: 1.5; }
        .bp-decision-right { width: 38%; line-height: 1.6; }

        .bp-signatures { border: 2px solid #000; border-top: none; }
        .bp-sign-cell {
          padding: 6px; text-align: center;
          font-size: 8px; vertical-align: bottom;
          border-right: 2px solid #000; height: 40px;
        }
        .bp-sign-cell:last-child { border-right: none; }

        .bp-footer { padding: 2px 4px; font-size: 6.5px; line-height: 1.5; }
        .bp-footer-right { text-align: right; }
        .bp-footer-center { text-align: center; font-style: italic; font-weight: bold; }

        @media print {
          @page { size: A4 portrait; margin: 6mm; }
          html, body { margin: 0; padding: 0; background: #fff; }
          body * { visibility: hidden; }
          .bulletin-print, .bulletin-print * { visibility: visible; }
          .bulletin-print {
            position: absolute; left: 0; top: 0;
            width: 100%; padding: 0 !important;
            font-size: 7.5px;
          }
          .bulletin-print table { page-break-inside: auto; }
          .bulletin-print tr { page-break-inside: avoid; }
        }
      `}</style>
    </div>
  );
}

/* ============================================================
   Petits composants
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