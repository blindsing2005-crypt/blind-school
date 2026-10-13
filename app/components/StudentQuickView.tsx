'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  PAYMENT_METHODS,
  formatMoney,
  getPaymentStatus,
  getStudentTotalPaid,
  getTranchePaid,
  nextReceiptNumber,
  trancheAmountFor,
  totalDue,
  usePayments,
  useSchoolSettings,
  type Payment,
  type Student,
} from '../lib/store';

type Step = 'view' | 'payment' | 'receipt';

export default function StudentQuickView({
  student,
  onClose,
  onOpenFullFiche,
}: {
  student: Student;
  onClose: () => void;
  onOpenFullFiche?: () => void;
}) {
  const [payments, setPayments] = usePayments();
  const [settings] = useSchoolSettings();

  const [step, setStep] = useState<Step>('view');
  const [activeTrancheId, setActiveTrancheId] = useState<string>('');
  const [amount, setAmount] = useState<number>(0);
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [lastReceipt, setLastReceipt] = useState<Payment | null>(null);

  const tranches = settings.tranches;
  const totalDueAll = useMemo(
    () => totalDue(tranches, student.niveau),
    [tranches, student.niveau],
  );
  const totalPaid = useMemo(
    () => getStudentTotalPaid(payments, student.id),
    [payments, student.id],
  );
  const balance = Math.max(totalDueAll - totalPaid, 0);
  const globalStatus = getPaymentStatus(totalPaid, totalDueAll);
  const today = new Date().toISOString().slice(0, 10);

  /* Fermeture avec Échap */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const openPayment = (trancheId: string) => {
    const t = tranches.find((x) => x.id === trancheId);
    if (!t) return;
    const tAmt = trancheAmountFor(t, student.niveau);
    const paid = getTranchePaid(payments, student.id, t.label);
    const remaining = Math.max(tAmt - paid, 0);
    setActiveTrancheId(trancheId);
    setAmount(remaining);
    setMethod(PAYMENT_METHODS[0]);
    setDate(today);
    setNote('');
    setStep('payment');
  };

  const handleSavePayment = () => {
    const t = tranches.find((x) => x.id === activeTrancheId);
    if (!t) return;
    if (amount <= 0) {
      alert('Le montant doit être supérieur à 0.');
      return;
    }
    const nouveau: Payment = {
      id: crypto.randomUUID(),
      studentId: student.id,
      amount,
      tranche: t.label,
      date,
      method,
      receiptNumber: nextReceiptNumber(payments),
      note: note.trim(),
      createdAt: new Date().toISOString(),
      anneeScolaireId: '',
    };
    setPayments((p) => [nouveau, ...p]);
    setLastReceipt(nouveau);
    setStep('receipt');
  };

  const statusClasses: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    slate: 'bg-slate-100 text-slate-600',
  };

  const statutEleve = student.statut || 'Actif';
  const statutEleveClasses: Record<string, string> = {
    Actif: 'bg-emerald-100 text-emerald-800',
    Redoublant: 'bg-amber-100 text-amber-800',
    Abandonné: 'bg-slate-200 text-slate-700',
    Expulsé: 'bg-red-100 text-red-800',
    Diplômé: 'bg-indigo-100 text-indigo-800',
  };

  return (
    <div
      className="fixed inset-0 z-[70] grid place-items-center bg-slate-900/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ---------- ÉTAPE 1 : APERÇU ---------- */}
        {step === 'view' && (
          <>
            <div className="relative bg-gradient-to-br from-indigo-600 to-purple-600 px-5 pb-10 pt-5 text-white">
              <button
                onClick={onClose}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-white/20 text-white transition hover:bg-white/30"
                aria-label="Fermer"
              >
                ✕
              </button>
              <div className="flex items-center gap-3">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/20 text-xl font-bold backdrop-blur">
                  {student.nom.slice(0, 1)}{student.prenom.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-lg font-bold">
                    {student.nom} {student.postnom}
                  </h2>
                  <p className="truncate text-sm text-white/90">{student.prenom}</p>
                  <p className="mt-0.5 font-mono text-[11px] text-white/70">{student.matricule}</p>
                </div>
              </div>
            </div>

            <div className="-mt-6 mx-5 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-md">
                <span className="text-slate-500">Classe :</span> {student.classe}
                {student.option ? ` • ${student.option}` : ''}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold shadow-md ${statutEleveClasses[statutEleve]}`}>
                {statutEleve}
              </span>
              <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-md">
                <span className="text-slate-500">Niveau :</span> {student.niveau}
              </span>
            </div>

            <div className="max-h-[55vh] overflow-y-auto p-5">
              <section className="mb-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  📞 Coordonnées
                </h3>
                <div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm">
                  <div>
                    <p className="text-[11px] text-slate-500">Parent / Tuteur</p>
                    <p className="font-medium">{student.nomParent || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Téléphone</p>
                    <p className="font-medium">{student.telephoneParent || '—'}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-[11px] text-slate-500">Adresse</p>
                    <p className="font-medium">{student.adresse || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Sexe</p>
                    <p className="font-medium">{student.sexe === 'M' ? 'Masculin' : 'Féminin'}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-slate-500">Naissance</p>
                    <p className="font-medium">{student.dateNaissance || '—'}</p>
                  </div>
                </div>
              </section>

              <section className="mb-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  💰 Résumé financier
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  <div className="rounded-lg border border-slate-200 bg-white p-2.5 text-center">
                    <p className="text-[10px] text-slate-500">Attendu</p>
                    <p className="mt-0.5 text-sm font-bold text-slate-800">{formatMoney(totalDueAll)}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-center">
                    <p className="text-[10px] text-emerald-700">Payé</p>
                    <p className="mt-0.5 text-sm font-bold text-emerald-800">{formatMoney(totalPaid)}</p>
                  </div>
                  <div className={`rounded-lg border p-2.5 text-center ${
                    balance === 0 ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
                  }`}>
                    <p className={`text-[10px] ${balance === 0 ? 'text-emerald-700' : 'text-red-700'}`}>Solde</p>
                    <p className={`mt-0.5 text-sm font-bold ${balance === 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                      {formatMoney(balance)}
                    </p>
                  </div>
                </div>
                <div className="mt-2 text-center">
                  <span className={`inline-block rounded-full px-3 py-0.5 text-[11px] font-medium ${statusClasses[globalStatus.color]}`}>
                    Statut global : {globalStatus.label}
                  </span>
                </div>
              </section>

              <section>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  🧾 Tranches ({student.niveau})
                </h3>
                {tranches.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 py-4 text-center text-sm text-slate-500">
                    Aucune tranche configurée. Allez dans Configuration → École &amp; Minerval.
                  </p>
                ) : (
                  <ul className="space-y-2">
                    {tranches.map((t) => {
                      const trancheAmount = trancheAmountFor(t, student.niveau);
                      const paid = getTranchePaid(payments, student.id, t.label);
                      const remaining = Math.max(trancheAmount - paid, 0);
                      const status = getPaymentStatus(paid, trancheAmount);
                      const isActive = t.startDate && t.endDate && today >= t.startDate && today <= t.endDate;
                      const canPay = remaining > 0 && (isActive || settings.allowOffPeriodPayment);

                      return (
                        <li
                          key={t.id}
                          className={`flex items-center gap-3 rounded-xl border p-3 transition ${
                            remaining === 0 ? 'border-emerald-200 bg-emerald-50/60'
                            : isActive ? 'border-indigo-300 bg-indigo-50/50'
                            : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-sm font-semibold">{t.label}</p>
                              {isActive && remaining > 0 && (
                                <span className="rounded-full bg-indigo-600 px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                                  Active
                                </span>
                              )}
                              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${statusClasses[status.color]}`}>
                                {status.label}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatMoney(paid)} / {formatMoney(trancheAmount)}
                              {remaining > 0 && (
                                <span className="ml-1 font-semibold text-red-600">
                                  — reste {formatMoney(remaining)}
                                </span>
                              )}
                            </p>
                          </div>
                          {canPay && (
                            <button
                              onClick={() => openPayment(t.id)}
                              className="shrink-0 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700"
                            >
                              + Payer
                            </button>
                          )}
                          {remaining === 0 && (
                            <span className="shrink-0 text-lg text-emerald-600" title="Soldée">✓</span>
                          )}
                          {remaining > 0 && !canPay && (
                            <span className="shrink-0 text-[10px] text-slate-400" title="Hors période">
                              🔒
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Fermer
              </button>
              {onOpenFullFiche && (
                <button
                  onClick={onOpenFullFiche}
                  className="rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  📄 Voir la fiche complète
                </button>
              )}
            </div>
          </>
        )}

        {/* ---------- ÉTAPE 2 : PAIEMENT ---------- */}
        {step === 'payment' && (() => {
          const t = tranches.find((x) => x.id === activeTrancheId);
          if (!t) return null;
          const trancheAmount = trancheAmountFor(t, student.niveau);
          const paid = getTranchePaid(payments, student.id, t.label);
          const remaining = Math.max(trancheAmount - paid, 0);
          return (
            <>
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                <h3 className="font-semibold">💳 Enregistrer un paiement</h3>
                <p className="text-xs text-slate-500">
                  {student.nom} {student.prenom} — {t.label}
                </p>
              </div>
              <div className="max-h-[65vh] space-y-4 overflow-y-auto p-5">
                <div className="rounded-xl bg-indigo-50 p-3 text-xs text-indigo-900">
                  <p className="font-semibold">{t.label} — {student.niveau}</p>
                  <div className="mt-1 grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-indigo-600">Montant dû</p>
                      <p className="font-bold">{formatMoney(trancheAmount)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-indigo-600">Déjà payé</p>
                      <p className="font-bold">{formatMoney(paid)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-indigo-600">Reste</p>
                      <p className="font-bold text-red-700">{formatMoney(remaining)}</p>
                    </div>
                  </div>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">
                    Montant à payer <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    value={amount}
                    onChange={(e) => setAmount(Number(e.target.value))}
                  />
                  <div className="mt-1 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setAmount(Math.round(remaining / 2))}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium hover:bg-slate-200"
                    >
                      Moitié
                    </button>
                    <button
                      type="button"
                      onClick={() => setAmount(remaining)}
                      className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium hover:bg-slate-200"
                    >
                      Tout
                    </button>
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Mode</span>
                    <select
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                      value={method}
                      onChange={(e) => setMethod(e.target.value)}
                    >
                      {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-xs font-medium text-slate-600">Date</span>
                    <input
                      type="date"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Note (facultatif)</span>
                  <input
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Ex : versement du père"
                  />
                </label>
              </div>
              <div className="flex justify-between gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
                <button
                  onClick={() => setStep('view')}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
                >
                  ← Retour
                </button>
                <button
                  onClick={handleSavePayment}
                  className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
                >
                  ✓ Valider le paiement
                </button>
              </div>
            </>
          );
        })()}

        {/* ---------- ÉTAPE 3 : REÇU ---------- */}
        {step === 'receipt' && lastReceipt && (
          <>
            <div className="border-b border-slate-200 bg-emerald-50 px-5 py-3">
              <h3 className="font-semibold text-emerald-900">✅ Paiement enregistré</h3>
              <p className="text-xs text-emerald-700">Le reçu a été généré avec succès</p>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">
              <div className="mb-4 text-center">
                {settings.schoolLogo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={settings.schoolLogo} alt="" className="mx-auto mb-2 h-14 w-14 rounded-xl object-cover" />
                ) : (
                  <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 font-bold text-white">
                    {(settings.schoolName || 'BS').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <h4 className="text-base font-bold">{settings.schoolName || 'École'}</h4>
                <p className="text-xs text-slate-500">Reçu de paiement</p>
              </div>

              <div className="rounded-lg border border-dashed border-slate-300 p-4 font-mono text-xs">
                <Row k="N° Reçu" v={lastReceipt.receiptNumber} />
                <Row k="Date" v={lastReceipt.date} />
                <Row k="Élève" v={`${student.nom} ${student.prenom}`} />
                <Row k="Classe" v={student.classe} />
                <Row k="Tranche" v={lastReceipt.tranche} />
                <Row k="Mode" v={lastReceipt.method} />
                <div className="mt-3 flex justify-between border-t border-slate-300 pt-3 text-base">
                  <span className="font-bold">Montant</span>
                  <span className="font-bold text-emerald-700">{formatMoney(lastReceipt.amount)}</span>
                </div>
              </div>

              <p className="mt-3 text-center text-[10px] text-slate-400">
                Merci pour votre confiance — Conservez ce reçu précieusement
              </p>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button
                onClick={() => { setStep('view'); setLastReceipt(null); }}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
              >
                Nouveau paiement
              </button>
              <button
                onClick={onClose}
                className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
              >
                Terminer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="mb-1.5 flex justify-between gap-3">
      <span className="text-slate-500">{k}</span>
      <span className="text-right font-medium">{v}</span>
    </div>
  );
}