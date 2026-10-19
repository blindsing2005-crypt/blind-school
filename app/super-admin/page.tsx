'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  ADMIN_MASTER_PASSWORD,
  LICENSE_DURATIONS,
  computeExpiryFromMonths,
  generateUnlockCode,
  useLicenseHistory,
  type GeneratedCode,
} from '../lib/license';

export default function SuperAdminPage() {
  const [history, setHistory] = useLicenseHistory();
  const [pwd, setPwd] = useState('');
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');

  // Générateur
  const [machineId, setMachineId] = useState('');
  const [months, setMonths] = useState<number>(3);
  const [note, setNote] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');
  const [generatedLabel, setGeneratedLabel] = useState('');
  const [search, setSearch] = useState('');

  const handleUnlock = () => {
    if (pwd === ADMIN_MASTER_PASSWORD) {
      setUnlocked(true);
      setError('');
    } else {
      setError('Mot de passe incorrect.');
    }
  };

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Copié !');
  };

  const handleGenerate = () => {
    if (!machineId.trim()) return alert('Entrez un ID machine.');
    const clean = machineId.trim().toUpperCase();
    const target = computeExpiryFromMonths(months);
    const generated = generateUnlockCode(clean, target.year, target.month);
    
    setGeneratedCode(generated);
    setGeneratedLabel(target.label);
    
    const entry: GeneratedCode = {
      id: crypto.randomUUID(),
      machineId: clean,
      code: generated,
      durationMonths: months,
      generatedAt: new Date().toISOString(),
      expiresAt: target.expiresAt,
      note: note.trim(),
    };
    setHistory((list) => [entry, ...list]);
  };

  const filteredHistory = history.filter((h: any) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return `${h.machineId} ${h.code} ${h.note}`.toLowerCase().includes(q);
  });

  if (!unlocked) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-900 p-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl text-center">
          <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-slate-800 text-3xl">🔒</div>
          <h1 className="text-xl font-bold text-slate-800">Accès Super-Admin</h1>
          <p className="mt-1 text-xs text-slate-500 mb-4">Réservé au créateur de BLIND SCHOOL</p>
          <input 
            type="password" 
            className="w-full rounded-lg border border-slate-300 p-2 text-center mb-3 outline-none focus:border-indigo-500" 
            value={pwd} onChange={e => setPwd(e.target.value)} 
            placeholder="Mot de passe" 
            onKeyDown={e => e.key === 'Enter' && handleUnlock()}
          />
          {error && <p className="text-xs text-red-500 mb-3">{error}</p>}
          <button onClick={handleUnlock} className="w-full rounded-lg bg-slate-800 py-2 text-sm font-semibold text-white hover:bg-slate-900">Déverrouiller</button>
          <div className="mt-4 text-center">
            <Link href="/" className="text-xs text-slate-400 hover:underline">← Retour à l'application</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Espace Super-Admin</h1>
          <p className="text-sm text-slate-500">Générateur de licences clients (Groupe Blind)</p>
        </div>
        <Link href="/" className="text-xs font-semibold text-indigo-600 hover:underline">Aller sur l'app →</Link>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold mb-4">🔑 Générer un code</h2>
          <div className="space-y-4">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">ID Machine (client)</span>
              <input className="w-full rounded-lg border p-2 uppercase" value={machineId} onChange={e => setMachineId(e.target.value)} placeholder="XXXX-XXXX-XXXX" />
            </label>
            
            <div>
              <span className="text-xs font-medium text-slate-600 mb-1 block">Durée de la licence</span>
              <div className="grid grid-cols-4 gap-2">
                {LICENSE_DURATIONS.map((m: number) => (
                  <button key={m} onClick={() => setMonths(m)} className={`rounded border py-1 text-xs font-semibold ${months === m ? 'bg-indigo-600 text-white' : 'bg-slate-50'}`}>{m} mois</button>
                ))}
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-medium text-slate-600">Note / Nom de l'école</span>
              <input className="w-full rounded-lg border p-2" value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: CS La Grâce - 50$" />
            </label>

            <button onClick={handleGenerate} className="w-full rounded-lg bg-emerald-600 py-2.5 font-semibold text-white hover:bg-emerald-700">Générer le code</button>

            {generatedCode && (
              <div className="mt-4 rounded-xl border-2 border-emerald-200 bg-emerald-50 p-4 text-center">
                <p className="text-xs font-semibold text-emerald-700 uppercase">Code à envoyer</p>
                <p className="text-3xl font-mono font-bold tracking-widest text-emerald-900 my-2">{generatedCode}</p>
                <p className="text-xs text-emerald-600 mb-3">Valable jusqu'à fin {generatedLabel}</p>
                <button onClick={() => copy(generatedCode)} className="rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white">📋 Copier</button>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col max-h-[600px]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold">📜 Historique</h2>
            <input className="rounded border px-2 py-1 text-xs" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <ul className="overflow-y-auto space-y-2 pr-2">
            {filteredHistory.length === 0 ? <p className="text-sm text-slate-500 text-center py-4">Aucun code.</p> : null}
            {filteredHistory.map((h: any) => (
              <li key={h.id} className="rounded-lg border p-3 text-xs">
                <div className="flex justify-between items-center mb-1">
                  <code className="font-bold text-sm">{h.code}</code>
                  <span className="text-slate-400">{new Date(h.expiresAt).toLocaleDateString()}</span>
                </div>
                <p className="text-slate-600">{h.note || 'Aucune note'} — {h.durationMonths} mois</p>
                <button onClick={() => copy(h.code)} className="mt-2 text-indigo-600 font-medium">Copier</button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}