'use client';
import { useEffect, useState } from 'react';
import {
  TRIAL_DAYS,
  computeStatus,
  useLicense,
} from '../lib/license';
import { useSchoolSettings } from '../lib/store';

export default function AbonnementPage() {
  const { license, unlock } = useLicense();
  const [settings] = useSchoolSettings();

  const [code, setCode] = useState('');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [status, setStatus] = useState(() => (license ? computeStatus(license) : null));
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!license) return;
    setStatus(computeStatus(license));
  }, [license]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = status
    ? Math.max(0, new Date(status.expiresAt).getTime() - now)
    : 0;
  const days = Math.floor(remaining / (1000 * 60 * 60 * 24));
  const hours = Math.floor((remaining / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((remaining / (1000 * 60)) % 60);
  const seconds = Math.floor((remaining / 1000) % 60);

  const isExpired = remaining <= 0;
  const isTrial = status?.isTrial ?? true;

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

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
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

        <section className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 shadow-sm">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-indigo-700">
            💳 Réabonnement
          </h2>
          <p className="mb-4 text-xs text-indigo-700">
            Renouvelez votre licence pour continuer à utiliser l&apos;application.
          </p>

          <div className="mb-4 rounded-xl bg-white p-4 text-center shadow-sm">
            <p className="text-xs uppercase tracking-wider text-slate-500">Tarif</p>
            <p className="mt-1 text-4xl font-bold text-indigo-700">30<span className="text-2xl">$</span></p>
            <p className="mt-1 text-xs text-slate-500">par mois — payable en 1, 3, 6 ou 12 mois</p>
          </div>

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

      {/* ====== CONTACT & WHATSAPP ====== */}
      <section className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-5 text-center shadow-sm">
        <h3 className="text-sm font-bold text-slate-700 mb-2">📞 Besoin d&apos;aide ou de réabonnement ?</h3>
        <p className="text-xs text-slate-500 mb-4">
          Contactez-nous directement par WhatsApp ou par appel pour toute assistance.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <a href="https://wa.me/243997189141" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition">
            <span>💬</span> +243 997 189 141
          </a>
          <a href="https://wa.me/243853929022" target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-700 transition">
            <span>💬</span> +243 853 929 022
          </a>
        </div>
      </section>

    </div>
  );
}