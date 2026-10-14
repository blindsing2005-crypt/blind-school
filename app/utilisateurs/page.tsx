'use client';
import { useMemo, useState, type FormEvent } from 'react';
import { CLASSES } from '../lib/store';
import {
  PERMISSION_LABELS,
  ROLES,
  ROLE_PERMISSIONS,
  generateRecoveryCode,
  getUserPermissions,
  hashPassword,
  useAuth,
  useRecoveryCode,
  useUsers,
  type Permission,
  type Role,
  type UserAccount,
} from '../lib/auth';

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-100 disabled:text-slate-400';

const ALL_CLASSES = Object.values(CLASSES).flat();

type FormState = {
  username: string;
  fullName: string;
  email: string;
  role: Role;
  password: string;
  active: boolean;
  assignedClasses: string[];
};

const emptyForm: FormState = {
  username: '',
  fullName: '',
  email: '',
  role: 'Secrétaire',
  password: '',
  active: true,
  assignedClasses: [],
};

export default function UtilisateursPage() {
  const { session, can } = useAuth();
  const [users, setUsers] = useUsers();
  const [recoveryCode, setRecoveryCode] = useRecoveryCode();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showPwd, setShowPwd] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);

  const [permsUser, setPermsUser] = useState<UserAccount | null>(null);

  const isAllowed = can('utilisateurs.manage');

  const reset = () => { setForm(emptyForm); setEditingId(null); setShowPwd(false); };

  const toggleClassAssignment = (c: string) => {
    setForm((f) => ({
      ...f,
      assignedClasses: f.assignedClasses.includes(c)
        ? f.assignedClasses.filter((x) => x !== c)
        : [...f.assignedClasses, c],
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!isAllowed) return;
    if (!form.username.trim() || !form.fullName.trim()) {
      setMessage({ type: 'error', text: 'Nom d\'utilisateur et nom complet obligatoires.' });
      return;
    }
    const username = form.username.trim().toLowerCase();
    const duplicate = users.some(
      (u) => u.username.toLowerCase() === username && u.id !== editingId,
    );
    if (duplicate) {
      setMessage({ type: 'error', text: 'Ce nom d\'utilisateur est déjà pris.' });
      return;
    }

    if (editingId) {
      let passwordHash: string | undefined;
      if (form.password.trim()) passwordHash = await hashPassword(form.password.trim());
      setUsers((list) =>
        list.map((u) =>
          u.id === editingId
            ? {
                ...u,
                username,
                fullName: form.fullName.trim(),
                email: form.email.trim().toLowerCase(),
                role: form.role,
                active: form.active,
                assignedClasses: form.assignedClasses,
                ...(passwordHash ? { passwordHash } : {}),
              }
            : u,
        ),
      );
      setMessage({ type: 'success', text: 'Compte mis à jour.' });
      reset();
    } else {
      if (form.password.trim().length < 5) {
        setMessage({ type: 'error', text: 'Mot de passe : minimum 5 caractères.' });
        return;
      }
      const passwordHash = await hashPassword(form.password.trim());
      const user: UserAccount = {
        id: crypto.randomUUID(),
        username,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        passwordHash,
        active: form.active,
        createdAt: new Date().toISOString(),
        lastLoginAt: '',
        customPermissions: null,
        resetCode: null,
        resetCodeExpiry: null,
        assignedClasses: form.assignedClasses,
      };
      setUsers((list) => [...list, user]);
      setMessage({ type: 'success', text: `Compte créé — ${user.username}` });
      reset();
    }
  };

  const handleEdit = (u: UserAccount) => {
    setForm({
      username: u.username,
      fullName: u.fullName,
      email: u.email || '',
      role: u.role,
      password: '',
      active: u.active,
      assignedClasses: u.assignedClasses || [],
    });
    setEditingId(u.id);
  };

  const changeRole = (u: UserAccount, newRole: Role) => {
    if (session?.userId === u.id && newRole !== 'Administrateur') {
      if (!confirm('Attention : vous allez retirer votre propre rôle d\'administrateur. Confirmer ?')) return;
    }
    setUsers((list) =>
      list.map((x) => (x.id === u.id ? { ...x, role: newRole, customPermissions: null } : x)),
    );
    setMessage({ type: 'success', text: `Rôle de ${u.username} : ${newRole}` });
  };

  const supprimer = (u: UserAccount) => {
    if (session?.userId === u.id) { alert('Vous ne pouvez pas supprimer votre propre compte.'); return; }
    if (!confirm(`Supprimer définitivement le compte « ${u.username} » ?`)) return;
    setUsers((list) => list.filter((x) => x.id !== u.id));
  };

  const toggleActive = (u: UserAccount) => {
    if (session?.userId === u.id) { alert('Vous ne pouvez pas désactiver votre propre compte.'); return; }
    setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, active: !x.active } : x)));
  };

  const regenerateRecovery = () => {
    if (!confirm('Générer un nouveau code de secours ? L\'ancien ne fonctionnera plus.')) return;
    const code = generateRecoveryCode();
    setRecoveryCode(code);
    setShowRecovery(true);
    setMessage({ type: 'success', text: 'Nouveau code de secours généré.' });
  };

  const copyRecovery = () => {
    if (!recoveryCode) return;
    navigator.clipboard.writeText(recoveryCode);
    alert('Code copié dans le presse-papier.');
  };

  const togglePermission = (u: UserAccount, perm: Permission) => {
    const current = u.customPermissions ?? getUserPermissions(u);
    const next = current.includes(perm)
      ? current.filter((p) => p !== perm)
      : [...current, perm];

    setUsers((list) =>
      list.map((x) =>
        x.id === u.id
          ? { ...x, customPermissions: next.length > 0 ? next : [] }
          : x,
      ),
    );
    if (permsUser && permsUser.id === u.id) {
      setPermsUser({ ...u, customPermissions: next.length > 0 ? next : [] });
    }
  };

  const resetPermissions = (u: UserAccount) => {
    if (!confirm('Réinitialiser les permissions de cet utilisateur selon son rôle ?')) return;
    setUsers((list) =>
      list.map((x) => (x.id === u.id ? { ...x, customPermissions: null } : x)),
    );
    if (permsUser && permsUser.id === u.id) {
      setPermsUser({ ...u, customPermissions: null });
    }
    setMessage({ type: 'success', text: 'Permissions réinitialisées.' });
  };

  const toggleAssignedClass = (u: UserAccount, c: string) => {
    const current = u.assignedClasses || [];
    const next = current.includes(c)
      ? current.filter((x) => x !== c)
      : [...current, c];
    setUsers((list) =>
      list.map((x) => (x.id === u.id ? { ...x, assignedClasses: next } : x)),
    );
  };

  const sorted = useMemo(
    () => [...users].sort((a, b) => a.username.localeCompare(b.username)),
    [users],
  );

  if (!isAllowed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <p className="mb-1 text-lg font-semibold text-red-900">🚫 Accès refusé</p>
          <p className="text-sm text-red-800">Cette page est réservée aux administrateurs.</p>
        </div>
      </div>
    );
  }

  const groupedPerms = PERMISSION_LABELS.reduce<Record<string, typeof PERMISSION_LABELS>>((acc, p) => {
    acc[p.group] = acc[p.group] || [];
    acc[p.group].push(p);
    return acc;
  }, {});

  const showClassAssignment = form.role === 'Enseignant' ||
    (form.assignedClasses && form.assignedClasses.length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Utilisateurs & Rôles</h1>
        <p className="text-sm text-slate-500">Gérez les comptes, rôles et permissions d&apos;accès</p>
      </header>

      {message && (
        <div className={`mb-5 rounded-xl border px-4 py-3 text-sm font-medium ${
          message.type === 'success'
            ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
            : 'border-red-200 bg-red-50 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Code de secours */}
      <section className="mb-6 rounded-2xl border-2 border-amber-300 bg-amber-50 p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h2 className="mb-1 text-lg font-semibold text-amber-900">🔑 Code de secours administrateur</h2>
            <p className="mb-3 text-sm text-amber-800">
              <b>Conservez précieusement ce code.</b> Il permet de réinitialiser le mot de passe de l&apos;administrateur.
            </p>
            <div className="rounded-lg border-2 border-amber-400 bg-white px-4 py-3">
              <p className="break-all font-mono text-lg font-bold tracking-widest text-amber-900">
                {showRecovery ? (recoveryCode || '(non généré)') : '••••-••••-••••'}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={() => setShowRecovery((v) => !v)} className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100">
              {showRecovery ? '👁 Masquer' : '👁 Afficher'}
            </button>
            <button onClick={copyRecovery} disabled={!recoveryCode} className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100 disabled:opacity-50">
              📋 Copier
            </button>
            <button onClick={regenerateRecovery} className="rounded-lg border border-amber-400 bg-white px-4 py-2 text-xs font-medium text-amber-800 hover:bg-amber-100">
              🔄 Régénérer
            </button>
          </div>
        </div>
      </section>

      {/* Formulaire */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">
          {editingId ? '✏️ Modifier un compte' : '➕ Nouveau compte'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-5">
            <Field label="Nom d'utilisateur" required>
              <input className={inputCls} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} placeholder="ex : marie" />
            </Field>
            <Field label="Nom complet" required>
              <input className={inputCls} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} placeholder="ex : Marie KABILA" />
            </Field>
            <Field label="Email">
              <input type="email" className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="marie@ecole.cd" />
            </Field>
            <Field label="Rôle">
              <select className={inputCls} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
                {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </Field>
            <Field label={editingId ? 'Nouveau mot de passe (vide = inchangé)' : 'Mot de passe'}>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  className={inputCls + ' pr-16'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="••••••••"
                />
                <button type="button" onClick={() => setShowPwd((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-slate-500 hover:bg-slate-100">
                  {showPwd ? 'Masquer' : 'Voir'}
                </button>
              </div>
            </Field>
          </div>

          {/* 🆕 Classes assignées */}
          <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-4">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold text-indigo-900">
                  🎓 Classes assignées (enseignant)
                </p>
                <p className="text-xs text-indigo-700">
                  Si vous cochez des classes, cet utilisateur ne verra QUE ces classes dans l&apos;espace Bulletins.
                  Laissez vide pour tout voir (administrateurs).
                </p>
              </div>
              {form.assignedClasses.length > 0 && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, assignedClasses: [] })}
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Tout décocher ({form.assignedClasses.length})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-lg border border-indigo-200 bg-white p-2">
              {ALL_CLASSES.map((c) => {
                const on = form.assignedClasses.includes(c);
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => toggleClassAssignment(c)}
                    className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                      on ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
              <span>Compte actif</span>
            </label>
            <div className="flex gap-3">
              {editingId && (
                <button type="button" onClick={reset} className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Annuler
                </button>
              )}
              <button type="submit" className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                {editingId ? 'Enregistrer' : 'Créer le compte'}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* Liste */}
      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">👥 Comptes ({sorted.length})</h2>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                <th className="px-3 py-2 font-semibold">Utilisateur</th>
                <th className="px-3 py-2 font-semibold">Nom complet</th>
                <th className="px-3 py-2 font-semibold">Rôle</th>
                <th className="px-3 py-2 font-semibold">Classes assignées</th>
                <th className="px-3 py-2 font-semibold">Statut</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => {
                const isCustom = u.customPermissions !== null;
                const classes = u.assignedClasses || [];
                return (
                  <tr key={u.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-mono text-xs">{u.username}</td>
                    <td className="px-3 py-2 font-medium">{u.fullName}</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-1">
                        <select
                          value={u.role}
                          onChange={(e) => changeRole(u, e.target.value as Role)}
                          className="rounded-lg border border-indigo-200 bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-800 outline-none hover:bg-indigo-100"
                        >
                          {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                        </select>
                        {isCustom && (
                          <span className="text-[10px] font-medium text-amber-700">⚙️ Personnalisées</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      {classes.length === 0 ? (
                        <span className="text-xs text-slate-400">Toutes</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {classes.slice(0, 3).map((c) => (
                            <span key={c} className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700">
                              {c}
                            </span>
                          ))}
                          {classes.length > 3 && (
                            <span className="text-[10px] text-slate-500">+{classes.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => toggleActive(u)}
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.active ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {u.active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-right whitespace-nowrap">
                      <button onClick={() => setPermsUser(u)} className="mr-3 text-xs font-medium text-amber-600 hover:underline">
                        🔐 Permissions
                      </button>
                      <button onClick={() => handleEdit(u)} className="mr-3 text-xs font-medium text-indigo-600 hover:underline">
                        Modifier
                      </button>
                      {session?.userId !== u.id && (
                        <button onClick={() => supprimer(u)} className="text-xs font-medium text-red-500 hover:underline">
                          Supprimer
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Matrice permissions */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="mb-4 text-lg font-semibold">🔐 Permissions par défaut</h2>
        <div className="-mx-2 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-left uppercase text-slate-500">
                <th className="px-3 py-2 font-semibold">Module</th>
                {ROLES.map((r) => <th key={r} className="px-3 py-2 text-center font-semibold">{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERMISSION_LABELS.map((row) => (
                <tr key={row.perm} className="border-b border-slate-100">
                  <td className="px-3 py-2 font-medium text-slate-700">{row.label}</td>
                  {ROLES.map((r) => {
                    const allowed = (ROLE_PERMISSIONS[r] as readonly string[]).includes(row.perm);
                    return (
                      <td key={r} className="px-3 py-2 text-center">
                        {allowed ? <span className="text-emerald-600">✓</span> : <span className="text-slate-300">—</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal Permissions */}
      {permsUser && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4" onClick={() => setPermsUser(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
              <h3 className="font-semibold">🔐 Permissions personnalisées</h3>
              <p className="text-xs text-slate-500">
                {permsUser.fullName} (@{permsUser.username}) — Rôle : {permsUser.role}
              </p>
            </div>

            <div className="space-y-4 p-5">
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                ⚠️ Cochez exactement les modules autorisés.
                <button onClick={() => resetPermissions(permsUser)} className="ml-2 font-semibold underline">
                  Réinitialiser selon le rôle
                </button>
              </div>

              {Object.entries(groupedPerms).map(([group, items]) => (
                <div key={group} className="rounded-xl border border-slate-200 p-3">
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{group}</h4>
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    {items.map(({ perm, label }) => {
                      const active = (permsUser.customPermissions ?? getUserPermissions(permsUser)).includes(perm);
                      return (
                        <label key={perm} className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm hover:bg-slate-50">
                          <input type="checkbox" className="h-4 w-4" checked={active} onChange={() => togglePermission(permsUser, perm)} />
                          <span>{label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Classes dans le modal */}
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/50 p-3">
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-indigo-700">
                  🎓 Classes assignées
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {ALL_CLASSES.map((c) => {
                    const on = (permsUser.assignedClasses || []).includes(c);
                    return (
                      <button
                        key={c}
                        onClick={() => {
                          toggleAssignedClass(permsUser, c);
                          const updated = (permsUser.assignedClasses || []).includes(c)
                            ? (permsUser.assignedClasses || []).filter((x) => x !== c)
                            : [...(permsUser.assignedClasses || []), c];
                          setPermsUser({ ...permsUser, assignedClasses: updated });
                        }}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition ${
                          on ? 'bg-indigo-600 text-white' : 'bg-white text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {c}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-indigo-700">
                  L&apos;enseignant ne verra que ces classes dans l&apos;espace Bulletins.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-3">
              <button onClick={() => setPermsUser(null)} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                Terminer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children, required }: { label: string; children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-600">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}