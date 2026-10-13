'use client';
import { useEffect, useRef, useState } from 'react';
import {
  useSchoolSettings,
  useSchoolYears,
  useActiveYearId,
  useActiveYear,
  type TrancheSetting,
  type SchoolYear,
} from '../lib/store';

/* ============================================================
   BLIND SCHOOL — Module 1 : Configuration & Année scolaire
   ============================================================ */

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
  const [tab, setTab] = useState<'annee' | 'ecole' | 'sauvegarde' | 'reinit'>('annee');

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Configuration</h1>
        <p className="text-sm text-slate-500">
          Année scolaire, école, sauvegarde et gestion des données
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        <TabBtn active={tab === 'annee'} onClick={() => setTab('annee')}>📅 Année scolaire</TabBtn>
        <TabBtn active={tab === 'ecole'} onClick={() => setTab('ecole')}>🏫 École &amp; Minerval</TabBtn>
        <TabBtn active={tab === 'sauvegarde'} onClick={() => setTab('sauvegarde')}>💾 Sauvegarde</TabBtn>
        <TabBtn active={tab === 'reinit'} onClick={() => setTab('reinit')}>⚠️ Réinitialisation</TabBtn>
      </div>

      {tab === 'annee' && <AnneeTab />}
      {tab === 'ecole' && <EcoleTab />}
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
    setNewYear({
      label: `${y} - ${y + 1}`,
      startDate: `${y}-09-01`,
      endDate: `${y + 1}-07-15`,
    });
  }, [years.length, newYear.label]);

  const handleCreate = () => {
    if (!newYear.label.trim() || !newYear.startDate || !newYear.endDate) {
      setMsg({ type: 'error', text: 'Remplissez tous les champs.' });
      return;
    }
    if (newYear.endDate <= newYear.startDate) {
      setMsg({ type: 'error', text: 'La date de fin doit être après le début.' });
      return;
    }
    const year: SchoolYear = {
      id: crypto.randomUUID(),
      label: newYear.label.trim(),
      startDate: newYear.startDate,
      endDate: newYear.endDate,
      status: years.length === 0 ? 'active' : 'planned',
      createdAt: new Date().toISOString(),
      closedAt: '',
    };
    setYears((list) => [...list, year]);
    if (years.length === 0) setActiveId(year.id);
    setNewYear({ label: '', startDate: '', endDate: '' });
    setMsg({ type: 'success', text: `Année « ${year.label} » créée.` });
  };

  const handleActivate = (id: string) => {
    if (!confirm('Activer cette année ?')) return;
    setYears((list) =>
      list.map((y) =>
        y.id === id
          ? { ...y, status: 'active' }
          : y.status === 'active'
            ? { ...y, status: 'closed', closedAt: new Date().toISOString() }
            : y,
      ),
    );
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
              <p className="text-xs font-medium uppercase tracking-wider text-emerald-700">
                🟢 Année scolaire active
              </p>
              <p className="mt-1 text-2xl font-bold text-emerald-900">{activeYear.label}</p>
              <p className="mt-1 text-sm text-emerald-700">
                Du {new Date(activeYear.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}{' '}
                au {new Date(activeYear.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
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
          <p className="mt-1 text-sm text-amber-800">Créez votre première année scolaire ci-dessous.</p>
        </section>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">➕ Nouvelle année scolaire</h2>
        <p className="mb-5 text-sm text-slate-500">
          Définissez la période complète (ex : septembre 2025 → juillet 2026).
        </p>

        {msg && (
          <div className={`mb-4 rounded-xl border px-4 py-3 text-sm font-medium ${
            msg.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}>
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Libellé <span className="text-red-500">*</span>
            </span>
            <input
              className={inputCls}
              value={newYear.label}
              onChange={(e) => setNewYear({ ...newYear, label: e.target.value })}
              placeholder="Ex : 2025 - 2026"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Date de début <span className="text-red-500">*</span>
            </span>
            <input
              type="date"
              className={inputCls}
              value={newYear.startDate}
              onChange={(e) => setNewYear({ ...newYear, startDate: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">
              Date de fin <span className="text-red-500">*</span>
            </span>
            <input
              type="date"
              className={inputCls}
              value={newYear.endDate}
              onChange={(e) => setNewYear({ ...newYear, endDate: e.target.value })}
            />
          </label>
        </div>

        <div className="mt-5 flex justify-end">
          <button
            onClick={handleCreate}
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
          >
            Créer l&apos;année
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">📚 Historique des années ({years.length})</h2>
        {sortedYears.length === 0 ? (
          <p className="rounded-lg bg-slate-50 py-8 text-center text-sm text-slate-500">
            Aucune année enregistrée.
          </p>
        ) : (
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="px-3 py-2 font-semibold">Libellé</th>
                  <th className="px-3 py-2 font-semibold">Début</th>
                  <th className="px-3 py-2 font-semibold">Fin</th>
                  <th className="px-3 py-2 font-semibold text-center">Statut</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {sortedYears.map((y) => (
                  <tr key={y.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-semibold">{y.label}</td>
                    <td className="px-3 py-2 text-slate-600">{y.startDate}</td>
                    <td className="px-3 py-2 text-slate-600">{y.endDate}</td>
                    <td className="px-3 py-2 text-center">
                      {y.status === 'active' && (
                        <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">🟢 Active</span>
                      )}
                      {y.status === 'closed' && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">Fermée</span>
                      )}
                      {y.status === 'planned' && (
                        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">Prévue</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      {y.status !== 'active' && (
                        <button onClick={() => handleActivate(y.id)} className="mr-3 text-xs font-medium text-emerald-600 hover:underline">
                          Activer
                        </button>
                      )}
                      {y.status !== 'active' && (
                        <button onClick={() => handleDelete(y.id)} className="text-xs font-medium text-red-500 hover:underline">
                          Supprimer
                        </button>
                      )}
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
   ONGLET 2 — ÉCOLE & MINERVAL
   ============================================================ */
function EcoleTab() {
  const [settings, setSettings] = useSchoolSettings();
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(null), 2500);
    return () => clearTimeout(t);
  }, [msg]);

  const tranches = settings.tranches;
  const today = new Date().toISOString().slice(0, 10);

  const updateTranche = (id: string, patch: Partial<TrancheSetting>) => {
    setSettings((s) => ({
      ...s,
      tranches: s.tranches.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  };

  const handleLogo = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMsg({ type: 'error', text: 'Format d\'image non supporté.' });
      return;
    }
    if (file.size > 1024 * 1024) {
      setMsg({ type: 'error', text: 'Image trop lourde (max 1 Mo).' });
      return;
    }
    const r = new FileReader();
    r.onload = (e) => {
      setSettings((s) => ({ ...s, schoolLogo: e.target?.result as string }));
      setMsg({ type: 'success', text: 'Logo mis à jour.' });
    };
    r.readAsDataURL(file);
  };

  const totalMat = tranches.reduce((s, t) => s + (t.amountMaternelle || 0), 0);
  const totalPri = tranches.reduce((s, t) => s + (t.amountPrimaire || 0), 0);
  const totalSec = tranches.reduce((s, t) => s + (t.amountSecondaire || 0), 0);

  const activeTrancheId = tranches.find(
    (t) => t.startDate && t.endDate && today >= t.startDate && today <= t.endDate,
  )?.id;

  return (
    <div className="space-y-6">
      {msg && (
        <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${
          msg.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {msg.text}
        </div>
      )}

      {activeTrancheId ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="font-semibold">🟢 Tranche actuellement active :</span>{' '}
          {tranches.find((t) => t.id === activeTrancheId)?.label}
          <span className="ml-2 text-emerald-600">•</span>
          <span className="text-xs">
            Du {tranches.find((t) => t.id === activeTrancheId)?.startDate} au {tranches.find((t) => t.id === activeTrancheId)?.endDate}
          </span>
        </div>
      ) : (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⏱️ <b>Aucune tranche n&apos;est active aujourd&apos;hui.</b>{' '}
          Vérifiez les dates d&apos;ouverture ci-dessous.
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">🏫 Identité de l&apos;école</h2>
        <p className="mb-5 text-sm text-slate-500">Apparaît dans le menu, les reçus et les bulletins.</p>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto,1fr]">
          <div className="flex flex-col items-center gap-3">
            {settings.schoolLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.schoolLogo} alt="" className="h-28 w-28 rounded-2xl border border-slate-200 bg-white object-contain p-1" />
            ) : (
              <div className="grid h-28 w-28 place-items-center rounded-2xl bg-slate-100 text-4xl text-slate-400">🏫</div>
            )}
            <label className="cursor-pointer rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
              📷 Choisir un logo
              <input type="file" accept="image/*" className="hidden" onChange={(e) => handleLogo(e.target.files?.[0])} />
            </label>
            {settings.schoolLogo && (
              <button
                onClick={() => { setSettings((s) => ({ ...s, schoolLogo: '' })); setMsg({ type: 'success', text: 'Logo retiré.' }); }}
                className="text-xs font-medium text-red-500 hover:underline"
              >
                Retirer
              </button>
            )}
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-600">
                Nom de l&apos;école <span className="text-red-500">*</span>
              </span>
              <input
                className={inputCls}
                value={settings.schoolName}
                onChange={(e) => setSettings((s) => ({ ...s, schoolName: e.target.value }))}
              />
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
              <input
                type="checkbox"
                className="mt-1 h-4 w-4"
                checked={settings.allowOffPeriodPayment}
                onChange={(e) => setSettings((s) => ({ ...s, allowOffPeriodPayment: e.target.checked }))}
              />
              <div>
                <p className="text-sm font-medium">Autoriser les paiements hors période</p>
                <p className="text-xs text-slate-500">Pour encaisser un retard en dehors des dates de la tranche.</p>
              </div>
            </label>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">💰 Tranches &amp; minerval</h2>
        <p className="mb-5 text-sm text-slate-500">
          Saisissez un montant différent par niveau. La colonne <b>Statut</b> indique si la tranche est ouverte aujourd&apos;hui.
        </p>

        <div className="-mx-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="px-3 py-2 font-semibold w-10">N°</th>
                <th className="px-3 py-2 font-semibold">Libellé</th>
                <th className="px-3 py-2 font-semibold w-32">🎒 Maternelle</th>
                <th className="px-3 py-2 font-semibold w-32">📚 Primaire</th>
                <th className="px-3 py-2 font-semibold w-32">🎓 Secondaire</th>
                <th className="px-3 py-2 font-semibold w-36">Début</th>
                <th className="px-3 py-2 font-semibold w-36">Fin</th>
                <th className="px-3 py-2 font-semibold w-28 text-center">Statut</th>
              </tr>
            </thead>
            <tbody>
              {tranches.map((t) => {
                const isActive = t.startDate && t.endDate && today >= t.startDate && today <= t.endDate;
                const isPast = t.endDate && today > t.endDate;
                const isFuture = t.startDate && today < t.startDate;
                const noDates = !t.startDate || !t.endDate;
                return (
                  <tr
                    key={t.id}
                    className={`border-b border-slate-100 ${isActive ? 'bg-emerald-50/60' : ''}`}
                  >
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{t.id}</td>
                    <td className="px-3 py-2">
                      <input className={inputCls} value={t.label} onChange={(e) => updateTranche(t.id, { label: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className={inputCls}
                        value={t.amountMaternelle}
                        onChange={(e) => updateTranche(t.id, { amountMaternelle: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className={inputCls}
                        value={t.amountPrimaire}
                        onChange={(e) => updateTranche(t.id, { amountPrimaire: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        className={inputCls}
                        value={t.amountSecondaire}
                        onChange={(e) => updateTranche(t.id, { amountSecondaire: Number(e.target.value) })}
                      />
                    </td>
                    <td className="px-3 py-2">
                      <input type="date" className={inputCls} value={t.startDate} onChange={(e) => updateTranche(t.id, { startDate: e.target.value })} />
                    </td>
                    <td className="px-3 py-2">
                      <input type="date" className={inputCls} value={t.endDate} onChange={(e) => updateTranche(t.id, { endDate: e.target.value })} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      {isActive && (
                        <span className="inline-block whitespace-nowrap rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                          🟢 ACTIVE
                        </span>
                      )}
                      {isPast && !isActive && (
                        <span className="inline-block whitespace-nowrap rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                          Terminée
                        </span>
                      )}
                      {isFuture && !isActive && (
                        <span className="inline-block whitespace-nowrap rounded-full bg-blue-100 px-2.5 py-1 text-xs font-medium text-blue-700">
                          À venir
                        </span>
                      )}
                      {noDates && (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-slate-200 font-bold">
                <td colSpan={2} className="px-3 py-3 text-right">Total annuel par élève</td>
                <td className="px-3 py-3 text-emerald-700">{new Intl.NumberFormat('fr-FR').format(totalMat)} FC</td>
                <td className="px-3 py-3 text-emerald-700">{new Intl.NumberFormat('fr-FR').format(totalPri)} FC</td>
                <td className="px-3 py-3 text-emerald-700">{new Intl.NumberFormat('fr-FR').format(totalSec)} FC</td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>

        <p className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
          💡 La <b>tranche active</b> est celle dont les dates encadrent la date du jour.
          C&apos;est elle qui active automatiquement le bouton <b>« + Payer »</b> dans la page Paiements.
        </p>
      </section>
    </div>
  );
}

/* ============================================================
   ONGLET 3 — SAUVEGARDE
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
    try {
      const le = window.localStorage.getItem('blind-school-last-export');
      if (le) setLastExport(le);
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const t = setTimeout(refresh, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = () => {
    if (typeof window === 'undefined') return;
    const data: Record<string, unknown> = {};
    STORAGE_KEYS_ALL.forEach(({ key }) => {
      try {
        const raw = window.localStorage.getItem(key);
        if (raw) data[key] = JSON.parse(raw);
      } catch { /* ignore */ }
    });
    const backup = {
      app: 'BLIND SCHOOL',
      version: '1.0',
      exportedAt: new Date().toISOString(),
      data,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `blind-school-sauvegarde-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    const now = new Date().toISOString();
    window.localStorage.setItem('blind-school-last-export', now);
    setLastExport(now);
  };

  const handleFile = (f: File | undefined) => {
    setImportError('');
    setImportPreview(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.json')) {
      setImportError('Fichier .json requis.');
      return;
    }
    const r = new FileReader();
    r.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (!parsed.data) { setImportError('Format invalide.'); return; }
        setImportPreview({ backup: parsed });
      } catch {
        setImportError('Fichier corrompu.');
      }
    };
    r.readAsText(f);
  };

  const applyImport = (mode: 'replace' | 'merge') => {
    if (!importPreview || typeof window === 'undefined') return;
    const data = (importPreview.backup.data as Record<string, unknown>) || {};
    if (mode === 'replace') {
      STORAGE_KEYS_ALL.forEach(({ key }) => window.localStorage.removeItem(key));
    }
    Object.entries(data).forEach(([key, value]) => {
      try {
        if (mode === 'merge' && Array.isArray(value)) {
          const existing = window.localStorage.getItem(key);
          const oldArr = existing ? JSON.parse(existing) : [];
          const merged = Array.isArray(oldArr) ? [...oldArr, ...value] : value;
          window.localStorage.setItem(key, JSON.stringify(merged));
        } else {
          window.localStorage.setItem(key, JSON.stringify(value));
        }
      } catch { /* ignore */ }
    });
    setImportPreview(null);
    if (fileRef.current) fileRef.current.value = '';
    if (confirm('Restauration terminée. Recharger la page ?')) window.location.reload();
    else refresh();
  };

  const totalRecords = Object.values(counts).reduce((s, n) => s + n, 0);
  const lastExportText = lastExport ? new Date(lastExport).toLocaleString('fr-FR') : 'Jamais';

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">💾 Exporter</h2>
        <p className="mb-4 text-sm text-slate-500">Téléchargez une copie complète de vos données.</p>
        <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          {STORAGE_KEYS_ALL.slice(0, 8).map(({ key, label, icon }) => (
            <div key={key} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xl">{icon}</div>
              <div className="text-xs font-medium text-slate-600">{label}</div>
              <div className="text-lg font-bold text-slate-900">{counts[key] ?? 0}</div>
            </div>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-slate-50 p-3 text-xs">
          <span className="text-slate-600">Total : <b className="text-slate-900">{totalRecords}</b></span>
          <span className="text-slate-600">Dernière export : <b className="text-slate-900">{lastExportText}</b></span>
        </div>
        <div className="mt-5 flex justify-end">
          <button onClick={handleExport} className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700">
            ⬇️ Exporter tout maintenant
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">📥 Restaurer</h2>
        <p className="mb-4 text-sm text-slate-500">Restaurez une sauvegarde précédente.</p>
        <label className="block cursor-pointer rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-indigo-400 hover:bg-indigo-50">
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <div className="mb-2 text-4xl">📂</div>
          <p className="font-medium text-slate-700">Cliquez pour choisir un fichier</p>
        </label>
        {importError && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">❌ {importError}</div>
        )}
        {importPreview && (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="mb-2 font-medium text-amber-900">Confirmer la restauration ?</p>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => applyImport('replace')} className="rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white hover:bg-red-700">
                🔄 Remplacer tout
              </button>
              <button onClick={() => applyImport('merge')} className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
                ➕ Fusionner
              </button>
              <button onClick={() => { setImportPreview(null); if (fileRef.current) fileRef.current.value = ''; }} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50">
                Annuler
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   ONGLET 4 — RÉINITIALISATION
   ============================================================ */
function ReinitTab() {
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState('');

  const handleReset = () => {
    if (typeof window === 'undefined') return;
    if (!c1) { alert('Cochez la première case.'); return; }
    if (c2.trim().toUpperCase() !== 'EFFACER') { alert('Tapez EFFACER.'); return; }
    STORAGE_KEYS_ALL.forEach(({ key }) => window.localStorage.removeItem(key));
    alert('Tout a été effacé. Rechargement...');
    window.location.reload();
  };

  return (
    <section className="rounded-2xl border-2 border-red-200 bg-red-50/40 p-5 shadow-sm sm:p-6">
      <h2 className="mb-1 text-lg font-semibold text-red-900">⚠️ Zone dangereuse</h2>
      <p className="mb-5 text-sm text-red-800">
        Efface <b>définitivement</b> toutes les données. <b>Irréversible.</b>
      </p>
      <div className="space-y-4 rounded-lg border border-red-200 bg-white p-4">
        <label className="flex items-start gap-3">
          <input type="checkbox" className="mt-1 h-4 w-4" checked={c1} onChange={(e) => setC1(e.target.checked)} />
          <span className="text-sm">Je comprends que <b>tout sera perdu</b>.</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-700">Tapez <b>EFFACER</b> :</span>
          <input
            className="w-full max-w-xs rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-red-500"
            value={c2}
            onChange={(e) => setC2(e.target.value)}
            placeholder="EFFACER"
          />
        </label>
        <div className="flex justify-end">
          <button
            onClick={handleReset}
            disabled={!c1 || c2.trim().toUpperCase() !== 'EFFACER'}
            className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            🗑️ Tout effacer
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   Composants
   ============================================================ */
function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition ${
      active ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
    }`}>
      {children}
    </button>
  );
}