'use client';
import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { CLASSES } from '../lib/store';
import {
  CONTRACT_TYPES,
  DEPARTURE_REASONS,
  DIPLOMAS,
  STAFF_ROLES,
  STAFF_STATUS,
  STAFF_STATUS_COLORS,
  SUBJECTS,
  nextStaffMatricule,
  seniority,
  useStaff,
  type DepartureReason,
  type Staff,
  type StaffRole,
  type StaffStatus,
} from '../lib/staff';
import PrintListModal from '../components/PrintListModal';

const today = () => new Date().toISOString().slice(0, 10);

const ALL_CLASSES = Object.values(CLASSES).flat();

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

type FormState = Omit<Staff, 'id' | 'matricule' | 'createdAt' | 'departureDate' | 'departureReason' | 'departureNote' | 'replacedById' | 'replacesId'>;

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
  const [tab, setTab] = useState<'liste' | 'nouveau' | 'remplacements'>('liste');
  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [detail, setDetail] = useState<Staff | null>(null);
  const [showPrint, setShowPrint] = useState(false);
  const [departureFor, setDepartureFor] = useState<Staff | null>(null);

  const [fRole, setFRole] = useState('');
  const [fStatut, setFStatut] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), 3500);
    return () => clearTimeout(t);
  }, [message]);

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
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage({ type: 'error', text: 'Le fichier doit être une image.' });
      return;
    }
    if (file.size > 1024 * 1024) {
      setMessage({ type: 'error', text: 'Image trop lourde (max 1 Mo).' });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => updateForm({ photo: e.target?.result as string });
    reader.readAsDataURL(file);
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.prenom) {
      setMessage({ type: 'error', text: 'Nom et Prénom sont obligatoires.' });
      return;
    }

    if (editingId) {
      setStaff((list) => list.map((s) => (s.id === editingId ? { ...s, ...form } : s)));
      setMessage({ type: 'success', text: 'Fiche mise à jour.' });
      setEditingId(null);
      setForm(emptyForm);
      setTab('liste');
    } else {
      const nouveau: Staff = {
        ...form,
        id: crypto.randomUUID(),
        matricule: nextStaffMatricule(staff),
        createdAt: new Date().toISOString(),
      };
      setStaff((list) => [nouveau, ...list]);
      setMessage({ type: 'success', text: `Membre ajouté — ${nouveau.matricule}` });
      setForm(emptyForm);
      setTab('liste');
    }
  };

  const handleEdit = (s: Staff) => {
    const { id, matricule, createdAt, departureDate, departureReason, departureNote, replacedById, replacesId, ...rest } = s;
    setForm(rest);
    setEditingId(id);
    setTab('nouveau');
    setDetail(null);
  };

  const supprimer = (id: string) => {
    if (!confirm('Supprimer ce membre du personnel ?')) return;
    setStaff((list) => list.filter((x) => x.id !== id));
  };

  /* ---------- Signalement de départ ---------- */
  const handleDeparture = (replacement: Staff) => {
    if (!departureFor) return;
    // 1. Marquer l'ancien comme parti + lier au remplaçant
    setStaff((list) =>
      list.map((s) =>
        s.id === departureFor.id
          ? {
              ...s,
              statut: 'Parti' as StaffStatus,
              departureDate: replacement.dateEmbauche || today(),
              departureReason: replacementReasons.get(departureFor.id) || 'Démission',
              replacedById: replacement.id,
            }
          : s,
      ),
    );
    // 2. Ajouter le remplaçant + lier à l'ancien
    setStaff((list) => [
      { ...replacement, replacesId: departureFor.id },
      ...list,
    ]);
    setMessage({
      type: 'success',
      text: `Départ enregistré + remplaçant ${replacement.nom} ${replacement.prenom} ajouté.`,
    });
    setDepartureFor(null);
  };

  // Petit helper pour transporter la raison depuis le modal
  const replacementReasons = new Map<string, DepartureReason>();

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
    enseignants: staff.filter((s) => s.role === 'Enseignant' && s.statut !== 'Parti').length,
    admin: staff.filter((s) => s.role !== 'Enseignant' && s.statut !== 'Parti').length,
    actifs: staff.filter((s) => s.statut === 'Actif').length,
    partis: staff.filter((s) => s.statut === 'Parti').length,
  }), [staff]);

  /* Historique des remplacements */
  const replacements = useMemo(() => {
    const list: { from: Staff; to: Staff }[] = [];
    staff.forEach((s) => {
      if (s.statut === 'Parti' && s.replacedById) {
        const replacement = staff.find((x) => x.id === s.replacedById);
        if (replacement) list.push({ from: s, to: replacement });
      }
    });
    return list.sort((a, b) => (b.from.departureDate || '').localeCompare(a.from.departureDate || ''));
  }, [staff]);

  /* Impression */
  const printColumns = useMemo(() => [
    { key: 'num', label: 'N°', width: '5%', align: 'center' as const },
    { key: 'matricule', label: 'Matricule', width: '13%' },
    { key: 'nom', label: 'Nom complet', width: '30%' },
    { key: 'role', label: 'Rôle', width: '20%' },
    { key: 'telephone', label: 'Téléphone', width: '15%' },
    { key: 'embauche', label: 'Embauche', width: '10%', align: 'center' as const },
    { key: 'statut', label: 'Statut', width: '7%', align: 'center' as const },
  ], []);

  const printRows = useMemo(() => {
    return filtered
      .sort((a, b) => `${a.nom}${a.prenom}`.localeCompare(`${b.nom}${b.prenom}`))
      .map((s, i) => ({
        num: i + 1,
        matricule: s.matricule,
        nom: `${s.nom} ${s.postnom} ${s.prenom}`,
        role: s.role,
        telephone: s.telephone || '—',
        embauche: s.dateEmbauche || '—',
        statut: s.statut,
      }));
  }, [filtered]);

  const printSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (fRole) parts.push(`Rôle : ${fRole}`);
    if (fStatut) parts.push(`Statut : ${fStatut}`);
    if (search) parts.push(`Recherche : ${search}`);
    if (!parts.length) parts.push('Tout le personnel');
    return parts.join(' • ');
  }, [fRole, fStatut, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Personnel &amp; Enseignants</h1>
        <p className="text-sm text-slate-500">Gérez votre équipe pédagogique et administrative</p>
      </header>

      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Total" value={stats.total} accent="indigo" />
        <StatCard label="Enseignants" value={stats.enseignants} accent="emerald" />
        <StatCard label="Personnel admin." value={stats.admin} accent="pink" />
        <StatCard label="Actifs" value={stats.actifs} accent="amber" />
        <StatCard label="Partis" value={stats.partis} accent="red" />
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
        <TabBtn active={tab === 'liste'} onClick={() => { setTab('liste'); resetForm(); }}>
          👥 Liste du personnel
          <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{staff.length}</span>
        </TabBtn>
        <TabBtn active={tab === 'nouveau'} onClick={() => { setTab('nouveau'); if (!editingId) resetForm(); }}>
          {editingId ? '✏️ Modifier la fiche' : '➕ Nouveau membre'}
        </TabBtn>
        <TabBtn active={tab === 'remplacements'} onClick={() => setTab('remplacements')}>
          🔄 Remplacements
          {replacements.length > 0 && (
            <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{replacements.length}</span>
          )}
        </TabBtn>
      </div>

      {/* ============ LISTE ============ */}
      {tab === 'liste' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Field label="Rôle">
              <select className={inputCls} value={fRole} onChange={(e) => setFRole(e.target.value)}>
                <option value="">Tous les rôles</option>
                {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label="Statut">
              <select className={inputCls} value={fStatut} onChange={(e) => setFStatut(e.target.value)}>
                <option value="">Tous les statuts</option>
                {STAFF_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Recherche">
              <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom, matricule, spécialité..." />
            </Field>
            <div className="flex items-end justify-end gap-3">
              {(fRole || fStatut || search) && (
                <button onClick={() => { setFRole(''); setFStatut(''); setSearch(''); }} className="text-xs font-medium text-indigo-600 hover:underline">
                  Réinitialiser
                </button>
              )}
              <button
                onClick={() => setShowPrint(true)}
                disabled={filtered.length === 0}
                className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300"
              >
                🖨️ Imprimer
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <div className="mb-2 text-4xl">👨‍🏫</div>
              <p className="font-medium text-slate-700">Aucun membre trouvé</p>
            </div>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2 font-semibold">Photo</th>
                    <th className="px-3 py-2 font-semibold">Matricule</th>
                    <th className="px-3 py-2 font-semibold">Nom complet</th>
                    <th className="px-3 py-2 font-semibold">Rôle</th>
                    <th className="px-3 py-2 font-semibold">Embauche</th>
                    <th className="px-3 py-2 font-semibold">Ancienneté</th>
                    <th className="px-3 py-2 font-semibold">Statut</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((s) => (
                    <tr key={s.id} className={`border-b border-slate-100 hover:bg-slate-50 ${s.statut === 'Parti' ? 'opacity-60' : ''}`}>
                      <td className="px-3 py-2">
                        {s.photo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={s.photo} alt="" className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-100 text-sm font-semibold text-slate-500">
                            {s.nom.slice(0, 1)}{s.prenom.slice(0, 1)}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-500">{s.matricule}</td>
                      <td className="px-3 py-2 font-medium">
                        <button onClick={() => setDetail(s)} className="text-left hover:text-indigo-600 hover:underline">
                          {s.nom} {s.postnom} {s.prenom}
                        </button>
                        <div className="text-xs text-slate-400">{s.telephone || '—'}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                          {s.role}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-600">{s.dateEmbauche || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{seniority(s.dateEmbauche, s.departureDate)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${STAFF_STATUS_COLORS[s.statut]}`}>
                          {s.statut}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        {s.statut !== 'Parti' && (
                          <button
                            onClick={() => setDepartureFor(s)}
                            className="mr-3 text-xs font-medium text-orange-600 hover:underline"
                            title="Signaler un départ + remplaçant"
                          >
                            🔄 Départ
                          </button>
                        )}
                        <button onClick={() => handleEdit(s)} className="mr-3 text-xs font-medium text-indigo-600 hover:underline">
                          Modifier
                        </button>
                        <button onClick={() => supprimer(s.id)} className="text-xs font-medium text-red-500 hover:text-red-700">
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ============ FORMULAIRE ============ */}
      {tab === 'nouveau' && (
        <form onSubmit={handleSubmit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Identité</h2>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto,1fr]">
              <div className="flex flex-col items-center gap-2">
                {form.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.photo} alt="" className="h-28 w-28 rounded-2xl border border-slate-200 object-cover" />
                ) : (
                  <div className="grid h-28 w-28 place-items-center rounded-2xl bg-slate-100 text-4xl text-slate-400">👤</div>
                )}
                <label className="cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50">
                  📷 Photo
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handlePhoto(e.target.files?.[0])} />
                </label>
                {form.photo && (
                  <button type="button" onClick={() => updateForm({ photo: '' })} className="text-xs font-medium text-red-500 hover:underline">
                    Retirer
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Nom" required>
                  <input className={inputCls} value={form.nom} onChange={(e) => updateForm({ nom: e.target.value })} />
                </Field>
                <Field label="Postnom">
                  <input className={inputCls} value={form.postnom} onChange={(e) => updateForm({ postnom: e.target.value })} />
                </Field>
                <Field label="Prénom" required>
                  <input className={inputCls} value={form.prenom} onChange={(e) => updateForm({ prenom: e.target.value })} />
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
                  <input className={inputCls} value={form.lieuNaissance} onChange={(e) => updateForm({ lieuNaissance: e.target.value })} />
                </Field>
                <Field label="État civil">
                  <select className={inputCls} value={form.etatCivil} onChange={(e) => updateForm({ etatCivil: e.target.value as FormState['etatCivil'] })}>
                    <option value="Célibataire">Célibataire</option>
                    <option value="Marié(e)">Marié(e)</option>
                    <option value="Divorcé(e)">Divorcé(e)</option>
                    <option value="Veuf(ve)">Veuf(ve)</option>
                  </select>
                </Field>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Coordonnées</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label="Téléphone">
                <input className={inputCls} value={form.telephone} onChange={(e) => updateForm({ telephone: e.target.value })} placeholder="+243 …" />
              </Field>
              <Field label="Email">
                <input type="email" className={inputCls} value={form.email} onChange={(e) => updateForm({ email: e.target.value })} />
              </Field>
              <Field label="Adresse">
                <input className={inputCls} value={form.adresse} onChange={(e) => updateForm({ adresse: e.target.value })} />
              </Field>
              <Field label="Contact d'urgence">
                <input className={inputCls} value={form.contactUrgence} onChange={(e) => updateForm({ contactUrgence: e.target.value })} />
              </Field>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Informations professionnelles</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Field label="Rôle" required>
                <select className={inputCls} value={form.role} onChange={(e) => updateForm({ role: e.target.value as StaffRole })}>
                  {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Field>
              <Field label="Date d'embauche">
                <input type="date" className={inputCls} value={form.dateEmbauche} onChange={(e) => updateForm({ dateEmbauche: e.target.value })} />
              </Field>
              <Field label="Type de contrat">
                <select className={inputCls} value={form.typeContrat} onChange={(e) => updateForm({ typeContrat: e.target.value as FormState['typeContrat'] })}>
                  {CONTRACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Diplôme le plus élevé">
                <select className={inputCls} value={form.diplome} onChange={(e) => updateForm({ diplome: e.target.value })}>
                  <option value="">— Choisir —</option>
                  {DIPLOMAS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Spécialité">
                <input className={inputCls} value={form.specialite} onChange={(e) => updateForm({ specialite: e.target.value })} />
              </Field>
              <Field label="Statut">
                <select className={inputCls} value={form.statut} onChange={(e) => updateForm({ statut: e.target.value as StaffStatus })}>
                  {STAFF_STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Affectation pédagogique</h2>
            <Field label="Classes assignées">
              <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                {ALL_CLASSES.map((c) => {
                  const on = form.classesAssignees.includes(c);
                  return (
                    <button key={c} type="button" onClick={() => toggleClass(c)}
                      className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                        on ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                      }`}>
                      {c}
                    </button>
                  );
                })}
              </div>
            </Field>

            <div className="mt-4">
              <Field label="Cours enseignés">
                <div className="flex flex-wrap gap-1.5 rounded-lg border border-slate-200 bg-slate-50 p-2">
                  {SUBJECTS.map((c) => {
                    const on = form.coursAssignes.includes(c);
                    return (
                      <button key={c} type="button" onClick={() => toggleCours(c)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          on ? 'bg-emerald-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}>
                        {c}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Notes internes</h2>
            <textarea rows={3} className={inputCls} value={form.notes} onChange={(e) => updateForm({ notes: e.target.value })} placeholder="Observations, remarques..." />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Réinitialiser
            </button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">
              {editingId ? 'Enregistrer les modifications' : 'Ajouter le membre'}
            </button>
          </div>
        </form>
      )}

      {/* ============ REMPLACEMENTS ============ */}
      {tab === 'remplacements' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            🎯 Cette page liste tous les <b>départs</b> et leur <b>remplaçant</b>. Pour signaler un nouveau départ,
            retournez dans la <b>Liste du personnel</b> et cliquez sur <b>🔄 Départ</b> sur la ligne du membre.
          </div>

          {replacements.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
              <div className="mb-2 text-4xl">🔄</div>
              <p className="font-medium text-slate-700">Aucun remplacement enregistré</p>
              <p className="mt-1 text-sm">
                Cliquez sur <b>🔄 Départ</b> sur un membre de la liste pour signaler son départ et enregistrer son remplaçant.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-semibold">🔄 Historique des remplacements ({replacements.length})</h2>
              <ul className="space-y-4">
                {replacements.map(({ from, to }, i) => (
                  <li key={i} className="rounded-xl border border-slate-200 p-4">
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-800">
                        {from.role} — {from.nom} {from.postnom} {from.prenom}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="rounded-full bg-red-100 px-2 py-0.5 font-medium text-red-800">
                          Parti le {from.departureDate || '—'}
                        </span>
                        {from.departureReason && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                            {from.departureReason}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr,auto,1fr] md:items-center">
                      <div className="rounded-lg bg-red-50/60 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-red-700">Avant</p>
                        <p className="text-sm font-medium">{from.nom} {from.prenom}</p>
                        <p className="font-mono text-[11px] text-slate-500">{from.matricule}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Embauche : {from.dateEmbauche || '—'} — Ancienneté : {seniority(from.dateEmbauche, from.departureDate)}
                        </p>
                      </div>
                      <div className="text-center text-2xl text-slate-400">→</div>
                      <div className="rounded-lg bg-emerald-50/60 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-emerald-700">Après</p>
                        <p className="text-sm font-medium">{to.nom} {to.prenom}</p>
                        <p className="font-mono text-[11px] text-slate-500">{to.matricule}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          Embauche : {to.dateEmbauche || '—'} — {to.telephone || 'Sans tél.'}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ============ MODAL DÉTAIL ============ */}
      {detail && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4" onClick={() => setDetail(null)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
              <div className="flex items-center gap-4">
                {detail.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={detail.photo} alt="" className="h-16 w-16 rounded-2xl object-cover" />
                ) : (
                  <div className="grid h-16 w-16 place-items-center rounded-2xl bg-slate-200 text-2xl text-slate-500">
                    {detail.nom.slice(0, 1)}{detail.prenom.slice(0, 1)}
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-bold">{detail.nom} {detail.postnom} {detail.prenom}</h3>
                  <p className="text-xs text-slate-500">{detail.role} • Matricule {detail.matricule}</p>
                  <div className="mt-2">
                    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STAFF_STATUS_COLORS[detail.statut]}`}>
                      {detail.statut}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setDetail(null)} className="text-slate-400 hover:text-slate-700">✕</button>
            </div>

            <div className="space-y-5 p-5 text-sm">
              <Section title="Identité">
                <Info label="Sexe" value={detail.sexe === 'M' ? 'Masculin' : 'Féminin'} />
                <Info label="Naissance" value={detail.dateNaissance ? `${detail.dateNaissance} à ${detail.lieuNaissance}` : '—'} />
                <Info label="État civil" value={detail.etatCivil} />
              </Section>

              <Section title="Coordonnées">
                <Info label="Téléphone" value={detail.telephone || '—'} />
                <Info label="Email" value={detail.email || '—'} />
                <Info label="Adresse" value={detail.adresse || '—'} />
                <Info label="Contact urgence" value={detail.contactUrgence || '—'} />
              </Section>

              <Section title="Carrière">
                <Info label="Date d'embauche" value={detail.dateEmbauche || '—'} />
                <Info label="Ancienneté" value={seniority(detail.dateEmbauche, detail.departureDate)} />
                <Info label="Contrat" value={detail.typeContrat} />
                <Info label="Diplôme" value={detail.diplome || '—'} />
                <Info label="Spécialité" value={detail.specialite || '—'} />
              </Section>

              {detail.statut === 'Parti' && (
                <Section title="Départ">
                  <Info label="Date de départ" value={detail.departureDate || '—'} />
                  <Info label="Motif" value={detail.departureReason || '—'} />
                </Section>
              )}

              {detail.classesAssignees.length > 0 && (
                <Section title="Classes assignées">
                  <div className="col-span-2 flex flex-wrap gap-1.5">
                    {detail.classesAssignees.map((c) => (
                      <span key={c} className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">{c}</span>
                    ))}
                  </div>
                </Section>
              )}

              {detail.coursAssignes.length > 0 && (
                <Section title="Cours enseignés">
                  <div className="col-span-2 flex flex-wrap gap-1.5">
                    {detail.coursAssignes.map((c) => (
                      <span key={c} className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">{c}</span>
                    ))}
                  </div>
                </Section>
              )}

              {detail.notes && (
                <Section title="Notes internes">
                  <p className="col-span-2 whitespace-pre-wrap text-slate-700">{detail.notes}</p>
                </Section>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
              {detail.statut !== 'Parti' && (
                <button
                  onClick={() => { setDepartureFor(detail); setDetail(null); }}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-700"
                >
                  🔄 Signaler un départ
                </button>
              )}
              <button onClick={() => setDetail(null)} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
                Fermer
              </button>
              <button onClick={() => handleEdit(detail)} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                ✏️ Modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL DÉPART + REMPLAÇANT ============ */}
      {departureFor && (
        <DepartureModal
          leaving={departureFor}
          existingStaff={staff}
          onClose={() => setDepartureFor(null)}
          onConfirm={(replacement, reason) => {
            replacementReasons.set(departureFor.id, reason);
            handleDeparture(replacement);
          }}
        />
      )}

      {/* ============ IMPRESSION ============ */}
      {showPrint && (
        <PrintListModal
          title="Liste du personnel & enseignants"
          subtitle={printSubtitle}
          columns={printColumns}
          rows={printRows}
          extraInfo={`${printRows.length} membre(s) — Document généré automatiquement`}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

/* ============================================================
   MODAL DÉPART + REMPLAÇANT
   ============================================================ */
function DepartureModal({
  leaving, existingStaff, onClose, onConfirm,
}: {
  leaving: Staff;
  existingStaff: Staff[];
  onClose: () => void;
  onConfirm: (replacement: Staff, reason: DepartureReason) => void;
}) {
  const [reason, setReason] = useState<DepartureReason>('Démission');
  const [departureNote, setDepartureNote] = useState('');

  /* Pré-remplir le remplaçant avec les mêmes infos que le partant */
  const [rep, setRep] = useState({
    nom: '',
    postnom: '',
    prenom: '',
    sexe: 'M' as 'M' | 'F',
    telephone: '',
    email: '',
    role: leaving.role,
    typeContrat: leaving.typeContrat,
    specialite: leaving.specialite,
    dateEmbauche: today(),
    classesAssignees: [...leaving.classesAssignees],
    coursAssignes: [...leaving.coursAssignes],
  });

  const [error, setError] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!rep.nom.trim() || !rep.prenom.trim()) {
      setError('Nom et Prénom du remplaçant obligatoires.');
      return;
    }
    const replacement: Staff = {
      id: crypto.randomUUID(),
      matricule: nextStaffMatricule(existingStaff),
      photo: '',
      nom: rep.nom.trim(),
      postnom: rep.postnom.trim(),
      prenom: rep.prenom.trim(),
      sexe: rep.sexe,
      dateNaissance: '',
      lieuNaissance: '',
      etatCivil: 'Célibataire',
      telephone: rep.telephone.trim(),
      email: rep.email.trim(),
      adresse: '',
      contactUrgence: '',
      role: rep.role,
      dateEmbauche: rep.dateEmbauche,
      typeContrat: rep.typeContrat,
      diplome: '',
      specialite: rep.specialite,
      statut: 'Actif',
      classesAssignees: rep.classesAssignees,
      coursAssignes: rep.coursAssignes,
      notes: `Remplaçant de ${leaving.nom} ${leaving.prenom} (${leaving.matricule}). Motif du départ : ${reason}.${departureNote ? ` Note : ${departureNote}` : ''}`,
      replacesId: leaving.id,
      createdAt: new Date().toISOString(),
    };
    onConfirm(replacement, reason);
  };

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/60 p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-200 bg-gradient-to-br from-orange-50 to-red-50 px-5 py-4">
          <h3 className="font-semibold text-orange-900">🔄 Signaler un départ & enregistrer le remplaçant</h3>
          <p className="text-xs text-slate-600">
            {leaving.nom} {leaving.postnom} {leaving.prenom} — {leaving.role}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-5">
          {/* Détails du départ */}
          <section>
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              📌 Détails du départ
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Motif *</span>
                <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value as DepartureReason)}>
                  {DEPARTURE_REASONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Note (optionnel)</span>
                <input className={inputCls} value={departureNote} onChange={(e) => setDepartureNote(e.target.value)} placeholder="Ex : a démissionné en bons termes" />
              </label>
            </div>
          </section>

          {/* Remplacement */}
          <section className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4">
            <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-emerald-800">
              👤 Fiche du remplaçant
            </h4>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Nom *</span>
                <input className={inputCls} value={rep.nom} onChange={(e) => setRep({ ...rep, nom: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Postnom</span>
                <input className={inputCls} value={rep.postnom} onChange={(e) => setRep({ ...rep, postnom: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Prénom *</span>
                <input className={inputCls} value={rep.prenom} onChange={(e) => setRep({ ...rep, prenom: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Sexe</span>
                <select className={inputCls} value={rep.sexe} onChange={(e) => setRep({ ...rep, sexe: e.target.value as 'M' | 'F' })}>
                  <option value="M">Masculin</option>
                  <option value="F">Féminin</option>
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Téléphone</span>
                <input className={inputCls} value={rep.telephone} onChange={(e) => setRep({ ...rep, telephone: e.target.value })} placeholder="+243 …" />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Email</span>
                <input className={inputCls} value={rep.email} onChange={(e) => setRep({ ...rep, email: e.target.value })} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Rôle</span>
                <select className={inputCls} value={rep.role} onChange={(e) => setRep({ ...rep, role: e.target.value as StaffRole })}>
                  {STAFF_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Contrat</span>
                <select className={inputCls} value={rep.typeContrat} onChange={(e) => setRep({ ...rep, typeContrat: e.target.value as FormState['typeContrat'] })}>
                  {CONTRACT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Date d&apos;embauche</span>
                <input type="date" className={inputCls} value={rep.dateEmbauche} onChange={(e) => setRep({ ...rep, dateEmbauche: e.target.value })} />
              </label>
              <div className="md:col-span-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Spécialité</span>
                  <input className={inputCls} value={rep.specialite} onChange={(e) => setRep({ ...rep, specialite: e.target.value })} />
                </label>
              </div>
            </div>

            <p className="mt-3 text-xs text-emerald-700">
              💡 Les <b>classes</b> et <b>cours</b> du partant ont été copiés automatiquement.
              Vous pourrez les modifier après.
            </p>
          </section>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800">❌ {error}</div>
          )}

          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-xs text-blue-800">
            ✅ À la validation : <b>{leaving.nom} {leaving.prenom}</b> sera marqué <b>Parti</b> et
            le remplaçant sera <b>automatiquement ajouté</b> à la liste du personnel.
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
              Annuler
            </button>
            <button type="submit" className="rounded-lg bg-orange-600 px-5 py-2 text-sm font-semibold text-white hover:bg-orange-700">
              🔄 Valider le remplacement
            </button>
          </div>
        </form>
      </div>
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

function StatCard({ label, value, accent }: { label: string; value: number; accent: 'indigo' | 'pink' | 'emerald' | 'amber' | 'red' }) {
  const colors: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600',
    pink: 'from-pink-500 to-pink-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className={`mb-3 h-1.5 w-10 rounded-full bg-gradient-to-r ${colors[accent]}`} />
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold sm:text-3xl">{value}</p>
    </div>
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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</h4>
      <div className="grid grid-cols-1 gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-3 sm:grid-cols-2">
        {children}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="text-sm">
      <span className="text-xs text-slate-500">{label}</span>
      <p className="font-medium text-slate-800">{value}</p>
    </div>
  );
}