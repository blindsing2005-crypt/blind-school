'use client';
import { useEffect, useRef, useState } from 'react';
import {
  useSchoolSettings,
  useSchoolYears,
  useActiveYearId,
  useActiveYear,
  DEFAULT_CLASSES,
  DEFAULT_OPTIONS,
  formatMoney,
  type TrancheSetting,
  type SchoolYear,
  type Niveau,
} from '../lib/store';

const STORAGE_KEYS_ALL: { key: string; label: string; icon: string }[] = [
  { key: 'blind-school-students',              label: 'Élèves',              icon: '👥' },
  { key: 'blind-school-payments',              label: 'Paiements',           icon: '💳' },
  { key: 'blind-school-expenses',              label: 'Dépenses',            icon: '💸' },
  { key: 'blind-school-settings',              label: 'Infos école',         icon: '🏫' },
  { key: 'blind-school-years',                 label: 'Années scolaires',    icon: '📅' },
  { key: 'blind-school-staff',                 label: 'Personnel',           icon: '👨‍🏫' },
  { key: 'blind-school-bulletin-templates-v2', label: 'Modèles bulletins',   icon: '🧩' },
  { key: 'blind-school-bulletin-grades-v2',    label: 'Notes bulletins',     icon: '✍️' },
  { key: 'blind-school-bulletin-conduite-v2',  label: 'Conduite',            icon: '📋' },
  { key: 'blind-school-bulletin-config-v2',    label: 'Config bulletins',    icon: '⚙️' },
  { key: 'blind-school-events',                label: 'Événements',          icon: '📅' },
  { key: 'blind-school-journey',               label: 'Parcours école',      icon: '📜' },
];

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400';

export default function ParametresPage() {
  const [tab, setTab] = useState<'annee' | 'ecole' | 'classes' | 'sauvegarde' | 'reinit'>('annee');

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
        <p className="text-sm text-slate-500">
          Année scolaire, école, classes, sauvegarde et gestion des données
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        <TabBtn active={tab === 'annee'} onClick={() => setTab('annee')}>📅 Année</TabBtn>
        <TabBtn active={tab === 'ecole'} onClick={() => setTab('ecole')}>🏫 École &amp; Minerval</TabBtn>
        <TabBtn active={tab === 'classes'} onClick={() => setTab('classes')}>🏫 Classes &amp; Options</TabBtn>
        <TabBtn active={tab === 'sauvegarde'} onClick={() => setTab('sauvegarde')}>💾 Sauvegarde</TabBtn>
        <TabBtn active={tab === 'reinit'} onClick={() => setTab('reinit')}>⚠️ Réinitialisation</TabBtn>
      </div>

      {tab === 'annee' && <AnneeTab />}
      {tab === 'ecole' && <EcoleTab />}
      {tab === 'classes' && <ClassesTab />}
      {tab === 'sauvegarde' && <SauvegardeTab />}
      {tab === 'reinit' && <ReinitTab />}
    </div>
  );
}

/* ============================================================
   ONGLET 1 — ANNÉE SCOLAIRE
   ============================================================ */
