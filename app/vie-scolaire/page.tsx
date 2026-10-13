'use client';
import { useMemo, useState, type FormEvent, type ReactNode } from 'react';
import {
  DAYS_FR_SHORT,
  EVENT_COLORS,
  EVENT_TYPES,
  MONTHS_FR,
  buildMonthGrid,
  eventCoversDay,
  sortEventsByDate,
  upcomingEvents,
  useEvents,
  useJourney,
  ymd,
  type EventType,
  type HistoryEntry,
  type SchoolEvent,
} from '../lib/vie-scolaire';

const today = () => ymd(new Date());

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400';

type EventForm = {
  title: string;
  type: EventType;
  startDate: string;
  endDate: string;
  description: string;
};

const emptyEvent: EventForm = {
  title: '',
  type: 'Examen',
  startDate: today(),
  endDate: '',
  description: '',
};

export default function VieScolairePage() {
  const [events, setEvents] = useEvents();
  const [journey, setJourney] = useJourney();
  const [tab, setTab] = useState<'calendrier' | 'evenements' | 'parcours'>('calendrier');

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState<string>(today());

  const [form, setForm] = useState<EventForm>(emptyEvent);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const updateForm = (patch: Partial<EventForm>) => setForm((f) => ({ ...f, ...patch }));

  const resetForm = () => {
    setForm({ ...emptyEvent, startDate: selectedDay || today() });
    setEditingId(null);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate) {
      setMessage({ type: 'error', text: 'Titre et date de début obligatoires.' });
      return;
    }
    if (form.endDate && form.endDate < form.startDate) {
      setMessage({ type: 'error', text: 'La date de fin doit être après le début.' });
      return;
    }
    if (editingId) {
      setEvents((list) => list.map((ev) => ev.id === editingId
        ? { ...ev, ...form, endDate: form.endDate || '' }
        : ev));
      setMessage({ type: 'success', text: 'Événement mis à jour.' });
    } else {
      const nouveau: SchoolEvent = {
        id: crypto.randomUUID(),
        ...form,
        endDate: form.endDate || '',
        createdAt: new Date().toISOString(),
      };
      setEvents((list) => [nouveau, ...list]);
      setMessage({ type: 'success', text: 'Événement ajouté.' });
    }
    resetForm();
  };

  const handleEdit = (ev: SchoolEvent) => {
    setForm({
      title: ev.title,
      type: ev.type,
      startDate: ev.startDate,
      endDate: ev.endDate,
      description: ev.description,
    });
    setEditingId(ev.id);
    setTab('evenements');
  };

  const supprimer = (id: string) => {
    if (!confirm('Supprimer cet événement ?')) return;
    setEvents((list) => list.filter((x) => x.id !== id));
  };

  const goPrev = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const goNext = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };
  const goToday = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth());
    setSelectedDay(ymd(d));
  };

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const upcoming = useMemo(() => upcomingEvents(events, 5), [events]);
  const dayEvents = useMemo(
    () => sortEventsByDate(events.filter((ev) => eventCoversDay(ev, selectedDay))),
    [events, selectedDay],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Vie scolaire</h1>
        <p className="text-sm text-slate-500">
          Calendrier, événements et parcours de l&apos;établissement
        </p>
      </header>

      <div className="mb-5 flex flex-wrap gap-2">
        <TabBtn active={tab === 'calendrier'} onClick={() => setTab('calendrier')}>📅 Calendrier</TabBtn>
        <TabBtn active={tab === 'evenements'} onClick={() => setTab('evenements')}>
          📝 Événements
          <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{events.length}</span>
        </TabBtn>
        <TabBtn active={tab === 'parcours'} onClick={() => setTab('parcours')}>🏫 Parcours de l&apos;école</TabBtn>
      </div>

      {message && (
        <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* ============ CALENDRIER ============ */}
      {tab === 'calendrier' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[2fr,1fr]">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button onClick={goPrev} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">‹</button>
                <h2 className="min-w-[180px] text-center text-lg font-semibold">
                  {MONTHS_FR[month]} {year}
                </h2>
                <button onClick={goNext} className="grid h-9 w-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50">›</button>
              </div>
              <button onClick={goToday} className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium hover:bg-slate-50">
                Aujourd&apos;hui
              </button>
            </div>

            <div className="grid grid-cols-7 border-l border-t border-slate-200">
              {DAYS_FR_SHORT.map((d) => (
                <div key={d} className="border-b border-r border-slate-200 bg-slate-50 px-2 py-1.5 text-center text-xs font-semibold uppercase text-slate-500">
                  {d}
                </div>
              ))}
              {grid.flat().map((date, i) => {
                const key = ymd(date);
                const inMonth = date.getMonth() === month;
                const isToday = key === today();
                const isSel = key === selectedDay;
                const dayEvs = events.filter((ev) => eventCoversDay(ev, key));
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedDay(key)}
                    className={`min-h-[78px] border-b border-r border-slate-200 p-1.5 text-left transition ${
                      inMonth ? 'bg-white' : 'bg-slate-50/60'
                    } ${isSel ? 'ring-2 ring-inset ring-indigo-500' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`text-xs font-semibold ${inMonth ? 'text-slate-700' : 'text-slate-400'}`}>
                      {date.getDate()}
                      {isToday && <span className="ml-1 rounded-full bg-indigo-600 px-1.5 py-0.5 text-[9px] text-white">auj.</span>}
                    </div>
                    <div className="mt-1 space-y-0.5">
                      {dayEvs.slice(0, 2).map((ev) => {
                        const c = EVENT_COLORS[ev.type];
                        return (
                          <div key={ev.id} className={`flex items-center gap-1 truncate rounded px-1 py-0.5 text-[10px] ${c.bg} ${c.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`}></span>
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );
                      })}
                      {dayEvs.length > 2 && (
                        <div className="text-[10px] text-slate-500">+{dayEvs.length - 2} autres</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-3 text-xs text-slate-600">
              {EVENT_TYPES.map((t) => (
                <span key={t} className="inline-flex items-center gap-1.5">
                  <span className={`h-2.5 w-2.5 rounded-full ${EVENT_COLORS[t].dot}`}></span>
                  {t}
                </span>
              ))}
            </div>
          </section>

          <div className="space-y-5">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                📌 {new Date(selectedDay).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              {dayEvents.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">
                  Aucun événement prévu.
                </p>
              ) : (
                <ul className="space-y-2">
                  {dayEvents.map((ev) => {
                    const c = EVENT_COLORS[ev.type];
                    return (
                      <li key={ev.id} className={`rounded-lg border p-3 ${c.bg}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className={`text-sm font-semibold ${c.text}`}>{ev.title}</p>
                            <p className="text-xs text-slate-600">
                              {ev.type}
                              {ev.endDate && ev.endDate !== ev.startDate && ` • jusqu'au ${ev.endDate}`}
                            </p>
                            {ev.description && (
                              <p className="mt-1 text-xs text-slate-600">{ev.description}</p>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <button onClick={() => handleEdit(ev)} className="text-xs font-medium text-indigo-600 hover:underline">
                              Modifier
                            </button>
                            <button onClick={() => supprimer(ev.id)} className="text-xs font-medium text-red-500 hover:underline">
                              Supprimer
                            </button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
                ⏭️ Prochains événements
              </h3>
              {upcoming.length === 0 ? (
                <p className="py-4 text-center text-sm text-slate-400">Aucun événement à venir.</p>
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((ev) => {
                    const c = EVENT_COLORS[ev.type];
                    return (
                      <li key={ev.id} className="flex items-start gap-2 rounded-lg border border-slate-100 p-2.5">
                        <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${c.dot}`}></span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{ev.title}</p>
                          <p className="text-xs text-slate-500">
                            {new Date(ev.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}
                            {ev.endDate && ev.endDate !== ev.startDate && ` → ${new Date(ev.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })}`}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}

      {/* ============ ÉVÉNEMENTS ============ */}
      {tab === 'evenements' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-1 text-lg font-semibold">
              {editingId ? '✏️ Modifier un événement' : '➕ Nouvel événement'}
            </h2>
            <p className="mb-5 text-sm text-slate-500">
              Ajoutez les dates importantes : examens, congés, réunions, activités.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <Field label="Titre" required>
                  <input className={inputCls} value={form.title} onChange={(e) => updateForm({ title: e.target.value })} placeholder="Ex : Examen de fin de semestre" />
                </Field>
                <Field label="Type">
                  <select className={inputCls} value={form.type} onChange={(e) => updateForm({ type: e.target.value as EventType })}>
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Date de début" required>
                  <input type="date" className={inputCls} value={form.startDate} onChange={(e) => updateForm({ startDate: e.target.value })} />
                </Field>
                <Field label="Date de fin (optionnel)">
                  <input type="date" className={inputCls} value={form.endDate} onChange={(e) => updateForm({ endDate: e.target.value })} />
                </Field>
                <div className="md:col-span-2">
                  <Field label="Description (optionnel)">
                    <input className={inputCls} value={form.description} onChange={(e) => updateForm({ description: e.target.value })} placeholder="Détails, lieu, horaire..." />
                  </Field>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-4">
                {editingId && (
                  <button type="button" onClick={resetForm} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                    Annuler
                  </button>
                )}
                <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                  {editingId ? 'Enregistrer les modifications' : "Ajouter l'événement"}
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="mb-4 text-lg font-semibold">📋 Tous les événements</h2>
            {events.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <div className="mb-2 text-4xl">📅</div>
                <p className="font-medium text-slate-700">Aucun événement enregistré</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {sortEventsByDate(events).map((ev) => {
                  const c = EVENT_COLORS[ev.type];
                  const isPast = (ev.endDate || ev.startDate) < today();
                  return (
                    <li key={ev.id} className={`flex items-start gap-3 py-3 ${isPast ? 'opacity-60' : ''}`}>
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${c.dot}`}></span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{ev.title}</p>
                        <p className="text-xs text-slate-500">
                          <span className={`inline-block rounded-full px-2 py-0.5 ${c.bg} ${c.text}`}>{ev.type}</span>
                          <span className="ml-2">
                            {new Date(ev.startDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
                            {ev.endDate && ev.endDate !== ev.startDate && ` → ${new Date(ev.endDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}`}
                          </span>
                          {isPast && <span className="ml-2 italic text-slate-400">(terminé)</span>}
                        </p>
                        {ev.description && <p className="mt-1 text-xs text-slate-600">{ev.description}</p>}
                      </div>
                      <div className="flex shrink-0 gap-3">
                        <button onClick={() => handleEdit(ev)} className="text-xs font-medium text-indigo-600 hover:underline">Modifier</button>
                        <button onClick={() => supprimer(ev.id)} className="text-xs font-medium text-red-500 hover:underline">Supprimer</button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {/* ============ PARCOURS ============ */}
      {tab === 'parcours' && <ParcoursTab journey={journey} setJourney={setJourney} />}
    </div>
  );
}

/* ============================================================
   PARCOURS
   ============================================================ */
function ParcoursTab({
  journey, setJourney,
}: {
  journey: ReturnType<typeof useJourney>[0];
  setJourney: ReturnType<typeof useJourney>[1];
}) {
  const [newEntry, setNewEntry] = useState<HistoryEntry>({
    id: '',
    year: '',
    title: '',
    description: '',
    order: 0,
  });

  const addEntry = (e: FormEvent) => {
    e.preventDefault();
    if (!newEntry.year.trim() || !newEntry.title.trim()) {
      alert('Année et titre obligatoires.');
      return;
    }
    const entry: HistoryEntry = {
      ...newEntry,
      id: crypto.randomUUID(),
      order: journey.entries.length + 1,
    };
    setJourney((j) => ({ ...j, entries: [...j.entries, entry] }));
    setNewEntry({ id: '', year: '', title: '', description: '', order: 0 });
  };

  const updateEntry = (id: string, patch: Partial<HistoryEntry>) => {
    setJourney((j) => ({
      ...j,
      entries: j.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  };

  const removeEntry = (id: string) => {
    if (!confirm('Supprimer cette étape ?')) return;
    setJourney((j) => ({ ...j, entries: j.entries.filter((e) => e.id !== id) }));
  };

  const sortedEntries = [...journey.entries].sort((a, b) => a.order - b.order);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">🏫 Présentation de l&apos;école</h2>
        <p className="mb-4 text-sm text-slate-500">
          Rédigez ici l&apos;histoire, la mission et les valeurs de votre établissement.
        </p>
        <textarea
          rows={6}
          className={inputCls}
          value={journey.presentation}
          onChange={(e) => setJourney((j) => ({ ...j, presentation: e.target.value }))}
          placeholder="Fondée en ..., notre école a pour mission de ..."
        />
        <p className="mt-2 text-xs text-emerald-700">💾 Enregistrement automatique</p>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-1 text-lg font-semibold">📜 Grandes étapes</h2>
        <p className="mb-5 text-sm text-slate-500">
          Retracez les étapes marquantes de votre établissement.
        </p>

        <form onSubmit={addEntry} className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-[100px,1fr,2fr,auto]">
          <Field label="Année">
            <input className={inputCls} value={newEntry.year} onChange={(e) => setNewEntry({ ...newEntry, year: e.target.value })} placeholder="1990" />
          </Field>
          <Field label="Titre">
            <input className={inputCls} value={newEntry.title} onChange={(e) => setNewEntry({ ...newEntry, title: e.target.value })} placeholder="Fondation de l'école" />
          </Field>
          <Field label="Description">
            <input className={inputCls} value={newEntry.description} onChange={(e) => setNewEntry({ ...newEntry, description: e.target.value })} placeholder="Courte description..." />
          </Field>
          <div className="flex items-end">
            <button type="submit" className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
              ➕ Ajouter
            </button>
          </div>
        </form>

        {sortedEntries.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <div className="mb-2 text-4xl">📜</div>
            <p className="font-medium text-slate-700">Aucune étape enregistrée</p>
            <p className="text-sm">Ajoutez votre première étape ci-dessus.</p>
          </div>
        ) : (
          <ol className="relative space-y-4 border-l-2 border-indigo-100 pl-6">
            {sortedEntries.map((entry, i) => (
              <li key={entry.id} className="relative">
                <span className="absolute -left-[31px] top-1 grid h-5 w-5 place-items-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                  {i + 1}
                </span>
                <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-[100px,1fr,2fr,auto]">
                  <Field label="Année">
                    <input className={inputCls} value={entry.year} onChange={(e) => updateEntry(entry.id, { year: e.target.value })} />
                  </Field>
                  <Field label="Titre">
                    <input className={inputCls} value={entry.title} onChange={(e) => updateEntry(entry.id, { title: e.target.value })} />
                  </Field>
                  <Field label="Description">
                    <input className={inputCls} value={entry.description} onChange={(e) => updateEntry(entry.id, { description: e.target.value })} />
                  </Field>
                  <div className="flex items-end">
                    <button onClick={() => removeEntry(entry.id)} className="text-xs font-medium text-red-500 hover:underline">
                      Supprimer
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  );
}

/* ============================================================
   PETITS COMPOSANTS
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