'use client';
import { useEffect, useMemo, useState } from 'react';
import {
  formatMoney,
  totalDue,
  usePayments,
  useSchoolSettings,
  useStudents,
  useActiveYear,
} from '../lib/store';
import {
  EXPENSE_CATEGORIES,
  EXPENSE_CATEGORY_COLORS,
  EXPENSE_METHODS,
  nextExpenseRef,
  useExpenses,
  type Expense,
  type ExpenseCategory,
} from '../lib/depenses';
import PrintListModal from '../components/PrintListModal';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400';

type Period = 'today' | 'week' | 'month' | 'year' | 'all' | 'custom';

const todayStr = () => new Date().toISOString().slice(0, 10);

export default function RapportsPage() {
  const [students] = useStudents();
  const [payments] = usePayments();
  const [expenses, setExpenses] = useExpenses();
  const [settings] = useSchoolSettings();
  const activeYear = useActiveYear();

  const [period, setPeriod] = useState<Period>('month');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [tab, setTab] = useState<'overview' | 'byClass' | 'byMode' | 'byTranche' | 'monthly' | 'all' | 'depenses' | 'bilan'>('overview');
  const [showPrint, setShowPrint] = useState(false);

  /* Nouvelle dépense */
  const [newExpense, setNewExpense] = useState<{
    category: ExpenseCategory;
    beneficiary: string;
    amount: number;
    date: string;
    method: string;
    note: string;
  }>({
    category: 'Salaire',
    beneficiary: '',
    amount: 0,
    date: todayStr(),
    method: EXPENSE_METHODS[0],
    note: '',
  });
  const [expenseMsg, setExpenseMsg] = useState('');

  const [dateRange, setDateRange] = useState({ from: '', to: '' });

  useEffect(() => {
    const now = new Date();
    const today = now.toISOString().slice(0, 10);
    let from = '';
    let to = today;

    if (period === 'today') from = today;
    else if (period === 'week') {
      const d = new Date(now);
      const day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day);
      from = d.toISOString().slice(0, 10);
    } else if (period === 'month') {
      from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    } else if (period === 'year') {
      from = `${now.getFullYear()}-01-01`;
    } else if (period === 'all') {
      from = ''; to = '';
    } else if (period === 'custom') {
      from = fromDate; to = toDate;
    }
    setDateRange({ from, to });
  }, [period, fromDate, toDate]);

  /* ---------- Filtres ---------- */
  const filteredPayments = useMemo(() =>
    payments.filter((p) => {
      if (dateRange.from && p.date < dateRange.from) return false;
      if (dateRange.to && p.date > dateRange.to) return false;
      return true;
    }), [payments, dateRange]);

  const filteredExpenses = useMemo(() =>
    expenses.filter((e) => {
      if (dateRange.from && e.date < dateRange.from) return false;
      if (dateRange.to && e.date > dateRange.to) return false;
      return true;
    }).sort((a, b) => b.date.localeCompare(a.date)), [expenses, dateRange]);

  /* ---------- Stats ---------- */
  const stats = useMemo(() => {
    const totalCollected = filteredPayments.reduce((s, p) => s + p.amount, 0);
    const totalExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
    const net = totalCollected - totalExpenses;

    const totalExpectedAll = students.reduce(
      (s, st) => s + totalDue(settings.tranches, st.niveau),
      0,
    );
    const allTimeCollected = payments.reduce((s, p) => s + p.amount, 0);
    const allTimeExpenses = expenses.reduce((s, e) => s + e.amount, 0);
    const recovery = totalExpectedAll > 0 ? (allTimeCollected / totalExpectedAll) * 100 : 0;

    return {
      totalCollected,
      totalExpenses,
      net,
      allTimeCollected,
      allTimeExpenses,
      allTimeNet: allTimeCollected - allTimeExpenses,
      totalExpectedAll,
      recovery,
      count: filteredPayments.length,
      countExpenses: filteredExpenses.length,
      average: filteredPayments.length > 0 ? totalCollected / filteredPayments.length : 0,
      studentsWhoPaid: new Set(filteredPayments.map((p) => p.studentId)).size,
    };
  }, [filteredPayments, filteredExpenses, payments, expenses, students, settings.tranches]);

  /* ---------- Regroupements ---------- */
  const byClass = useMemo(() => {
    const map = new Map<string, { count: number; total: number; studentsSet: Set<string> }>();
    filteredPayments.forEach((p) => {
      const st = students.find((s) => s.id === p.studentId);
      if (!st) return;
      const key = `${st.classe}${st.option ? ` • ${st.option}` : ''}`;
      const entry = map.get(key) || { count: 0, total: 0, studentsSet: new Set<string>() };
      entry.count++;
      entry.total += p.amount;
      entry.studentsSet.add(st.id);
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, count: v.count, total: v.total, studentsCount: v.studentsSet.size }))
      .sort((a, b) => b.total - a.total);
  }, [filteredPayments, students]);

  const byMode = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredPayments.forEach((p) => {
      const entry = map.get(p.method) || { count: 0, total: 0 };
      entry.count++;
      entry.total += p.amount;
      map.set(p.method, entry);
    });
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filteredPayments]);

  const byTranche = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredPayments.forEach((p) => {
      const entry = map.get(p.tranche) || { count: 0, total: 0 };
      entry.count++;
      entry.total += p.amount;
      map.set(p.tranche, entry);
    });
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filteredPayments]);

  const byMonth = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredPayments.forEach((p) => {
      const key = p.date.slice(0, 7);
      const entry = map.get(key) || { count: 0, total: 0 };
      entry.count++;
      entry.total += p.amount;
      map.set(key, entry);
    });
    return Array.from(map.entries())
      .map(([key, v]) => {
        const [y, m] = key.split('-');
        const months = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
        return { key, label: `${months[Number(m) - 1]} ${y}`, ...v };
      })
      .sort((a, b) => a.key.localeCompare(b.key));
  }, [filteredPayments]);

  const byNiveau = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredPayments.forEach((p) => {
      const st = students.find((s) => s.id === p.studentId);
      if (!st) return;
      const entry = map.get(st.niveau) || { count: 0, total: 0 };
      entry.count++;
      entry.total += p.amount;
      map.set(st.niveau, entry);
    });
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filteredPayments, students]);

  const byExpenseCategory = useMemo(() => {
    const map = new Map<string, { count: number; total: number }>();
    filteredExpenses.forEach((e) => {
      const entry = map.get(e.category) || { count: 0, total: 0 };
      entry.count++;
      entry.total += e.amount;
      map.set(e.category, entry);
    });
    return Array.from(map.entries())
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => b.total - a.total);
  }, [filteredExpenses]);

  const labelForPeriod = () => {
    if (period === 'today') return "Aujourd'hui";
    if (period === 'week') return 'Cette semaine';
    if (period === 'month') return 'Ce mois';
    if (period === 'year') return 'Cette année';
    if (period === 'all') return 'Tout l\'historique';
    return `Du ${dateRange.from || '...'} au ${dateRange.to || '...'}`;
  };

  /* ---------- Enregistrer une dépense ---------- */
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    setExpenseMsg('');
    if (!newExpense.beneficiary.trim()) {
      setExpenseMsg('Nom du bénéficiaire obligatoire.');
      return;
    }
    if (newExpense.amount <= 0) {
      setExpenseMsg('Le montant doit être supérieur à 0.');
      return;
    }
    const nouveau: Expense = {
      id: crypto.randomUUID(),
      category: newExpense.category,
      beneficiary: newExpense.beneficiary.trim(),
      amount: newExpense.amount,
      date: newExpense.date,
      method: newExpense.method,
      note: newExpense.note.trim(),
      anneeScolaireId: activeYear?.id || '',
      createdAt: new Date().toISOString(),
    };
    setExpenses((list) => [nouveau, ...list]);
    setNewExpense({
      category: 'Salaire',
      beneficiary: '',
      amount: 0,
      date: todayStr(),
      method: EXPENSE_METHODS[0],
      note: '',
    });
    setExpenseMsg('✅ Dépense enregistrée.');
  };

  const supprimerDepense = (id: string) => {
    if (!confirm('Supprimer cette dépense ?')) return;
    setExpenses((list) => list.filter((x) => x.id !== id));
  };

  /* ---------- Print ---------- */
  const printRows = useMemo(() =>
    [...filteredPayments]
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((p, i) => {
        const st = students.find((s) => s.id === p.studentId);
        return {
          num: i + 1,
          recu: p.receiptNumber,
          date: p.date,
          eleve: st ? `${st.nom} ${st.prenom}` : '—',
          classe: st?.classe || '—',
          tranche: p.tranche,
          mode: p.method,
          montant: formatMoney(p.amount),
        };
      }), [filteredPayments, students]);

  const printExpenseRows = useMemo(() =>
    filteredExpenses.map((e, i) => ({
      num: i + 1,
      date: e.date,
      categorie: e.category,
      benef: e.beneficiary,
      mode: e.method,
      note: e.note || '—',
      montant: formatMoney(e.amount),
    })), [filteredExpenses]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Rapports financiers</h1>
        <p className="text-sm text-slate-500">
          Encaissements, dépenses et bilan de l&apos;établissement
        </p>
      </header>

      {/* Filtres période */}
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Période</span>
            <select className={inputCls} value={period} onChange={(e) => setPeriod(e.target.value as Period)}>
              <option value="today">Aujourd&apos;hui</option>
              <option value="week">Cette semaine</option>
              <option value="month">Ce mois</option>
              <option value="year">Cette année</option>
              <option value="all">Tout l&apos;historique</option>
              <option value="custom">Personnalisée</option>
            </select>
          </label>

          {period === 'custom' && (
            <>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Du</span>
                <input type="date" className={inputCls} value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-600">Au</span>
                <input type="date" className={inputCls} value={toDate} onChange={(e) => setToDate(e.target.value)} />
              </label>
            </>
          )}

          <div className="flex items-end">
            <button
              onClick={() => setShowPrint(true)}
              disabled={filteredPayments.length === 0}
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              🖨️ Imprimer les encaissements
            </button>
          </div>
        </div>
      </section>

      {/* Bandeau BILAN NET en haut */}
      <section className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-3">
        <BigMoneyCard
          label={`💰 Total encaissé (${labelForPeriod()})`}
          value={formatMoney(stats.totalCollected)}
          color="from-emerald-500 to-emerald-600"
        />
        <BigMoneyCard
          label={`💸 Total dépenses (${labelForPeriod()})`}
          value={formatMoney(stats.totalExpenses)}
          color="from-red-500 to-red-600"
        />
        <BigMoneyCard
          label={`📊 Solde net (${labelForPeriod()})`}
          value={formatMoney(stats.net)}
          color={stats.net >= 0 ? 'from-indigo-500 to-indigo-600' : 'from-amber-500 to-amber-600'}
        />
      </section>

      {/* Cartes stats */}
      <section className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Versements" value={String(stats.count)} accent="indigo" />
        <StatCard label="Dépenses" value={String(stats.countExpenses)} accent="red" />
        <StatCard label="Versement moyen" value={formatMoney(Math.round(stats.average))} accent="amber" />
        <StatCard label="Élèves ayant payé" value={String(stats.studentsWhoPaid)} accent="purple" />
      </section>

      {/* Recouvrement */}
      <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
          📊 Taux de recouvrement global
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-500">Total attendu</p>
            <p className="text-xl font-bold text-slate-900">{formatMoney(stats.totalExpectedAll)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Total encaissé (historique)</p>
            <p className="text-xl font-bold text-emerald-700">{formatMoney(stats.allTimeCollected)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Taux de recouvrement</p>
            <p className="text-xl font-bold text-indigo-700">{stats.recovery.toFixed(1)}%</p>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all"
            style={{ width: `${Math.min(stats.recovery, 100)}%` }}
          />
        </div>
      </section>

      {/* Onglets */}
      <div className="mb-5 flex flex-wrap gap-2">
        <TabBtn active={tab === 'overview'} onClick={() => setTab('overview')}>📊 Vue d&apos;ensemble</TabBtn>
        <TabBtn active={tab === 'depenses'} onClick={() => setTab('depenses')}>💸 Dépenses</TabBtn>
        <TabBtn active={tab === 'bilan'} onClick={() => setTab('bilan')}>📈 Bilan</TabBtn>
        <TabBtn active={tab === 'byClass'} onClick={() => setTab('byClass')}>🏫 Par classe</TabBtn>
        <TabBtn active={tab === 'byMode'} onClick={() => setTab('byMode')}>💳 Par mode</TabBtn>
        <TabBtn active={tab === 'monthly'} onClick={() => setTab('monthly')}>📅 Par mois</TabBtn>
        <TabBtn active={tab === 'all'} onClick={() => setTab('all')}>📋 Encaissements</TabBtn>
      </div>

      {/* Vue d'ensemble */}
      {tab === 'overview' && (
        <div className="space-y-5">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              🎓 Répartition par niveau
            </h2>
            {byNiveau.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Aucun paiement sur cette période.</p>
            ) : (
              <div className="space-y-3">
                {byNiveau.map((n) => {
                  const pct = stats.totalCollected > 0 ? (n.total / stats.totalCollected) * 100 : 0;
                  return (
                    <div key={n.label}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{n.label}</span>
                        <span className="text-slate-500">{formatMoney(n.total)} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              💸 Répartition des dépenses par catégorie
            </h2>
            {byExpenseCategory.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-400">Aucune dépense sur cette période.</p>
            ) : (
              <div className="space-y-3">
                {byExpenseCategory.map((cat) => {
                  const pct = stats.totalExpenses > 0 ? (cat.total / stats.totalExpenses) * 100 : 0;
                  return (
                    <div key={cat.label}>
                      <div className="mb-1 flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{cat.label}</span>
                        <span className="text-slate-500">{formatMoney(cat.total)} ({pct.toFixed(1)}%)</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-gradient-to-r from-red-500 to-orange-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Dépenses */}
      {tab === 'depenses' && (
        <div className="space-y-5">
          {/* Formulaire */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-1 text-lg font-semibold">➕ Nouvelle dépense</h2>
            <p className="mb-5 text-sm text-slate-500">
              Salaires, imprévus, fournitures, frais divers…
            </p>

            {expenseMsg && (
              <div className={`mb-4 rounded-lg border px-4 py-2.5 text-sm ${
                expenseMsg.startsWith('✅')
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-800'
              }`}>
                {expenseMsg}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Catégorie *</span>
                  <select
                    className={inputCls}
                    value={newExpense.category}
                    onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value as ExpenseCategory })}
                  >
                    {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Bénéficiaire *</span>
                  <input
                    className={inputCls}
                    value={newExpense.beneficiary}
                    onChange={(e) => setNewExpense({ ...newExpense, beneficiary: e.target.value })}
                    placeholder="Ex : M. KABILA (prof de math) / Boutique ABC"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Montant (FC) *</span>
                  <input
                    type="number"
                    min={0}
                    className={inputCls}
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: Number(e.target.value) })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Date</span>
                  <input
                    type="date"
                    className={inputCls}
                    value={newExpense.date}
                    onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Mode de paiement</span>
                  <select
                    className={inputCls}
                    value={newExpense.method}
                    onChange={(e) => setNewExpense({ ...newExpense, method: e.target.value })}
                  >
                    {EXPENSE_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                  </select>
                </label>
                <label className="block md:col-span-3">
                  <span className="mb-1 block text-xs font-medium text-slate-600">Note (optionnel)</span>
                  <input
                    className={inputCls}
                    value={newExpense.note}
                    onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                    placeholder="Ex : salaire du mois d'octobre / réparation plomberie"
                  />
                </label>
              </div>
              <div className="flex justify-end">
                <button type="submit" className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
                  💸 Enregistrer la dépense
                </button>
              </div>
            </form>
          </section>

          {/* Liste */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold">📋 Historique des dépenses</h2>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">
                  {filteredExpenses.length} dépense(s) — Total : <b className="text-red-700">{formatMoney(stats.totalExpenses)}</b>
                </span>
              </div>
            </div>
            {filteredExpenses.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-500">Aucune dépense sur cette période.</p>
            ) : (
              <div className="-mx-2 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                      <th className="px-3 py-2 font-semibold">Date</th>
                      <th className="px-3 py-2 font-semibold">Catégorie</th>
                      <th className="px-3 py-2 font-semibold">Bénéficiaire</th>
                      <th className="px-3 py-2 font-semibold">Note</th>
                      <th className="px-3 py-2 font-semibold">Mode</th>
                      <th className="px-3 py-2 font-semibold text-right">Montant</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenses.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{e.date}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${EXPENSE_CATEGORY_COLORS[e.category]}`}>
                            {e.category}
                          </span>
                        </td>
                        <td className="px-3 py-2 font-medium">{e.beneficiary}</td>
                        <td className="px-3 py-2 text-slate-600 max-w-xs truncate">{e.note || '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{e.method}</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-700">-{formatMoney(e.amount)}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            onClick={() => supprimerDepense(e.id)}
                            className="text-xs font-medium text-red-500 hover:text-red-700"
                          >
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-slate-300 font-bold">
                      <td colSpan={5} className="px-3 py-2 text-right">Total dépenses</td>
                      <td className="px-3 py-2 text-right text-red-800">-{formatMoney(stats.totalExpenses)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Bilan */}
      {tab === 'bilan' && (
        <div className="space-y-5">
          <section className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 p-6">
            <h2 className="mb-4 text-lg font-bold text-indigo-900">📈 Bilan net — {labelForPeriod()}</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b border-indigo-200 pb-3">
                <span className="text-sm font-medium text-slate-700">💰 Total encaissé</span>
                <span className="text-xl font-bold text-emerald-700">+{formatMoney(stats.totalCollected)}</span>
              </div>
              <div className="flex items-center justify-between border-b border-indigo-200 pb-3">
                <span className="text-sm font-medium text-slate-700">💸 Total dépenses</span>
                <span className="text-xl font-bold text-red-700">-{formatMoney(stats.totalExpenses)}</span>
              </div>
              <div className="flex items-center justify-between pt-2">
                <span className="text-base font-bold text-indigo-900">📊 SOLDE NET</span>
                <span className={`text-2xl font-bold ${stats.net >= 0 ? 'text-indigo-700' : 'text-amber-700'}`}>
                  {stats.net >= 0 ? '+' : ''}{formatMoney(stats.net)}
                </span>
              </div>
              {stats.net < 0 && (
                <p className="rounded-lg bg-amber-100 p-3 text-xs text-amber-800">
                  ⚠️ Les dépenses dépassent les encaissements sur cette période.
                </p>
              )}
            </div>
          </section>

          {/* Bilan global */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">🌍 Bilan global (toutes périodes)</h2>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-xs text-emerald-700">Total encaissé (historique)</p>
                <p className="mt-1 text-xl font-bold text-emerald-800">{formatMoney(stats.allTimeCollected)}</p>
              </div>
              <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs text-red-700">Total dépenses (historique)</p>
                <p className="mt-1 text-xl font-bold text-red-800">{formatMoney(stats.allTimeExpenses)}</p>
              </div>
              <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
                <p className="text-xs text-indigo-700">Solde net global</p>
                <p className="mt-1 text-xl font-bold text-indigo-800">{formatMoney(stats.allTimeNet)}</p>
              </div>
            </div>
          </section>

          {/* Top 10 bénéficiaires */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">👥 Top bénéficiaires de dépenses</h2>
            {(() => {
              const byBenef = new Map<string, { count: number; total: number }>();
              filteredExpenses.forEach((e) => {
                const entry = byBenef.get(e.beneficiary) || { count: 0, total: 0 };
                entry.count++;
                entry.total += e.amount;
                byBenef.set(e.beneficiary, entry);
              });
              const arr = Array.from(byBenef.entries())
                .map(([label, v]) => ({ label, ...v }))
                .sort((a, b) => b.total - a.total)
                .slice(0, 10);
              if (arr.length === 0) return <p className="py-6 text-center text-sm text-slate-500">Aucune dépense.</p>;
              return (
                <div className="-mx-2 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                        <th className="px-3 py-2 font-semibold">Bénéficiaire</th>
                        <th className="px-3 py-2 font-semibold text-right">Nb dépenses</th>
                        <th className="px-3 py-2 font-semibold text-right">Total versé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {arr.map((b) => (
                        <tr key={b.label} className="border-b border-slate-100">
                          <td className="px-3 py-2 font-medium">{b.label}</td>
                          <td className="px-3 py-2 text-right">{b.count}</td>
                          <td className="px-3 py-2 text-right font-semibold text-red-700">{formatMoney(b.total)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </section>
        </div>
      )}

      {/* Par classe */}
      {tab === 'byClass' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            🏫 Encaissements par classe
          </h2>
          {byClass.length === 0 ? (
            <p className="py-12 text-center text-slate-500">Aucun paiement sur cette période.</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2 font-semibold">Classe</th>
                    <th className="px-3 py-2 font-semibold text-right">Élèves ayant payé</th>
                    <th className="px-3 py-2 font-semibold text-right">Nb versements</th>
                    <th className="px-3 py-2 font-semibold text-right">Total encaissé</th>
                    <th className="px-3 py-2 font-semibold text-right">% du total</th>
                  </tr>
                </thead>
                <tbody>
                  {byClass.map((c) => {
                    const pct = stats.totalCollected > 0 ? (c.total / stats.totalCollected) * 100 : 0;
                    return (
                      <tr key={c.label} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium">{c.label}</td>
                        <td className="px-3 py-2 text-right">{c.studentsCount}</td>
                        <td className="px-3 py-2 text-right">{c.count}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-700">{formatMoney(c.total)}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Par mode */}
      {tab === 'byMode' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            💳 Encaissements par mode de paiement
          </h2>
          {byMode.length === 0 ? (
            <p className="py-12 text-center text-slate-500">Aucun paiement sur cette période.</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2 font-semibold">Mode</th>
                    <th className="px-3 py-2 font-semibold text-right">Nb versements</th>
                    <th className="px-3 py-2 font-semibold text-right">Total encaissé</th>
                    <th className="px-3 py-2 font-semibold text-right">% du total</th>
                  </tr>
                </thead>
                <tbody>
                  {byMode.map((m) => {
                    const pct = stats.totalCollected > 0 ? (m.total / stats.totalCollected) * 100 : 0;
                    return (
                      <tr key={m.label} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium">{m.label}</td>
                        <td className="px-3 py-2 text-right">{m.count}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-700">{formatMoney(m.total)}</td>
                        <td className="px-3 py-2 text-right text-slate-600">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Par mois */}
      {tab === 'monthly' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            📅 Évolution mensuelle (encaissements vs dépenses)
          </h2>
          {byMonth.length === 0 ? (
            <p className="py-12 text-center text-slate-500">Aucune donnée sur cette période.</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2 font-semibold">Mois</th>
                    <th className="px-3 py-2 font-semibold text-right">Encaissé</th>
                    <th className="px-3 py-2 font-semibold text-right">Dépenses</th>
                    <th className="px-3 py-2 font-semibold text-right">Solde</th>
                  </tr>
                </thead>
                <tbody>
                  {byMonth.map((m) => {
                    const depTotal = filteredExpenses
                      .filter((e) => e.date.slice(0, 7) === m.key)
                      .reduce((s, e) => s + e.amount, 0);
                    const net = m.total - depTotal;
                    return (
                      <tr key={m.key} className="border-b border-slate-100">
                        <td className="px-3 py-2 font-medium whitespace-nowrap">{m.label}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-700">{formatMoney(m.total)}</td>
                        <td className="px-3 py-2 text-right font-semibold text-red-700">{formatMoney(depTotal)}</td>
                        <td className={`px-3 py-2 text-right font-bold ${net >= 0 ? 'text-indigo-700' : 'text-amber-700'}`}>
                          {net >= 0 ? '+' : ''}{formatMoney(net)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Encaissements */}
      {tab === 'all' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            📋 Tous les encaissements ({filteredPayments.length})
          </h2>
          {filteredPayments.length === 0 ? (
            <p className="py-12 text-center text-slate-500">Aucun paiement sur cette période.</p>
          ) : (
            <div className="-mx-2 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                    <th className="px-3 py-2 font-semibold">N° Reçu</th>
                    <th className="px-3 py-2 font-semibold">Date</th>
                    <th className="px-3 py-2 font-semibold">Élève</th>
                    <th className="px-3 py-2 font-semibold">Classe</th>
                    <th className="px-3 py-2 font-semibold">Tranche</th>
                    <th className="px-3 py-2 font-semibold">Mode</th>
                    <th className="px-3 py-2 font-semibold text-right">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {[...filteredPayments].sort((a, b) => b.date.localeCompare(a.date)).map((p) => {
                    const st = students.find((s) => s.id === p.studentId);
                    return (
                      <tr key={p.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-3 py-2 font-mono text-xs text-slate-500">{p.receiptNumber}</td>
                        <td className="px-3 py-2 text-slate-600">{p.date}</td>
                        <td className="px-3 py-2 font-medium">{st ? `${st.nom} ${st.prenom}` : '—'}</td>
                        <td className="px-3 py-2 text-slate-600">{st?.classe || '—'}</td>
                        <td className="px-3 py-2">{p.tranche}</td>
                        <td className="px-3 py-2 text-slate-600">{p.method}</td>
                        <td className="px-3 py-2 text-right font-semibold text-emerald-700">+{formatMoney(p.amount)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Print encaissements */}
      {showPrint && (
        <PrintListModal
          title="Rapport des encaissements"
          subtitle={`${labelForPeriod()} — ${filteredPayments.length} versement(s)`}
          columns={[
            { key: 'num', label: 'N°', width: '5%', align: 'center' },
            { key: 'recu', label: 'N° Reçu', width: '15%' },
            { key: 'date', label: 'Date', width: '12%', align: 'center' },
            { key: 'eleve', label: 'Élève', width: '24%' },
            { key: 'classe', label: 'Classe', width: '13%' },
            { key: 'tranche', label: 'Tranche', width: '14%' },
            { key: 'mode', label: 'Mode', width: '10%' },
            { key: 'montant', label: 'Montant', width: '15%', align: 'right' },
          ]}
          rows={printRows}
          totalsRow={{
            num: '', recu: '', date: '', eleve: '', classe: '',
            tranche: 'TOTAL', mode: '',
            montant: formatMoney(stats.totalCollected),
          }}
          extraInfo={`Total encaissé : ${formatMoney(stats.totalCollected)} — Total dépenses : ${formatMoney(stats.totalExpenses)} — Solde net : ${formatMoney(stats.net)}`}
          onClose={() => setShowPrint(false)}
        />
      )}
    </div>
  );
}

/* ============================================================
   Composants
   ============================================================ */
function BigMoneyCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className={`h-1.5 bg-gradient-to-r ${color}`} />
      <div className="p-5">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="mt-1 text-2xl font-bold">{value}</p>
      </div>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: string; accent: 'indigo' | 'emerald' | 'amber' | 'purple' | 'red' }) {
  const colors: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    purple: 'from-purple-500 to-purple-600',
    red: 'from-red-500 to-red-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className={`mb-2 h-1.5 w-10 rounded-full bg-gradient-to-r ${colors[accent]}`} />
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold sm:text-xl">{value}</p>
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center rounded-xl px-4 py-2 text-sm font-medium transition ${
      active ? 'bg-indigo-600 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
    }`}>
      {children}
    </button>
  );
}