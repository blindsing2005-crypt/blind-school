'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatMoney, usePayments, useStudents, type Student } from '../lib/store';
import { useEvents } from '../lib/vie-scolaire';
import { useStaff } from '../lib/staff';
import StudentQuickView from './StudentQuickView';

type ResultType = 'eleve' | 'personnel' | 'paiement' | 'evenement';

interface SearchResult {
  type: ResultType;
  icon: string;
  title: string;
  subtitle: string;
  href: string;
  studentId?: string;
}

export default function GlobalSearch() {
  const router = useRouter();
  const [students] = useStudents();
  const [payments] = usePayments();
  const [staff] = useStaff();
  const [events] = useEvents();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [quickStudent, setQuickStudent] = useState<Student | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === 'Escape' && open && !quickStudent) {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, quickStudent]);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const results = useMemo<SearchResult[]>(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];

    const out: SearchResult[] = [];

    students.forEach((s) => {
      const hay = `${s.nom} ${s.postnom} ${s.prenom} ${s.matricule}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({ type: 'eleve', icon: '👤', title: `${s.nom} ${s.postnom} ${s.prenom}`, subtitle: `Élève • ${s.classe} • ${s.matricule}`, href: `/eleves?student=${s.id}`, studentId: s.id });
      }
    });

    staff.forEach((s) => {
      const hay = `${s.nom} ${s.postnom} ${s.prenom} ${s.matricule} ${s.specialite}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({ type: 'personnel', icon: '👨‍🏫', title: `${s.nom} ${s.postnom} ${s.prenom}`, subtitle: `${s.role} • ${s.matricule}`, href: '/personnel' });
      }
    });

    payments.forEach((p) => {
      if (p.receiptNumber.toLowerCase().includes(q)) {
        const student = students.find((s) => s.id === p.studentId);
        out.push({ type: 'paiement', icon: '💳', title: `Reçu ${p.receiptNumber}`, subtitle: `${student ? `${student.nom} ${student.prenom}` : 'Élève inconnu'} • ${formatMoney(p.amount)} • ${p.date}`, href: '/paiements', studentId: student?.id });
      }
    });

    events.forEach((ev) => {
      const hay = `${ev.title} ${ev.description}`.toLowerCase();
      if (hay.includes(q)) {
        out.push({ type: 'evenement', icon: '📅', title: ev.title, subtitle: `${ev.type} • ${ev.startDate}`, href: '/vie-scolaire' });
      }
    });

    return out.slice(0, 20);
  }, [query, students, staff, payments, events]);

  const handleSelect = (r: SearchResult) => {
    if ((r.type === 'eleve' || r.type === 'paiement') && r.studentId) {
      const student = students.find((s) => s.id === r.studentId);
      if (student) {
        setQuickStudent(student);
        setOpen(false);
        return;
      }
    }
    setOpen(false);
    router.push(r.href);
  };

  const goToFullFiche = () => {
    if (!quickStudent) return;
    const id = quickStudent.id;
    setQuickStudent(null);
    router.push(`/eleves?student=${id}`);
  };

  return (
    <>
      {/* 🔍 Bouton de recherche visible PARTOUT (Mobile et PC) */}
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-2 py-2 text-slate-500 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 lg:px-3"
        title="Rechercher (Ctrl+K)"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="hidden lg:inline text-xs">Rechercher…</span>
        <span className="hidden lg:inline rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px]">Ctrl K</span>
      </button>

      {/* Modal de recherche (le reste ne change pas) */}
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/60 p-4 pt-24 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0 text-slate-400">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input autoFocus className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-slate-400" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un élève, un reçu..." />
              <button onClick={() => setOpen(false)} className="rounded bg-slate-100 px-2 py-1 font-mono text-[10px] text-slate-500 hover:bg-slate-200">ESC</button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {query.trim().length < 2 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500">
                  <p className="font-medium">Que cherchez-vous ?</p>
                  <p className="mt-1 text-xs">Tapez au moins 2 caractères.</p>
                </div>
              ) : results.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-slate-500"><p>Aucun résultat pour « {query} »</p></div>
              ) : (
                <ul className="divide-y divide-slate-100">
                  {results.map((r, i) => (
                    <li key={`${r.type}-${i}`}>
                      <button onClick={() => handleSelect(r)} className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-indigo-50">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-lg">{r.icon}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{r.title}</p>
                          <p className="truncate text-xs text-slate-500">{r.subtitle}</p>
                        </div>
                        <span className="whitespace-nowrap text-xs font-medium text-indigo-600">Aperçu →</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
              <span>{results.length} résultat(s)</span>
              <span className="font-mono">Ctrl + K</span>
            </div>
          </div>
        </div>
      )}

      {quickStudent && (
        <StudentQuickView student={quickStudent} onClose={() => setQuickStudent(null)} onOpenFullFiche={goToFullFiche} />
      )}
    </>
  );
}