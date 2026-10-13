'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  ADMIN_MASTER_PASSWORD,
  LICENSE_DURATIONS,
  TRIAL_DAYS,
  computeExpiryFromMonths,
  computeStatus,
  generateUnlockCode,
  useLicense,
  useLicenseHistory,
  type GeneratedCode,
} from '../lib/license';
import { useSchoolSettings } from '../lib/store';

export default function LicencePage() {
  const { license, unlock } = useLicense();
  const [settings] = useSchoolSettings();
  const [history, setHistory] = useLicenseHistory();

  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPwd, setAdminPwd] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);

  /* Générateur */
  const [genMachineId, setGenMachineId] = useState('');
  const [genMonths, setGenMonths] = useState<number>(3);
  const [genNote, setGenNote] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [generatedExpiry, setGeneratedExpiry] = useState<string>('');

  /* Filtres historique */
  const [historySearch, setHistorySearch] = useState('');

  const [dates, setDates] = useState({
    installed: '',
    trialEnd: '',
    paidEnd: '',
    daysLeft: 0,
  });

  useEffect(() => {
    if (!license) return;
    const s = computeStatus(license);
    setDates({
      installed: new Date(license.installedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' }),
      trialEnd: new Date(license.trialEndsAt).toLocaleDateString('fr-FR', { dateStyle: 'long' }),
      paidEnd: license.paidUntil
        ? new Date(license.paidUntil).toLocaleDateString('fr-FR', { dateStyle: 'long' })
        : '—',
      daysLeft: s.daysLeft,
    });
  }, [license]);

  const handleUnlock = () => {
    setMsg(null);
    if (!code.trim()) {
      setMsg({ type: 'error', text: 'Saisissez votre code de déblocage.' });
      return;
    }
    const res = unlock(code);
    setMsg({ type: res.success ? 'success' : 'error', text: res.message });
    if (res.success) {
      setTimeout(() => { window.location.href = '/'; }, 1400);
    }
  };

  const handleAdminUnlock = () => {
    if (adminPwd === ADMIN_MASTER_PASSWORD) {
      setAdminUnlocked(true);
      setAdminPwd('');
    } else {
      alert('Mot de passe administrateur incorrect.');
      setAdminPwd('');
    }
  };

  /* ---------- Génération ---------- */
  const previewExpiry = useMemo(() => computeExpiryFromMonths(genMonths), [genMonths]);

  const handleGenerate = () => {
    if (!genMachineId.trim()) { alert('Entrez un ID machine.'); return; }
    const clean = genMachineId.trim().toUpperCase();
    const target = computeExpiryFromMonths(genMonths);
    const generated = generateUnlockCode(clean, target.year, target.month);

    setGeneratedCode(generated);
    setGeneratedExpiry(target.label);

    // Enregistre dans l'historique
    const entry: GeneratedCode = {
      id: crypto.randomUUID(),
      machineId: clean,
      code: generated,
      durationMonths: genMonths,
      generatedAt: new Date().toISOString(),
      expiresAt: target.expiresAt,
      note: genNote.trim(),
    };
    setHistory((list) => [entry, ...list]);
  };

  const copyToClipboard = (text: string, label = 'Code') => {
    navigator.clipboard.writeText(text);
    alert(`${label} copié.`);
  };

  const deleteHistoryEntry = (id: string) => {
    if (!confirm('Supprimer cette entrée de l\'historique ?')) return;
    setHistory((list) => list.filter((x) => x.id !== id));
  };

  const filteredHistory = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return history;
    return history.filter((h) =>
      `${h.machineId} ${h.code} ${h.note}`.toLowerCase().includes(q),
    );
  }, [history, historySearch]);

  if (!license) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <p className="text-sm text-slate-500">Chargement…</p>
      </div>
    );
  }

  const schoolName = settings.schoolName || 'BLIND SCHOOL';

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 p-4">
      <div className="w-full max-w-2xl">
        {/* En-tête */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-2xl font-bold text-white shadow-lg">
            🔐
          </div>
          <h1 className="text-2xl font-bold tracking-tight">{schoolName}</h1>
          <p className="mt-1 text-sm text-slate-500">Activation de la licence</p>
        </div>

        {/* État */}
        <section className="mb-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider text-slate-500">
              État actuel
            </span>
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              dates.daysLeft > 0
                ? 'bg-amber-100 text-amber-800'
                : 'bg-red-100 text-red-800'
            }`}>
              {dates.daysLeft > 0 ? `⏱️ ${dates.daysLeft} jour(s) restant(s)` : '❌ Expiré'}
            </span>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-500">Installé le</dt>
              <dd className="font-medium">{dates.installed}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Essai gratuit jusqu&apos;au</dt>
              <dd className="font-medium">{dates.trialEnd}</dd>
            </div>
            {license.paidUntil && (
              <div className="flex justify-between">
                <dt className="text-slate-500">Licence payée jusqu&apos;au</dt>
                <dd className="font-medium text-emerald-700">{dates.paidEnd}</dd>
              </div>
            )}
          </dl>
        </section>

        {/* ID machine */}
        <section className="mb-4 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-amber-800">
            🆔 Identifiant de cet appareil
          </p>
          <p className="mb-2 text-xs text-amber-800">
            Transmettez cet identifiant à votre fournisseur pour obtenir un code de déblocage.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-amber-300 bg-white px-3 py-2 text-center font-mono text-lg font-bold tracking-widest text-amber-900">
              {license.machineId}
            </code>
            <button
              onClick={() => copyToClipboard(license.machineId, 'ID machine')}
              className="rounded-lg bg-amber-600 px-3 py-2 text-xs font-semibold text-white hover:bg-amber-700"
            >
              📋 Copier
            </button>
          </div>
        </section>

        {/* Saisie */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block">
            <span className="mb-2 block text-xs font-medium text-slate-600">
              Code de déblocage
            </span>
            <input
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-center font-mono text-lg tracking-widest outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="YYYYMM-XXXX"
              maxLength={12}
            />
          </label>

          {msg && (
            <div className={`mt-4 rounded-lg border px-3 py-2 text-sm ${
              msg.type === 'success'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : 'border-red-200 bg-red-50 text-red-800'
            }`}>
              {msg.text}
            </div>
          )}

          <button
            onClick={handleUnlock}
            className="mt-4 w-full rounded-lg bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700"
          >
            🔓 Débloquer l&apos;application
          </button>
        </section>

        <p className="mt-4 text-center text-xs text-slate-400">
          Essai de {TRIAL_DAYS} jours — Pour toute assistance contactez votre fournisseur.
        </p>

        {/* Bouton discret admin */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowAdmin((v) => !v)}
            className="text-[10px] text-slate-300 hover:text-slate-500"
            title="Générateur de codes"
          >
            ⚙️
          </button>
        </div>

        {/* ============ PANNEAU ADMIN ============ */}
        {showAdmin && (
          <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              🔧 Générateur de codes — usage interne
            </h3>

            {!adminUnlocked ? (
              <div className="space-y-3">
                <input
                  type="password"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                  value={adminPwd}
                  onChange={(e) => setAdminPwd(e.target.value)}
                  placeholder="Mot de passe administrateur"
                  onKeyDown={(e) => e.key === 'Enter' && handleAdminUnlock()}
                />
                <button
                  onClick={handleAdminUnlock}
                  className="w-full rounded-lg bg-slate-700 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  Valider
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Onglets : générateur / historique */}
                <AdminTabs />

                {/* Formulaire */}
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    ID machine du client
                  </span>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm uppercase outline-none focus:border-indigo-500"
                    value={genMachineId}
                    onChange={(e) => setGenMachineId(e.target.value.toUpperCase())}
                    placeholder="XXXX-XXXX-XXXX"
                  />
                </label>

                {/* Durées */}
                <div>
                  <p className="mb-2 text-xs font-medium text-slate-600">
                    Durée à accorder
                  </p>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                    {LICENSE_DURATIONS.map((m) => (
                      <button
                        key={m}
                        onClick={() => setGenMonths(m)}
                        className={`rounded-lg border px-2 py-2 text-xs font-semibold transition ${
                          genMonths === m
                            ? 'border-indigo-500 bg-indigo-600 text-white'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        {m} mois
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] italic text-slate-500">
                    📅 Valable jusqu&apos;au <b className="text-slate-700">{previewExpiry.label}</b>
                  </p>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    Note (optionnel)
                  </span>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                    value={genNote}
                    onChange={(e) => setGenNote(e.target.value)}
                    placeholder="Ex : École La Grâce — Payé 50$"
                  />
                </label>

                <button
                  onClick={handleGenerate}
                  className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  🔑 Générer le code ({genMonths} mois)
                </button>

                {generatedCode && (
                  <div className="rounded-lg border-2 border-emerald-300 bg-white p-4 text-center">
                    <p className="mb-1 text-[10px] uppercase tracking-wider text-emerald-700">
                      Code à transmettre
                    </p>
                    <p className="font-mono text-2xl font-bold tracking-widest text-emerald-900">
                      {generatedCode}
                    </p>
                    <p className="mt-1 text-[10px] text-slate-500">
                      Valable jusqu&apos;à fin {generatedExpiry}
                    </p>
                    <button
                      onClick={() => copyToClipboard(generatedCode)}
                      className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      📋 Copier le code
                    </button>
                  </div>
                )}

                {/* Historique */}
                <div className="border-t border-slate-200 pt-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      📜 Historique ({history.length})
                    </p>
                    <input
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs outline-none focus:border-indigo-500"
                      value={historySearch}
                      onChange={(e) => setHistorySearch(e.target.value)}
                      placeholder="Rechercher…"
                    />
                  </div>

                  {filteredHistory.length === 0 ? (
                    <p className="py-4 text-center text-xs text-slate-400">
                      Aucun code dans l&apos;historique pour l&apos;instant.
                    </p>
                  ) : (
                    <ul className="max-h-72 space-y-2 overflow-y-auto">
                      {filteredHistory.map((h) => {
                        const expired = new Date(h.expiresAt).getTime() < Date.now();
                        return (
                          <li key={h.id} className="rounded-lg border border-slate-200 bg-white p-3 text-xs">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <code className="font-mono text-sm font-bold tracking-wider text-slate-800">
                                {h.code}
                              </code>
                              <span className={`rounded-full px-2 py-0.5 font-medium ${
                                expired ? 'bg-slate-100 text-slate-500' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {expired ? 'Expiré' : 'Actif'}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
                              <span className="font-mono">{h.machineId}</span>
                              <span>•</span>
                              <span>{h.durationMonths} mois</span>
                              <span>•</span>
                              <span>
                                jusqu&apos;au {new Date(h.expiresAt).toLocaleDateString('fr-FR')}
                              </span>
                            </div>
                            {h.note && (
                              <p className="mt-1 italic text-slate-500">{h.note}</p>
                            )}
                            <div className="mt-2 flex justify-end gap-2">
                              <button
                                onClick={() => copyToClipboard(h.code)}
                                className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100"
                              >
                                Copier
                              </button>
                              <button
                                onClick={() => deleteHistoryEntry(h.id)}
                                className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-100"
                              >
                                Supprimer
                              </button>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

/** Petit composant pour organiser (facultatif, pas de logique) */
function AdminTabs() {
  return null;
}