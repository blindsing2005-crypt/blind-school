'use client';
import { useEffect, useState } from 'react';
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

export default function AbonnementPage() {
  const { license, unlock } = useLicense();
  const [settings] = useSchoolSettings();
  const [history, setHistory] = useLicenseHistory();

  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /* Panneau admin (caché) */
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminPwd, setAdminPwd] = useState('');
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const [genMachineId, setGenMachineId] = useState('');
  const [genMonths, setGenMonths] = useState<number>(3);
  const [genNote, setGenNote] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [generatedLabel, setGeneratedLabel] = useState('');
  const [historySearch, setHistorySearch] = useState('');

  /* Compte à rebours en temps réel */
  const [status, setStatus] = useState(() => (license ? computeStatus(license) : null));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!license) return;
    setStatus(computeStatus(license));
  }, [license]);

  /* Tick toutes les secondes */
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  /* Calcul du temps restant précis */
  const remaining = status
    ? Math.max(0, new Date(status.expiresAt).getTime() - now)
    : 0;
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  const isExpired = remaining <= 0;
  const isTrial = status?.isTrial ?? true;

  /* ---------- Actions ---------- */
  const handleUnlock = () => {
    setMsg(null);
    if (!code.trim()) {
      setMsg({ type: 'error', text: 'Saisissez votre code de réabonnement.' });
      return;
    }
    const res = unlock(code);
    setMsg({ type: res.success ? 'success' : 'error', text: res.message });
    if (res.success) setCode('');
  };

  const copy = (text: string, label = 'Texte') => {
    navigator.clipboard.writeText(text);
    alert(`${label} copié.`);
  };

  const handleAdminUnlock = () => {
    if (adminPwd === ADMIN_MASTER_PASSWORD) {
      setAdminUnlocked(true);
      setAdminPwd('');
    } else {
      alert('Mot de passe incorrect.');
      setAdminPwd('');
    }
  };

  const previewExpiry = computeExpiryFromMonths(genMonths);

  const handleGenerate = () => {
    if (!genMachineId.trim()) { alert('Entrez un ID machine.'); return; }
    const clean = genMachineId.trim().toUpperCase();
    const target = computeExpiryFromMonths(genMonths);
    const generated = generateUnlockCode(clean, target.year, target.month);
    setGeneratedCode(generated);
    setGeneratedLabel(target.label);
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

  const deleteHistory = (id: string) => {
    if (!confirm('Supprimer cette entrée ?')) return;
    setHistory((list) => list.filter((x) => x.id !== id));
  };

  const filteredHistory = history.filter((h) => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return true;
    return `${h.machineId} ${h.code} ${h.note}`.toLowerCase().includes(q);
  });

  if (!license || !status) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-50">
        <p className="text-sm text-slate-500">Chargement…</p>
      </div>
    );
  }

  const schoolName = settings.schoolName || 'BLIND SCHOOL';

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Abonnement & Licence</h1>
        <p className="text-sm text-slate-500">
          Gérez votre licence {schoolName} et réabonnez-vous
        </p>
      </header>

      {/* Bandeau statut global */}
      <section className={`mb-5 rounded-2xl border-2 p-5 ${
        isExpired
          ? 'border-red-300 bg-red-50'
          : days <= 7
            ? 'border-amber-300 bg-amber-50'
            : 'border-emerald-300 bg-emerald-50'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wider ${
              isExpired ? 'text-red-700' : days <= 7 ? 'text-amber-700' : 'text-emerald-700'
            }`}>
              {isExpired ? '❌ Licence expirée' : isTrial ? '⏱️ Essai gratuit' : '✅ Licence active'}
            </p>
            <p className={`mt-1 text-3xl font-bold ${
              isExpired ? 'text-red-900' : days <= 7 ? 'text-amber-900' : 'text-emerald-900'
            }`}>
              {isExpired ? 'Bloqué' : `${days} jour${days > 1 ? 's' : ''} restant${days > 1 ? 's' : ''}`}
            </p>
            {!isExpired && (
              <p className={`mt-1 font-mono text-sm ${
                isExpired ? 'text-red-700' : days <= 7 ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {String(hours).padStart(2, '0')}h {String(minutes).padStart(2, '0')}m {String(seconds).padStart(2, '0')}s
              </p>
            )}
          </div>
          <div className="text-right">
            <p className={`text-xs ${
              isExpired ? 'text-red-700' : days <= 7 ? 'text-amber-700' : 'text-emerald-700'
            }`}>Expire le</p>
            <p className={`text-lg font-bold ${
              isExpired ? 'text-red-900' : days <= 7 ? 'text-amber-900' : 'text-emerald-900'
            }`}>
              {new Date(status.expiresAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
            </p>
          </div>
        </div>
      </section>

      {/* Grille 2 colonnes : infos + réabonnement */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* Infos licence */}
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            📋 Informations de la licence
          </h2>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-500">Identifiant de cet appareil</dt>
              <dd className="text-right">
                <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-bold text-slate-800">
                  {license.machineId}
                </code>
                <button
                  onClick={() => copy(license.machineId, 'ID machine')}
                  className="ml-1 text-[11px] text-indigo-600 hover:underline"
                >
                  copier
                </button>
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-500">Installé le</dt>
              <dd className="font-medium">
                {new Date(license.installedAt).toLocaleDateString('fr-FR')}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-slate-500">Fin de l&apos;essai</dt>
              <dd className="font-medium">
                {new Date(license.trialEndsAt).toLocaleDateString('fr-FR')}
              </dd>
            </div>
            {license.paidUntil && (
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Licence payée jusqu&apos;au</dt>
                <dd className="font-medium text-emerald-700">
                  {new Date(license.paidUntil).toLocaleDateString('fr-FR')}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-5 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
            💡 <b>Besoin d&apos;aide ?</b> Envoyez votre identifiant de licence (ci-dessus)
            à votre fournisseur pour recevoir un code de réabonnement.
          </div>
        </section>

        {/* Réabonnement */}
        <section className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-indigo-700">
            💳 Réabonnement
          </h2>
          <p className="mb-4 text-xs text-indigo-700">
            Renouvelez votre licence pour continuer à utiliser l&apos;application.
          </p>

          {/* Prix */}
          <div className="mb-4 rounded-xl bg-white p-4 text-center shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-500">Tarif</p>
            <p className="mt-1 text-4xl font-bold text-indigo-700">30<span className="text-2xl">$</span></p>
            <p className="mt-1 text-xs text-slate-500">par mois — payable en 1, 3, 6 ou 12 mois</p>
          </div>

          {/* Champ code */}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-indigo-800">
              Code de réabonnement
            </span>
            <input
              className="w-full rounded-lg border border-indigo-300 bg-white px-3 py-3 text-center font-mono text-lg tracking-widest outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="YYYYMM-XXXX"
              maxLength={12}
            />
          </label>

          {msg && (
            <div className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
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
            🔓 Activer le code
          </button>

          <p className="mt-3 text-center text-[11px] text-indigo-700">
            Essai gratuit de {TRIAL_DAYS} jours à l&apos;installation
          </p>
        </section>
      </div>

      {/* Bouton discret admin */}
      <div className="mt-6 text-center">
        <button
          onClick={() => setShowAdmin((v) => !v)}
          className="text-[10px] text-slate-300 hover:text-slate-500"
          title="Espace fournisseur"
        >
          ⚙️
        </button>
      </div>

      {/* ============ PANNEAU ADMIN ============ */}
      {showAdmin && (
        <section className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-5 shadow-sm">
          <h3 className="mb-3 text-sm font-semibold text-slate-700">
            🔧 Espace fournisseur — Générateur de codes
          </h3>

          {!adminUnlocked ? (
            <div className="space-y-3">
              <input
                type="password"
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500"
                value={adminPwd}
                onChange={(e) => setAdminPwd(e.target.value)}
                placeholder="Mot de passe fournisseur"
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

              <div>
                <p className="mb-2 text-xs font-medium text-slate-600">Durée à accorder</p>
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
                  {' '}— Tarif indicatif : <b>{genMonths * 30}$</b>
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
                  placeholder="Ex : École La Grâce — Payé 90$"
                />
              </label>

              <button
                onClick={handleGenerate}
                className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700"
              >
                🔑 Générer le code ({genMonths} mois — {genMonths * 30}$)
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
                    Valable jusqu&apos;à fin {generatedLabel}
                  </p>
                  <button
                    onClick={() => copy(generatedCode)}
                    className="mt-3 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                  >
                    📋 Copier le code
                  </button>
                </div>
              )}

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
                  <p className="py-4 text-center text-xs text-slate-400">Aucun code généré.</p>
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
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-slate-500">
                            <span className="font-mono">{h.machineId}</span>
                            <span>•</span>
                            <span>{h.durationMonths} mois ({h.durationMonths * 30}$)</span>
                            <span>•</span>
                            <span>jusqu&apos;au {new Date(h.expiresAt).toLocaleDateString('fr-FR')}</span>
                          </div>
                          {h.note && <p className="mt-1 italic text-slate-500">{h.note}</p>}
                          <div className="mt-2 flex justify-end gap-2">
                            <button onClick={() => copy(h.code)} className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 hover:bg-indigo-100">
                              Copier
                            </button>
                            <button onClick={() => deleteHistory(h.id)} className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-medium text-red-600 hover:bg-red-100">
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
  );
}