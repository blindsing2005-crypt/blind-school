'use client';
import { useMemo, useState, type ReactNode } from 'react';
import {
  CLASSES,
  NIVEAUX,
  OPTIONS,
  PAYMENT_METHODS,
  TRANCHE_OPTIONS,
  classeAvecOption,
  formatMoney,
  getPaymentStatus,
  getStudentTotalPaid,
  getTranchePaid,
  nextReceiptNumber,
  trancheAmountFor,
  totalDue,
  usePayments,
  useSchoolSettings,
  useStudents,
  type Niveau,
  type Payment,
  type Student,
  type TrancheSetting,
} from '../lib/store';
import PrintListModal from '../components/PrintListModal';

const today = () => new Date().toISOString().slice(0, 10);

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

export default function PaiementsPage() {
  const [students] = useStudents();
  const [payments, setPayments] = usePayments();
  const [settings] = useSchoolSettings();
  const [tab, setTab] = useState<'suivi' | 'historique' | 'config'>('suivi');

  const [fNiveau, setFNiveau] = useState<Niveau | ''>('');
  const [fClasse, setFClasse] = useState('');
  const [fOption, setFOption] = useState('');
  const [fStatut, setFStatut] = useState('');
  const [search, setSearch] = useState('');

  const [paymentFor, setPaymentFor] = useState<Student | null>(null);
  const [receiptFor, setReceiptFor] = useState<Payment | null>(null);
  const [showPrint, setShowPrint] = useState(false);

  const studentsWithTotals = useMemo(() => {
    return students.map((s) => {
      const due = totalDue(settings.tranches, s.niveau);
      const paid = getStudentTotalPaid(payments, s.id);
      const balance = Math.max(due - paid, 0);
      const status = getPaymentStatus(paid, due);
      return { student: s, totalPaid: paid, totalDue: due, balance, status };
    });
  }, [students, payments, settings.tranches]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return studentsWithTotals.filter(({ student: s, status }) => {
      if (fNiveau && s.niveau !== fNiveau) return false;
      if (fClasse && s.classe !== fClasse) return false;
      if (fOption && s.option !== fOption) return false;
      if (fStatut && status.label !== fStatut) return false;
      if (q) {
        const hay = `${s.nom} ${s.postnom} ${s.prenom} ${s.matricule}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [studentsWithTotals, fNiveau, fClasse, fOption, fStatut, search]);

  const totals = useMemo(() => {
    const due = filtered.reduce((s, x) => s + x.totalDue, 0);
    const paid = filtered.reduce((s, x) => s + x.totalPaid, 0);
    return { due, paid, balance: Math.max(due - paid, 0) };
  }, [filtered]);

  const ajouterPaiement = (data: Omit<Payment, 'id' | 'createdAt' | 'receiptNumber'>) => {
    const nouveau: Payment = {
      ...data,
      id: crypto.randomUUID(),
      receiptNumber: nextReceiptNumber(payments),
      createdAt: new Date().toISOString(),
    };
    setPayments((p) => [nouveau, ...p]);
    setPaymentFor(null);
    setReceiptFor(nouveau);
  };

  const supprimerPaiement = (id: string) => {
    if (!confirm('Supprimer ce paiement ? Action irréversible.')) return;
    setPayments((p) => p.filter((x) => x.id !== id));
  };

  const classesFiltre = fNiveau ? CLASSES[fNiveau] : Object.values(CLASSES).flat();
  const optionFiltreDispo = fClasse ? classeAvecOption(fClasse) : false;

  const resetFiltres = () => {
    setFNiveau(''); setFClasse(''); setFOption(''); setFStatut(''); setSearch('');
  };

  /* ---------- Données impression ---------- */
  const printColumns = useMemo(() => [
    { key: 'num', label: 'N°', width: '5%', align: 'center' as const },
    { key: 'matricule', label: 'Matricule', width: '13%' },
    { key: 'eleve', label: 'Élève', width: '28%' },
    { key: 'classe', label: 'Classe', width: '14%' },
    { key: 'du', label: 'Total dû', width: '13%', align: 'right' as const },
    { key: 'paye', label: 'Payé', width: '13%', align: 'right' as const },
    { key: 'solde', label: 'Solde', width: '13%', align: 'right' as const },
    { key: 'statut', label: 'Statut', width: '11%', align: 'center' as const },
  ], []);

  const printRows = useMemo(() => {
    return [...filtered]
      .sort((a, b) => `${a.student.nom}${a.student.prenom}`.localeCompare(`${b.student.nom}${b.student.prenom}`))
      .map((x, i) => ({
        num: i + 1,
        matricule: x.student.matricule,
        eleve: `${x.student.nom} ${x.student.postnom} ${x.student.prenom}`,
        classe: x.student.classe + (x.student.option ? ` • ${x.student.option}` : ''),
        du: formatMoney(x.totalDue),
        paye: formatMoney(x.totalPaid),
        solde: formatMoney(x.balance),
        statut: x.status.label,
      }));
  }, [filtered]);

  const printSubtitle = useMemo(() => {
    const parts: string[] = [];
    if (fNiveau) parts.push(`Niveau : ${fNiveau}`);
    if (fClasse) parts.push(`Classe : ${fClasse}`);
    if (fOption) parts.push(`Option : ${fOption}`);
    if (fStatut) parts.push(`Statut : ${fStatut}`);
    if (!parts.length) parts.push('Tous les élèves');
    return parts.join(' • ');
  }, [fNiveau, fClasse, fOption, fStatut]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Paiements &amp; Minerval</h1>
        <p className="text-sm text-slate-500">Suivi des tranches, reçus et statuts de paiement</p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        <TabBtn active={tab === 'suivi'} onClick={() => setTab('suivi')}>💰 Suivi</TabBtn>
        <TabBtn active={tab === 'historique'} onClick={() => setTab('historique')}>
          🧾 Historique
          <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{payments.length}</span>
        </TabBtn>
        <TabBtn active={tab === 'config'} onClick={() => setTab('config')}>⚙️ Configuration</TabBtn>
      </div>

      {tab === 'suivi' && (
        <>
          <section className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-3">
            <MoneyCard label="Total attendu" value={formatMoney(totals.due)} color="from-slate-500 to-slate-600" />
            <MoneyCard label="Total encaissé" value={formatMoney(totals.paid)} color="from-emerald-500 to-emerald-600" />
            <MoneyCard label="Solde restant" value={formatMoney(totals.balance)} color="from-red-500 to-red-600" />
          </section>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-5">
              <Field label="Niveau">
                <select className={inputCls} value={fNiveau} onChange={(e) => { setFNiveau(e.target.value as Niveau | ''); setFClasse(''); setFOption(''); }}>
                  <option value="">Tous</option>
                  {NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Classe">
                <select className={inputCls} value={fClasse} onChange={(e) => { setFClasse(e.target.value); if (!classeAvecOption(e.target.value)) setFOption(''); }}>
                  <option value="">Toutes</option>
                  {classesFiltre.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Option">
                <select className={inputCls} value={fOption} onChange={(e) => setFOption(e.target.value)} disabled={!optionFiltreDispo}>
                  <option value="">{optionFiltreDispo ? 'Toutes' : '—'}</option>
                  {OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Statut">
                <select className={inputCls} value={fStatut} onChange={(e) => setFStatut(e.target.value)}>
                  <option value="">Tous</option>
                  <option value="Payé">Payé</option>
                  <option value="Partiel">Partiel</option>
                  <option value="Non payé">Non payé</option>
                </select>
              </Field>
              <Field label="Recherche">
                <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom ou matricule..." />
              </Field>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-600">
                <span className="font-semibold text-slate-900">{filtered.length}</span> élève(s)
              </p>
              <div className="flex gap-2">
                {(fNiveau || fClasse || fOption || fStatut || search) && (
                  <button onClick={resetFiltres} className="text-xs font-medium text-indigo-600 hover:underline">
                    Réinitialiser les filtres
                  </button>
                )}
                <button
                  onClick={() => setShowPrint(true)}
                  disabled={filtered.length === 0}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:bg-slate-300"
                >
                  🖨️ Imprimer le suivi
                </button>
              </div>
            </div>

            {filtered.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <div className="mb-2 text-4xl">💳</div>
                <p className="font-medium text-slate-700">Aucun élève trouvé</p>
                <p className="text-sm">Inscrivez d&apos;abord des élèves dans le module Élèves.</p>
              </div>
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="px-3 py-2 font-semibold">Matricule</th>
                      <th className="px-3 py-2 font-semibold">Élève</th>
                      <th className="px-3 py-2 font-semibold">Classe</th>
                      <th className="px-3 py-2 font-semibold text-right">Total dû</th>
                      <th className="px-3 py-2 font-semibold text-right">Payé</th>
                      <th className="px-3 py-2 font-semibold text-right">Solde</th>
                      <th className="px-3 py-2 font-semibold">Statut</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(({ student: s, totalDue: tDue, totalPaid, balance, status }) => (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">{s.matricule}</td>
                        <td className="px-3 py-2 font-medium">
                          {s.nom} {s.prenom}
                          <div className="text-xs text-slate-400">{s.postnom}</div>
                        </td>
                        <td className="px-3 py-2">
                          {s.classe}
                          {s.option && <div className="text-xs text-slate-400">{s.option}</div>}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600">{formatMoney(tDue)}</td>
                        <td className="px-3 py-2 text-right font-medium text-emerald-700">{formatMoney(totalPaid)}</td>
                        <td className="px-3 py-2 text-right font-medium text-red-600">{formatMoney(balance)}</td>
                        <td className="px-3 py-2"><StatusBadge status={status} /></td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => setPaymentFor(s)}
                            disabled={balance === 0}
                            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                          >
                            + Paiement
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {tab === 'historique' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          {payments.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              <div className="mb-2 text-4xl">🧾</div>
              <p className="font-medium text-slate-700">Aucun paiement enregistré</p>
            </div>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2 font-semibold">N° Reçu</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Élève</th>
                    <th className="px-3 py-2 font-semibold">Tranche</th>
                    <th className="px-3 py-2 font-semibold">Mode</th>
                    <th className="px-3 py-2 font-semibold text-right">Montant</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {[...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((p) => {
                    const s = students.find((x) => x.id === p.studentId);
                    return (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">{p.receiptNumber}</td>
                        <td className="px-3 py-2 text-slate-600">{p.date}</td>
                        <td className="px-3 py-2 font-medium">
                          {s ? `${s.nom} ${s.prenom}` : 'Élève supprimé'}
                          {s && <div className="text-xs text-slate-400">{s.classe}</div>}
                        </td>
                        <td className="px-3 py-2">{p.tranche}</td>
                        <td className="px-3 py-2 text-slate-600">{p.method}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-700">+{formatMoney(p.amount)}</td>
                        <td className="px-3 py-2 text-right whitespace-nowrap">
                          <button onClick={() => setReceiptFor(p)} className="mr-3 text-xs font-medium text-indigo-600 hover:underline">
                            Reçu
                          </button>
                          <button onClick={() => supprimerPaiement(p.id)} className="text-xs font-medium text-red-500 hover:text-red-700">
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === 'config' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <h2 className="mb-1 text-lg font-semibold">📅 Tranches de paiement</h2>
          <p className="mb-5 text-sm text-slate-500">
            Montants par niveau et dates d&apos;ouverture.
          </p>
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="px-3 py-2 font-semibold w-10">N°</th>
                  <th className="px-3 py-2 font-semibold">Libellé</th>
                  <th className="px-3 py-2 font-semibold text-right">Maternelle</th>
                  <th className="px-3 py-2 font-semibold text-right">Primaire</th>
                  <th className="px-3 py-2 font-semibold text-right">Secondaire</th>
                  <th className="px-3 py-2 font-semibold">Début</th>
                  <th className="px-3 py-2 font-semibold">Fin</th>
                </tr>
              </thead>
              <tbody>
                {settings.tranches.map((t) => (
                  <tr key={t.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs text-slate-500">{t.id}</td>
                    <td className="px-3 py-2 font-medium">{t.label}</td>
                    <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{formatMoney(t.amountMaternelle)}</td>
                    <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{formatMoney(t.amountPrimaire)}</td>
                    <td className="px-3 py-2 text-right text-emerald-700 font-semibold">{formatMoney(t.amountSecondaire)}</td>
                    <td className="px-3 py-2 text-slate-600">{t.startDate || '—'}</td>
                    <td className="px-3 py-2 text-slate-600">{t.endDate || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 rounded-lg bg-blue-50 p-3 text-xs text-blue-800">
            💡 Pour modifier les montants ou les dates, allez dans <b>⚙️ Configuration → 🏫 École &amp; Minerval</b>.
          </p>
        </div>
      )}

      {paymentFor && (
        <PaymentModal
          student={paymentFor}
          tranches={settings.tranches}
          alreadyPaid={getStudentTotalPaid(payments, paymentFor.id)}
          payments={payments}
          onClose={() => setPaymentFor(null)}
          onSave={ajouterPaiement}
        />
      )}

      {receiptFor && (
        <ReceiptModal
          payment={receiptFor}
          student={students.find((s) => s.id === receiptFor.studentId) || null}
          schoolName={settings.schoolName}
          schoolLogo={settings.schoolLogo}
          onClose={() => setReceiptFor(null)}
        />
      )}

      {showPrint && (
        <PrintListModal
          title="Suivi des paiements des élèves"
          subtitle={printSubtitle}
          columns={printColumns}
          rows={printRows}
          totalsRow={{
            num: '',
            matricule: '',
            eleve: '',
            classe: 'TOTAL',
            du: formatMoney(totals.due),
            paye: formatMoney(totals.paid),
            solde: formatMoney(totals.balance),
            statut: '',
          }}
          extraInfo={`${printRows.length} élève(s) — Attendu : ${formatMoney(totals.due)} — Encaissé : ${formatMoney(totals.paid)} — Reste : ${formatMoney(totals.balance)}`}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

/* ============================================================
   Modal Paiement
   ============================================================ */
function PaymentModal({
  student, tranches, alreadyPaid, payments, onClose, onSave,
}: {
  student: Student;
  tranches: TrancheSetting[];
  alreadyPaid: number;
  payments: Payment[];
  onClose: () => void;
  onSave: (p: Omit<Payment, 'id' | 'createdAt' | 'receiptNumber'>) => void;
}) {
  const due = totalDue(tranches, student.niveau);
  const balance = Math.max(due - alreadyPaid, 0);

  // Tranche par défaut : première non soldée
  const defaultTranche = useMemo(() => {
    for (const t of tranches) {
      const amount = trancheAmountFor(t, student.niveau);
      const paid = getTranchePaid(payments, student.id, t.label);
      if (paid < amount) return t;
    }
    return tranches[0] || null;
  }, [tranches, payments, student.id, student.niveau]);

  const [selectedTrancheId, setSelectedTrancheId] = useState<string>(defaultTranche?.id || '');
  const [amount, setAmount] = useState<number>(() => {
    if (!defaultTranche) return 0;
    const tAmt = trancheAmountFor(defaultTranche, student.niveau);
    const paid = getTranchePaid(payments, student.id, defaultTranche.label);
    return Math.max(tAmt - paid, 0);
  });
  const [method, setMethod] = useState<string>(PAYMENT_METHODS[0]);
  const [date, setDate] = useState<string>(today());
  const [note, setNote] = useState('');

  const selectedTranche = tranches.find((t) => t.id === selectedTrancheId) || null;
  const selectedAmount = selectedTranche ? trancheAmountFor(selectedTranche, student.niveau) : 0;
  const selectedPaid = selectedTranche ? getTranchePaid(payments, student.id, selectedTranche.label) : 0;
  const selectedRemaining = Math.max(selectedAmount - selectedPaid, 0);

  const handleTrancheChange = (id: string) => {
    setSelectedTrancheId(id);
    const t = tranches.find((x) => x.id === id);
    if (t) {
      const amt = trancheAmountFor(t, student.niveau);
      const paid = getTranchePaid(payments, student.id, t.label);
      setAmount(Math.max(amt - paid, 0));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTranche) { alert('Aucune tranche sélectionnée.'); return; }
    if (amount <= 0) { alert('Montant invalide'); return; }
    if (amount > balance) {
      if (!confirm(`Le montant dépasse le solde (${formatMoney(balance)}). Continuer ?`)) return;
    }
    onSave({
      studentId: student.id,
      amount,
      tranche: selectedTranche.label,
      method,
      date,
      note: note.trim(),
      anneeScolaireId: '',
    });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <h3 className="font-semibold">Enregistrer un paiement</h3>
          <p className="text-xs text-slate-500">{student.nom} {student.prenom} — {student.classe}</p>
        </div>
        <form onSubmit={submit} className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
            <div>
              <p className="text-slate-500">Total dû ({student.niveau})</p>
              <p className="font-semibold">{formatMoney(due)}</p>
            </div>
            <div>
              <p className="text-slate-500">Déjà payé</p>
              <p className="font-semibold text-emerald-700">{formatMoney(alreadyPaid)}</p>
            </div>
            <div className="col-span-2 border-t border-slate-200 pt-2">
              <p className="text-slate-500">Solde restant</p>
              <p className="text-lg font-bold text-red-600">{formatMoney(balance)}</p>
            </div>
          </div>

          <Field label="Tranche à payer *">
            <select className={inputCls} value={selectedTrancheId} onChange={(e) => handleTrancheChange(e.target.value)}>
              {tranches.map((t) => {
                const amt = trancheAmountFor(t, student.niveau);
                const paid = getTranchePaid(payments, student.id, t.label);
                const ok = paid >= amt;
                return (
                  <option key={t.id} value={t.id}>
                    {t.label} — {formatMoney(amt)} {ok ? '✅' : `(reste ${formatMoney(Math.max(amt - paid, 0))})`}
                  </option>
                );
              })}
            </select>
          </Field>

          {selectedTranche && (
            <div className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-900">
              <p className="font-semibold">{selectedTranche.label}</p>
              <p>Montant ({student.niveau}) : {formatMoney(selectedAmount)}</p>
              <p>Déjà payé : {formatMoney(selectedPaid)}</p>
              <p className="font-bold text-indigo-700">Reste : {formatMoney(selectedRemaining)}</p>
            </div>
          )}

          <Field label="Montant *">
            <input type="number" min={1} className={inputCls} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
            <div className="mt-1 flex gap-2">
              <button type="button" onClick={() => setAmount(Math.round(selectedRemaining / 2))} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium hover:bg-slate-200">Moitié</button>
              <button type="button" onClick={() => setAmount(selectedRemaining)} className="rounded bg-slate-100 px-2 py-0.5 text-[11px] font-medium hover:bg-slate-200">Tout</button>
            </div>
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Mode de paiement">
              <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </Field>
            <Field label="Date">
              <input type="date" className={inputCls} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
          </div>

          <Field label="Note (facultatif)">
            <input className={inputCls} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex : versement du parent" />
          </Field>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Annuler
            </button>
            <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              Valider le paiement
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   Modal Reçu
   ============================================================ */
function ReceiptModal({
  payment, student, schoolName, schoolLogo, onClose,
}: {
  payment: Payment;
  student: Student | null;
  schoolName: string;
  schoolLogo: string;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="border-b border-slate-200 bg-emerald-50 px-5 py-3">
          <h3 className="font-semibold text-emerald-900">✅ Paiement enregistré</h3>
          <p className="text-xs text-emerald-700">Le reçu a été généré avec succès</p>
        </div>

        <div className="p-6">
          <div className="mb-4 text-center">
            {schoolLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={schoolLogo} alt="Logo" className="mx-auto mb-2 h-14 w-14 rounded-xl object-cover" />
            ) : (
              <div className="mx-auto mb-2 grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 font-bold text-white">
                {schoolName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <h4 className="text-lg font-bold">{schoolName || 'École'}</h4>
            <p className="text-xs text-slate-500">Reçu de paiement</p>
          </div>

          <div className="mb-4 rounded-lg border border-dashed border-slate-300 p-4 font-mono text-xs">
            <Row k="N° Reçu" v={payment.receiptNumber} strong />
            <Row k="Date" v={payment.date} />
            <Row k="Élève" v={student ? `${student.nom} ${student.prenom}` : '—'} />
            <Row k="Matricule" v={student?.matricule || '—'} />
            <Row k="Classe" v={student?.classe || '—'} />
            <Row k="Tranche" v={payment.tranche} />
            <Row k="Mode" v={payment.method} />
            {payment.note && <Row k="Note" v={payment.note} />}
            <div className="mt-3 flex justify-between border-t border-slate-300 pt-3 text-base">
              <span className="font-bold">Montant</span>
              <span className="font-bold text-emerald-700">{formatMoney(payment.amount)}</span>
            </div>
          </div>

          <p className="text-center text-[10px] text-slate-400">
            Merci pour votre confiance — Conservez ce reçu précieusement
          </p>
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 p-4">
          <button onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100">
            Fermer
          </button>
          <button onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
            🖨️ Imprimer
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="mb-2 flex justify-between">
      <span className="text-slate-500">{k}</span>
      <span className={strong ? 'font-bold' : ''}>{v}</span>
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

function MoneyCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 bg-gradient-to-r ${color}`} />
      <div className="p-5">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-xl font-bold sm:text-2xl">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: { label: string; color: string } }) {
  const map: Record<string, string> = {
    emerald: 'bg-emerald-100 text-emerald-800',
    amber: 'bg-amber-100 text-amber-800',
    red: 'bg-red-100 text-red-800',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${map[status.color] || map.slate}`}>
      {status.label}
    </span>
  );
}