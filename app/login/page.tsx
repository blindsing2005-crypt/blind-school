'use client';
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
  checkRecoveryCode,
  hashPassword,
  requestReset,
  getUserPermissions,
  useRecoveryCode,
  useSession,
  useUsers,
  verifyLogin,
  verifyResetCode,
  type UserAccount,
} from '../lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [users, setUsers] = useUsers();
  const [recoveryCode] = useRecoveryCode();
  const [, setSession] = useSession();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const [showRecovery, setShowRecovery] = useState(false);
  const [recoveryTab, setRecoveryTab] = useState<'code' | 'email'>('email');

  const [globalCode, setGlobalCode] = useState('');
  const [globalPwd, setGlobalPwd] = useState('');
  const [globalPwd2, setGlobalPwd2] = useState('');
  const [globalError, setGlobalError] = useState('');
  const [globalStep, setGlobalStep] = useState<'code' | 'pwd'>('code');

  const [identifier, setIdentifier] = useState('');
  const [emailStep, setEmailStep] = useState<'request' | 'verify' | 'newpwd' | 'done'>('request');
  const [foundUser, setFoundUser] = useState<UserAccount | null>(null);
  const [sentCode, setSentCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [emailPwd, setEmailPwd] = useState('');
  const [emailPwd2, setEmailPwd2] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const user = await verifyLogin(users, username, password);
      if (!user) {
        setError('Identifiant ou mot de passe incorrect.');
        setBusy(false);
        return;
      }
      setUsers((list) => list.map((u) => u.id === user.id ? { ...u, lastLoginAt: new Date().toISOString() } : u));
      setSession({ userId: user.id, username: user.username, fullName: user.fullName, role: user.role, loginAt: new Date().toISOString() });

      // 🆕 Redirection intelligente basée sur les permissions personnalisées
      const perms = getUserPermissions(user);
      let target = '/';
      if (!perms.includes('dashboard.view')) {
        if (perms.includes('eleves.view')) target = '/eleves';
        else if (perms.includes('paiements.view')) target = '/paiements';
        else if (perms.includes('bulletins.view')) target = '/bulletins';
        else if (perms.includes('personnel.view')) target = '/personnel';
        else if (perms.includes('vie.view')) target = '/vie-scolaire';
        else if (perms.includes('parametres.view')) target = '/parametres';
      }
      router.replace(target);
    } catch {
      setError('Erreur inattendue. Réessayez.');
      setBusy(false);
    }
  };

  const handleGlobalVerify = () => {
    setGlobalError('');
    if (!checkRecoveryCode(recoveryCode, globalCode)) {
      setGlobalError('Code de récupération incorrect.');
      return;
    }
    setGlobalStep('pwd');
  };

  const handleGlobalReset = async () => {
    setGlobalError('');
    if (globalPwd.trim().length < 5) { setGlobalError('Mot de passe : minimum 5 caractères.'); return; }
    if (globalPwd !== globalPwd2) { setGlobalError('Les deux mots de passe ne correspondent pas.'); return; }
    const admin = users.find((u) => u.role === 'Administrateur' && u.active);
    if (!admin) { setGlobalError('Aucun administrateur actif trouvé.'); return; }
    const newHash = await hashPassword(globalPwd);
    setUsers((list) => list.map((u) => (u.id === admin.id ? { ...u, passwordHash: newHash } : u)));
    alert(`Mot de passe du compte « ${admin.username} » réinitialisé.`);
    closeRecovery();
  };

  const handleEmailRequest = () => {
    setEmailError('');
    const result = requestReset(users, identifier);
    if ('error' in result) { setEmailError(result.error); return; }
    const { user, code } = result;
    setUsers((list) => list.map((u) => u.id === user.id ? { ...u, resetCode: code, resetCodeExpiry: new Date(Date.now() + 15 * 60 * 1000).toISOString() } : u));
    setFoundUser(user);
    setSentCode(code);
    setEmailStep('verify');
  };

  const handleEmailVerify = async () => {
    setEmailError('');
    if (!foundUser) return;
    const res = await verifyResetCode(foundUser, enteredCode);
    if (!res.ok) { setEmailError(res.error || 'Code invalide.'); return; }
    setEmailStep('newpwd');
  };

  const handleEmailNewPwd = async () => {
    setEmailError('');
    if (emailPwd.trim().length < 5) { setEmailError('Mot de passe : minimum 5 caractères.'); return; }
    if (emailPwd !== emailPwd2) { setEmailError('Les deux mots de passe ne correspondent pas.'); return; }
    if (!foundUser) return;
    const newHash = await hashPassword(emailPwd);
    setUsers((list) => list.map((u) => u.id === foundUser.id ? { ...u, passwordHash: newHash, resetCode: null, resetCodeExpiry: null } : u));
    setEmailStep('done');
  };

  const closeRecovery = () => {
    setShowRecovery(false);
    setGlobalCode(''); setGlobalPwd(''); setGlobalPwd2(''); setGlobalError(''); setGlobalStep('code');
    setIdentifier(''); setEnteredCode(''); setEmailPwd(''); setEmailPwd2(''); setEmailError('');
    setFoundUser(null); setSentCode(''); setEmailStep('request');
    setRecoveryTab('email');
  };

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-indigo-50 via-slate-50 to-purple-50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 text-lg font-bold text-white shadow-lg">BS</div>
          <h1 className="text-2xl font-bold tracking-tight">BLIND SCHOOL</h1>
          <p className="text-sm text-slate-500">Connectez-vous pour continuer</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
          {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">❌ {error}</div>}
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Nom d&apos;utilisateur</span>
            <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" value={username} onChange={(e) => setUsername(e.target.value)} autoFocus required placeholder="ex : admin" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-slate-600">Mot de passe</span>
            <input type="password" className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" />
          </label>
          <button type="submit" disabled={busy} className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:bg-slate-400">
            {busy ? 'Connexion…' : 'Se connecter'}
          </button>
          <button type="button" onClick={() => setShowRecovery(true)} className="block w-full text-center text-xs font-medium text-indigo-600 hover:underline">
            Mot de passe oublié ?
          </button>
        </form>

        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
          <p className="mb-1 font-semibold">🔑 Première connexion</p>
          <p>Utilisateur : <b>admin</b> — Mot de passe : <b>admin123</b></p>
        </div>
      </div>

      {showRecovery && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/60 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
              <h3 className="font-semibold">🔑 Récupération de mot de passe</h3>
            </div>
            <div className="flex border-b border-slate-200">
              <button onClick={() => setRecoveryTab('email')} className={`flex-1 px-4 py-2.5 text-xs font-medium transition ${recoveryTab === 'email' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>📧 Par email</button>
              <button onClick={() => setRecoveryTab('code')} className={`flex-1 px-4 py-2.5 text-xs font-medium transition ${recoveryTab === 'code' ? 'border-b-2 border-indigo-600 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>🔐 Code de secours</button>
            </div>
            {recoveryTab === 'email' && (
              <div className="space-y-4 p-5">
                {emailStep === 'request' && (
                  <>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-slate-600">Identifiant ou email</span>
                      <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none" value={identifier} onChange={(e) => setIdentifier(e.target.value)} autoFocus />
                    </label>
                    {emailError && <div className="text-xs text-red-600">❌ {emailError}</div>}
                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                      <button onClick={closeRecovery} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Annuler</button>
                      <button onClick={handleEmailRequest} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm text-white">Envoyer</button>
                    </div>
                  </>
                )}
                {emailStep === 'verify' && (
                  <>
                    <div className="text-center p-4 bg-indigo-50 rounded-lg">
                      <p className="text-[10px] text-indigo-600 uppercase">Simulation Email</p>
                      <p className="font-mono text-3xl font-bold tracking-widest text-indigo-900">{sentCode}</p>
                    </div>
                    <input className="w-full text-center tracking-widest text-lg rounded-lg border border-slate-300 p-2" value={enteredCode} onChange={(e) => setEnteredCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" />
                    {emailError && <div className="text-xs text-red-600">❌ {emailError}</div>}
                    <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                      <button onClick={() => setEmailStep('request')} className="text-xs text-slate-500">← Retour</button>
                      <button onClick={handleEmailVerify} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm text-white">Vérifier</button>
                    </div>
                  </>
                )}
                {emailStep === 'newpwd' && (
                  <>
                    <input type="password" className="w-full rounded-lg border border-slate-300 p-2 text-sm" value={emailPwd} onChange={(e) => setEmailPwd(e.target.value)} placeholder="Nouveau mot de passe" />
                    <input type="password" className="w-full rounded-lg border border-slate-300 p-2 text-sm" value={emailPwd2} onChange={(e) => setEmailPwd2(e.target.value)} placeholder="Confirmer" />
                    {emailError && <div className="text-xs text-red-600">❌ {emailError}</div>}
                    <div className="flex justify-end gap-3 pt-4">
                      <button onClick={handleEmailNewPwd} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm text-white">Réinitialiser</button>
                    </div>
                  </>
                )}
                {emailStep === 'done' && (
                  <div className="text-center p-4">
                    <div className="text-4xl mb-2">✅</div>
                    <button onClick={closeRecovery} className="mt-4 rounded-lg bg-indigo-600 px-5 py-2 text-sm text-white">Fermer</button>
                  </div>
                )}
              </div>
            )}
            {recoveryTab === 'code' && (
              <div className="space-y-4 p-5">
                {globalStep === 'code' && (
                  <>
                    <input className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-center font-mono text-lg tracking-widest outline-none" value={globalCode} onChange={(e) => setGlobalCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX" />
                    {globalError && <div className="text-xs text-red-600">❌ {globalError}</div>}
                    <div className="flex justify-end gap-3 pt-4">
                      <button onClick={closeRecovery} className="rounded-lg border border-slate-300 px-4 py-2 text-sm">Annuler</button>
                      <button onClick={handleGlobalVerify} className="rounded-lg bg-indigo-600 px-5 py-2 text-sm text-white">Vérifier</button>
                    </div>
                  </>
                )}
                {globalStep === 'pwd' && (
                  <>
                    <input type="password" className="w-full rounded-lg border border-slate-300 p-2 text-sm" value={globalPwd} onChange={(e) => setGlobalPwd(e.target.value)} placeholder="Nouveau mot de passe admin" />
                    <input type="password" className="w-full rounded-lg border border-slate-300 p-2 text-sm" value={globalPwd2} onChange={(e) => setGlobalPwd2(e.target.value)} placeholder="Confirmer" />
                    {globalError && <div className="text-xs text-red-600">❌ {globalError}</div>}
                    <div className="flex justify-end gap-3 pt-4">
                      <button onClick={handleGlobalReset} className="rounded-lg bg-emerald-600 px-5 py-2 text-sm text-white">Réinitialiser</button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}