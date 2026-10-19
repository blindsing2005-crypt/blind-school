'use client';
import { useMemo, useState, type ReactNode } from 'react';
import {
  CLASSES,
  NIVEAUX,
  OPTIONS,
  PAYMENT_METHODS,
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
} from '../lib/store';
import PrintListModal from '../components/PrintListModal';

const today = () => new Date().toISOString().slice(0, 10);
const inputCls = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400';

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
      const due = totalDue(settings.tranches, s.niveau, s.option);
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
    const nouveau: Payment = { ...data, id: crypto.randomUUID(), receiptNumber: nextReceiptNumber(payments), createdAt: new Date().toISOString() };
    setPayments((p) => [nouveau, ...p]);
    setPaymentFor(null);
    setReceiptFor(nouveau);
  };

  const supprimerPaiement = (id: string) => {
    if (!confirm('Supprimer ce paiement ?')) return;
    setPayments((p) => p.filter((x) => x.id !== id));
  };

  const classesFiltre = fNiveau ? CLASSES[fNiveau] : Object.values(CLASSES).flat();
  const optionFiltreDispo = fClasse ? classeAvecOption(fClasse) : false;
  const resetFiltres = () => { setFNiveau(''); setFClasse(''); setFOption(''); setFStatut(''); setSearch(''); };

  const printColumns = [
    { key: 'num', label: 'N°', width: '5%', align: 'center' as const },
    { key: 'matricule', label: 'Matricule', width: '13%' },
    { key: 'eleve', label: 'Élève', width: '28%' },
    { key: 'classe', label: 'Classe', width: '14%' },
    { key: 'du', label: 'Total dû', width: '13%', align: 'right' as const },
    { key: 'paye', label: 'Payé', width: '13%', align: 'right' as const },
    { key: 'solde', label: 'Solde', width: '13%', align: 'right' as const },
    { key: 'statut', label: 'Statut', width: '11%', align: 'center' as const },
  ];

  const printRows = filtered.sort((a, b) => a.student.nom.localeCompare(b.student.nom)).map((x, i) => ({
    num: i + 1,
    matricule: x.student.matricule,
    eleve: `${x.student.nom} ${x.student.postnom} ${x.student.prenom}`,
    classe: x.student.classe + (x.student.option ? ` • ${x.student.option}` : ''),
    du: formatMoney(x.totalDue),
    paye: formatMoney(x.totalPaid),
    solde: formatMoney(x.balance),
    statut: x.status.label,
  }));

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Paiements &amp; Minerval</h1>
        <p className="text-sm text-slate-500">Suivi des tranches, reçus et statuts de paiement</p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        <TabBtn active={tab === 'suivi'} onClick={() => setTab('suivi')}>💰 Suivi</TabBtn>
        <TabBtn active={tab === 'historique'} onClick={() => setTab('historique')}>🧾 Historique <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{payments.length}</span></TabBtn>
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
                  <option value="">Tous</option>{NIVEAUX.map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
              </Field>
              <Field label="Classe">
                <select className={inputCls} value={fClasse} onChange={(e) => { setFClasse(e.target.value); if (!classeAvecOption(e.target.value)) setFOption(''); }}>
                  <option value="">Toutes</option>{classesFiltre.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Option">
                <select className={inputCls} value={fOption} onChange={(e) => setFOption(e.target.value)} disabled={!optionFiltreDispo}>
                  <option value="">{optionFiltreDispo ? 'Toutes' : '—'}</option>{OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </Field>
              <Field label="Statut">
                <select className={inputCls} value={fStatut} onChange={(e) => setFStatut(e.target.value)}>
                  <option value="">Tous</option><option value="Payé">Payé</option><option value="Partiel">Partiel</option><option value="Non payé">Non payé</option>
                </select>
              </Field>
              <Field label="Recherche">
                <input className={inputCls} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Nom..." />
              </Field>
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-slate-600"><span className="font-semibold">{filtered.length}</span> élève(s)</p>
              <div className="flex gap-2">
                {(fNiveau || fClasse || fOption || fStatut || search) && <button onClick={resetFiltres} className="text-xs font-medium text-indigo-600">Réinitialiser</button>}
                <button onClick={() => setShowPrint(true)} disabled={filtered.length === 0} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-slate-300">🖨️ Imprimer</button>
              </div>
            </div>

            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-xs uppercase text-slate-500"><th className="px-3 py-2">Matricule</th><th className="px-3 py-2">Élève</th><th className="px-3 py-2">Classe</th><th className="px-3 py-2 text-right">Total dû</th><th className="px-3 py-2 text-right">Payé</th><th className="px-3 py-2 text-right">Solde</th><th className="px-3 py-2">Statut</th><th className="px-3 py-2"></th></tr></thead>
                <tbody>
                  {filtered.map(({ student: s, totalDue: tDue, totalPaid, balance, status }) => (
                    <tr key={s.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-xs">{s.matricule}</td>
                      <td className="px-3 py-2 font-medium">{s.nom} {s.prenom}</td>
                      <td className="px-3 py-2">{s.classe}{s.option && <div className="text-[10px] text-slate-400">{s.option}</div>}</td>
                      <td className="px-3 py-2 text-right">{formatMoney(tDue)}</td>
                      <td className="px-3 py-2 text-right text-emerald-700">{formatMoney(totalPaid)}</td>
                      <td className="px-3 py-2 text-right text-red-600">{formatMoney(balance)}</td>
                      <td className="px-3 py-2"><StatusBadge status={status} /></td>
                      <td className="px-3 py-2 text-right">
                        <button onClick={() => setPaymentFor(s)} disabled={balance === 0} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:bg-slate-300">+ Paiement</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {tab === 'historique' && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <table className="w-full text-sm">
            <thead><tr className="border-b text-left text-xs text-slate-500"><th className="px-3 py-2">N° Reçu</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Élève</th><th className="px-3 py-2">Tranche</th><th className="px-3 py-2 text-right">Montant</th><th className="px-3 py-2"></th></tr></thead>
            <tbody>
              {payments.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map(p => {
                const s = students.find(x => x.id === p.studentId);
                return (
                  <tr key={p.id} className="border-b">
                    <td className="px-3 py-2 font-mono text-xs">{p.receiptNumber}</td>
                    <td className="px-3 py-2">{p.date}</td>
                    <td className="px-3 py-2">{s ? `${s.nom} ${s.prenom}` : '—'}</td>
                    <td className="px-3 py-2">{p.tranche}</td>
                    <td className="px-3 py-2 text-right text-emerald-700">+{formatMoney(p.amount)}</td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => setReceiptFor(p)} className="text-xs text-indigo-600 mr-3">Reçu</button>
                      <button onClick={() => supprimerPaiement(p.id)} className="text-xs text-red-500">✕</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'config' && (
        <div className="rounded-2xl border bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold mb-4">Configuration rapide</h2>
          <p className="text-sm text-slate-500 mb-4">Pour modifier les montants, allez dans <b>Configuration → École &amp; Minerval</b>.</p>
        </div>
      )}

      {paymentFor && <PaymentModal student={paymentFor} tranches={settings.tranches} alreadyPaid={getStudentTotalPaid(payments, paymentFor.id)} payments={payments} onClose={() => setPaymentFor(null)} onSave={ajouterPaiement} />}
      {receiptFor && <ReceiptModal payment={receiptFor} student={students.find((s) => s.id === receiptFor.studentId) || null} schoolName={settings.schoolName} schoolLogo={settings.schoolLogo} onClose={() => setReceiptFor(null)} />}
      {showPrint && <PrintListModal title="Suivi des paiements" subtitle="Liste filtrée" columns={printColumns} rows={printRows} totalsRow={{ num: '', matricule: '', eleve: '', classe: 'TOTAL', du: formatMoney(totals.due), paye: formatMoney(totals.paid), solde: formatMoney(totals.balance), statut: '' }} onClose={() => setShowPrint(false)} />}
    </div>
  );
}

function PaymentModal({ student, tranches, alreadyPaid, payments, onClose, onSave }: any) {
  const due = totalDue(tranches, student.niveau, student.option);
  const balance = Math.max(due - alreadyPaid, 0);
  const [amount, setAmount] = useState(balance);
  const [trancheLabel, setTrancheLabel] = useState(tranches[0]?.label || '');
  const [method, setMethod] = useState(PAYMENT_METHODS[0]);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');

  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (amount <= 0) return alert('Montant invalide');
    onSave({ studentId: student.id, amount, tranche: trancheLabel, method, date, note, anneeScolaireId: '' });
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        <div className="border-b px-5 py-3 font-semibold">Enregistrer un paiement — {student.nom}</div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs">
            <div>Dû ({student.niveau} {student.option ? `• ${student.option}` : ''}) : <b>{formatMoney(due)}</b></div>
            <div>Déjà payé : <b>{formatMoney(alreadyPaid)}</b></div>
            <div className="col-span-2 border-t pt-2">Solde : <b className="text-red-600 text-lg">{formatMoney(balance)}</b></div>
          </div>
          <label className="block"><span className="text-xs">Tranche</span><select className={inputCls} value={trancheLabel} onChange={e => setTrancheLabel(e.target.value)}>{tranches.map((t: any) => <option key={t.id} value={t.label}>{t.label}</option>)}</select></label>
          <label className="block"><span className="text-xs">Montant *</span><input type="number" className={inputCls} value={amount} onChange={e => setAmount(Number(e.target.value))} /></label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="text-xs">Mode</span><select className={inputCls} value={method} onChange={e => setMethod(e.target.value)}>{PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}</select></label>
            <label className="block"><span className="text-xs">Date</span><input type="date" className={inputCls} value={date} onChange={e => setDate(e.target.value)} /></label>
          </div>
          <label className="block"><span className="text-xs">Note</span><input className={inputCls} value={note} onChange={e => setNote(e.target.value)} /></label>
        </div>
        <div className="flex justify-end gap-3 border-t p-4 bg-slate-50">
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Annuler</button>
          <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 text-sm text-white">Valider</button>
        </div>
      </form>
    </div>
  );
}

function ReceiptModal({ payment, student, schoolName, schoolLogo, onClose }: any) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="bg-emerald-50 text-emerald-900 p-4 font-bold border-b">✅ Paiement enregistré</div>
        <div className="p-6 text-center">
          {schoolLogo && <img src={schoolLogo} alt="" className="h-12 w-12 mx-auto mb-2 rounded object-cover" />}
          <h3 className="font-bold text-lg">{schoolName}</h3>
          <p className="text-xs text-slate-500 mb-4">Reçu {payment.receiptNumber}</p>
          <div className="text-left text-sm bg-slate-50 p-4 rounded-lg border space-y-1">
            <p>Élève : <b>{student?.nom} {student?.prenom}</b></p>
            <p>Tranche : <b>{payment.tranche}</b></p>
            <p>Date : <b>{payment.date}</b></p>
            <p className="text-lg font-bold text-emerald-700 mt-2 border-t pt-2">+{formatMoney(payment.amount)}</p>
          </div>
        </div>
        <div className="flex justify-end gap-3 p-4 border-t">
          <button onClick={onClose} className="rounded-lg border px-4 py-2 text-sm">Fermer</button>
          <button onClick={() => window.print()} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm text-white">🖨️ Imprimer</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: any) { return <label className="block"><span className="text-xs text-slate-500">{label}</span>{children}</label>; }
function TabBtn({ active, onClick, children }: any) { return <button onClick={onClick} className={`rounded-xl px-4 py-2 text-sm font-medium ${active ? 'bg-indigo-600 text-white' : 'bg-white border'}`}>{children}</button>; }
function MoneyCard({ label, value, color }: any) { return <div className={`rounded-2xl p-4 text-white bg-gradient-to-r ${color}`}><p className="text-xs opacity-80">{label}</p><p className="text-xl font-bold">{value}</p></div>; }
function StatusBadge({ status }: any) {
  const map: any = { emerald: 'bg-emerald-100 text-emerald-800', amber: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800', slate: 'bg-slate-100' };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[status.color]}`}>{status.label}</span>;
}