function AnneeTab() {
  const [years, setYears] = useSchoolYears();
  const [activeId, setActiveId] = useActiveYearId();
  const activeYear = useActiveYear();

  const [newYear, setNewYear] = useState({ label: '', startDate: '', endDate: '' });
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 3000);
    return () => clearTimeout(t);
  }, [msg]);

  useEffect(() => {
    if (years.length > 0 || newYear.label) return;
    const y = new Date().getFullYear();
    setNewYear({ label: `${y} - ${y + 1}`, startDate: `${y}-09-01`, endDate: `${y + 1}-07-15` });
  }, [years.length, newYear.label]);

  const handleCreate = () => {
    if (!newYear.label.trim() || !newYear.startDate || !newYear.endDate) {
      setMsg({ type: 'error', text: 'Remplissez tous les champs.' }); return;
    }
    if (newYear.endDate <= newYear.startDate) {
      setMsg({ type: 'error', text: 'La date de fin doit être après le début.' }); return;
    }
    const year: SchoolYear = {
      id: crypto.randomUUID(), label: newYear.label.trim(), startDate: newYear.startDate, endDate: newYear.endDate, status: years.length === 0 ? 'active' : 'planned', createdAt: new Date().toISOString(), closedAt: '',
    };
    setYears((list) => [...list, year]);
    if (years.length === 0) setActiveId(year.id);
    setNewYear({ label: '', startDate: '', endDate: '' });
    setMsg({ type: 'success', text: `Année « ${year.label} » créée.` });
  };

  const handleActivate = (id: string) => {
    if (!confirm('Activer cette année ?')) return;
    setYears((list) => list.map((y) => y.id === id ? { ...y, status: 'active' } : y.status === 'active' ? { ...y, status: 'closed', closedAt: new Date().toISOString() } : y));
    setActiveId(id);
    setMsg({ type: 'success', text: 'Année activée.' });
  };

  const handleDelete = (id: string) => {
    if (id === activeId) { alert('Impossible de supprimer l\'année active.'); return; }
    if (!confirm('Supprimer cette année ?')) return;
    setYears((list) => list.filter((y) => y.id !== id));
  };

  const sortedYears = [...years].sort((a, b) => b.startDate.localeCompare(a.startDate));

  return (
    <div className="space-y-6">
      {activeYear ? (
        <section className="rounded-2xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">🟢 Année scolaire active</p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">{activeYear.label}</p>
              <p className="mt-1 text-sm text-emerald-700">Du {new Date(activeYear.startDate).toLocaleDateString('fr-FR')} au {new Date(activeYear.endDate).toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-emerald-700">Progression</p>
              <p className="text-lg font-bold text-emerald-900">
                {(() => {
                  const start = new Date(activeYear.startDate).getTime();
                  const end = new Date(activeYear.endDate).getTime();
                  const now = Date.now();
                  if (now < start) return '0%';
                  if (now > end) return '100%';
                  return Math.round(((now - start) / (end - start)) * 100) + '%';
                })()}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <section className="rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 text-center">
          <p className="mb-1 text-3xl">📅</p>
          <p className="font-semibold text-amber-900">Aucune année scolaire active</p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">➕ Nouvelle année scolaire</h2>
        {msg && <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${msg.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-800'}`}>{msg.text}</div>}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-4">
          <Field label="Libellé *"><input className={inputCls} value={newYear.label} onChange={(e) => setNewYear({ ...newYear, label: e.target.value })} /></Field>
          <Field label="Date de début *"><input type="date" className={inputCls} value={newYear.startDate} onChange={(e) => setNewYear({ ...newYear, startDate: e.target.value })} /></Field>
          <Field label="Date de fin *"><input type="date" className={inputCls} value={newYear.endDate} onChange={(e) => setNewYear({ ...newYear, endDate: e.target.value })} /></Field>
        </div>
        <div className="mt-5 flex justify-end"><button onClick={handleCreate} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700">Créer l&apos;année</button></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">📚 Historique des années</h2>
        {sortedYears.length === 0 ? <p className="py-4 text-center text-sm text-slate-500">Aucune année.</p> : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="px-3 py-2">Libellé</th><th className="px-3 py-2">Début</th><th className="px-3 py-2">Fin</th><th className="px-3 py-2 text-center">Statut</th><th className="px-3 py-2"></th></tr></thead>
              <tbody>
                {sortedYears.map((y) => (
                  <tr key={y.id} className="border-b">
                    <td className="px-3 py-2 font-semibold">{y.label}</td>
                    <td className="px-3 py-2 text-slate-600">{y.startDate}</td>
                    <td className="px-3 py-2 text-slate-600">{y.endDate}</td>
                    <td className="px-3 py-2 text-center">
                      {y.status === 'active' ? <span className="rounded-full bg-emerald-100 px-2 text-xs text-emerald-800">🟢 Active</span> : y.status === 'closed' ? <span className="rounded-full bg-slate-100 px-2 text-xs">Fermée</span> : <span className="rounded-full bg-blue-100 px-2 text-xs text-blue-800">Prévue</span>}
                    </td>
                    <td className="px-3 py-2 text-right">
                      {y.status !== 'active' && <button onClick={() => handleActivate(y.id)} className="mr-3 text-xs text-emerald-600">Activer</button>}
                      {y.status !== 'active' && <button onClick={() => handleDelete(y.id)} className="text-xs text-red-500">Supprimer</button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   ONGLET 2 — ÉCOLE & MINERVAL (avec tarifs par option)
   ============================================================ */
function EcoleTab() {
  const [settings, setSettings] = useSchoolSettings();
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!msg) return; const t = setTimeout(() => setMsg(null), 2500); return () => clearTimeout(t);
  }, [msg]);

  const tranches = settings.tranches;
  const today = new Date().toISOString().slice(0, 10);
  const activeTrancheId = tranches.find((t) => t.startDate && t.endDate && today >= t.startDate && today <= t.endDate)?.id;

  const updateTranche = (id: string, patch: Partial<TrancheSetting>) => {
    setSettings((s) => ({ ...s, tranches: s.tranches.map((t) => (t.id === id ? { ...t, ...patch } : t)) }));
  };

  const updateOptionAmount = (trancheId: string, option: string, amount: number) => {
    setSettings((s) => ({
      ...s,
      tranches: s.tranches.map((t) => t.id === trancheId ? { ...t, amountOptions: { ...(t.amountOptions || {}), [option]: amount } } : t)
    }));
  };

  const handleLogo = (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/') || file.size > 1024 * 1024) { setMsg({ type: 'error', text: 'Image max 1Mo.' }); return; }
    const r = new FileReader();
    r.onload = (e) => { setSettings((s) => ({ ...s, schoolLogo: e.target?.result as string })); setMsg({ type: 'success', text: 'Logo mis à jour.' }); };
    r.readAsDataURL(file);
  };

  const totalMat = tranches.reduce((s, t) => s + (t.amountMaternelle || 0), 0);
  const totalPri = tranches.reduce((s, t) => s + (t.amountPrimaire || 0), 0);
  const totalSecBase = tranches.reduce((s, t) => s + (t.amountSecondaire || 0), 0);

  return (
    <div className="space-y-6">
      {msg && <div className={`rounded-xl border px-4 py-3 text-sm ${msg.type === 'success' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'}`}>{msg.text}</div>}

      {activeTrancheId && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="font-semibold">🟢 Tranche active :</span> {tranches.find(t => t.id === activeTrancheId)?.label}
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">🏫 Identité de l&apos;école</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto,1fr]">
          <div className="flex flex-col items-center gap-3">
            {settings.schoolLogo ? <img src={settings.schoolLogo} alt="" className="h-28 w-28 rounded-2xl object-contain bg-white border" /> : <div className="grid h-28 w-28 place-items-center rounded-2xl bg-slate-100 text-4xl">🏫</div>}
            <label className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white">📷 Logo<input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogo(e.target.files?.[0])} /></label>
          </div>
          <div className="space-y-4">
            <Field label="Nom de l'école *"><input className={inputCls} value={settings.schoolName} onChange={(e) => setSettings((s) => ({ ...s, schoolName: e.target.value }))} /></Field>
            <label className="flex items-center gap-3 rounded-lg border p-3"><input type="checkbox" checked={settings.allowOffPeriodPayment} onChange={(e) => setSettings((s) => ({ ...s, allowOffPeriodPayment: e.target.checked }))} /><span className="text-sm">Autoriser les paiements hors période</span></label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">💰 Tranches &amp; minerval</h2>
        <p className="mb-5 text-sm text-slate-500">Saisissez les montants. Pour le secondaire, ajoutez le prix spécifique de chaque option.</p>

        <div className="-mx-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase text-slate-500">
                <th className="px-2 py-2 w-8">N°</th>
                <th className="px-2 py-2">Libellé</th>
                <th className="px-2 py-2 w-28">Maternelle</th>
                <th className="px-2 py-2 w-28">Primaire</th>
                <th className="px-2 py-2 w-28">Secondaire (Base)</th>
                <th className="px-2 py-2 w-36">Début</th>
                <th className="px-2 py-2 w-36">Fin</th>
                <th className="px-2 py-2 text-center w-24">Statut</th>
              </tr>
            </thead>
            <tbody>
              {tranches.map((t) => {
                const isActive = t.startDate && t.endDate && today >= t.startDate && today <= t.endDate;
                return (
                  <tr key={t.id} className={`border-b ${isActive ? 'bg-emerald-50/50' : ''}`}>
                    <td className="px-2 py-2 font-mono text-xs">{t.id}</td>
                    <td className="px-2 py-2"><input className={inputCls} value={t.label} onChange={(e) => updateTranche(t.id, { label: e.target.value })} /></td>
                    <td className="px-2 py-2"><input type="number" className={inputCls} value={t.amountMaternelle} onChange={(e) => updateTranche(t.id, { amountMaternelle: Number(e.target.value) })} /></td>
                    <td className="px-2 py-2"><input type="number" className={inputCls} value={t.amountPrimaire} onChange={(e) => updateTranche(t.id, { amountPrimaire: Number(e.target.value) })} /></td>
                    <td className="px-2 py-2"><input type="number" className={inputCls} value={t.amountSecondaire} onChange={(e) => updateTranche(t.id, { amountSecondaire: Number(e.target.value) })} /></td>
                    <td className="px-2 py-2"><input type="date" className={inputCls} value={t.startDate} onChange={(e) => updateTranche(t.id, { startDate: e.target.value })} /></td>
                    <td className="px-2 py-2"><input type="date" className={inputCls} value={t.endDate} onChange={(e) => updateTranche(t.id, { endDate: e.target.value })} /></td>
                    <td className="px-2 py-2 text-center">{isActive ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">ACTIVE</span> : <span className="text-xs text-slate-400">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <h3 className="mt-8 mb-3 text-sm font-bold text-slate-700">📚 Tarifs du Secondaire par Option</h3>
        <div className="rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b">
              <tr className="text-left text-xs uppercase text-slate-500">
                <th className="px-3 py-2">Tranche</th>
                {settings.options.map(opt => <th key={opt} className="px-3 py-2 text-center">{opt}</th>)}
              </tr>
            </thead>
            <tbody>
              {tranches.map(t => (
                <tr key={t.id} className="border-b">
                  <td className="px-3 py-2 font-medium">{t.label}</td>
                  {settings.options.map(opt => (
                    <td key={opt} className="px-3 py-2">
                      <input 
                        type="number" 
                        className={inputCls + " text-center"} 
                        placeholder={String(t.amountSecondaire)} 
                        value={t.amountOptions?.[opt] ?? ''} 
                        onChange={e => updateOptionAmount(t.id, opt, Number(e.target.value))} 
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-xs text-slate-500">Si un champ est vide, le prix de base du Secondaire sera utilisé.</p>

        <div className="mt-6 flex flex-wrap gap-4 rounded-lg bg-slate-50 p-4 text-xs font-semibold">
          <span>Total Maternelle : {formatMoney(totalMat)}</span>
          <span>Total Primaire : {formatMoney(totalPri)}</span>
          <span>Total Secondaire (Base) : {formatMoney(totalSecBase)}</span>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   ONGLET 3 — CLASSES & OPTIONS (Nouveau)
   ============================================================ */
function ClassesTab() {
  const [settings, setSettings] = useSchoolSettings();
  const [newClass, setNewClass] = useState<Record<Niveau, string>>({ Maternelle: '', Primaire: '', Secondaire: '' });
  const [newOption, setNewOption] = useState('');

  const addClass = (niveau: Niveau) => {
    const val = newClass[niveau].trim();
    if (!val) return;
    if (settings.classes[niveau].includes(val)) { alert('Cette classe existe déjà.'); return; }
    setSettings(s => ({ ...s, classes: { ...s.classes, [niveau]: [...s.classes[niveau], val] } }));
    setNewClass({ ...newClass, [niveau]: '' });
  };

  const removeClass = (niveau: Niveau, classe: string) => {
    if (!confirm(`Supprimer la classe ${classe} ?`)) return;
    setSettings(s => ({ ...s, classes: { ...s.classes, [niveau]: s.classes[niveau].filter(c => c !== classe) } }));
  };

  const addOption = () => {
    const val = newOption.trim();
    if (!val) return;
    if (settings.options.includes(val)) { alert('Cette option existe déjà.'); return; }
    setSettings(s => ({ ...s, options: [...s.options, val] }));
    setNewOption('');
  };

  const removeOption = (opt: string) => {
    if (!confirm(`Supprimer l'option ${opt} ?`)) return;
    setSettings(s => ({ ...s, options: s.options.filter(o => o !== opt) }));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {(['Maternelle', 'Primaire', 'Secondaire'] as Niveau[]).map(niv => (
          <section key={niv} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">{niv}</h2>
            <ul className="space-y-2 mb-4 max-h-64 overflow-y-auto">
              {settings.classes[niv].map(c => (
                <li key={c} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                  <span>{c}</span>
                  <button onClick={() => removeClass(niv, c)} className="text-xs text-red-500 hover:underline">✕</button>
                </li>
              ))}
            </ul>
            <div className="flex gap-2">
              <input className={inputCls} value={newClass[niv]} onChange={e => setNewClass({ ...newClass, [niv]: e.target.value })} placeholder="Ex : 1ère A" onKeyDown={e => e.key === 'Enter' && addClass(niv)} />
              <button onClick={() => addClass(niv)} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">+</button>
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold">Options (Secondaire)</h2>
        <div className="flex flex-wrap gap-2 mb-4">
          {settings.options.map(o => (
            <span key={o} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm">
              {o} <button onClick={() => removeOption(o)} className="text-red-500 hover:text-red-700">✕</button>
            </span>
          ))}
        </div>
        <div className="flex gap-2 max-w-md">
          <input className={inputCls} value={newOption} onChange={e => setNewOption(e.target.value)} placeholder="Ex : Scientifique" onKeyDown={e => e.key === 'Enter' && addOption()} />
          <button onClick={addOption} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Ajouter</button>
        </div>
      </section>
    </div>
  );
}

/* ============================================================
   ONGLET 4 — SAUVEGARDE
   ============================================================ */
function SauvegardeTab() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [lastExport, setLastExport] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [importPreview, setImportPreview] = useState<{ backup: Record<string, unknown> } | null>(null);
  const [importError, setImportError] = useState('');

  const refresh = () => {
    if (typeof window === 'undefined') return;
    const c: Record<string, number> = {};
    STORAGE_KEYS_ALL.forEach(({ key }) => {
      try {
        const raw = window.localStorage.getItem(key);
        if (!raw) { c[key] = 0; return; }
        const v = JSON.parse(raw);
        if (Array.isArray(v)) c[key] = v.length;
        else if (v && typeof v === 'object') c[key] = Object.keys(v).length;
        else c[key] = 1;
      } catch { c[key] = 0; }
    });
    setCounts(c);
    try { const le = window.localStorage.getItem('blind-school-last-export'); if (le) setLastExport(le); } catch {}
  };

  useEffect(() => { const t = setTimeout(refresh, 0); return () => clearTimeout(t); }, []);

  const handleExport = () => {
    if (typeof window === 'undefined') return;
    const data: Record<string, unknown> = {};
    STORAGE_KEYS_ALL.forEach(({ key }) => {
      try { const raw = window.localStorage.getItem(key); if (raw) data[key] = JSON.parse(raw); } catch {}
    });
    const backup = { app: 'BLIND SCHOOL', version: '1.0', exportedAt: new Date().toISOString(), data };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `blind-school-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    const now = new Date().toISOString(); window.localStorage.setItem('blind-school-last-export', now); setLastExport(now);
  };

  const handleFile = (f: File | undefined) => {
    setImportError(''); setImportPreview(null);
    if (!f || !f.name.toLowerCase().endsWith('.json')) { setImportError('Fichier .json requis.'); return; }
    const r = new FileReader();
    r.onload = (e) => {
      try { const parsed = JSON.parse(e.target?.result as string); if (!parsed.data) { setImportError('Format invalide.'); return; } setImportPreview({ backup: parsed }); } catch { setImportError('Fichier corrompu.'); }
    };
    r.readAsText(f);
  };

  const applyImport = (mode: 'replace' | 'merge') => {
    if (!importPreview || typeof window === 'undefined') return;
    const data = (importPreview.backup.data as Record<string, unknown>) || {};
    if (mode === 'replace') STORAGE_KEYS_ALL.forEach(({ key }) => window.localStorage.removeItem(key));
    Object.entries(data).forEach(([key, value]) => {
      try {
        if (mode === 'merge' && Array.isArray(value)) {
          const existing = window.localStorage.getItem(key);
          const oldArr = existing ? JSON.parse(existing) : [];
          window.localStorage.setItem(key, JSON.stringify(Array.isArray(oldArr) ? [...oldArr, ...value] : value));
        } else { window.localStorage.setItem(key, JSON.stringify(value)); }
      } catch {}
    });
    setImportPreview(null); if (fileRef.current) fileRef.current.value = '';
    if (confirm('Restauration terminée. Recharger ?')) window.location.reload(); else refresh();
  };

  const totalRecords = Object.values(counts).reduce((s, n) => s + n, 0);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">💾 Exporter</h2>
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {STORAGE_KEYS_ALL.slice(0, 8).map(({ key, label, icon }) => (
            <div key={key} className="rounded-lg border bg-slate-50 p-3"><div className="text-xl">{icon}</div><div className="text-xs text-slate-600">{label}</div><div className="text-lg font-bold">{counts[key] ?? 0}</div></div>
          ))}
        </div>
        <div className="flex justify-between text-xs mb-4"><span>Total : <b>{totalRecords}</b></span><span>Dernière : <b>{lastExport ? new Date(lastExport).toLocaleString('fr-FR') : 'Jamais'}</b></span></div>
        <div className="flex justify-end"><button onClick={handleExport} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white">⬇️ Exporter tout</button></div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-1 text-lg font-semibold">📥 Restaurer</h2>
        <label className="block cursor-pointer rounded-xl border-2 border-dashed bg-slate-50 p-6 text-center hover:bg-indigo-50 mt-4">
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <div className="text-4xl mb-2">📂</div><p className="font-medium">Cliquez pour choisir un fichier</p>
        </label>
        {importError && <div className="mt-4 text-sm text-red-800">❌ {importError}</div>}
        {importPreview && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-medium mb-2">Confirmer ?</p>
            <div className="flex gap-3"><button onClick={() => applyImport('replace')} className="bg-red-600 text-white px-3 py-1 rounded">Remplacer</button><button onClick={() => applyImport('merge')} className="bg-indigo-600 text-white px-3 py-1 rounded">Fusionner</button></div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   ONGLET 5 — RÉINITIALISATION
   ============================================================ */
function ReinitTab() {
  const [c1, setC1] = useState(false); const [c2, setC2] = useState('');
  const handleReset = () => {
    if (typeof window === 'undefined' || !c1 || c2.trim().toUpperCase() !== 'EFFACER') { alert('Confirmation incorrecte.'); return; }
    STORAGE_KEYS_ALL.forEach(({ key }) => window.localStorage.removeItem(key));
    window.location.reload();
  };
  return (
    <section className="rounded-2xl border-2 border-red-200 bg-red-50/40 p-5 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-red-900">⚠️ Zone dangereuse</h2>
      <p className="mb-5 text-sm text-red-800">Efface <b>définitivement</b> toutes les données.</p>
      <div className="space-y-4 rounded-lg border bg-white p-4">
        <label className="flex items-start gap-3"><input type="checkbox" checked={c1} onChange={(e) => setC1(e.target.checked)} /><span className="text-sm">Je comprends que tout sera perdu.</span></label>
        <label className="block"><span className="text-xs">Tapez <b>EFFACER</b> :</span><input className="w-full max-w-xs border p-2 rounded" value={c2} onChange={(e) => setC2(e.target.value)} /></label>
        <div className="flex justify-end"><button onClick={handleReset} disabled={!c1 || c2.trim().toUpperCase() !== 'EFFACER'} className="bg-red-600 text-white px-5 py-2 rounded disabled:opacity-50">Tout effacer</button></div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>{children}</label>;
}
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition ${active ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}>{children}</button>;
}