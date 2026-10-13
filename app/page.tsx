'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import {
  formatMoney,
  getPaymentStatus,
  getStudentTotalPaid,
  totalDue,
  usePayments,
  useSchoolSettings,
  useStudents,
  useActiveYear,
} from './lib/store';
import { upcomingEvents, useEvents, ymd } from './lib/vie-scolaire';
import { useStaff } from './lib/staff';
import {
  computeStudentBulletin,
  useBulletinConfig,
  useBulletinTemplates,
  useConduite,
  useGrades,
} from './lib/bulletins';

export default function DashboardPage() {
  const [students] = useStudents();
  const [payments] = usePayments();
  const [settings] = useSchoolSettings();
  const [events] = useEvents();
  const [staff] = useStaff();
  const [templates] = useBulletinTemplates();
  const [grades] = useGrades();
  const [conduite] = useConduite();
  const [bulletinConfig] = useBulletinConfig();
  const activeYear = useActiveYear();

  /* Année scolaire en cours (évite new Date() direct pendant le rendu) */
  const [anneeScolaire, setAnneeScolaire] = useState('');
  useEffect(() => {
    const y = new Date().getFullYear();
    setAnneeScolaire(`${y} – ${y + 1}`);
  }, []);

  /* ---------- Statistiques ---------- */
  const stats = useMemo(() => {
    const totalPaid = payments.reduce((s, p) => s + p.amount, 0);
    const totalDueAll = students.reduce(
      (sum, s) => sum + totalDue(settings.tranches, s.niveau),
      0,
    );

    const byStatus = { Payé: 0, Partiel: 0, 'Non payé': 0 };
    students.forEach((s) => {
      const due = totalDue(settings.tranches, s.niveau);
      const paid = getStudentTotalPaid(payments, s.id);
      const st = getPaymentStatus(paid, due);
      if (st.label === 'Payé') byStatus['Payé']++;
      else if (st.label === 'Partiel') byStatus['Partiel']++;
      else if (st.label === 'Non payé') byStatus['Non payé']++;
    });

    return {
      totalStudents: students.length,
      totalDueAll,
      totalPaid,
      balance: Math.max(totalDueAll - totalPaid, 0),
      byStatus,
    };
  }, [students, payments, settings.tranches]);

  /* ---------- Alertes ---------- */
  const alerts = useMemo(() => {
    const list: { id: string; icon: string; level: 'red' | 'amber' | 'blue'; text: string; href: string; cta: string }[] = [];

    // 1. Élèves non payés
    const notPaid = students.filter(
      (s) => getStudentTotalPaid(payments, s.id) === 0,
    );
    if (notPaid.length > 0) {
      list.push({
        id: 'not-paid',
        icon: '🔴',
        level: 'red',
        text: `${notPaid.length} élève(s) n'ont encore effectué aucun versement`,
        href: '/paiements',
        cta: 'Voir les paiements',
      });
    }

    // 2. Élèves avec solde restant
    const partial = students.filter((s) => {
      const due = totalDue(settings.tranches, s.niveau);
      const paid = getStudentTotalPaid(payments, s.id);
      return paid > 0 && paid < due;
    });
    if (partial.length > 0) {
      list.push({
        id: 'partial',
        icon: '🟠',
        level: 'amber',
        text: `${partial.length} élève(s) ont un solde restant à régler`,
        href: '/paiements',
        cta: 'Voir la liste',
      });
    }

    // 3. Événements dans les 7 prochains jours
    const today = ymd(new Date());
    const in7days = new Date();
    in7days.setDate(in7days.getDate() + 7);
    const in7 = ymd(in7days);
    const soonEvents = events.filter((ev) => ev.startDate >= today && ev.startDate <= in7);
    if (soonEvents.length > 0) {
      list.push({
        id: 'events-soon',
        icon: '📅',
        level: 'blue',
        text: `${soonEvents.length} événement(s) à venir cette semaine : ${soonEvents.map((e) => e.title).slice(0, 2).join(', ')}${soonEvents.length > 2 ? '…' : ''}`,
        href: '/vie-scolaire',
        cta: 'Voir le calendrier',
      });
    }

    // 4. Personnel en congé
    const onLeave = staff.filter((s) => s.statut === 'En congé');
    if (onLeave.length > 0) {
      list.push({
        id: 'staff-leave',
        icon: '🏖️',
        level: 'amber',
        text: `${onLeave.length} membre(s) du personnel en congé`,
        href: '/personnel',
        cta: 'Voir le personnel',
      });
    }

    // 5. Bulletins incomplets
    let incompleteClasses = 0;
    templates.forEach((tpl) => {
      const classStudents = students.filter(
        (s) => s.classe === tpl.classe && (tpl.option ? s.option === tpl.option : true),
      );
      if (classStudents.length === 0) return;
      const allComplete = classStudents.every((s) => {
        const b = computeStudentBulletin(s.id, tpl, grades, conduite, bulletinConfig);
        return b.isComplete;
      });
      if (!allComplete) incompleteClasses++;
    });
    if (incompleteClasses > 0) {
      list.push({
        id: 'bulletins-incomplete',
        icon: '📄',
        level: 'blue',
        text: `${incompleteClasses} classe(s) ont des bulletins non complétés`,
        href: '/bulletins',
        cta: 'Compléter les bulletins',
      });
    }

    return list;
  }, [students, payments, settings.tranches, events, staff, templates, grades, conduite, bulletinConfig]);

  /* ---------- Derniers paiements ---------- */
  const recentPayments = useMemo(
    () => [...payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 5),
    [payments],
  );

  /* ---------- Prochains événements ---------- */
  const nextEvents = useMemo(() => upcomingEvents(events, 3), [events]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Tableau de bord</h1>
        <p className="text-sm text-slate-500">
          Vue d&apos;ensemble de {settings.schoolName || 'votre établissement'}
          {activeYear ? ` — Année ${activeYear.label}` : ` — ${anneeScolaire || '…'}`}
        </p>
      </header>

      {/* Bandeau année active */}
      {activeYear && (
        <section className="mb-5 flex flex-wrap items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <span className="font-semibold">🟢 Année active :</span>
          <span>{activeYear.label}</span>
          <span className="text-emerald-600">•</span>
          <span className="text-xs">
            Du {new Date(activeYear.startDate).toLocaleDateString('fr-FR')} au {new Date(activeYear.endDate).toLocaleDateString('fr-FR')}
          </span>
        </section>
      )}

      {/* Alertes */}
      {alerts.length > 0 && (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            ⚠️ Alertes ({alerts.length})
          </h2>
          <ul className="space-y-2">
            {alerts.map((a) => {
              const colors: Record<string, string> = {
                red: 'border-red-200 bg-red-50 text-red-900',
                amber: 'border-amber-200 bg-amber-50 text-amber-900',
                blue: 'border-blue-200 bg-blue-50 text-blue-900',
              };
              return (
                <li key={a.id} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${colors[a.level]}`}>
                  <span className="text-lg">{a.icon}</span>
                  <span className="flex-1 text-sm font-medium">{a.text}</span>
                  <Link
                    href={a.href}
                    className="whitespace-nowrap rounded-lg bg-white/70 px-3 py-1.5 text-xs font-semibold transition hover:bg-white"
                  >
                    {a.cta} →
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Effectifs */}
      <section className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total élèves" value={stats.totalStudents} accent="indigo" />
        <StatCard label="Élèves à jour" value={stats.byStatus['Payé']} accent="emerald" />
        <StatCard label="Paiements partiels" value={stats.byStatus['Partiel']} accent="amber" />
        <StatCard label="Non payés" value={stats.byStatus['Non payé']} accent="red" />
      </section>

      {/* Finances */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <MoneyCard label="Total attendu" value={formatMoney(stats.totalDueAll)} color="from-slate-500 to-slate-600" />
        <MoneyCard label="Total encaissé" value={formatMoney(stats.totalPaid)} color="from-emerald-500 to-emerald-600" />
        <MoneyCard label="Solde restant" value={formatMoney(stats.balance)} color="from-red-500 to-red-600" />
      </section>

      {/* Statuts + actions */}
      <section className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Statut des paiements
          </h2>
          <div className="space-y-3">
            <StatusBar label="Payé" count={stats.byStatus['Payé']} total={stats.totalStudents} color="bg-emerald-500" />
            <StatusBar label="Partiel" count={stats.byStatus['Partiel']} total={stats.totalStudents} color="bg-amber-500" />
            <StatusBar label="Non payé" count={stats.byStatus['Non payé']} total={stats.totalStudents} color="bg-red-500" />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Actions rapides
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <QuickLink href="/eleves" icon="👥" label="Inscrire un élève" />
            <QuickLink href="/paiements" icon="💳" label="Enregistrer un paiement" />
            <QuickLink href="/rapports" icon="💰" label="Voir les rapports" />
            <QuickLink href="/bulletins" icon="📄" label="Saisir des notes" />
          </div>
        </div>
      </section>

      {/* 2 colonnes */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Derniers paiements
            </h2>
            <Link href="/paiements" className="text-xs font-medium text-indigo-600 hover:underline">Voir tout →</Link>
          </div>
          {recentPayments.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Aucun paiement enregistré.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentPayments.map((p) => {
                const student = students.find((s) => s.id === p.studentId);
                return (
                  <li key={p.id} className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm font-medium">
                        {student ? `${student.nom} ${student.prenom}` : 'Élève inconnu'}
                      </p>
                      <p className="text-xs text-slate-500">{p.tranche} • {p.date}</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-600">+{formatMoney(p.amount)}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
              Prochains événements
            </h2>
            <Link href="/vie-scolaire" className="text-xs font-medium text-indigo-600 hover:underline">Calendrier →</Link>
          </div>
          {nextEvents.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">Aucun événement à venir.</p>
          ) : (
            <ul className="space-y-2">
              {nextEvents.map((ev) => (
                <li key={ev.id} className="flex items-start gap-3 rounded-lg border border-slate-100 p-2.5">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-indigo-50 text-sm">📅</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{ev.title}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(ev.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}
                      {ev.endDate && ev.endDate !== ev.startDate && ` → ${new Date(ev.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long' })}`}
                    </p>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                    {ev.type}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, accent }: { label: string; value: number; accent: 'indigo' | 'emerald' | 'amber' | 'red' }) {
  const colors: Record<string, string> = {
    indigo: 'from-indigo-500 to-indigo-600',
    emerald: 'from-emerald-500 to-emerald-600',
    amber: 'from-amber-500 to-amber-600',
    red: 'from-red-500 to-red-600',
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className={`mb-3 h-1.5 w-10 rounded-full bg-gradient-to-r ${colors[accent]}`} />
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold sm:text-3xl">{value}</p>
    </div>
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

function StatusBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{count} / {total}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50">
      <span className="text-lg">{icon}</span>
      {label}
    </Link>
  );
}