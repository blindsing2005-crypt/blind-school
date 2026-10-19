'use client';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { useSchoolSettings } from '../lib/store';
import {
  CONTRACT_TYPES,
  DIPLOMAS,
  STAFF_ROLES,
  STAFF_STATUS,
  STAFF_STATUS_COLORS,
  SUBJECTS,
  nextStaffMatricule,
  seniority,
  useStaff,
  type Staff,
  type StaffRole,
  type StaffStatus,
} from '../lib/staff';
import PrintListModal from '../components/PrintListModal';

const today = () => new Date().toISOString().slice(0, 10);

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

type FormState = Omit<Staff, 'id' | 'matricule' | 'createdAt'>;

const emptyForm: FormState = {
  photo: '',
  nom: '', postnom: '', prenom: '',
  sexe: 'M',
  dateNaissance: '', lieuNaissance: '',
  etatCivil: 'Célibataire',
  telephone: '', email: '', adresse: '', contactUrgence: '',
  role: 'Enseignant',
  dateEmbauche: today(),
  typeContrat: 'CDI',
  diplome: '', specialite: '',
  statut: 'Actif',
  classesAssignees: [], coursAssignes: [],
  notes: '',
};

export default function PersonnelPage() {
  const [staff, setStaff] = useStaff();
  const [settings] = useSchoolSettings();
  const [tab, setTab] = useState<'liste' | 'nouveau'>('liste');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detail, setDetail] = useState<Staff | null>(null);
  const [showPrint, setShowPrint] = useState(false);

  const [fRole, setFRole] = useState('');
  const [fStatut, setFStatut] = useState('');
  const [search, setSearch] = useState('');

  // 🆕 Classes dynamiques
  const allClasses = useMemo(() => Object.values(settings.classes || {}).flat(), [settings.classes]);

  const updateForm = (patch: Partial<FormState>) => setForm((f) => ({ ...f, ...patch }));
  const toggleClass = (c: string) =>
    updateForm({
      classesAssignees: form.classesAssignees.includes(c)
        ? form.classesAssignees.filter((x) => x !== c)
        : [...form.classesAssignees, c],
    });
  const toggleCours = (c: string) =>
    updateForm({
      coursAssignes: form.coursAssignes.includes(c)
        ? form.coursAssignes.filter((x) => x !== c)
        : [...form.coursAssignes, c],
    });

  const handlePhoto = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/') || file.size > 1024 * 1024) { setMessage({ type: 'error', text: 'Image max 1Mo.' }); return; }
    const reader = new FileReader();
    reader.onload = (e) => updateForm({ photo: e.target?.result as string });
    reader.readAsDataURL(file);
  };

  const resetForm = () => { setForm(emptyForm); setEditingId(null); };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.prenom) { setMessage({ type: 'error', text: 'Nom et Prénom sont obligatoires.' }); return; }

    if (editingId) {
      setStaff((list) => list.map((s) => (s.id === editingId ? { ...s, ...form } : s)));
      setMessage({ type: 'success', text: 'Fiche mise à jour.' });
      setEditingId(null); setForm(emptyForm); setTab('liste');
    } else {
      const nouveau: Staff = { ...form, id: crypto.randomUUID(), matricule: nextStaffMatricule(staff), createdAt: new Date().toISOString() };
      setStaff((list) => [nouveau, ...list]);
      setMessage({ type: 'success', text: `Membre ajouté — ${nouveau.matricule}` });
      setForm(emptyForm); setTab('liste');
    }
  };

  const handleEdit = (s: Staff) => {
    const { id, matricule, createdAt, ...rest } = s;
    setForm(rest); setEditingId(id); setTab('nouveau'); setDetail(null);
  };

  const supprimer = (id: string) => {
    if (!confirm('Supprimer ce membre du personnel ?')) return;
    setStaff((list) => list.filter((x) => x.id !== id));
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (fRole && s.role !== fRole) return false;
      if (fStatut && s.statut !== fStatut) return false;
      if (q) {
        const hay = `${s.nom} ${s.postnom} ${s.prenom} ${s.matricule} ${s.specialite}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [staff, fRole, fStatut, search]);

  const stats = useMemo(() => ({
    total: staff.length,
    enseignants: staff.filter((s) => s.role === 'Enseignant').length,
    admin: staff.filter((s) => s.role !== 'Enseignant').length,
    actifs: staff.filter((s) => s.statut === 'Actif').length,
  }), [staff]);

  const printColumns = [
    { key: 'num', label: 'N°', width: '5%', align: 'center' as const },
    { key: 'matricule', label: 'Matricule', width: '13%' },
    { key: 'nom', label: 'Nom complet', width: '30%' },
    { key: 'role', label: 'Rôle', width: '20%' },
    { key: 'telephone', label: 'Téléphone', width: '15%' },
    { key: 'embauche', label: 'Embauche', width: '10%', align: 'center' as const },
    { key: 'statut', label: 'Statut', width: '7%', align: 'center' as const },
  ];

  const printRows = filtered.sort((a, b) => `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`)).map((s, i) => ({
    num: i + 1,
    matricule: s.matricule,
    nom: `${s.nom} ${s.postnom} ${s.prenom}`,
    role: s.role,
    telephone: s.telephone || '—',
    embauche: s.dateEmbauche || '—',
    statut: s.statut,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Personnel &amp; Enseignants</h1>
        <p className="text-sm text-slate-500">Gérez votre équipe pédagogique et administrative</p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total membres" value={stats.total} accent="indigo" />
        <StatCard label="Enseignants" value={stats.enseignants} accent="emerald" />
        <StatCard label="Personnel admin." value={stats.admin} accent="pink" />
        <StatCard label="Actifs" value={stats.actifs} accent="amber" />
      </section>

      {message && (
        <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${message.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        <TabBtn active={tab === 'liste'} onClick={() => { setTab('liste'); resetForm(); }}>
          👥 Liste du personnel <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{staff.length}</span>
        </TabBtn>
        <TabBtn active={tab === 'nouveau'} onClick={() => { setTab('nouveau'); if (!editingId) resetForm(); }}>
          {editingId ? '✏️ Modifier la fiche' : '➕ Nouveau membre'}
        </TabBtn>
      </div>

      {tab === 'liste' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Rôle">
              <select className={inputCls} value={fRole} onChange={(e) => setFRole(e.target.value)}>
                <option value="">Tous les rôles</option>{STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Statut">
              <select className={inputCls} value={fStatut} onChange={(e) => setFStatut(e.target.value)}>
                <option value="">Tous les statuts</option>{STAFF_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Recherche">
              <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, matricule..." />
            </Field>
            <div className="flex items-end justify-end gap-3">
              {(fRole || fStatut || search) && <button onClick={() => { setFRole(''); setFStatut(''); setSearch(''); }} className="text-xs font-medium text-indigo-600 hover:underline">Réinitialiser</button>}
              <button onClick={() => setShowPrint(true)} disabled={filtered.length === 0} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300">🖨️ Imprimer</button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500"><div className="mb-2 text-4xl">👨‍🏫</div><p className="font-medium text-slate-700">Aucun membre trouvé</p></div>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500"><th className="px-3 py-2">Photo</th><th className="px-3 py-2">Matricule</th><th className="px-3 py-2">Nom complet</th><th className="px-3 py-2">Rôle</th><th className="px-3 py-2">Embauche</th><th className="px-3 py-2">Ancienneté</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2"></th></tr></thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-3 py-2">{s.photo ? <img src={s.photo} alt="" className="h-10 w-10 rounded-full object-cover" /> : <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">{s.nom.slice(0, 1)}{s.prenom.slice(0, 1)}</div>}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">{s.matricule}</td>
                      <td className="px-3 py-2 font-medium"><button onClick={() => setDetail(s)} className="text-left hover:text-indigo-600 hover:underline">{s.nom} {s.postnom} {s.prenom}</button><div className="text-xs text-slate-400">{s.telephone || '—'}</div></td>
                      <td className="px-3 py-2"><span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{s.role}</span></td>
                      <td className="px-3 py-2 text-slate-600">{s.dateEmbauche || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{seniority(s.dateEmbauche)}</td>
                      <td className="px-3 py-2"><span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STAFF_STATUS_COLORS[s.statut]}`}>{s.statut}</span></td>
                      <td className="px-3 py-2 text-right whitespace-nowrap"><button onClick={() => handleEdit(s)} className="mr-3 text-xs font-medium text-indigo-600 hover:underline">Modifier</button><button onClick={() => supprimer(s.id)} className="text-xs font-medium text-red-500 hover:text-red-700">Supprimer</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'nouveau' && (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Identité</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto,1fr]">
              <div className="flex flex-col items-center gap-2">
                {form.photo ? <img src={form.photo} alt="" className="h-28 w-28 rounded-2xl border border-slate-200 object-cover" /> : <div className="grid h-28 w-28 place-items-center rounded-2xl bg-slate-100 text-4xl text-slate-400">👤</div>}
                <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">📷 Photo<input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0])} /></label>
                {form.photo && <button type="button" onClick={() => updateForm({ photo: '' })} className="text-xs font-medium text-red-500 hover:underline">Retirer</button>}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Nom" required><input className={inputCls} value={form.nom} onChange={(e) => updateForm({ nom: e.target.value })} /></Field>
                <Field label="Postnom"><input className={inputCls} value={form.postnom} onChange={(e) => updateForm({ postnom: e.target.value })} /></Field>
                <Field label="Prénom" required><input className={inputCls} value={form.prenom} onChange={(e) => updateForm({ prenom: e.target.value })} /></Field>
                <Field label="Sexe"><select className={inputCls} value={form.sexe} onChange={(e) => updateForm({ sexe: e.target.value as 'M' | 'F' })}><option value="M">Masculin</option><option value="F">Féminin</option></select></Field>
                <Field label="Date de naissance"><input type="date" className={inputCls} value={form.dateNaissance} onChange={(e) => updateForm({ dateNaissance: e.target.value })} /></Field>
                <Field label="Lieu de naissance"><input className={inputCls} value={form.lieuNaissance} onChange={(e) => updateForm({ lieuNaissance: e.target.value })} /></Field>
                <Field label="État civil"><select className={inputCls} value={form.etatCivil} onChange={(e) => updateForm({ etatCivil: e.target.value as any })}><option value="Célibataire">Célibataire</option><option value="Marié(e)">Marié(e)</option><option value="Divorcé(e)">Divorcé(e)</option><option value="Veuf(ve)">Veuf(ve)</option></select></Field>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Coordonnées</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Téléphone"><input className={inputCls} value={form.telephone} onChange={(e) => updateForm({ telephone: e.target.value })} /></Field>
              <Field label="Email"><input type="email" className={inputCls} value={form.email} onChange={(e) => updateForm({ email: e.target.value })} /></Field>
              <Field label="Adresse"><input className={inputCls} value={form.adresse} onChange={(e) => updateForm({ adresse: e.target.value })} /></Field>
              <Field label="Contact d'urgence"><input className={inputCls} value={form.contactUrgence} onChange={(e) => updateForm({ contactUrgence: e.target.value })} /></Field>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Informations professionnelles</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Rôle" required><select className={inputCls} value={form.role} onChange={(e) => updateForm({ role: e.target.value as StaffRole })}>{STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}</select></Field>
              <Field label="Date d'embauche"><input type="date" className={inputCls} value={form.dateEmbauche} onChange={(e) => updateForm({ dateEmbauche: e.target.value })} /></Field>
              <Field label="Type de contrat"><select className={inputCls} value={form.typeContrat} onChange={(e) => updateForm({ typeContrat: e.target.value as any })}>{CONTRACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}</select></Field>
              <Field label="Diplôme le plus élevé"><select className={inputCls} value={form.diplome} onChange={(e) => updateForm({ diplome: e.target.value })}><option value="">— Choisir —</option>{DIPLOMAS.map((d) => <option key={d} value={d}>{d}</option>)}</select></Field>
              <Field label="Spécialité"><input className={inputCls} value={form.specialite} onChange={(e) => updateForm({ specialite: e.target.value })} /></Field>
              <Field label="Statut"><select className={inputCls} value={form.statut} onChange={(e) => updateForm({ statut: e.target.value as StaffStatus })}>{STAFF_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}</select></Field>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Affectation pédagogique</h2>
            <Field label="Classes assignées">
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                {allClasses.map((c) => {
                  const on = form.classesAssignees.includes(c);
                  return (<button key={c} type="button" onClick={() => toggleClass(c)} className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${on ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>{c}</button>);
                })}
              </div>
            </Field>
            <div className="mt-4">
              <Field label="Cours enseignés">
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  {SUBJECTS.map((c) => {
                    const on = form.coursAssignes.includes(c);
                    return (<button key={c} type="button" onClick={() => toggleCours(c)} className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${on ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'}`}>{c}</button>);
                  })}
                </div>
              </Field>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Notes internes</h2>
            <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} placeholder="Observations..." />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Réinitialiser</button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">{editingId ? 'Enregistrer' : 'Ajouter le membre'}</button>
          </div>
        </form>
      )}

      {detail && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={() => setDetail(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-4">
                {detail.photo ? <img src={detail.photo} alt="" className="h-16 w-16 rounded-2xl object-cover" /> : <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-200 text-2xl text-slate-500">{detail.nom.slice(0, 1)}{detail.prenom.slice(0, 1)}</div>}
                <div><h3 className="text-lg font-bold">{detail.nom} {detail.postnom} {detail.prenom}</h3><p className="text-xs text-slate-500">{detail.role} • {detail.matricule}</p></div>
              </div>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>
            <div className="space-y-5 p-5 text-sm">
              <Section title="Identité"><Info label="Sexe" value={detail.sexe === 'M' ? 'Masculin' : 'Féminin'} /><Info label="Naissance" value={detail.dateNaissance || '—'} /><Info label="État civil" value={detail.etatCivil} /></Section>
              <Section title="Coordonnées"><Info label="Téléphone" value={detail.telephone || '—'} /><Info label="Email" value={detail.email || '—'} /><Info label="Adresse" value={detail.adresse || '—'} /></Section>
              <Section title="Carrière"><Info label="Embauche" value={detail.dateEmbauche || '—'} /><Info label="Ancienneté" value={seniority(detail.dateEmbauche)} /><Info label="Contrat" value={detail.typeContrat} /><Info label="Diplôme" value={detail.diplome || '—'} /></Section>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button onClick={() => setDetail(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700">Fermer</button>
              <button onClick={() => handleEdit(detail)} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white">✏️ Modifier</button>
            </div>
          </div>
        </div>
      )}

      {showPrint && <PrintListModal title="Liste du personnel" subtitle="Tous les membres" columns={printColumns} rows={printRows} extraInfo={`${printRows.length} membre(s)`} onClose={() => setShowPrint(false)} />}
    </div>
  );
}

function Field({ label, children, required }: any) { return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">{label} {required && <span className="text-red-500">*</span>}</span>{children}</label>; }
function StatCard({ label, value, accent }: any) { const colors: any = { indigo: 'from-indigo-500 to-indigo-600', pink: 'from-pink-500 to-pink-600', emerald: 'from-emerald-500 to-emerald-600', amber: 'from-amber-500 to-amber-600' }; return <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className={`mb-3 h-1.5 w-10 rounded-full bg-gradient-to-r ${colors[accent]}`} /><p className="text-xs font-medium text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold sm:text-3xl">{value}</p></div>; }
function TabBtn({ active, onClick, children }: any) { return <button onClick={onClick} className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition ${active ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{children}</button>; }
function Section({ title, children }: any) { return (<div><h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h4><div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3 sm:grid-cols-2">{children}</div></div>); }
function Info({ label, value }: any) { return (<div className="text-sm"><span className="text-xs text-slate-500">{label}</span><p className="font-medium text-slate-800">{value}</p></div>); }